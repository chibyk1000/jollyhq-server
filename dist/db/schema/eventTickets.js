"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventTicketRelations = exports.eventTickets = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const events_1 = require("./events");
const drizzle_orm_1 = require("drizzle-orm");
exports.eventTickets = (0, pg_core_1.pgTable)("event_tickets", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    eventId: (0, pg_core_1.uuid)("event_id")
        .notNull()
        .references(() => events_1.events.id, { onDelete: "cascade" }),
    // User free labels (VIP, Balcony, Regular)
    label: (0, pg_core_1.varchar)("label", { length: 100 }).notNull(),
    // total available
    quantity: (0, pg_core_1.integer)("quantity").notNull(),
    // numeric pricing (0 for FREE)
    price: (0, pg_core_1.numeric)("price", { precision: 12, scale: 2 }).default("0").notNull(),
    // UI radio "paid" | "free"
    isFree: (0, pg_core_1.boolean)("is_free").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").default((0, drizzle_orm_1.sql) `now()`),
});
exports.eventTicketRelations = (0, drizzle_orm_1.relations)(exports.eventTickets, ({ one }) => ({
    event: one(events_1.events, {
        fields: [exports.eventTickets.eventId],
        references: [events_1.events.id],
    }),
}));
