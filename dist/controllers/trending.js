"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrendingEventsController = void 0;
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
class TrendingEventsController {
    static async getTrendingEvents(req, res) {
        try {
            const limit = Number(req.query.limit) || 10;
            const trending = await db_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT 
          e.id AS "eventId",
          e.name,
          e.category,
          e.event_type AS "eventType",
          e.image_url AS "imageUrl",
          e.location,
          e.event_date AS "eventDate",
          e.event_time AS "eventTime",
          e.planner_id AS "plannerId",
          COALESCE(SUM(t.quantity), 0) AS "totalTicketsSold",
          MIN(CASE WHEN t.is_free = FALSE THEN t.price END) AS "minPrice",
          MAX(CASE WHEN t.is_free = FALSE THEN t.price END) AS "maxPrice",
          COALESCE(
            json_agg(
              json_build_object(
                'ticketId', t.id,
                'label', t.label,
                'quantity', t.quantity,
                'price', t.price,
                'isFree', t.is_free
              )
            ) FILTER (WHERE t.id IS NOT NULL),
            '[]'
          ) AS tickets
        FROM events e
        LEFT JOIN event_tickets t ON t.event_id = e.id
        GROUP BY e.id
        ORDER BY COALESCE(SUM(t.quantity), 0) DESC
        LIMIT ${limit};
      `);
            // Format priceRange in JS
            const formatted = trending.rows.map((e) => {
                const prices = e.tickets
                    .filter((t) => !t.isFree)
                    .map((t) => Number(t.price));
                return {
                    ...e,
                    priceRange: prices.length > 0
                        ? `₦${Math.min(...prices).toLocaleString()} - ₦${Math.max(...prices).toLocaleString()}`
                        : "FREE",
                };
            });
            res.json({ trending: formatted });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }
}
exports.TrendingEventsController = TrendingEventsController;
