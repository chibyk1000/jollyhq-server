"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderRelations = exports.orders = exports.orderStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const events_1 = require("./events");
const eventTickets_1 = require("./eventTickets");
const profiles_1 = require("./profiles");
const pg_core_2 = require("drizzle-orm/pg-core");
exports.orderStatusEnum = (0, pg_core_2.pgEnum)("order_status", [
    "PENDING",
    "PAID",
    "FAILED",
    "CANCELLED",
]);
exports.orders = (0, pg_core_1.pgTable)("orders", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    // FK → users.id
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(() => profiles_1.user.id, { onDelete: "cascade" }),
    // FK → events.id
    eventId: (0, pg_core_1.uuid)("event_id").references(() => events_1.events.id, {
        onDelete: "cascade",
    }),
    // FK → event_tickets.id
    ticketId: (0, pg_core_1.uuid)("ticket_id").references(() => eventTickets_1.eventTickets.id, {
        onDelete: "cascade",
    }),
    quantity: (0, pg_core_1.numeric)("quantity").notNull().default("1"),
    totalAmount: (0, pg_core_1.numeric)("total_amount", { precision: 12, scale: 2 }).notNull(),
    currency: (0, pg_core_1.varchar)("currency", { length: 10 }).default("NGN"),
    // Nomba
    orderReference: (0, pg_core_1.varchar)("order_reference", { length: 150 })
        .notNull()
        .unique(),
    transactionId: (0, pg_core_1.varchar)("transaction_id", { length: 150 }),
    paymentMethod: (0, pg_core_1.varchar)("payment_method", { length: 50 }),
    status: (0, exports.orderStatusEnum)("status").default("PENDING"), // PENDING | PAID | FAILED | CANCELLED
    isPaid: (0, pg_core_1.boolean)("is_paid").default(false),
    paidAt: (0, pg_core_1.timestamp)("paid_at", { mode: "date" }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: "date" })
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});
exports.orderRelations = (0, drizzle_orm_1.relations)(exports.orders, ({ one }) => ({
    event: one(events_1.events, {
        fields: [exports.orders.eventId],
        references: [events_1.events.id],
    }),
    ticket: one(eventTickets_1.eventTickets, {
        fields: [exports.orders.ticketId],
        references: [eventTickets_1.eventTickets.id],
    }),
    user: one(profiles_1.user, {
        fields: [exports.orders.userId],
        references: [profiles_1.user.id],
    }),
}));
