import { Request, Response } from "express";
import { db } from "../db";
import { events } from "../db/schema/events";
import { eventPlanners } from "../db/schema/eventPlanners";
import { and, eq, sql } from "drizzle-orm";
import { uploadToSupabase } from "../utils/upload";
import { eventTickets } from "../db/schema/eventTickets";
import { chatMembers } from "../db/schema/chatMembers";
import { chats } from "../db/schema/chats";
import { walletTransactions } from "../db/schema/transactions";
import { wallets } from "../db/schema/wallet";
import { orders } from "../db/schema/order";
import { logger } from "../utils/logger";

export class EventController {
  // ── CREATE EVENT ──────────────────────────────────────────────────────────
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

      const result = await db.transaction(async (tx) => {
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

        const [newChat] = await tx
          .insert(chats)
          .values({
            eventId: newEvent.id,
            name: `${name} Group`,
            isGroup: true,
          })
          .returning();

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
      return res
        .status(500)
        .json({ message: "Failed to create event", error: error.message });
    }
  }

  // ── UPDATE EVENT ──────────────────────────────────────────────────────────
  static async updateEvent(req: Request, res: Response) {
    try {
      const { eventId } = req.params;
      const updateData = req.body;

      // Only the planner who owns this event may update it
      const user = req.user;
      if (!user?.id) return res.status(401).json({ message: "Unauthorized" });

      const [planner] = await db
        .select()
        .from(eventPlanners)
        .where(eq(eventPlanners.profileId, user.id));

      if (!planner) {
        return res.status(403).json({ message: "Not an event planner" });
      }

      const [existing] = await db
        .select()
        .from(events)
        .where(and(eq(events.id, eventId), eq(events.plannerId, planner.id)));

      if (!existing) {
        return res
          .status(404)
          .json({ message: "Event not found or access denied" });
      }

      if (req.file) {
        updateData.imageUrl = await uploadToSupabase(req.file, "events/images");
      }

      const [updated] = await db
        .update(events)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(events.id, eventId))
        .returning();

      return res.json({ success: true, data: updated });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ── GET ALL EVENTS ────────────────────────────────────────────────────────
  static async getAllEvents(req: Request, res: Response) {
    try {
      const result = await db.execute(sql`
        SELECT
          e.id                      AS "eventId",
          e.name,
          e.category,
          e.event_type              AS "eventType",
          e.image_url               AS "imageUrl",
          e.location,
          e.event_date              AS "eventDate",
          e.event_time              AS "eventTime",
          e.planner_id              AS "plannerId",
          COALESCE(
            json_agg(
              json_build_object(
                'ticketId', t.id,
                'label',    t.label,
                'quantity', t.quantity,
                'price',    t.price,
                'isFree',   t.is_free
              )
            ) FILTER (WHERE t.id IS NOT NULL),
            '[]'
          ) AS tickets
        FROM events e
        LEFT JOIN event_tickets t ON t.event_id = e.id
        GROUP BY e.id
        ORDER BY e.event_date DESC;
      `);

      return res.json({ success: true, data: result.rows });
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  }

  // ── GET EVENTS BY PLANNER ─────────────────────────────────────────────────
  static async getEventsByPlanner(req: Request, res: Response) {
    try {
      const { plannerId } = req.params;

      const [planner] = await db
        .select()
        .from(eventPlanners)
        .where(eq(eventPlanners.profileId, plannerId));

      if (!planner) {
        return res.status(404).json({ message: "Event planner not found" });
      }

      // Single query — no N+1
      const result = await db.execute(sql`
        SELECT
          e.id                      AS "eventId",
          e.name,
          e.category,
          e.event_type              AS "eventType",
          e.image_url               AS "imageUrl",
          e.location,
          e.event_date              AS "eventDate",
          e.event_time              AS "eventTime",
          COALESCE(
            json_agg(
              json_build_object(
                'ticketId', t.id,
                'label',    t.label,
                'quantity', t.quantity,
                'price',    t.price,
                'isFree',   t.is_free
              )
            ) FILTER (WHERE t.id IS NOT NULL),
            '[]'
          ) AS tickets
        FROM events e
        LEFT JOIN event_tickets t ON t.event_id = e.id
        WHERE e.planner_id = ${planner.id}
        GROUP BY e.id
        ORDER BY e.event_date DESC;
      `);

      return res.json({ success: true, data: result.rows });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ── GET EVENT BY ID ───────────────────────────────────────────────────────
  static async getEventById(req: Request, res: Response) {
    try {
      const { eventId } = req.params;

      if (!eventId) {
        return res.status(400).json({ message: "Event ID is required" });
      }

      const [event] = await db
        .select({
          event: events,
          planner: {
            id: eventPlanners.id,
            profileId: eventPlanners.profileId,
            name: eventPlanners.businessName,
            image: eventPlanners.logoUrl,
          },
        })
        .from(events)
        .leftJoin(eventPlanners, eq(events.plannerId, eventPlanners.id))
        .where(eq(events.id, eventId));

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const tickets = await db
        .select()
        .from(eventTickets)
        .where(eq(eventTickets.eventId, eventId));

      return res.json({
        success: true,
        data: {
          ...event.event,
          planner: event.planner,
          tickets,
        },
      });
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  }

  // ── GET EVENT OVERVIEW (planner dashboard) ────────────────────────────────
  static async getEventOverview(req: Request, res: Response) {
    try {
      const { eventId } = req.params;

      // ── Event ──────────────────────────────────────────────────────────────
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

      // ── Tickets ────────────────────────────────────────────────────────────
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

      // ── Sales via orders table ─────────────────────────────────────────────
      // Use orders (PAID status) as the source of truth for sales
      const salesResult = await db.execute(sql`
        SELECT
          o.ticket_id                       AS "ticketId",
          SUM(o.quantity::int)              AS "sold",
          SUM(o.total_amount::numeric)      AS "revenue"
        FROM orders o
        WHERE o.event_id   = ${eventId}
          AND o.status     = 'PAID'
        GROUP BY o.ticket_id
      `);

      const salesMap = Object.fromEntries(
        (salesResult.rows as any[]).map((r) => [
          r.ticketId,
          { sold: Number(r.sold), revenue: Number(r.revenue) },
        ]),
      );

      // ── Ticket progress ────────────────────────────────────────────────────
      const ticketProgress = tickets.map((t) => {
        const { sold = 0, revenue = 0 } = salesMap[t.id] ?? {};
        const total = t.quantity;

        return {
          label: t.label,
          sold,
          available: Math.max(total - sold, 0),
          total,
          revenue: t.isFree ? 0 : revenue,
          progress: total > 0 ? sold / total : 0,
        };
      });

      const ticketSummary = {
        confirmed: ticketProgress.reduce((a, b) => a + b.sold, 0),
        available: ticketProgress.reduce((a, b) => a + b.available, 0),
        pending: 0,
        cancelled: 0,
      };

      // ── Revenue from wallet transactions ───────────────────────────────────
      // Find the planner's event_planner wallet
      const plannerWallet = await db.query.wallets.findFirst({
        where: and(
          eq(wallets.userId, event.plannerId),
          eq(wallets.ownerType, "event_planner"),
        ),
      });

      const txRows = plannerWallet
        ? await db
            .select({
              amount: walletTransactions.amount,
              type: walletTransactions.type,
              source: walletTransactions.source,
            })
            .from(walletTransactions)
            .where(
              and(
                eq(walletTransactions.walletId, plannerWallet.id),
                eq(walletTransactions.source, "ticket_sale"),
              ),
            )
        : [];

      const totalRevenue = txRows
        .filter((t) => t.type === "credit")
        .reduce((a, b) => a + Number(b.amount), 0);

      // ── Order payment stats ────────────────────────────────────────────────
      const orderStats = await db.execute(sql`
        SELECT
          status,
          COUNT(*)            AS count,
          SUM(total_amount::numeric) AS total
        FROM orders
        WHERE event_id = ${eventId}
        GROUP BY status
      `);

      const statsMap = Object.fromEntries(
        (orderStats.rows as any[]).map((r) => [
          r.status,
          { count: Number(r.count), total: Number(r.total) },
        ]),
      );

      const paid = statsMap["PAID"] ?? { count: 0, total: 0 };
      const pending = statsMap["PENDING"] ?? { count: 0, total: 0 };
      const failed = statsMap["FAILED"] ?? { count: 0, total: 0 };
      const cancelled = statsMap["CANCELLED"] ?? { count: 0, total: 0 };

      // ── Response ───────────────────────────────────────────────────────────
      return res.json({
        success: true,
        data: {
          event: {
            id: event.id,
            name: event.name,
            imageUrl: event.imageUrl,
            date: event.eventDate,
            time: event.eventTime,
            location: event.location,
            status: "Upcoming",
            revenue: totalRevenue,
          },
          stats: {
            totalTicketsSold: ticketSummary.confirmed,
            totalOrders: paid.count + pending.count + failed.count,
            totalRevenue,
          },
          ticketSummary,
          ticketProgress,
          payment: {
            totalPaid: paid.total,
            totalPending: pending.total,
            orderBreakdown: {
              paid: paid.count,
              pending: pending.count,
              failed: failed.count,
              cancelled: cancelled.count,
            },
          },
        },
      });
    } catch (error: any) {
      logger.error(error);
      return res.status(500).json({ error: error.message });
    }
  }
}
