"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userSettings = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const profiles_1 = require("./profiles");
exports.userSettings = (0, pg_core_1.pgTable)("user_settings", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(() => profiles_1.profiles.id, { onDelete: "cascade" })
        .unique(),
    // ===== Preferences =====
    notificationsEnabled: (0, pg_core_1.boolean)("notifications_enabled")
        .notNull()
        .default(true),
    darkModeEnabled: (0, pg_core_1.boolean)("dark_mode_enabled").notNull().default(false),
    language: (0, pg_core_1.varchar)("language", { length: 10 }).notNull().default("en"),
    // ===== Account Modes =====
    plannerModeEnabled: (0, pg_core_1.boolean)("planner_mode_enabled").notNull().default(false),
    vendorModeEnabled: (0, pg_core_1.boolean)("vendor_mode_enabled").notNull().default(false),
    // active mode: null | planner | vendor
    activeAccountMode: (0, pg_core_1.varchar)("active_account_mode", { length: 20 }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date()),
});
