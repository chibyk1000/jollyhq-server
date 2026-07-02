"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletsRelations = exports.wallets = exports.walletOwnerTypeEnum = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const profiles_1 = require("./profiles");
const transactions_1 = require("./transactions");
const withdrawalRequests_1 = require("./withdrawalRequests");
exports.walletOwnerTypeEnum = (0, pg_core_1.pgEnum)("wallet_owner_type", [
    "event_planner",
    "vendor",
]);
exports.wallets = (0, pg_core_1.pgTable)("wallets", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id")
        .references(() => profiles_1.user.id, { onDelete: "cascade" })
        .notNull(),
    // one wallet per role per user
    // e.g. same user can have event_planner + vendor wallet
    // but NOT two event_planner wallets
    ownerType: (0, exports.walletOwnerTypeEnum)("owner_type").default("event_planner"),
    balance: (0, pg_core_1.real)("balance").default(0).notNull(),
    currency: (0, pg_core_1.varchar)("currency", { length: 10 }).default("NGN").notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").$onUpdate(() => new Date()),
}, (table) => ({
    // composite unique: one wallet per (user, role) pair
    uniqueUserRole: (0, pg_core_1.uniqueIndex)("wallets_user_id_owner_type_unique").on(table.userId, table.ownerType),
}));
exports.walletsRelations = (0, drizzle_orm_1.relations)(exports.wallets, ({ one, many }) => ({
    user: one(profiles_1.user, {
        fields: [exports.wallets.userId],
        references: [profiles_1.user.id],
    }),
    transactions: many(transactions_1.walletTransactions),
    withdrawals: many(withdrawalRequests_1.withdrawalRequests),
}));
