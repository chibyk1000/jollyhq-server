"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketController = void 0;
const db_1 = require("../db");
const eventTickets_1 = require("../db/schema/eventTickets");
const drizzle_orm_1 = require("drizzle-orm");
const eventDiscounts_1 = require("../db/schema/eventDiscounts");
class TicketController {
    /**
     * CREATE Ticket(s)
     * Accepts array or single ticket payload
     */
    static async createTicket(req, res) {
        try {
            const payload = req.body;
            const { eventId, eventType, ticketType, seatingEnabled, tickets, discountCodes, } = payload;
            if (!eventId ||
                !tickets ||
                !Array.isArray(tickets) ||
                tickets.length === 0) {
                return res
                    .status(400)
                    .json({ message: "Event ID and tickets are required" });
            }
            // Map tickets to include eventId and ticketType
            const ticketsToInsert = tickets.map((t) => ({
                eventId,
                label: t.label,
                quantity: Number(t.quantity),
                remaining: Number(t.quantity),
                price: t.price,
                ticketType,
                seatingEnabled: !!seatingEnabled,
            }));
            // Insert tickets
            const createdTickets = await db_1.db
                .insert(eventTickets_1.eventTickets)
                .values(ticketsToInsert)
                .returning();
            // Handle discount codes if provided
            let createdDiscounts = [];
            if (discountCodes &&
                Array.isArray(discountCodes) &&
                discountCodes.length > 0) {
                const discountsToInsert = discountCodes
                    .filter((d) => d.code && d.code.trim() !== "")
                    .map((d) => ({
                    eventId,
                    code: d.code.trim(),
                    usageLimit: Number(d.usage),
                }));
                if (discountsToInsert.length > 0) {
                    createdDiscounts = await db_1.db
                        .insert(eventDiscounts_1.eventDiscounts)
                        .values(discountsToInsert)
                        .returning();
                }
            }
            return res.status(201).json({
                message: "Tickets and discounts created successfully",
                tickets: createdTickets,
                discounts: createdDiscounts,
            });
        }
        catch (e) {
            console.log(e);
            return res.status(500).json({ error: e.message });
        }
    }
    /**
     * GET Tickets by Event ID
     */
    static async getTicketsByEvent(req, res) {
        try {
            const { eventId } = req.params;
            const result = await db_1.db
                .select()
                .from(eventTickets_1.eventTickets)
                .where((0, drizzle_orm_1.eq)(eventTickets_1.eventTickets.eventId, eventId));
            return res.json(result);
        }
        catch (e) {
            console.log(e);
            res.status(500).json({ error: e.message });
        }
    }
    /**
     * GET a single ticket
     */
    static async getTicket(req, res) {
        try {
            const { ticketId } = req.params;
            const [ticket] = await db_1.db
                .select()
                .from(eventTickets_1.eventTickets)
                .where((0, drizzle_orm_1.eq)(eventTickets_1.eventTickets.id, ticketId));
            if (!ticket) {
                return res.status(404).json({ message: "Ticket not found" });
            }
            return res.json(ticket);
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
    /**
     * UPDATE Ticket
     */
    static async updateTicket(req, res) {
        try {
            const { ticketId } = req.params;
            const data = req.body;
            delete data.id; // Keep ID immutable
            const [updated] = await db_1.db
                .update(eventTickets_1.eventTickets)
                .set(data)
                .where((0, drizzle_orm_1.eq)(eventTickets_1.eventTickets.id, ticketId))
                .returning();
            if (!updated) {
                return res.status(404).json({ message: "Ticket not found" });
            }
            return res.json(updated);
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
    /**
     * DELETE Ticket
     */
    static async deleteTicket(req, res) {
        try {
            const { ticketId } = req.params;
            const [deleted] = await db_1.db
                .delete(eventTickets_1.eventTickets)
                .where((0, drizzle_orm_1.eq)(eventTickets_1.eventTickets.id, ticketId))
                .returning();
            if (!deleted) {
                return res.status(404).json({ message: "Ticket not found" });
            }
            return res.json({ message: "Ticket deleted" });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
}
exports.TicketController = TicketController;
