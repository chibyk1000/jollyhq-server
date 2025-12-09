import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { chats } from "./chats";
import { profiles } from "./profiles";

export const chatMembers = pgTable("chat_members", {
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
});
