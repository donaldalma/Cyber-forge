import { pgTable, text, serial, timestamp, pgEnum, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const payloadCategoryEnum = pgEnum("payload_category", [
  "XSS", "SQLi", "CSRF", "LFI", "SSRF", "XXE", "RCE", "IDOR", "Open Redirect", "SSTI", "Path Traversal", "Command Injection"
]);

export const payloadsTable = pgTable("payloads", {
  id: serial("id").primaryKey(),
  category: payloadCategoryEnum("category").notNull(),
  subcategory: text("subcategory").notNull(),
  title: text("title").notNull(),
  payload: text("payload").notNull(),
  description: text("description").notNull(),
  isBypass: boolean("is_bypass").notNull().default(false),
  bypassType: text("bypass_type"),
  tags: text("tags").array().notNull().default([]),
  platform: text("platform"),
  cve: text("cve"),
  views: integer("views").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPayloadSchema = createInsertSchema(payloadsTable).omit({
  id: true, views: true, createdAt: true,
});
export type InsertPayload = z.infer<typeof insertPayloadSchema>;
export type Payload = typeof payloadsTable.$inferSelect;
