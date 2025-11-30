import { InferModel, relations } from "drizzle-orm";
import { numeric, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { wallets } from "./wallet";

// ------------------- Transaction Schema -------------------
export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),

  walletId: uuid("wallet_id")
    .notNull()
    .references(() => wallets.id, { onDelete: "cascade" }),

  type: varchar("type", { length: 50 }).notNull(), // "credit" | "debit"
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  description: text("description"),

  status: varchar("status", { length: 50 }).default("pending"), // "pending", "completed", "failed"
  reference: varchar("reference", { length: 100 }), // optional tx reference/id

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

// Transaction Types
export type Transaction = InferModel<typeof transactions>;
export type NewTransaction = InferModel<typeof transactions, "insert">;

export const transactionRelations = relations(transactions, ({ one }) => ({
  wallet: one(wallets, {
    fields: [transactions.walletId],
    references: [wallets.id],
  }),
}));
