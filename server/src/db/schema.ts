import { pgTable, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
