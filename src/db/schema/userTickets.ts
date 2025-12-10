// src/db/schema/userTickets.ts
import { pgTable, uuid, timestamp, integer } from "drizzle-orm/pg-core";
import { profiles } from "./profiles";
import { eventTickets } from "./eventTickets";
import { sql } from "drizzle-orm";

export const userTickets = pgTable("user_tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  ticketId: uuid("ticket_id")
    .notNull()
    .references(() => eventTickets.id, { onDelete: "cascade" }),
  quantity: integer("quantity").default(1).notNull(),
  purchasedAt: timestamp("purchased_at").default(sql`NOW()`),
});
