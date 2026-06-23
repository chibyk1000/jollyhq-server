import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { chats } from "./chats";
import { user as profiles } from "./profiles";
import { relations } from "drizzle-orm";

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),

    chatId: integer("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),

    senderId: integer("sender_id")
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
  }),
);

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(profiles, {
    fields: [messages.senderId],
    references: [profiles.id],
  }),
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
}));
