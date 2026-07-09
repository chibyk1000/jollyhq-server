// walletTransactions.ts
import { InferSelectModel, InferInsertModel, relations } from "drizzle-orm";
import {
  pgTable,
  varchar,
  timestamp,
  uuid,
  real,
  pgEnum,
} from "drizzle-orm/pg-core";
import { wallets } from "./wallet";

export const txTypeEnum = pgEnum("wallet_tx_type", ["credit", "debit"]);

export const txSourceEnum = pgEnum("wallet_tx_source", [
  "ticket_sale", // event planner credited when ticket sold
  "vendor_payment", // vendor credited when service paid
  "withdrawal_payout", // debit when withdrawal is approved
  "refund_reversal", // debit when a sale is reversed
]);

export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  walletId: uuid("wallet_id")
    .references(() => wallets.id, { onDelete: "cascade" })
    .notNull(),

  type: txTypeEnum("type").notNull(),
  source: txSourceEnum("source").notNull(),

  amount: real("amount").notNull(),
  balanceBefore: real("balance_before").notNull(),
  balanceAfter: real("balance_after").notNull(),

  // ties back to the order or withdrawal that caused this
  reference: varchar("reference").unique().notNull(),
  narration: varchar("narration", { length: 255 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WalletTransaction = InferSelectModel<typeof walletTransactions>;
export type NewWalletTransaction = InferInsertModel<typeof walletTransactions>;

export const walletTransactionRelations = relations(
  walletTransactions,
  ({ one }) => ({
    wallet: one(wallets, {
      fields: [walletTransactions.walletId],
      references: [wallets.id],
    }),
  }),
);
