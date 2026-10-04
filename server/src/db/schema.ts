import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", [
  "tenant",
  "landlord",
  "agent",
  "officer",
  "admin",
]);

export const verificationStatus = pgEnum("verification_status", [
  "unverified",
  "documents_reviewed",
  "identity_confirmed",
  "authority_verified",
]);

export const propertyType = pgEnum("property_type", [
  "apartment",
  "house",
  "studio",
  "room",
  "commercial",
]);

export const propertyAvailability = pgEnum("property_availability", [
  "available",
  "taken",
  "coming_soon",
]);

export const propertyVerification = pgEnum("property_verification", [
  "unverified",
  "documents_reviewed",
  "authority_verified",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  role: userRole("role").notNull().default("tenant"),
  verificationStatus: verificationStatus("verification_status")
    .notNull()
    .default("unverified"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  propertyType: propertyType("property_type").notNull(),
  rooms: integer("rooms").notNull(),
  rentAmount: numeric("rent_amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("GHS"),
  availability: propertyAvailability("availability").notNull().default("available"),
  verificationStatus: propertyVerification("verification_status")
    .notNull()
    .default("unverified"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const propertyPhotos = pgTable("property_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Property = typeof properties.$inferSelect;
export type NewProperty = typeof properties.$inferInsert;
export type PropertyPhoto = typeof propertyPhotos.$inferSelect;
export type NewPropertyPhoto = typeof propertyPhotos.$inferInsert;
