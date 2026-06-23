"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRelations = exports.user = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const wallet_1 = require("./wallet");
const sessions_1 = require("./sessions");
const account_1 = require("./account");
const chats_1 = require("./chats");
/* =========================
   USER TABLE
========================= */
exports.user = (0, pg_core_1.pgTable)("user", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    // Auth-required
    email: (0, pg_core_1.varchar)("email", { length: 255 }).notNull().unique(),
    username: (0, pg_core_1.varchar)("username", { length: 100 }).unique(),
    displayUsername: (0, pg_core_1.varchar)("display_username", { length: 100 }).unique(),
    password: (0, pg_core_1.text)("password"),
    lastLoginMethod: (0, pg_core_1.varchar)("last_login_method"),
    // Profile
    firstName: (0, pg_core_1.varchar)("first_name", { length: 100 }).notNull(),
    lastName: (0, pg_core_1.varchar)("last_name", { length: 100 }).notNull(),
    phoneNumber: (0, pg_core_1.varchar)("phone", { length: 20 }),
    image: (0, pg_core_1.text)("image"),
    // Verification
    emailVerified: (0, pg_core_1.boolean)("email_verified").default(false).notNull(),
    phoneNumberVerified: (0, pg_core_1.boolean)("phone_verified").default(false).notNull(),
    // OAuth
    googleId: (0, pg_core_1.text)("google_id"),
    facebookId: (0, pg_core_1.text)("facebook_id"),
    instagramId: (0, pg_core_1.text)("instagram_id"),
    // Roles
    // Legal
    agreedToTerms: (0, pg_core_1.boolean)("agreed_to_terms").default(false).notNull(),
    // Timestamps
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at")
        .$onUpdate(() => new Date())
        .notNull(),
    deletedAt: (0, pg_core_1.timestamp)("deleted_at"),
    role: (0, pg_core_1.text)("role"),
    banned: (0, pg_core_1.boolean)("banned").default(false),
    banReason: (0, pg_core_1.text)("ban_reason"),
    banExpires: (0, pg_core_1.timestamp)("ban_expires"),
});
/* =========================
   USER RELATIONS
========================= */
exports.userRelations = (0, drizzle_orm_1.relations)(exports.user, ({ one, many }) => ({
    wallet: one(wallet_1.wallets, {
        fields: [exports.user.id],
        references: [wallet_1.wallets.userId],
    }),
    sessions: many(sessions_1.session),
    accounts: many(account_1.account),
    chats: many(chats_1.chats),
}));
