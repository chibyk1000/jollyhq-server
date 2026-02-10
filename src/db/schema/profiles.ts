import { InferModel, relations } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { wallets } from "./wallet";
import { session } from "./sessions";
import { account } from "./account";

/* =========================
   USER TABLE
========================= */

export const user = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Auth-required
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 100 }).unique(),
  displayUsername: varchar("display_username", { length: 100 }).unique(),

  password: text("password"),
  lastLoginMethod: varchar("last_login_method"),
  // Profile
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phoneNumber: varchar("phone", { length: 20 }),
  image: text("image"),
  // Verification
  emailVerified: boolean("email_verified").default(false).notNull(),
  phoneNumberVerified: boolean("phone_verified").default(false).notNull(),

  // OAuth
  googleId: text("google_id"),
  facebookId: text("facebook_id"),
  instagramId: text("instagram_id"),

  // Roles

  // Legal
  agreedToTerms: boolean("agreed_to_terms").default(false).notNull(),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
  deletedAt: timestamp("deleted_at"),
});

/* =========================
   TYPES
========================= */

export type User = InferModel<typeof user>;
export type NewUser = InferModel<typeof user, "insert">;

/* =========================
   USER RELATIONS
========================= */

export const userRelations = relations(user, ({ one, many }) => ({
  wallet: one(wallets, {
    fields: [user.id],
    references: [wallets.userId],
  }),
  sessions: many(session),
  accounts: many(account),
}));
