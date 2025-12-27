import { relations, sql } from "drizzle-orm";
import { InferModel } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  text,
} from "drizzle-orm/pg-core";

import { vendors } from "./vendors";
import { vendorServices } from "./vendorServices";
import { profiles } from "./profiles";
import { events } from "./events"; // optional but recommended

export const vendorBookings = pgTable("vendor_bookings", {
  /* ---------- IDS ---------- */
  id: uuid("id").defaultRandom().primaryKey(),

  vendorId: uuid("vendor_id")
    .references(() => vendors.id, { onDelete: "cascade" })
    .notNull(),

  serviceId: uuid("service_id").references(() => vendorServices.id, {
    onDelete: "set null",
  }),

  userId: uuid("user_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),

  eventId: uuid("event_id").references(() => events.id, {
    onDelete: "set null",
  }),

  /* ---------- BOOKING INFO ---------- */
  quantity: integer("quantity").default(1).notNull(),
  amount: integer("amount").notNull(), // total amount charged

  scheduledDate: timestamp("scheduled_date"), // when service is needed
  notes: text("notes"),

  /* ---------- STATUS ---------- */
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  // pending | accepted | completed | cancelled | rejected

  isPaid: boolean("is_paid").default(false).notNull(),
  paymentRef: varchar("payment_ref", { length: 255 }),

  /* ---------- TIMESTAMPS ---------- */
  createdAt: timestamp("created_at")
    .default(sql`NOW()`)
    .notNull(),

  updatedAt: timestamp("updated_at").$onUpdate(() => sql`CURRENT_TIMESTAMP`),

  cancelledAt: timestamp("cancelled_at"),
});


export const vendorBookingRelations = relations(vendorBookings, ({ one }) => ({
  vendor: one(vendors, {
    fields: [vendorBookings.vendorId],
    references: [vendors.id],
  }),

  service: one(vendorServices, { 
    fields: [vendorBookings.serviceId],
    references: [vendorServices.id],
  }),

  user: one(profiles, {
    fields: [vendorBookings.userId],
    references: [profiles.id],
  }),

  event: one(events, {
    fields: [vendorBookings.eventId],
    references: [events.id],
  }),
}));



export type VendorBooking = InferModel<typeof vendorBookings>;
export type NewVendorBooking = InferModel<typeof vendorBookings, "insert">;
