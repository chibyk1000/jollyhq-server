"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withdrawalRequestRelations = exports.withdrawalRequests = exports.withdrawalStatusEnum = void 0;
// withdrawalRequests.ts
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const wallet_1 = require("./wallet");
exports.withdrawalStatusEnum = (0, pg_core_1.pgEnum)("withdrawal_status", [
    "pending", // just submitted
    "approved", // admin approved, payout queued
    "paid", // money sent to their bank
    "rejected", // admin rejected
]);
exports.withdrawalRequests = (0, pg_core_1.pgTable)("withdrawal_requests", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    walletId: (0, pg_core_1.integer)("wallet_id")
        .references(() => wallet_1.wallets.id, { onDelete: "cascade" })
        .notNull(),
    amount: (0, pg_core_1.real)("amount").notNull(),
    status: (0, exports.withdrawalStatusEnum)("status").default("pending").notNull(),
    // where to send the money
    bankCode: (0, pg_core_1.varchar)("bank_code", { length: 20 }).notNull(),
    bankName: (0, pg_core_1.varchar)("bank_name", { length: 100 }).notNull(),
    accountNumber: (0, pg_core_1.varchar)("account_number", { length: 20 }).notNull(),
    accountName: (0, pg_core_1.varchar)("account_name", { length: 150 }).notNull(),
    // filled when paid
    payoutReference: (0, pg_core_1.varchar)("payout_reference"),
    paidAt: (0, pg_core_1.timestamp)("paid_at"),
    // filled when rejected
    rejectionReason: (0, pg_core_1.varchar)("rejection_reason", { length: 255 }),
    reviewedAt: (0, pg_core_1.timestamp)("reviewed_at"),
    reviewedBy: (0, pg_core_1.integer)("reviewed_by"), // admin user id
    narration: (0, pg_core_1.varchar)("narration", { length: 255 }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").$onUpdate(() => new Date()),
});
exports.withdrawalRequestRelations = (0, drizzle_orm_1.relations)(exports.withdrawalRequests, ({ one }) => ({
    wallet: one(wallet_1.wallets, {
        fields: [exports.withdrawalRequests.walletId],
        references: [wallet_1.wallets.id],
    }),
}));
