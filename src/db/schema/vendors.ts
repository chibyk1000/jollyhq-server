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

  // ---------- BASIC INFO ----------
  profession: varchar("profession", { length: 255 }).notNull(),
  category: varchar("category", { length: 255 }).notNull(),
  bio: text("bio"), // short description/about vendor

  // ---------- MEDIA ----------
  image: varchar("image", { length: 255 }).notNull(), // profile image
  coverImage: varchar("cover_image", { length: 255 }), // optional banner

  // ---------- PRICING ----------
  price: varchar("price", { length: 255 }).notNull(), // display price
  minPrice: integer("min_price"), // optional structured pricing
  maxPrice: integer("max_price"),

  // ---------- LOCATION ----------
  location: varchar("location", { length: 255 }).notNull(),
  city: varchar("city", { length: 120 }),
  country: varchar("country", { length: 120 }),

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