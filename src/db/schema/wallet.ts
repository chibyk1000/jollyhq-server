import { InferModel, relations } from "drizzle-orm";
import {
  pgTable,
  varchar,
  timestamp,
  boolean,
  uuid,
  real,
} from "drizzle-orm/pg-core";
import { user as  profiles } from "./profiles";

export const wallets = pgTable("wallets", {
  id: uuid("id").defaultRandom().primaryKey(),

  // polymorphic owner
userId: uuid("user_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),

accountId:varchar("account_id"),
  balance: real("balance").default(0).notNull(),
  currency: varchar("currency", { length: 10 }).default("NGN"),

  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

// Types
export type Wallet = InferModel<typeof wallets>;
export type NewWallet = InferModel<typeof wallets, "insert">;

