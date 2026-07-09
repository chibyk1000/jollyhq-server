import { InferSelectModel, InferInsertModel, relations } from "drizzle-orm";
import {
  pgTable,
  varchar,
  timestamp,
  boolean,
  uuid,
  real,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user as profiles } from "./profiles";
import { walletTransactions } from "./transactions";
import { withdrawalRequests } from "./withdrawalRequests";

export const walletOwnerTypeEnum = pgEnum("wallet_owner_type", [
  "event_planner",
  "vendor",
]);

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => profiles.id, { onDelete: "cascade" })
      .notNull(),

    // one wallet per role per user
    // e.g. same user can have event_planner + vendor wallet
    // but NOT two event_planner wallets
    ownerType: walletOwnerTypeEnum("owner_type").default("event_planner"),

    balance: real("balance").default(0).notNull(),
    currency: varchar("currency", { length: 10 }).default("NGN").notNull(),
    isActive: boolean("is_active").default(true).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (table) => ({
    // composite unique: one wallet per (user, role) pair
    uniqueUserRole: uniqueIndex("wallets_user_id_owner_type_unique").on(
      table.userId,
      table.ownerType,
    ),
  }),
);

export type Wallet = InferSelectModel<typeof wallets>;
export type NewWallet = InferInsertModel<typeof wallets>;

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(profiles, {
    fields: [wallets.userId],
    references: [profiles.id],
  }),
  transactions: many(walletTransactions),
  withdrawals: many(withdrawalRequests),
}));
