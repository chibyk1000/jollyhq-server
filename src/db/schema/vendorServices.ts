import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  text,
} from "drizzle-orm/pg-core";
import { vendors } from "./vendors";

export const vendorServices = pgTable("vendor_services", {
  id: uuid("id").defaultRandom().primaryKey(),

  vendorId: uuid("vendor_id")
    .references(() => vendors.id, { onDelete: "cascade" })
    .notNull(),

  // ---------- SERVICE INFO ----------
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 255 }).notNull(),

  // ---------- PRICING ----------
  price: integer("price").notNull(), // base price
  priceType: varchar("price_type", { length: 50 }).default("fixed"),
  // fixed | hourly | per_event

  // ---------- TIME ----------
  durationMinutes: integer("duration_minutes"),
  deliveryTime: varchar("delivery_time", { length: 120 }),

  // ---------- MEDIA ----------
  image: varchar("image", { length: 255 }),

  // ---------- STATUS ----------
  isActive: boolean("is_active").default(true).notNull(),

  // ---------- META ----------
  createdAt: timestamp("created_at")
    .default(sql`NOW()`)
    .notNull(),

  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});



export const vendorServiceRelations = relations(vendorServices, ({ one }) => ({
  vendor: one(vendors, {
    fields: [vendorServices.vendorId],
    references: [vendors.id],
  }),
}));
 