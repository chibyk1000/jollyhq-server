"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vendorServiceRelations = exports.vendorServices = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const vendors_1 = require("./vendors");
exports.vendorServices = (0, pg_core_1.pgTable)("vendor_services", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    vendorId: (0, pg_core_1.uuid)("vendor_id")
        .references(() => vendors_1.vendors.id, { onDelete: "cascade" })
        .notNull(),
    // ---------- SERVICE INFO ----------
    title: (0, pg_core_1.varchar)("title", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    category: (0, pg_core_1.varchar)("category", { length: 255 }).notNull(),
    // ---------- PRICING ----------
    price: (0, pg_core_1.integer)("price").notNull(), // base price
    priceType: (0, pg_core_1.varchar)("price_type", { length: 50 }).default("fixed"),
    // fixed | hourly | per_event
    // ---------- TIME ----------
    durationMinutes: (0, pg_core_1.integer)("duration_minutes"),
    deliveryTime: (0, pg_core_1.varchar)("delivery_time", { length: 120 }),
    // ---------- MEDIA ----------
    image: (0, pg_core_1.varchar)("image", { length: 255 }),
    // ---------- STATUS ----------
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    // ---------- META ----------
    createdAt: (0, pg_core_1.timestamp)("created_at")
        .default((0, drizzle_orm_1.sql) `NOW()`)
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").$onUpdate(() => (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
});
exports.vendorServiceRelations = (0, drizzle_orm_1.relations)(exports.vendorServices, ({ one }) => ({
    vendor: one(vendors_1.vendors, {
        fields: [exports.vendorServices.vendorId],
        references: [vendors_1.vendors.id],
    }),
}));
