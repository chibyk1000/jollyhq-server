"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionRelations = exports.transactions = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const wallet_1 = require("./wallet");
// ------------------- Transaction Schema -------------------
exports.transactions = (0, pg_core_1.pgTable)("transactions", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    walletId: (0, pg_core_1.uuid)("wallet_id")
        .notNull()
        .references(() => wallet_1.wallets.id, { onDelete: "cascade" }),
    type: (0, pg_core_1.varchar)("type", { length: 50 }).notNull(), // "credit" | "debit"
    amount: (0, pg_core_1.numeric)("amount", { precision: 14, scale: 2 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    status: (0, pg_core_1.varchar)("status", { length: 50 }).default("pending"), // "pending", "completed", "failed"
    reference: (0, pg_core_1.varchar)("reference", { length: 100 }), // optional tx reference/id
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").$onUpdate(() => new Date()),
});
exports.transactionRelations = (0, drizzle_orm_1.relations)(exports.transactions, ({ one }) => ({
    wallet: one(wallet_1.wallets, {
        fields: [exports.transactions.walletId],
        references: [wallet_1.wallets.id],
    }),
}));
