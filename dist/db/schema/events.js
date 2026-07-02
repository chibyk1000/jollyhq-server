"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventRelations = exports.events = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const eventPlanners_1 = require("./eventPlanners");
const eventTickets_1 = require("./eventTickets");
const eventDiscounts_1 = require("./eventDiscounts");
exports.events = (0, pg_core_1.pgTable)("events", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    // FK → event_planners.id
    plannerId: (0, pg_core_1.uuid)("planner_id")
        .notNull()
        .references(() => eventPlanners_1.eventPlanners.id, { onDelete: "cascade" }),
    imageUrl: (0, pg_core_1.text)("image_url"),
    eventType: (0, pg_core_1.varchar)("event_type", { length: 50 }).notNull(),
    category: (0, pg_core_1.varchar)("category", { length: 50 }).notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 150 }).notNull(),
    eventDate: (0, pg_core_1.timestamp)("event_date", { withTimezone: false }).notNull(),
    eventTime: (0, pg_core_1.timestamp)("event_time", { withTimezone: false }).notNull(),
    location: (0, pg_core_1.varchar)("location", { length: 255 }),
    description: (0, pg_core_1.text)("description"),
    createdAt: (0, pg_core_1.timestamp)("created_at").default((0, drizzle_orm_1.sql) `NOW()`),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").$onUpdate(() => (0, drizzle_orm_1.sql) `NOW()`),
});
exports.eventRelations = (0, drizzle_orm_1.relations)(exports.events, ({ one, many }) => ({
    planner: one(eventPlanners_1.eventPlanners, {
        fields: [exports.events.plannerId],
        references: [eventPlanners_1.eventPlanners.id],
    }),
    tickets: many(eventTickets_1.eventTickets),
    discounts: many(eventDiscounts_1.eventDiscounts),
}));
