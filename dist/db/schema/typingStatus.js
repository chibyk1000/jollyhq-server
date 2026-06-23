"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typingStatus = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const chats_1 = require("./chats");
const profiles_1 = require("./profiles");
exports.typingStatus = (0, pg_core_1.pgTable)("typing_status", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    chatId: (0, pg_core_1.integer)("chat_id").references(() => chats_1.chats.id, { onDelete: "cascade" }),
    profileId: (0, pg_core_1.integer)("profile_id").references(() => profiles_1.user.id),
    isTyping: (0, pg_core_1.boolean)("is_typing").default(false),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
