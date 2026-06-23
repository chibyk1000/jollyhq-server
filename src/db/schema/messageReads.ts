import { pgTable, serial, integer, timestamp, varchar, index } from "drizzle-orm/pg-core";
import { messages } from "./messages";
import { user as profiles } from "./profiles";

export const messageReads = pgTable(
  "message_reads",
  {
    id: serial("id").primaryKey(),

    messageId: integer("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),

    profileId: integer("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),

    readAt: timestamp("read_at").defaultNow(),
  },
  (table) => ({
    messageIdx: index("message_reads_message_id_idx").on(table.messageId),
    profileIdx: index("message_reads_profile_id_idx").on(table.profileId),
  }),
);
