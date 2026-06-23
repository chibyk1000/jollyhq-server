import {
  integer,
  serial,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { events } from "./events";
import { relations, sql } from "drizzle-orm";

export const eventDiscounts = pgTable("event_discounts", {
  id: serial("id").primaryKey(),

  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),

  code: varchar("code", { length: 50 }).notNull(),

  // example: "Max 30"
  usageLimit: integer("usage_limit"),

  usedCount: integer("used_count").default(0),

  createdAt: timestamp("created_at").default(sql`now()`),
});

export const eventDiscountRelations = relations(eventDiscounts, ({ one }) => ({
  event: one(events, {
    fields: [eventDiscounts.eventId],
    references: [events.id],
  }),
}));
