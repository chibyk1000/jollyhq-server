"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRelations = exports.chats = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const events_1 = require("./events");
const drizzle_orm_1 = require("drizzle-orm");
const chatMembers_1 = require("./chatMembers");
const messages_1 = require("./messages");
exports.chats = (0, pg_core_1.pgTable)("chats", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    // One chat per event
    eventId: (0, pg_core_1.uuid)("event_id")
        .notNull()
        .unique()
        .references(() => events_1.events.id, { onDelete: "cascade" }),
    name: (0, pg_core_1.varchar)("name", { length: 150 }), // Optional custom chat name
    isGroup: (0, pg_core_1.boolean)("is_group").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.chatRelations = (0, drizzle_orm_1.relations)(exports.chats, ({ many, one }) => ({
    members: many(chatMembers_1.chatMembers),
    messages: many(messages_1.messages),
    event: one(events_1.events, {
        fields: [exports.chats.eventId],
        references: [events_1.events.id],
    }),
}));
