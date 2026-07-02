"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventDiscountRelations = exports.eventDiscounts = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const events_1 = require("./events");
const drizzle_orm_1 = require("drizzle-orm");
exports.eventDiscounts = (0, pg_core_1.pgTable)("event_discounts", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    eventId: (0, pg_core_1.uuid)("event_id")
        .notNull()
        .references(() => events_1.events.id, { onDelete: "cascade" }),
    code: (0, pg_core_1.varchar)("code", { length: 50 }).notNull(),
    // example: "Max 30"
    usageLimit: (0, pg_core_1.integer)("usage_limit"),
    usedCount: (0, pg_core_1.integer)("used_count").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").default((0, drizzle_orm_1.sql) `now()`),
});
exports.eventDiscountRelations = (0, drizzle_orm_1.relations)(exports.eventDiscounts, ({ one }) => ({
    event: one(events_1.events, {
        fields: [exports.eventDiscounts.eventId],
        references: [events_1.events.id],
    }),
}));
