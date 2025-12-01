"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavoriteController = void 0;
const db_1 = require("../db");
const favorites_1 = require("../db/schema/favorites");
const drizzle_orm_1 = require("drizzle-orm");
class FavoriteController {
    // Add event to favorites
    static async addFavorite(req, res) {
        const { eventId } = req.params;
        const userId = req.user?.id;
        try {
            await db_1.db
                .insert(favorites_1.favoriteEvents)
                .values({ userId: userId, eventId })
                .onConflictDoNothing();
            res.status(201).json({ message: "Event added to favorites" });
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ message: "Error adding favorite", error: err });
        }
    }
    // Remove event from favorites
    static async removeFavorite(req, res) {
        const { id } = req.params;
        const userId = req.user?.id;
        try {
            await db_1.db
                .delete(favorites_1.favoriteEvents)
                .where((0, drizzle_orm_1.eq)(favorites_1.favoriteEvents.id, id));
            res.status(200).json({ message: "Event removed from favorites" });
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ message: "Error removing favorite", error: err });
        }
    }
    // Get all favorite events of a user
    static async getFavorites(req, res) {
        const userId = req.user?.id;
        try {
            const favorites = await db_1.db
                .select()
                .from(favorites_1.favoriteEvents)
                .where((0, drizzle_orm_1.eq)(favorites_1.favoriteEvents.userId, userId));
            res.status(200).json({ favorites });
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ message: "Error fetching favorites", error: err });
        }
    }
}
exports.FavoriteController = FavoriteController;
