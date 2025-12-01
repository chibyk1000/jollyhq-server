// src/controllers/ticket.controller.ts
import { Request, Response } from "express";
import { db } from "../db";
import { eventTickets } from "../db/schema/eventTickets";
import { eq } from "drizzle-orm";
import { eventDiscounts } from "../db/schema/eventDiscounts";

export class TicketController {
  /**
   * CREATE Ticket(s)
   * Accepts array or single ticket payload
   */
  static async createTicket(req: Request, res: Response) {
    try {
      const payload = req.body;
  

      const {
        eventId,
        eventType,
        ticketType,
        seatingEnabled,
        tickets,
        discountCodes,
      } = payload;

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
        price: t.price,
        ticketType,
        seatingEnabled: !!seatingEnabled,
      }));

      // Insert tickets
      const createdTickets = await db
        .insert(eventTickets)
        .values(ticketsToInsert)
        .returning();

      // Handle discount codes if provided
      let createdDiscounts = [] as any;
      if (
        discountCodes &&
        Array.isArray(discountCodes) &&
        discountCodes.length > 0
      ) {
        const discountsToInsert = discountCodes
          .filter((d: any) => d.code && d.code.trim() !== "")
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
        message: "Tickets and discounts created successfully",
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
}
