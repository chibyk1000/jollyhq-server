import { pgTable, uuid, timestamp, varchar } from "drizzle-orm/pg-core";
import { messages } from "./messages";
import { profiles } from "./profiles";

export const messageReads = pgTable("message_reads", {
  id: uuid("id").defaultRandom().primaryKey(),

  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),

  profileId: uuid("profile_id", )
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),

  readAt: timestamp("read_at").defaultNow(),
});
