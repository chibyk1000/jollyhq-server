import { boolean, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { chats } from "./chats";
import { profiles } from "./profiles";

export const typingStatus = pgTable("typing_status", {
  id: uuid("id").defaultRandom().primaryKey(),

  chatId: uuid("chat_id").references(() => chats.id, { onDelete: "cascade" }),
  profileId: uuid("profile_id").references(
    () => profiles.id
  ),

  isTyping: boolean("is_typing").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});
