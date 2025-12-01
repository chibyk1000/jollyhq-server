import { InferModel, relations } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  uuid,
  numeric,
  real,
} from "drizzle-orm/pg-core";
import { eventPlanners } from "./eventPlanners"; // your existing schema

// ------------------- Wallet Schema -------------------
export const wallets = pgTable("wallets", {
  id: uuid("id").defaultRandom().primaryKey(),

  eventPlannerId: uuid("event_planner_id")
    .notNull()
    .references(() => eventPlanners.id, { onDelete: "cascade" }),

  balance: real("balance").default(0.0), // e.g., NGN 0.00
  currency: varchar("currency", { length: 10 }).default("NGN"), // optional if supporting multiple currencies

  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

// Wallet Types
export type Wallet = InferModel<typeof wallets>;
export type NewWallet = InferModel<typeof wallets, "insert">;

export const walletRelations = relations(wallets, ({ one }) => ({
  eventPlanner: one(eventPlanners, {
    fields: [wallets.eventPlannerId],
    references: [eventPlanners.id],
  }),
}));
