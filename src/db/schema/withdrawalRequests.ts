// withdrawalRequests.ts
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

export const withdrawalStatusEnum = pgEnum("withdrawal_status", [
  "pending", // just submitted
  "approved", // admin approved, payout queued
  "paid", // money sent to their bank
  "rejected", // admin rejected
]);

export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  walletId: uuid("wallet_id")
    .references(() => wallets.id, { onDelete: "cascade" })
    .notNull(),

  amount: real("amount").notNull(),
  status: withdrawalStatusEnum("status").default("pending").notNull(),

  // where to send the money
  bankCode: varchar("bank_code", { length: 20 }).notNull(),
  bankName: varchar("bank_name", { length: 100 }).notNull(),
  accountNumber: varchar("account_number", { length: 20 }).notNull(),
  accountName: varchar("account_name", { length: 150 }).notNull(),

  // filled when paid
  payoutReference: varchar("payout_reference"),
  paidAt: timestamp("paid_at"),

  // filled when rejected
  rejectionReason: varchar("rejection_reason", { length: 255 }),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: uuid("reviewed_by"), // admin user id

  narration: varchar("narration", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

export type WithdrawalRequest = InferSelectModel<typeof withdrawalRequests>;
export type NewWithdrawalRequest = InferInsertModel<typeof withdrawalRequests>;

export const withdrawalRequestRelations = relations(
  withdrawalRequests,
  ({ one }) => ({
    wallet: one(wallets, {
      fields: [withdrawalRequests.walletId],
      references: [wallets.id],
    }),
  }),
);
