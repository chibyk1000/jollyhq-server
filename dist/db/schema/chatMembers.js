"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatMemberRelations = exports.chatMembers = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const chats_1 = require("./chats");
const profiles_1 = require("./profiles");
const drizzle_orm_1 = require("drizzle-orm");
exports.chatMembers = (0, pg_core_1.pgTable)("chat_members", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    chatId: (0, pg_core_1.integer)("chat_id")
        .notNull()
        .references(() => chats_1.chats.id, { onDelete: "cascade" }),
    profileId: (0, pg_core_1.integer)("profile_id")
        .notNull()
        .references(() => profiles_1.user.id, { onDelete: "cascade" }),
    role: (0, pg_core_1.varchar)("role", { length: 20 }).default("member"), // admin | member
    isMuted: (0, pg_core_1.boolean)("is_muted").default(false),
    isBanned: (0, pg_core_1.boolean)("is_banned").default(false),
    joinedAt: (0, pg_core_1.timestamp)("joined_at").defaultNow(),
}, (table) => ({
    chatIdx: (0, pg_core_1.index)("chat_members_chat_id_idx").on(table.chatId),
    profileIdx: (0, pg_core_1.index)("chat_members_profile_id_idx").on(table.profileId),
    // 🔴 ADD THIS
    uniqueMember: (0, pg_core_1.uniqueIndex)("chat_member_unique").on(table.chatId, table.profileId),
}));
exports.chatMemberRelations = (0, drizzle_orm_1.relations)(exports.chatMembers, ({ one }) => ({
    chat: one(chats_1.chats, {
        fields: [exports.chatMembers.chatId],
        references: [chats_1.chats.id],
    }),
    profile: one(profiles_1.user, {
        fields: [exports.chatMembers.profileId],
        references: [profiles_1.user.id],
    }),
}));
