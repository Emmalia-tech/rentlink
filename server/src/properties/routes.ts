import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/client.js";
import { properties, propertyPhotos, users } from "../db/schema.js";
import { requireAuth, requireRole } from "../auth/middleware.js";

const router = Router();

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  location: z.string().min(2),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  propertyType: z.enum(["apartment", "house", "studio", "room", "commercial"]),
  rooms: z.number().int().min(0),
  rentAmount: z.number().positive(),
  currency: z.string().default("GHS"),
  availability: z.enum(["available", "taken", "coming_soon"]).default("available"),
  photos: z.array(z.string().url()).optional(),
});

const updateSchema = createSchema.partial();

function serializeProperty(row: typeof properties.$inferSelect, photos: string[] = []) {
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    description: row.description,
    location: row.location,
    latitude: row.latitude,
    longitude: row.longitude,
    propertyType: row.propertyType,
    rooms: row.rooms,
    rentAmount: row.rentAmount,
    currency: row.currency,
    availability: row.availability,
    verificationStatus: row.verificationStatus,
    photos,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// CREATE — landlord or agent only
router.post(
  "/",
  requireAuth,
  requireRole("landlord", "agent", "admin"),
  async (req: Request, res: Response) => {
    try {
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      if (!req.user) return res.status(401).json({ error: "Not authenticated" });

      const data = parsed.data;

      const [created] = await db
        .insert(properties)
        .values({
          ownerId: req.user.userId,
          title: data.title,
          description: data.description,
          location: data.location,
          latitude: data.latitude !== undefined ? String(data.latitude) : null,
          longitude: data.longitude !== undefined ? String(data.longitude) : null,
          propertyType: data.propertyType,
          rooms: data.rooms,
          rentAmount: String(data.rentAmount),
          currency: data.currency,
          availability: data.availability,
        })
        .returning();

      if (!created) return res.status(500).json({ error: "Failed to create property" });

      let photos: string[] = [];
      if (data.photos && data.photos.length > 0) {
        const rows = data.photos.map((url, index) => ({
          propertyId: created.id,
          url,
          order: index,
        }));
        await db.insert(propertyPhotos).values(rows);
        photos = data.photos;
      }

      return res.status(201).json({ property: serializeProperty(created, photos) });
    } catch (err) {
      console.error("[properties.create] Error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// LIST — public
router.get("/", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;

    const rows = await db
      .select()
      .from(properties)
      .orderBy(desc(properties.createdAt))
      .limit(limit)
      .offset(offset);

    const ids = rows.map((r) => r.id);
    const photos = ids.length
      ? await db.select().from(propertyPhotos)
      : [];

    const photoMap = new Map<string, string[]>();
    for (const p of photos) {
      const arr = photoMap.get(p.propertyId) || [];
      arr.push(p.url);
      photoMap.set(p.propertyId, arr);
    }

    return res.json({
      properties: rows.map((r) => serializeProperty(r, photoMap.get(r.id) || [])),
      limit,
      offset,
    });
  } catch (err) {
    console.error("[properties.list] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET ONE — public
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const [row] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, req.params.id))
      .limit(1);

    if (!row) return res.status(404).json({ error: "Property not found" });

    const photos = await db
      .select()
      .from(propertyPhotos)
      .where(eq(propertyPhotos.propertyId, row.id));

    return res.json({
      property: serializeProperty(row, photos.sort((a, b) => a.order - b.order).map((p) => p.url)),
    });
  } catch (err) {
    console.error("[properties.get] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// UPDATE — owner only
router.patch(
  "/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Not authenticated" });

      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const [existing] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, req.params.id))
        .limit(1);

      if (!existing) return res.status(404).json({ error: "Property not found" });

      const isOwner = existing.ownerId === req.user.userId;
      const isAdmin = req.user.role === "admin";
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "You do not own this property" });
      }

      const data = parsed.data;
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (data.title !== undefined) updates.title = data.title;
      if (data.description !== undefined) updates.description = data.description;
      if (data.location !== undefined) updates.location = data.location;
      if (data.latitude !== undefined) updates.latitude = String(data.latitude);
      if (data.longitude !== undefined) updates.longitude = String(data.longitude);
      if (data.propertyType !== undefined) updates.propertyType = data.propertyType;
      if (data.rooms !== undefined) updates.rooms = data.rooms;
      if (data.rentAmount !== undefined) updates.rentAmount = String(data.rentAmount);
      if (data.currency !== undefined) updates.currency = data.currency;
      if (data.availability !== undefined) updates.availability = data.availability;

      const [updated] = await db
        .update(properties)
        .set(updates)
        .where(eq(properties.id, req.params.id))
        .returning();

      if (!updated) return res.status(500).json({ error: "Failed to update" });

      if (data.photos) {
        await db.delete(propertyPhotos).where(eq(propertyPhotos.propertyId, updated.id));
        if (data.photos.length > 0) {
          await db.insert(propertyPhotos).values(
            data.photos.map((url, index) => ({
              propertyId: updated.id,
              url,
              order: index,
            }))
          );
        }
      }

      const photoRows = await db
        .select()
        .from(propertyPhotos)
        .where(eq(propertyPhotos.propertyId, updated.id));

      return res.json({
        property: serializeProperty(
          updated,
          photoRows.sort((a, b) => a.order - b.order).map((p) => p.url)
        ),
      });
    } catch (err) {
      console.error("[properties.update] Error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// DELETE — owner or admin
router.delete(
  "/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Not authenticated" });

      const [existing] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, req.params.id))
        .limit(1);

      if (!existing) return res.status(404).json({ error: "Property not found" });

      const isOwner = existing.ownerId === req.user.userId;
      const isAdmin = req.user.role === "admin";
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "You do not own this property" });
      }

      await db.delete(properties).where(eq(properties.id, req.params.id));
      return res.status(204).send();
    } catch (err) {
      console.error("[properties.delete] Error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
