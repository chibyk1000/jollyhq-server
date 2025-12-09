import { pgTable, uuid, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { chats } from "./chats";
import { profiles } from "./profiles";

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),

  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),

  senderId: uuid("sender_id", )
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),

  content: text("content"), // Message text
  type: varchar("type", { length: 20 }).default("text"), // text | image | video | file | audio
  mediaUrl: text("media_url"),

  createdAt: timestamp("created_at").defaultNow(),
});
