// src/controllers/ticket.controller.ts
import { Request, Response } from "express";
import { db } from "../db";
import { eventTickets } from "../db/schema/eventTickets";
import { desc, eq } from "drizzle-orm";
import { eventDiscounts } from "../db/schema/eventDiscounts";
import { userTickets } from "../db/schema/userTickets";
import { events } from "../db/schema";

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
      console.log(e);
      return res.status(500).json({ error: e.message });
    }
  }

  /**
   * GET Tickets by Event ID
   */
  static async getTicketsByEvent(req: Request, res: Response) {
    try {
      const { eventId } = req.params;

      const result = await db
        .select()
        .from(eventTickets)
        .where(eq(eventTickets.eventId, eventId));

      return res.json(result);
    } catch (e: any) {
      console.log(e);
      res.status(500).json({ error: e.message });
    }
  }

  /**
   * GET a single ticket
   */
  static async getTicket(req: Request, res: Response) {
    try {
      const { ticketId } = req.params;

      const [ticket] = await db
        .select()
        .from(eventTickets)
        .where(eq(eventTickets.id, ticketId));

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

      const data = req.body;
      delete data.id; // Keep ID immutable

      const [updated] = await db
        .update(eventTickets)
        .set(data)
        .where(eq(eventTickets.id, ticketId))
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

      const [deleted] = await db
        .delete(eventTickets)
        .where(eq(eventTickets.id, ticketId))
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
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }
}
