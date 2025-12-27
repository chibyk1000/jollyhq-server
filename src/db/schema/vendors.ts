import { InferModel, relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  real,
  timestamp,
  uuid,
  varchar,
  text,
} from "drizzle-orm/pg-core";
import { profiles } from "./profiles";
import { vendorServices } from "./vendorServices";
import { wallets } from "./wallet";

export const vendors = pgTable("vendors", {
  // ---------- IDs ----------
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),
  businessName: varchar("business_name", { length: 255 }),
  contactName: varchar("name", { length: 255 }).notNull(),
  contactEmail: varchar("email", { length: 255 }).notNull(),
  contactPhone: varchar("phone", { length: 255 }).notNull(),
  // ---------- BASIC INFO ----------

  category: varchar("category", { length: 255 }).notNull(),
  description: text("description"), // short description/about vendor

  // ---------- MEDIA ----------
  image: varchar("image", { length: 255 }).notNull(), // profile image

  // ---------- PRICING ----------
  priceRange: varchar("price_range", { length: 255 }).notNull(), // display price

  // ---------- LOCATION ----------
  location: varchar("location", { length: 255 }).notNull(),
  city: varchar("city", { length: 120 }),

  // ---------- PERFORMANCE ----------
  rating: real("rating").default(0).notNull(),
  reviews: integer("reviews").default(0).notNull(),
  responseTime: varchar("response_time", { length: 255 }).notNull(),

  // ---------- STATUS ----------
  verified: boolean("verified").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),

  // ---------- TIMESTAMPS ----------
  createdAt: timestamp("created_at")
    .default(sql`NOW()`)
    .notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => sql`CURRENT_TIMESTAMP`),
  deletedAt: timestamp("deleted_at"), // soft delete
});

export const vendorRelations = relations(vendors, ({ many, one }) => ({
  services: many(vendorServices),
  wallet: one(wallets, {
    fields: [vendors.id],
    references: [wallets.ownerId],
  }),
}));


export type Vendors = InferModel<typeof vendors>;