"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRelations = exports.chats = exports.chatDirectTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const events_1 = require("./events");
// import { userprofiles } from "./profiles";
const drizzle_orm_1 = require("drizzle-orm");
const chatMembers_1 = require("./chatMembers");
const messages_1 = require("./messages");
const vendors_1 = require("./vendors");
const pg_core_2 = require("drizzle-orm/pg-core");
const profiles_1 = require("./profiles");
exports.chatDirectTypeEnum = (0, pg_core_2.pgEnum)("chat_direct_type", [
    "user_vendor", // regular user ↔ vendor
    "vendor_planner", // vendor ↔ event planner
]);
exports.chats = (0, pg_core_1.pgTable)("chats", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    eventId: (0, pg_core_1.integer)("event_id").references(() => events_1.events.id, {
        onDelete: "cascade",
    }),
    vendorId: (0, pg_core_1.integer)("vendor_id").references(() => vendors_1.vendors.id, {
        onDelete: "cascade",
    }),
    userId: (0, pg_core_1.integer)("user_id").references(() => profiles_1.user.id, {
        onDelete: "cascade",
    }),
    // NEW — marks this as a DM and describes who's talking
    directType: (0, exports.chatDirectTypeEnum)("direct_type"),
    lastMessageAt: (0, pg_core_1.timestamp)("last_message_at"),
    lastMessagePreview: (0, pg_core_1.varchar)("last_message_preview", { length: 100 }),
    name: (0, pg_core_1.varchar)("name", { length: 150 }),
    isGroup: (0, pg_core_1.boolean)("is_group").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => ({
    hasContext: (0, pg_core_1.check)("chats_has_context", (0, drizzle_orm_1.sql) `${table.eventId} IS NOT NULL OR ${table.vendorId} IS NOT NULL OR ${table.directType} IS NOT NULL`),
}));
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
    user: one(profiles_1.user, {
        fields: [exports.chats.userId],
        references: [profiles_1.user.id],
    }),
}));
