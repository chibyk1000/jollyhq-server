// src/db/schema/userTickets.ts
import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { user as profiles } from "./profiles";
import { eventTickets } from "./eventTickets";
import { sql } from "drizzle-orm";

export const userTickets = pgTable("user_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  ticketId: integer("ticket_id")
    .notNull()
    .references(() => eventTickets.id, { onDelete: "cascade" }),
  quantity: integer("quantity").default(1).notNull(),
  purchasedAt: timestamp("purchased_at").default(sql`NOW()`),
});
