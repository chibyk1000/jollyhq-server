import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { chats } from "./chats";
import { user as profiles } from "./profiles";
import { relations } from "drizzle-orm";

export const chatMembers = pgTable(
  "chat_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),

    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),

    role: varchar("role", { length: 20 }).default("member"), // admin | member
    isMuted: boolean("is_muted").default(false),
    isBanned: boolean("is_banned").default(false),

    joinedAt: timestamp("joined_at").defaultNow(),
  },
  (table) => ({
    chatIdx: index("chat_members_chat_id_idx").on(table.chatId),
    profileIdx: index("chat_members_profile_id_idx").on(table.profileId),

    // 🔴 ADD THIS
    uniqueMember: uniqueIndex("chat_member_unique").on(
      table.chatId,
      table.profileId,
    ),
  }),
);

export const chatMemberRelations = relations(chatMembers, ({ one }) => ({
  chat: one(chats, {
    fields: [chatMembers.chatId],
    references: [chats.id],
  }),
  profile: one(profiles, {
    fields: [chatMembers.profileId],
    references: [profiles.id],
  }),
}));