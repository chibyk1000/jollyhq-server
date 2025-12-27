"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRelations = exports.chats = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const events_1 = require("./events");
const drizzle_orm_1 = require("drizzle-orm");
const chatMembers_1 = require("./chatMembers");
const messages_1 = require("./messages");
const vendors_1 = require("./vendors");
exports.chats = (0, pg_core_1.pgTable)("chats", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    // Optional event-based chat
    eventId: (0, pg_core_1.uuid)("event_id").references(() => events_1.events.id, {
        onDelete: "cascade",
    }),
    // Optional vendor-based chat
    vendorId: (0, pg_core_1.uuid)("vendor_id").references(() => vendors_1.vendors.id, {
        onDelete: "cascade",
    }),
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
    vendor: one(vendors_1.vendors, {
        fields: [exports.chats.vendorId],
        references: [vendors_1.vendors.id],
    }),
}));
