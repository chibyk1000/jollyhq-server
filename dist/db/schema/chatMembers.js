"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatMembers = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const chats_1 = require("./chats");
const profiles_1 = require("./profiles");
exports.chatMembers = (0, pg_core_1.pgTable)("chat_members", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    chatId: (0, pg_core_1.uuid)("chat_id")
        .notNull()
        .references(() => chats_1.chats.id, { onDelete: "cascade" }),
    profileId: (0, pg_core_1.uuid)("profile_id")
        .notNull()
        .references(() => profiles_1.profiles.id, { onDelete: "cascade" }),
    role: (0, pg_core_1.varchar)("role", { length: 20 }).default("member"), // admin | member
    isMuted: (0, pg_core_1.boolean)("is_muted").default(false),
    isBanned: (0, pg_core_1.boolean)("is_banned").default(false),
    joinedAt: (0, pg_core_1.timestamp)("joined_at").defaultNow(),
});
