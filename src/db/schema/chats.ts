import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  check,
} from "drizzle-orm/pg-core";
import { events } from "./events";
// import { userprofiles } from "./profiles";
import { relations, sql } from "drizzle-orm";
import { chatMembers } from "./chatMembers";
import { messages } from "./messages";
import { vendors } from "./vendors";

import { pgEnum } from "drizzle-orm/pg-core";
import { user } from "./profiles";

export const chatDirectTypeEnum = pgEnum("chat_direct_type", [
  "user_vendor", // regular user ↔ vendor
  "vendor_planner", // vendor ↔ event planner
]);

export const chats = pgTable(
  "chats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id").references(() => events.id, {
      onDelete: "cascade",
    }),
    vendorId: uuid("vendor_id").references(() => vendors.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id").references(() => user.id, {
      onDelete: "cascade",
    }),
    // NEW — marks this as a DM and describes who's talking
    directType: chatDirectTypeEnum("direct_type"),
    lastMessageAt: timestamp("last_message_at"),
    lastMessagePreview: varchar("last_message_preview", { length: 100 }),
    name: varchar("name", { length: 150 }),
    isGroup: boolean("is_group").default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    hasContext: check(
      "chats_has_context",
      sql`${table.eventId} IS NOT NULL OR ${table.vendorId} IS NOT NULL OR ${table.directType} IS NOT NULL`,
    ),
  }),
);


export const chatRelations = relations(chats, ({ many, one }) => ({
  members: many(chatMembers),
  messages: many(messages),
  event: one(events, {
    fields: [chats.eventId],
    references: [events.id],
  }),
  vendor: one(vendors, {
    fields: [chats.vendorId],
    references: [vendors.id],
  }),

  user: one(user, {
    fields: [chats.userId],
    references: [user.id],
  }),
}));

