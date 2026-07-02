"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionRelations = exports.session = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const profiles_1 = require("./profiles");
const drizzle_orm_1 = require("drizzle-orm");
exports.session = (0, pg_core_1.pgTable)("session", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(),
    token: (0, pg_core_1.text)("token").notNull().unique(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at")
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
    ipAddress: (0, pg_core_1.text)("ip_address"),
    userAgent: (0, pg_core_1.text)("user_agent"),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(() => profiles_1.user.id, { onDelete: "cascade" }),
    impersonatedBy: (0, pg_core_1.text)("impersonated_by"),
}, (table) => [(0, pg_core_1.index)("session_userId_idx").on(table.userId)]);
exports.sessionRelations = (0, drizzle_orm_1.relations)(exports.session, ({ one }) => ({
    user: one(profiles_1.user, {
        fields: [exports.session.userId],
        references: [profiles_1.user.id],
    }),
}));
