import { Request, Response } from "express";
import { db } from "../db";
import { events } from "../db/schema/events";
import { eventTickets } from "../db/schema/eventTickets";
import { eventPlanners } from "../db/schema/eventPlanners";
import { sql } from "drizzle-orm";

export class TrendingEventsController {
  static async getTrendingEvents(req: Request, res: Response) {
    try {
      console.log("dfsdfa");

        const limit = Number(req.query.limit) || 10;

        // Select events + planner + total tickets sold
        const trending = await db
          .select({
            id: events.id,
            name: events.name,
            category: events.category,
            eventType: events.eventType,
            imageUrl: events.imageUrl,
            location: events.location,
            type:events.eventType,
            eventDate: events.eventDate,
            plannerId: events.plannerId,
            totalTicketsSold: sql<number>`COALESCE(SUM(${eventTickets.quantity}), 0)`,
          })
          .from(events)
          .leftJoin(eventTickets, sql`${eventTickets.eventId} = ${events.id}`)
          .leftJoin(
            eventPlanners,
            sql`${eventPlanners.id} = ${events.plannerId}`
          )
          .groupBy(events.id, eventPlanners.id)
          .orderBy(sql`COALESCE(SUM(${eventTickets.quantity}), 0) DESC`)
          .limit(limit);

        res.json(trending);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
}
