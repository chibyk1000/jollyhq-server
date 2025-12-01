import { Request, Response } from "express";
import { db } from "../db";
import { favoriteEvents } from "../db/schema/favorites";
import { eq } from "drizzle-orm";

export class FavoriteController {
  // Add event to favorites
  static async addFavorite(req: Request, res: Response) {
    const { eventId } = req.params;
    const userId = req.user?.id;

    try {
      await db
        .insert(favoriteEvents)
        .values({ userId: userId as string, eventId })
        .onConflictDoNothing();

      res.status(201).json({ message: "Event added to favorites" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error adding favorite", error: err });
    }
  }

  // Remove event from favorites
  static async removeFavorite(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;

    try {
      await db
        .delete(favoriteEvents)
        .where(
          eq(favoriteEvents.id, id as string),
      
        );

      res.status(200).json({ message: "Event removed from favorites" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error removing favorite", error: err });
    }
  }

  // Get all favorite events of a user
  static async getFavorites(req: Request, res: Response) {
    const userId = req.user?.id;

    try {
      const favorites = await db
        .select()
        .from(favoriteEvents)
        .where(eq(favoriteEvents.userId, userId as string));

      res.status(200).json({ favorites });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error fetching favorites", error: err });
    }
  }
}
