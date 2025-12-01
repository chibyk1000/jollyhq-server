"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventPlannerRelations = exports.eventPlanners = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const profiles_1 = require("./profiles"); // ensure correct import path
const events_1 = require("./events");
exports.eventPlanners = (0, pg_core_1.pgTable)("event_planners", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    profileId: (0, pg_core_1.varchar)("profile_id", { length: 36 })
        .notNull()
        .references(() => profiles_1.profiles.id, { onDelete: "cascade" }).unique(), // FK to base user profile
    // BASIC COMPANY INFO
    businessName: (0, pg_core_1.varchar)("business_name", { length: 255 }).notNull(),
    businessEmail: (0, pg_core_1.varchar)("business_email", { length: 255 }),
    businessPhone: (0, pg_core_1.varchar)("business_phone", { length: 20 }),
    website: (0, pg_core_1.varchar)("website", { length: 255 }),
    // Address
    address: (0, pg_core_1.text)("address"),
    city: (0, pg_core_1.varchar)("city", { length: 100 }),
    state: (0, pg_core_1.varchar)("state", { length: 100 }),
    country: (0, pg_core_1.varchar)("country", { length: 100 }),
    postalCode: (0, pg_core_1.varchar)("postal_code", { length: 50 }),
    // LEGAL / KYC
    bvn: (0, pg_core_1.varchar)("bvn", { length: 20 }),
    nin: (0, pg_core_1.varchar)("nin", { length: 20 }),
    // DOCUMENTS
    logoUrl: (0, pg_core_1.varchar)("logo_url", { length: 500 }),
    idDocumentUrl: (0, pg_core_1.varchar)("id_document_url", { length: 500 }),
    businessDocumentUrl: (0, pg_core_1.varchar)("business_document_url", { length: 500 }),
    // SOCIAL LINKS
    instagram: (0, pg_core_1.varchar)("instagram", { length: 255 }),
    facebook: (0, pg_core_1.varchar)("facebook", { length: 255 }),
    twitter: (0, pg_core_1.varchar)("twitter", { length: 255 }),
    // STATUS
    isVerified: (0, pg_core_1.boolean)("is_verified").default(false),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    // Timestamps
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").$onUpdate(() => new Date()),
});
exports.eventPlannerRelations = (0, drizzle_orm_1.relations)(exports.eventPlanners, ({ one, many }) => ({
    profile: one(profiles_1.profiles, {
        fields: [exports.eventPlanners.profileId],
        references: [profiles_1.profiles.id],
    }),
    events: many(events_1.events), // 👈 EventPlanner has many events
}));
