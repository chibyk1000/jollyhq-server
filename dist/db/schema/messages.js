"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messages = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const chats_1 = require("./chats");
const profiles_1 = require("./profiles");
exports.messages = (0, pg_core_1.pgTable)("messages", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    chatId: (0, pg_core_1.uuid)("chat_id")
        .notNull()
        .references(() => chats_1.chats.id, { onDelete: "cascade" }),
    senderId: (0, pg_core_1.uuid)("sender_id")
        .notNull()
        .references(() => profiles_1.profiles.id, { onDelete: "cascade" }),
    content: (0, pg_core_1.text)("content"), // Message text
    type: (0, pg_core_1.varchar)("type", { length: 20 }).default("text"), // text | image | video | file | audio
    mediaUrl: (0, pg_core_1.text)("media_url"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
