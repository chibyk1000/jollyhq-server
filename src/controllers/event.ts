import { Request, Response } from "express";
import { db } from "../db";
import { events } from "../db/schema/events";
import { eventPlanners } from "../db/schema/eventPlanners";
import { eq } from "drizzle-orm";
import { uploadToSupabase } from "../utils/upload";
import { eventTickets } from "../db/schema/eventTickets";

export class EventController {
  // ---------------- CREATE EVENT ----------------
  static async createEvent(req: Request, res: Response) {
    try {
      const {
        eventType,
        name,
        eventDate,
        eventTime,
        location,
        description,
        category,
      } = req.body;
      const user = req.user;

      if (!user?.id) return res.status(401).json({ message: "Unauthorized" });

      const [planner] = await db
        .select()
        .from(eventPlanners)
        .where(eq(eventPlanners.profileId, user.id));

      if (!planner) {
        return res.status(403).json({
          message:
            "You must register as an event planner before creating events.",
        });
      }

      let imageUrl: string | null = null;
      if (req.file) {
        imageUrl = await uploadToSupabase(req.file, "events/images");
      }

      const [newEvent] = await db
        .insert(events)
        .values({
          plannerId: planner.id,
          imageUrl,
          eventType,
          category,
          name,
          eventDate: new Date(eventDate),
          eventTime: new Date(eventTime),
          location,
          description,
        })
        .returning();

      res
        .status(201)
        .json({ message: "Event created successfully", event: newEvent });
    } catch (error: any) {
      console.error(error);
      res
        .status(500)
        .json({ error: error.message || "Failed to create event" });
    }
  }

  // ---------------- UPDATE EVENT ----------------
  static async updateEvent(req: Request, res: Response) {
    try {
      const { eventId } = req.params;
      const updateData = req.body;

      if (req.file) {
        updateData.imageUrl = await uploadToSupabase(req.file, "events/images");
      }

      const [updated] = await db
        .update(events)
        .set(updateData)
        .where(eq(events.id, eventId))
        .returning();

      if (!updated) return res.status(404).json({ message: "Event not found" });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ---------------- GET ALL EVENTS ----------------
  static async getAllEvents(req: Request, res: Response) {
    try {
      const allEvents = await db.select().from(events);
      res.json({ events: allEvents });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ---------------- GET EVENTS BY PLANNER ----------------
  static async getEventsByPlanner(req: Request, res: Response) {
    try {
      const { plannerId } = req.params;

      const plannerExists = await db
        .select()
        .from(eventPlanners)
        .where(eq(eventPlanners.profileId, plannerId));

      if (!plannerExists.length) {
        return res.status(404).json({ message: "Event planner not found" });
      }

      const [planner] = plannerExists;
      const plannerEvents = await db
        .select()
        .from(events)
        .where(eq(events.plannerId, planner.id));

      res.json({ events: plannerEvents });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
  static async getEventById(req: Request, res: Response) {
    try {
      const { eventId } = req.params;

      if (!eventId) {
        return res.status(400).json({ message: "Event ID is required" });
      }

      // 1️⃣ Get event along with planner
      const [event] = await db
        .select({
          event: events,
          planner: {
            id: eventPlanners.id,
            profileId: eventPlanners.profileId,
            name: eventPlanners.businessName, // if you have a name column
            image:eventPlanners.logoUrl

          },
        })
        .from(events)
        .leftJoin(eventPlanners, eq(events.plannerId, eventPlanners.id))
        .where(eq(events.id, eventId));

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // 2️⃣ Get tickets for event
      const tickets = await db
        .select()
        .from(eventTickets)
        .where(eq(eventTickets.eventId, eventId));


      return res.json({
        event: {
          ...event.event,   
          planner:event.planner
        },
        tickets,
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }
}
