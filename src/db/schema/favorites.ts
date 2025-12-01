// db/schema/favoriteEvents.ts
import { pgTable, uuid, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { InferModel, relations } from "drizzle-orm";
import { profiles } from "./profiles";
import { events } from "./events";

export const favoriteEvents = pgTable(
  "favorite_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => {
    // unique constraint on userId + eventId
    return {
      unique_user_event: uniqueIndex("unique_user_event").on(
        table.userId,
        table.eventId
      ),
    };
  }
);

export const favoriteEventRelations = relations(favoriteEvents, ({ one }) => ({
  user: one(profiles, {
    fields: [favoriteEvents.userId],
    references: [profiles.id],
  }),
  event: one(events, {
    fields: [favoriteEvents.eventId],
    references: [events.id],
  }),
}));

export type FavoriteEvent = InferModel<typeof favoriteEvents>;
export type NewFavoriteEvent = InferModel<typeof favoriteEvents, "insert">;
