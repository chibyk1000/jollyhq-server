"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavoriteController = void 0;
const db_1 = require("../db");
const favorites_1 = require("../db/schema/favorites");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../db/schema");
class FavoriteController {
    // ⭐ Toggle Favorite (Add or Remove)
    static async toggleFavorite(req, res) {
        const { eventId } = req.params;
        const userId = req.user?.id;
        try {
            // 1️⃣ Check if favorite exists
            const existing = await db_1.db
                .select()
                .from(favorites_1.favoriteEvents)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(favorites_1.favoriteEvents.eventId, eventId), (0, drizzle_orm_1.eq)(favorites_1.favoriteEvents.userId, userId)))
                .limit(1);
            if (existing.length > 0) {
                // 2️⃣ Remove if exists → Unfavorite
                await db_1.db
                    .delete(favorites_1.favoriteEvents)
                    .where((0, drizzle_orm_1.eq)(favorites_1.favoriteEvents.id, existing[0].id));
                return res.status(200).json({
                    message: "Event removed from favorites",
                    isFavorite: false,
                });
            }
            // 3️⃣ Insert new favorite → Favorite
            await db_1.db.insert(favorites_1.favoriteEvents).values({
                userId: userId,
                eventId,
            });
            console.log("success");
            return res.status(201).json({
                message: "Event added to favorites",
                isFavorite: true,
            });
        }
        catch (err) {
            console.error(err);
            res.status(500).json({
                message: "Error toggling favorite",
                error: err,
            });
        }
    }
    // Fetch all user favorites (remains same)
    static async getFavorites(req, res) {
        const userId = req.user?.id;
        try {
            const favorites = await db_1.db
                .select({
                favoriteId: favorites_1.favoriteEvents.id,
                favoritedAt: favorites_1.favoriteEvents.createdAt,
                event: schema_1.events,
            })
                .from(favorites_1.favoriteEvents)
                .innerJoin(schema_1.events, (0, drizzle_orm_1.eq)(favorites_1.favoriteEvents.eventId, schema_1.events.id))
                .where((0, drizzle_orm_1.eq)(favorites_1.favoriteEvents.userId, userId));
            res.status(200).json({ favorites });
        }
        catch (err) {
            console.error(err);
            res.status(500).json({
                message: "Error fetching favorites",
                error: err,
            });
        }
    }
}
exports.FavoriteController = FavoriteController;
