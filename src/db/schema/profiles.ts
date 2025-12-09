import { InferModel } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  uuid,
  
} from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(), // supabase auth uid

  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),

  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  avatarUrl: varchar("avatar_url"),
  // Agreed To Terms
  agreedToTerms: boolean("agreed_to_terms").default(false).notNull(),
  googleId: text("google_id"),
  // Roles
  roles: text("role").array().default(["user"]), // default array with "user"
  currentRole: varchar("current_role", { length: 50 }).default("user"), // default role
  facebookId: text("facebook_id"),
  instagramId: text("instagram_id"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});



export type Profile = InferModel<typeof profiles>;
export type NewProfile = InferModel<typeof profiles, "insert">;