import { pgTable, uuid, varchar, timestamp, text } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { eventPlanners } from "./eventPlanners";
import { eventTickets } from "./eventTickets";
import { eventDiscounts } from "./eventDiscounts";


export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),

  // FK → event_planners.id
  plannerId: uuid("planner_id")
    .notNull()
    .references(() => eventPlanners.id, { onDelete: "cascade" }),

  imageUrl: text("image_url"),

  eventType: varchar("event_type", { length: 50 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  name: varchar("name", { length: 150 }).notNull(),

  eventDate: timestamp("event_date", { withTimezone: false }).notNull(),
  eventTime: timestamp("event_time", { withTimezone: false }).notNull(),

  location: varchar("location", { length: 255 }),
  description: text("description"),

  createdAt: timestamp("created_at").default(sql`NOW()`),
  updatedAt: timestamp("updated_at").$onUpdate(()=>sql`NOW()`),
});

export const eventRelations = relations(events, ({ one, many }) => ({
  planner: one(eventPlanners, {
    fields: [events.plannerId],
    references: [eventPlanners.id],
  }),
  tickets: many(eventTickets),

  discounts: many(eventDiscounts),
}));
