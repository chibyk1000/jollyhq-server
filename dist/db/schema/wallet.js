"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletRelations = exports.wallets = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const eventPlanners_1 = require("./eventPlanners"); // your existing schema
// ------------------- Wallet Schema -------------------
exports.wallets = (0, pg_core_1.pgTable)("wallets", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    eventPlannerId: (0, pg_core_1.uuid)("event_planner_id")
        .notNull()
        .references(() => eventPlanners_1.eventPlanners.id, { onDelete: "cascade" }),
    balance: (0, pg_core_1.real)("balance").default(0.0), // e.g., NGN 0.00
    currency: (0, pg_core_1.varchar)("currency", { length: 10 }).default("NGN"), // optional if supporting multiple currencies
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").$onUpdate(() => new Date()),
});
exports.walletRelations = (0, drizzle_orm_1.relations)(exports.wallets, ({ one }) => ({
    eventPlanner: one(eventPlanners_1.eventPlanners, {
        fields: [exports.wallets.eventPlannerId],
        references: [eventPlanners_1.eventPlanners.id],
    }),
}));
