import { InferModel, relations } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles } from "./profiles"; // ensure correct import path

export const eventPlanners = pgTable("event_planners", {
  id: uuid("id").defaultRandom().primaryKey(),

  profileId: varchar("profile_id", { length: 36 })
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }), // FK to base user profile

  // BASIC COMPANY INFO
  businessName: varchar("business_name", { length: 255 }).notNull(),
  businessEmail: varchar("business_email", { length: 255 }),
  businessPhone: varchar("business_phone", { length: 20 }),
  website: varchar("website", { length: 255 }),

  // Address
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }),
  postalCode: varchar("postal_code", { length: 50 }),

  // LEGAL / KYC
  bvn: varchar("bvn", { length: 20 }),
  nin: varchar("nin", { length: 20 }),

  // DOCUMENTS
  logoUrl: varchar("logo_url", { length: 500 }),
  idDocumentUrl: varchar("id_document_url", { length: 500 }),
  businessDocumentUrl: varchar("business_document_url", { length: 500 }),

  // SOCIAL LINKS
  instagram: varchar("instagram", { length: 255 }),
  facebook: varchar("facebook", { length: 255 }),
  twitter: varchar("twitter", { length: 255 }),

  // STATUS
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

// Types
export type EventPlanner = InferModel<typeof eventPlanners>;
export type NewEventPlanner = InferModel<typeof eventPlanners, "insert">;

export const eventPlannerRelations = relations(eventPlanners, ({ one }) => ({
  profile: one(profiles, {
    fields: [eventPlanners.profileId],
    references: [profiles.id],
  }),
}));
