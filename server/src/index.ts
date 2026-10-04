import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { pool } from "./db/client.js";
import authRoutes from "./auth/routes.js";
import { requireAuth } from "./auth/middleware.js";
import { db } from "./db/client.js";
import { users } from "./db/schema.js";
import { eq } from "drizzle-orm";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// --- Middleware ---
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// --- Routes ---
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "rentlink-server",
    timestamp: new Date().toISOString(),
  });
});

app.get("/db-health", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT NOW() as now, version() as version");
    res.json({
      status: "ok",
      database: "rentlink_dev",
      now: result.rows[0].now,
      version: result.rows[0].version,
    });
  } catch (err) {
    console.error("[db-health] Error:", err);
    res.status(500).json({
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

app.use("/auth", authRoutes);

app.get("/auth/me", requireAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      role: users.role,
      verificationStatus: users.verificationStatus,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, req.user.userId))
    .limit(1);

  if (!user) return res.status(404).json({ error: "User not found" });

  return res.json({ user });
});

app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "RentLink Ghana API",
    version: "0.1.0",
    message: "Find. Verify. Pay. Protect.",
  });
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`[server] RentLink API running on http://localhost:${PORT}`);
  console.log(`[server] Health check: http://localhost:${PORT}/health`);
  console.log(`[server] DB health:   http://localhost:${PORT}/db-health`);
  console.log(`[server] Auth:        http://localhost:${PORT}/auth`);
});
