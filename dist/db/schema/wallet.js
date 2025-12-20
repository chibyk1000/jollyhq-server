"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wallets = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.wallets = (0, pg_core_1.pgTable)("wallets", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    // polymorphic owner
    ownerId: (0, pg_core_1.uuid)("owner_id").notNull(),
    ownerType: (0, pg_core_1.varchar)("owner_type", { length: 50 }).notNull(),
    // "user" | "vendor" | "event_planner"
    balance: (0, pg_core_1.real)("balance").default(0).notNull(),
    currency: (0, pg_core_1.varchar)("currency", { length: 10 }).default("NGN"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").$onUpdate(() => new Date()),
});
