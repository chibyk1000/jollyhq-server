import { Request, Response } from "express";
import { db } from "../db";
import { events } from "../db/schema/events";
import { eventPlanners } from "../db/schema/eventPlanners";
import { eq, sql } from "drizzle-orm";
import { uploadToSupabase } from "../utils/upload";
import { eventTickets } from "../db/schema/eventTickets";
import { chatMembers } from "../db/schema/chatMembers";
import { chats } from "../db/schema/chats";
import { userTickets } from "../db/schema/userTickets";
import { transactions } from "../db/schema/transactions";
import { wallets } from "../db/schema/wallet";
import { logger } from "../utils/logger";

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

      if (!user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // ✅ Ensure user is an Event Planner
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

      // ✅ Upload event image (if provided)
      let imageUrl: string | null = null;
      if (req.file) {
        imageUrl = await uploadToSupabase(req.file, "events/images");
      }

      // ✅ TRANSACTION (Event + Chat + Admin Member)
      const result = await db.transaction(async (tx) => {
        // 1. Create Event
        const [newEvent] = await tx
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

        // 2. Create Chat for Event
        const [newChat] = await tx
          .insert(chats)
          .values({
            eventId: newEvent.id,
            name: `${name} Group`,
            isGroup: true,
          })
          .returning();

        // 3. Add Event Planner as Admin
        await tx.insert(chatMembers).values({
          chatId: newChat.id,
          profileId: user.id,
          role: "admin",
        });

        return { newEvent, newChat };
      });

      return res.status(201).json({
        message: "Event and group chat created successfully",
        event: result.newEvent,
        chat: result.newChat,
      });
    } catch (error: any) {
      console.error("Create Event Error:", error);
      return res.status(500).json({
        message: "Failed to create event",
        error: error.message,
      });
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
      const result = await db.execute(sql`
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
        ORDER BY e.event_date DESC;
      `);

      res.json({ result: result.rows });
    } catch (error: any) {
      console.error(error);
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

      // Get all events by this planner
      const plannerEvents = await db
        .select()
        .from(events)
        .where(eq(events.plannerId, planner.id));

      // For each event, fetch tickets
      const eventsWithTickets = await Promise.all(
        plannerEvents.map(async (event) => {
          const tickets = await db
            .select()
            .from(eventTickets)
            .where(eq(eventTickets.eventId, event.id));

          return {
            ...event,
            tickets, // attach tickets to each event
          };
        })
      );

      res.json({ events: eventsWithTickets });
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
            image: eventPlanners.logoUrl,
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
          planner: event.planner,
        },
        tickets,
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getEventOverview(req: Request, res: Response) {
    try {
      const { eventId } = req.params;
      /* ---------------- EVENT INFO ---------------- */
      const [event] = await db
        .select({
          id: events.id,
          name: events.name,
          imageUrl: events.imageUrl,
          eventDate: events.eventDate,
          eventTime: events.eventTime,
          location: events.location,
          plannerId: events.plannerId,
        })
        .from(events)
        .where(eq(events.id, eventId));
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      /* ---------------- TICKETS ---------------- */
      const tickets = await db
        .select({
          id: eventTickets.id,
          label: eventTickets.label,
          quantity: eventTickets.quantity,
          price: eventTickets.price,
          isFree: eventTickets.isFree,
        })
        .from(eventTickets)
        .where(eq(eventTickets.eventId, eventId));
      /* ---------------- SOLD TICKETS ---------------- */
      const soldTickets = await db
        .select({
          ticketId: userTickets.ticketId,
          sold: sql<number>`sum(${userTickets.quantity})`,
        })
        .from(userTickets)
        .groupBy(userTickets.ticketId);
      const soldMap = Object.fromEntries(
        soldTickets.map((t) => [t.ticketId, Number(t.sold)])
      );
      /* ---------------- TICKET PROGRESS ---------------- */
      const ticketProgress = tickets.map((t) => {
        const sold = soldMap[t.id] ?? 0;
        const total = t.quantity;
        const revenue = t.isFree ? 0 : sold * Number(t.price);

        return {
          label: t.label,
          sold,
          available: Math.max(total - sold, 0),
          total,
          revenue,
          progress: total > 0 ? sold / total : 0,
        };
      });
      /* ---------------- TICKET SUMMARY ---------------- */
      const ticketSummary = {
        confirmed: ticketProgress.reduce((a, b) => a + b.sold, 0),
        available: ticketProgress.reduce((a, b) => a + b.available, 0),
        pending: 0, // no pending concept in schema yet
        cancelled: 0, // no cancelled concept yet
      };
      /* ---------------- PAYMENTS ---------------- */
      const payments = await db
        .select({
          amount: transactions.amount,
          status: transactions.status,
        })
        .from(transactions)
        .leftJoin(wallets, eq(transactions.walletId, wallets.id))
        .where(eq(wallets.ownerId, event.plannerId));

      const totalPaid = payments
        .filter((p) => p.status === "completed")
        .reduce((a, b) => a + Number(b.amount), 0);
      const escrowHeld = payments
        .filter((p) => p.status === "pending")
        .reduce((a, b) => a + Number(b.amount), 0);
      /* ---------------- RESPONSE ---------------- */
      return res.json({
        event: {
          id: event.id,
          name: event.name,
          imageUrl: event.imageUrl,
          date: event.eventDate,
          time: event.eventTime,
          location: event.location,
          status: "Upcoming",
          revenue: totalPaid,
        },
        stats: {
          totalVendorsBooked: 0, // not in schema yet
          vendorsPending: 0,
          totalTickets: ticketSummary.confirmed,
          payments: payments.length,
        },
        ticketSummary,
        ticketProgress,
        payment: {
          totalPaid,
          escrowHeld,
          vendorBreakdown: {
            completed: payments.filter((p) => p.status === "completed").length,
            pending: payments.filter((p) => p.status === "pending").length,
            cancelled: payments.filter((p) => p.status === "failed").length,
          },
        },
      });
    } catch (error) {
      logger.error(error);
    }
  }
}
