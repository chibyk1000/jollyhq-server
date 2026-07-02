"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountRelations = exports.account = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const profiles_1 = require("./profiles");
exports.account = (0, pg_core_1.pgTable)("account", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    accountId: (0, pg_core_1.text)("account_id").notNull(),
    providerId: (0, pg_core_1.text)("provider_id").notNull(),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(() => profiles_1.user.id, { onDelete: "cascade" }),
    accessToken: (0, pg_core_1.text)("access_token"),
    refreshToken: (0, pg_core_1.text)("refresh_token"),
    idToken: (0, pg_core_1.text)("id_token"),
    accessTokenExpiresAt: (0, pg_core_1.timestamp)("access_token_expires_at"),
    refreshTokenExpiresAt: (0, pg_core_1.timestamp)("refresh_token_expires_at"),
    scope: (0, pg_core_1.text)("scope"),
    password: (0, pg_core_1.text)("password"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at")
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
}, (table) => [(0, pg_core_1.index)("account_userId_idx").on(table.userId)]);
exports.accountRelations = (0, drizzle_orm_1.relations)(exports.account, ({ one }) => ({
    user: one(profiles_1.user, {
        fields: [exports.account.userId],
        references: [profiles_1.user.id],
    }),
}));
