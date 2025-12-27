"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vendorRelations = exports.vendors = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const profiles_1 = require("./profiles");
const vendorServices_1 = require("./vendorServices");
const wallet_1 = require("./wallet");
exports.vendors = (0, pg_core_1.pgTable)("vendors", {
    // ---------- IDs ----------
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id")
        .references(() => profiles_1.profiles.id, { onDelete: "cascade" })
        .notNull(),
    businessName: (0, pg_core_1.varchar)("business_name", { length: 255 }).default(""),
    contactName: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    contactEmail: (0, pg_core_1.varchar)("email", { length: 255 }).notNull(),
    contactPhone: (0, pg_core_1.varchar)("phone", { length: 255 }).notNull(),
    // ---------- BASIC INFO ----------
    category: (0, pg_core_1.varchar)("category", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"), // short description/about vendor
    // ---------- MEDIA ----------
    image: (0, pg_core_1.varchar)("image", { length: 255 }).notNull(), // profile image
    // ---------- PRICING ----------
    priceRange: (0, pg_core_1.varchar)("price_range", { length: 255 }).notNull(), // display price
    // ---------- LOCATION ----------
    location: (0, pg_core_1.varchar)("location", { length: 255 }).notNull(),
    city: (0, pg_core_1.varchar)("city", { length: 120 }),
    // ---------- PERFORMANCE ----------
    rating: (0, pg_core_1.real)("rating").default(0).notNull(),
    reviews: (0, pg_core_1.integer)("reviews").default(0).notNull(),
    responseTime: (0, pg_core_1.varchar)("response_time", { length: 255 }).notNull(),
    // ---------- STATUS ----------
    verified: (0, pg_core_1.boolean)("verified").default(false).notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    // ---------- TIMESTAMPS ----------
    createdAt: (0, pg_core_1.timestamp)("created_at")
        .default((0, drizzle_orm_1.sql) `NOW()`)
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").$onUpdate(() => (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    deletedAt: (0, pg_core_1.timestamp)("deleted_at"), // soft delete
});
exports.vendorRelations = (0, drizzle_orm_1.relations)(exports.vendors, ({ many, one }) => ({
    services: many(vendorServices_1.vendorServices),
    wallet: one(wallet_1.wallets, {
        fields: [exports.vendors.id],
        references: [wallet_1.wallets.ownerId],
    }),
}));
