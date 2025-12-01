import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { events } from "./events";
import { relations, sql } from "drizzle-orm";

export const eventTickets = pgTable("event_tickets", {
  id: uuid("id").defaultRandom().primaryKey(),

  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),

  // User free labels (VIP, Balcony, Regular)
  label: varchar("label", { length: 100 }).notNull(),

  // total available
  quantity: integer("quantity").notNull(),

  // numeric pricing (0 for FREE)
  price: numeric("price", { precision: 12, scale: 2 }).default("0").notNull(),

  // UI radio "paid" | "free"
  isFree: boolean("is_free").default(false),

  createdAt: timestamp("created_at").default(sql`now()`),
});

export const eventTicketRelations = relations(eventTickets, ({ one }) => ({
  event: one(events, {
    fields: [eventTickets.eventId],
    references: [events.id],
  }),
}));
