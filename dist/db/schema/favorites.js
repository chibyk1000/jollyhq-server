"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.favoriteEventRelations = exports.favoriteEvents = void 0;
// db/schema/favoriteEvents.ts
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const profiles_1 = require("./profiles");
const events_1 = require("./events");
exports.favoriteEvents = (0, pg_core_1.pgTable)("favorite_events", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(() => profiles_1.profiles.id, { onDelete: "cascade" }),
    eventId: (0, pg_core_1.uuid)("event_id")
        .notNull()
        .references(() => events_1.events.id, { onDelete: "cascade" }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => {
    // unique constraint on userId + eventId
    return {
        unique_user_event: (0, pg_core_1.uniqueIndex)("unique_user_event").on(table.userId, table.eventId),
    };
});
exports.favoriteEventRelations = (0, drizzle_orm_1.relations)(exports.favoriteEvents, ({ one }) => ({
    user: one(profiles_1.profiles, {
        fields: [exports.favoriteEvents.userId],
        references: [profiles_1.profiles.id],
    }),
    event: one(events_1.events, {
        fields: [exports.favoriteEvents.eventId],
        references: [events_1.events.id],
    }),
}));
