import { pgTable, uuid, text, timestamp, varchar, index } from "drizzle-orm/pg-core";
import { chats } from "./chats";
import { user as profiles } from "./profiles";

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),

    senderId: uuid("sender_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).default("sent"),
    // sending | sent | delivered | failed

    content: text("content"), // Message text
    type: varchar("type", { length: 20 }).default("text"), // text | image | video | file | audio
    mediaUrl: text("media_url"),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    chatIdx: index("messages_chat_id_idx").on(table.chatId),
    createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
  })
);
