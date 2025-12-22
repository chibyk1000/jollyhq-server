
import {
  pgTable,
  uuid,
  boolean,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import { profiles } from "./profiles";


export const userSettings = pgTable("user_settings", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" })
    .unique(),

  // ===== Preferences =====
  notificationsEnabled: boolean("notifications_enabled")
    .notNull()
    .default(true),

  darkModeEnabled: boolean("dark_mode_enabled").notNull().default(false),

  language: varchar("language", { length: 10 }).notNull().default("en"),

  // ===== Account Modes =====
  plannerModeEnabled: boolean("planner_mode_enabled").notNull().default(false),

  vendorModeEnabled: boolean("vendor_mode_enabled").notNull().default(false),
  hasSeenOnboarding: boolean("has_seen_onboarding").default(false),

  // active mode: null | planner | vendor
  activeAccountMode: varchar("active_account_mode", { length: 20 }),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
    .defaultNow() 
    .$onUpdate(() => new Date()),
});
