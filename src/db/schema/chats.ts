import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { events } from "./events";
// import { userprofiles } from "./profiles";
import { relations } from "drizzle-orm";
import { chatMembers } from "./chatMembers";
import { messages } from "./messages";
import { vendors } from "./vendors";

export const chats = pgTable("chats", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Optional event-based chat
  eventId: uuid("event_id").references(() => events.id, {
    onDelete: "cascade",
  }),

  // Optional vendor-based chat
  vendorId: uuid("vendor_id").references(() => vendors.id, {
    onDelete: "cascade",
  }),
  lastMessageAt: timestamp("last_message_at"),
  lastMessagePreview: varchar("last_message_preview", { length: 100 }),

  name: varchar("name", { length: 150 }), // Optional custom chat name
  isGroup: boolean("is_group").default(true),

  createdAt: timestamp("created_at").defaultNow(),
});


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
}));

