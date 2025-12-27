"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vendorBookingRelations = exports.vendorBookings = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const vendors_1 = require("./vendors");
const vendorServices_1 = require("./vendorServices");
const profiles_1 = require("./profiles");
const events_1 = require("./events"); // optional but recommended
exports.vendorBookings = (0, pg_core_1.pgTable)("vendor_bookings", {
    /* ---------- IDS ---------- */
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    vendorId: (0, pg_core_1.uuid)("vendor_id")
        .references(() => vendors_1.vendors.id, { onDelete: "cascade" })
        .notNull(),
    serviceId: (0, pg_core_1.uuid)("service_id").references(() => vendorServices_1.vendorServices.id, {
        onDelete: "set null",
    }),
    userId: (0, pg_core_1.uuid)("user_id")
        .references(() => profiles_1.profiles.id, { onDelete: "cascade" })
        .notNull(),
    eventId: (0, pg_core_1.uuid)("event_id").references(() => events_1.events.id, {
        onDelete: "set null",
    }),
    /* ---------- BOOKING INFO ---------- */
    quantity: (0, pg_core_1.integer)("quantity").default(1).notNull(),
    amount: (0, pg_core_1.integer)("amount").notNull(), // total amount charged
    scheduledDate: (0, pg_core_1.timestamp)("scheduled_date"), // when service is needed
    notes: (0, pg_core_1.text)("notes"),
    /* ---------- STATUS ---------- */
    status: (0, pg_core_1.varchar)("status", { length: 50 }).default("pending").notNull(),
    // pending | accepted | completed | cancelled | rejected
    isPaid: (0, pg_core_1.boolean)("is_paid").default(false).notNull(),
    paymentRef: (0, pg_core_1.varchar)("payment_ref", { length: 255 }),
    /* ---------- TIMESTAMPS ---------- */
    createdAt: (0, pg_core_1.timestamp)("created_at")
        .default((0, drizzle_orm_1.sql) `NOW()`)
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").$onUpdate(() => (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    cancelledAt: (0, pg_core_1.timestamp)("cancelled_at"),
});
exports.vendorBookingRelations = (0, drizzle_orm_1.relations)(exports.vendorBookings, ({ one }) => ({
    vendor: one(vendors_1.vendors, {
        fields: [exports.vendorBookings.vendorId],
        references: [vendors_1.vendors.id],
    }),
    service: one(vendorServices_1.vendorServices, {
        fields: [exports.vendorBookings.serviceId],
        references: [vendorServices_1.vendorServices.id],
    }),
    user: one(profiles_1.profiles, {
        fields: [exports.vendorBookings.userId],
        references: [profiles_1.profiles.id],
    }),
    event: one(events_1.events, {
        fields: [exports.vendorBookings.eventId],
        references: [events_1.events.id],
    }),
}));
