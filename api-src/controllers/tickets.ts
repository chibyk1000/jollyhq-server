// src/controllers/ticket.controller.ts
import { Request, Response } from "express";
import { db } from "../db";
import { eventTickets } from "../db/schema/eventTickets";
import { desc, eq, sql } from "drizzle-orm";
import { eventDiscounts } from "../db/schema/eventDiscounts";
import { userTickets } from "../db/schema/userTickets";
import { events } from "../db/schema";
import { orders } from "../db/schema/order";
import { logger } from "../utils/logger";

export class TicketController {
  /**
   * CREATE Ticket(s)
   * Accepts array or single ticket payload
   */
  static async createTicket(req: Request, res: Response) {
    try {
      const {
        eventId,

        ticketType,

        tickets,
        discountCodes,
      } = req.body;

      if (
        !eventId ||
        !tickets ||
        !Array.isArray(tickets) ||
        tickets.length === 0
      ) {
        return res
          .status(400)
          .json({ message: "Event ID and tickets are required" });
      }

      // Map tickets to include eventId and ticketType
      const ticketsToInsert = tickets.map((t: any) => ({
        eventId,
        label: t.label,
        quantity: Number(t.quantity),
        remaining: Number(t.quantity),
        price: ticketType === "free" ? 0 : t.price,
        ticketType,
        isFree: ticketType === "free",
      }));

      // Insert tickets
      const createdTickets = await db
        .insert(eventTickets)
        .values(ticketsToInsert)
        .returning();

      // Handle discount codes only if paid tickets
      let createdDiscounts: any[] = [];
      if (ticketType === "paid" && discountCodes?.length) {
        const discountsToInsert = discountCodes
          .filter((d: any) => d.code?.trim())
          .map((d: any) => ({
            eventId,
            code: d.code.trim(),
            usageLimit: Number(d.usage),
          }));

        if (discountsToInsert.length > 0) {
          createdDiscounts = await db
            .insert(eventDiscounts)
            .values(discountsToInsert)
            .returning();
        }
      }

      return res.status(201).json({
        message: "Tickets created successfully",
        tickets: createdTickets,
        discounts: createdDiscounts,
      });
    } catch (e: any) {
      logger.error("Failed to create tickets", e);
      return res.status(500).json({ error: e.message });
    }
  }

  /**
   * GET Tickets by Event ID
   */
  static async getTicketsByEvent(req: Request, res: Response) {
    try {
      const { eventId } = req.params;
      const eventIdStr = Array.isArray(eventId) ? eventId[0] : eventId;

      const result = await db
        .select()
        .from(eventTickets)
        .where(eq(eventTickets.eventId, eventIdStr));

      return res.json(result);
    } catch (e: any) {
      logger.error("Failed to fetch ticket", e);
      res.status(500).json({ error: e.message });
    }
  }

  /**
   * GET a single ticket
   */
  static async getTicket(req: Request, res: Response) {
    try {
      const { ticketId } = req.params;
      const ticketIdStr = Array.isArray(ticketId) ? ticketId[0] : ticketId;

      const [ticket] = await db
        .select()
        .from(eventTickets)
        .where(eq(eventTickets.id, ticketIdStr));

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      return res.json(ticket);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  /**
   * UPDATE Ticket
   */
  static async updateTicket(req: Request, res: Response) {
    try {
      const { ticketId } = req.params;
      const ticketIdStr = Array.isArray(ticketId) ? ticketId[0] : ticketId;

      const data = req.body;
      delete data.id; // Keep ID immutable

      const [updated] = await db
        .update(eventTickets)
        .set(data)
        .where(eq(eventTickets.id, ticketIdStr))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      return res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  /**
   * DELETE Ticket
   */
  static async deleteTicket(req: Request, res: Response) {
    try {
      const { ticketId } = req.params;
      const ticketIdStr = Array.isArray(ticketId) ? ticketId[0] : ticketId;

      const [deleted] = await db
        .delete(eventTickets)
        .where(eq(eventTickets.id, ticketIdStr))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      return res.json({ message: "Ticket deleted" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  /**
   * GET Tickets purchased by a user
   */
  static async getTicketsByUser(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Join userTickets → eventTickets → events to get ticket + event info
      const tickets = await db
        .select({
          ticketId: eventTickets.id,
          label: eventTickets.label,
          price: eventTickets.price,
          isFree: eventTickets.isFree,
          quantity: userTickets.quantity,
          purchasedAt: userTickets.purchasedAt,

          // Event details
          event: {
            eventId: events.id,
            name: events.name,
            category: events.category,
            eventType: events.eventType,
            imageUrl: events.imageUrl,
            location: events.location,
            eventDate: events.eventDate,
            eventTime: events.eventTime,
            plannerId: events.plannerId,
          },
        })
        .from(userTickets)
        .innerJoin(eventTickets, eq(userTickets.ticketId, eventTickets.id))
        .innerJoin(events, eq(eventTickets.eventId, events.id))
        .where(eq(userTickets.userId, userId))
        .orderBy(desc(userTickets.purchasedAt));

      return res.json({ tickets });
    } catch (err: any) {
      logger.error("Failed to fetch tickets by user", err);
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET all tickets
   */
  static async getAllTickets(req: Request, res: Response) {
    try {
      const tickets = await db.select().from(eventTickets);
      return res.json(tickets);
    } catch (e: any) {
      logger.error("Failed to fetch all tickets", e);
      res.status(500).json({ error: e.message });
    }
  }

  /**
   * GET tickets stats
   */
  static async getTicketsStats(req: Request, res: Response) {
    try {
      // Get total tickets quantity
      const totalTicketsResult = await db.execute(sql`
        SELECT COALESCE(SUM(CAST(quantity AS INTEGER)), 0) as total 
        FROM event_tickets
      `);
      const totalTickets = (totalTicketsResult.rows[0] as any).total || 0;

      // Get sold tickets (sum of quantities from user_tickets)
      const soldTicketsResult = await db.execute(sql`
        SELECT COALESCE(SUM(CAST(quantity AS INTEGER)), 0) as total 
        FROM user_tickets
      `);
      const soldTickets = (soldTicketsResult.rows[0] as any).total || 0;

      // Available tickets = total - sold
      const availableTickets = Math.max(0, totalTickets - soldTickets);

      // Get total revenue from orders
      const revenueResult = await db.execute(sql`
        SELECT COALESCE(SUM(CAST(total_amount AS FLOAT)), 0) as total 
        FROM orders 
        WHERE status = ${"PAID"}
      `);
      const totalRevenue = (revenueResult.rows[0] as any).total || 0;

      return res.json({
        totalTickets,
        soldTickets,
        availableTickets,
        totalRevenue,
      });
    } catch (e: any) {
      logger.error("Failed to fetch ticket stats", e);
      res.status(500).json({ error: e.message });
    }
  }
}
