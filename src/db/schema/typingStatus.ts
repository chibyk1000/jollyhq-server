import {
  boolean,
  pgTable,
  serial,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { chats } from "./chats";
import { user as profiles } from "./profiles";

export const typingStatus = pgTable("typing_status", {
  id: serial("id").primaryKey(),

  chatId: integer("chat_id").references(() => chats.id, { onDelete: "cascade" }),
  profileId: integer("profile_id").references(() => profiles.id),
  isTyping: boolean("is_typing").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});
