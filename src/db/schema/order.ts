import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  numeric,
  text,
  boolean,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { events } from "./events";
import { eventTickets } from "./eventTickets";
import { user } from "./profiles";
import { pgEnum } from "drizzle-orm/pg-core";

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "PAID",
  "FAILED",
  "CANCELLED",
]);

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),

  // FK → users.id
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // FK → events.id
  eventId: uuid("event_id")
  
    .references(() => events.id, { onDelete: "cascade" }),

  // FK → event_tickets.id
  ticketId: uuid("ticket_id")
    .references(() => eventTickets.id, { onDelete: "cascade" }),

  quantity: numeric("quantity").notNull().default("1"),

  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),

  currency: varchar("currency", { length: 10 }).default("NGN"),

  // Nomba
  orderReference: varchar("order_reference", { length: 150 })
    .notNull()
    .unique(),

  transactionId: varchar("transaction_id", { length: 150 }),

  paymentMethod: varchar("payment_method", { length: 50 }),

  status: orderStatusEnum("status").default("PENDING"), // PENDING | PAID | FAILED | CANCELLED

  isPaid: boolean("is_paid").default(false),

  paidAt: timestamp("paid_at", { mode: "date" }),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),

  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const orderRelations = relations(orders, ({ one }) => ({
  event: one(events, {
    fields: [orders.eventId],
    references: [events.id],
  }),

  ticket: one(eventTickets, {
    fields: [orders.ticketId],
    references: [eventTickets.id],
  }),

  user: one(user, {
    fields: [orders.userId],
    references: [user.id],
  }),
}));