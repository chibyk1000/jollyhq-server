"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrendingEventsController = void 0;
const db_1 = require("../db");
const events_1 = require("../db/schema/events");
const eventTickets_1 = require("../db/schema/eventTickets");
const eventPlanners_1 = require("../db/schema/eventPlanners");
const drizzle_orm_1 = require("drizzle-orm");
class TrendingEventsController {
    static async getTrendingEvents(req, res) {
        try {
            console.log("dfsdfa");
            const limit = Number(req.query.limit) || 10;
            // Select events + planner + total tickets sold
            const trending = await db_1.db
                .select({
                id: events_1.events.id,
                name: events_1.events.name,
                category: events_1.events.category,
                eventType: events_1.events.eventType,
                imageUrl: events_1.events.imageUrl,
                location: events_1.events.location,
                type: events_1.events.eventType,
                eventDate: events_1.events.eventDate,
                plannerId: events_1.events.plannerId,
                totalTicketsSold: (0, drizzle_orm_1.sql) `COALESCE(SUM(${eventTickets_1.eventTickets.quantity}), 0)`,
            })
                .from(events_1.events)
                .leftJoin(eventTickets_1.eventTickets, (0, drizzle_orm_1.sql) `${eventTickets_1.eventTickets.eventId} = ${events_1.events.id}`)
                .leftJoin(eventPlanners_1.eventPlanners, (0, drizzle_orm_1.sql) `${eventPlanners_1.eventPlanners.id} = ${events_1.events.plannerId}`)
                .groupBy(events_1.events.id, eventPlanners_1.eventPlanners.id)
                .orderBy((0, drizzle_orm_1.sql) `COALESCE(SUM(${eventTickets_1.eventTickets.quantity}), 0) DESC`)
                .limit(limit);
            res.json(trending);
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    }
}
exports.TrendingEventsController = TrendingEventsController;
