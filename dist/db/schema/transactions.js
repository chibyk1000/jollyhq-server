"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletTransactionRelations = exports.walletTransactions = exports.txSourceEnum = exports.txTypeEnum = void 0;
// walletTransactions.ts
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const wallet_1 = require("./wallet");
exports.txTypeEnum = (0, pg_core_1.pgEnum)("wallet_tx_type", ["credit", "debit"]);
exports.txSourceEnum = (0, pg_core_1.pgEnum)("wallet_tx_source", [
    "ticket_sale", // event planner credited when ticket sold
    "vendor_payment", // vendor credited when service paid
    "withdrawal_payout", // debit when withdrawal is approved
    "refund_reversal", // debit when a sale is reversed
]);
exports.walletTransactions = (0, pg_core_1.pgTable)("wallet_transactions", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    walletId: (0, pg_core_1.integer)("wallet_id")
        .references(() => wallet_1.wallets.id, { onDelete: "cascade" })
        .notNull(),
    type: (0, exports.txTypeEnum)("type").notNull(),
    source: (0, exports.txSourceEnum)("source").notNull(),
    amount: (0, pg_core_1.real)("amount").notNull(),
    balanceBefore: (0, pg_core_1.real)("balance_before").notNull(),
    balanceAfter: (0, pg_core_1.real)("balance_after").notNull(),
    // ties back to the order or withdrawal that caused this
    reference: (0, pg_core_1.varchar)("reference").unique().notNull(),
    narration: (0, pg_core_1.varchar)("narration", { length: 255 }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.walletTransactionRelations = (0, drizzle_orm_1.relations)(exports.walletTransactions, ({ one }) => ({
    wallet: one(wallet_1.wallets, {
        fields: [exports.walletTransactions.walletId],
        references: [wallet_1.wallets.id],
    }),
}));
