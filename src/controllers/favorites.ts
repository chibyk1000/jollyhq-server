import { Request, Response } from "express";
import { db } from "../db";
import { favoriteEvents } from "../db/schema/favorites";
import { eq, and } from "drizzle-orm";
import { events } from "../db/schema";

export class FavoriteController {
  // ⭐ Toggle Favorite (Add or Remove)
  static async toggleFavorite(req: Request, res: Response) {
    const { eventId } = req.params;
    const userId = req.user?.id;

    try {
      // 1️⃣ Check if favorite exists
      const existing = await db
        .select()
        .from(favoriteEvents)
        .where(
          and(
            eq(favoriteEvents.eventId, eventId),
            eq(favoriteEvents.userId, userId as string)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // 2️⃣ Remove if exists → Unfavorite
        await db
          .delete(favoriteEvents)
          .where(eq(favoriteEvents.id, existing[0].id));

        return res.status(200).json({
          message: "Event removed from favorites",
          isFavorite: false,
        });
      }

      // 3️⃣ Insert new favorite → Favorite
      await db.insert(favoriteEvents).values({
        userId: userId as string,
        eventId,
      });
console.log("success");

      return res.status(201).json({
        message: "Event added to favorites",
        isFavorite: true,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Error toggling favorite",
        error: err,
      });
    }
  }

  // Fetch all user favorites (remains same)
  static async getFavorites(req: Request, res: Response) {
    const userId = req.user?.id;

    try {
      const favorites = await db
        .select({
          favoriteId: favoriteEvents.id,
          favoritedAt: favoriteEvents.createdAt,
          event: events,
        })
        .from(favoriteEvents)
        .innerJoin(events, eq(favoriteEvents.eventId, events.id))
        .where(eq(favoriteEvents.userId, userId as string));

      res.status(200).json({ favorites });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Error fetching favorites",
        error: err,
      });
    }
  }
}
