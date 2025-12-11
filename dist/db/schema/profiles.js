"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profiles = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.profiles = (0, pg_core_1.pgTable)("profiles", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(), // supabase auth uid
    firstName: (0, pg_core_1.varchar)("first_name", { length: 100 }).notNull(),
    lastName: (0, pg_core_1.varchar)("last_name", { length: 100 }).notNull(),
    email: (0, pg_core_1.varchar)("email", { length: 255 }).notNull().unique(),
    username: (0, pg_core_1.varchar)("username", { length: 100 }).notNull().unique(),
    phone: (0, pg_core_1.varchar)("phone", { length: 20 }),
    avatarUrl: (0, pg_core_1.varchar)("avatar_url"),
    // Agreed To Terms
    agreedToTerms: (0, pg_core_1.boolean)("agreed_to_terms").default(false).notNull(),
    googleId: (0, pg_core_1.text)("google_id"),
    // Roles
    roles: (0, pg_core_1.text)("role").array().default(["user"]), // default array with "user"
    currentRole: (0, pg_core_1.varchar)("current_role", { length: 50 }).default("user"), // default role
    facebookId: (0, pg_core_1.text)("facebook_id"),
    instagramId: (0, pg_core_1.text)("instagram_id"),
    // Timestamps
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").$onUpdate(() => new Date()),
});
