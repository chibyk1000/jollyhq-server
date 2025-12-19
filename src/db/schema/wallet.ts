import { InferModel, relations } from "drizzle-orm";
import {
  pgTable,
  varchar,
  timestamp,
  boolean,
  uuid,
  real,
} from "drizzle-orm/pg-core";

export const wallets = pgTable("wallets", {
  id: uuid("id").defaultRandom().primaryKey(),

  // polymorphic owner
  ownerId: uuid("owner_id").notNull(),
  ownerType: varchar("owner_type", { length: 50 }).notNull(),
  // "user" | "vendor" | "event_planner"

  balance: real("balance").default(0).notNull(),
  currency: varchar("currency", { length: 10 }).default("NGN"),

  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

// Types
export type Wallet = InferModel<typeof wallets>;
export type NewWallet = InferModel<typeof wallets, "insert">;

