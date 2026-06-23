"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messagesRelations = exports.messages = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const chats_1 = require("./chats");
const profiles_1 = require("./profiles");
const drizzle_orm_1 = require("drizzle-orm");
exports.messages = (0, pg_core_1.pgTable)("messages", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    chatId: (0, pg_core_1.integer)("chat_id")
        .notNull()
        .references(() => chats_1.chats.id, { onDelete: "cascade" }),
    senderId: (0, pg_core_1.integer)("sender_id")
        .notNull()
        .references(() => profiles_1.user.id, { onDelete: "cascade" }),
    status: (0, pg_core_1.varchar)("status", { length: 20 }).default("sent"),
    // sending | sent | delivered | failed
    content: (0, pg_core_1.text)("content"), // Message text
    type: (0, pg_core_1.varchar)("type", { length: 20 }).default("text"), // text | image | video | file | audio
    mediaUrl: (0, pg_core_1.text)("media_url"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => ({
    chatIdx: (0, pg_core_1.index)("messages_chat_id_idx").on(table.chatId),
    createdAtIdx: (0, pg_core_1.index)("messages_created_at_idx").on(table.createdAt),
}));
exports.messagesRelations = (0, drizzle_orm_1.relations)(exports.messages, ({ one }) => ({
    sender: one(profiles_1.user, {
        fields: [exports.messages.senderId],
        references: [profiles_1.user.id],
    }),
}));
