"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userTickets = void 0;
// src/db/schema/userTickets.ts
const pg_core_1 = require("drizzle-orm/pg-core");
const profiles_1 = require("./profiles");
const eventTickets_1 = require("./eventTickets");
const drizzle_orm_1 = require("drizzle-orm");
exports.userTickets = (0, pg_core_1.pgTable)("user_tickets", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(() => profiles_1.profiles.id, { onDelete: "cascade" }),
    ticketId: (0, pg_core_1.uuid)("ticket_id")
        .notNull()
        .references(() => eventTickets_1.eventTickets.id, { onDelete: "cascade" }),
    quantity: (0, pg_core_1.integer)("quantity").default(1).notNull(),
    purchasedAt: (0, pg_core_1.timestamp)("purchased_at").default((0, drizzle_orm_1.sql) `NOW()`),
});
