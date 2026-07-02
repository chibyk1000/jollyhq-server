"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketController = void 0;
const db_1 = require("../db");
const eventTickets_1 = require("../db/schema/eventTickets");
const drizzle_orm_1 = require("drizzle-orm");
const eventDiscounts_1 = require("../db/schema/eventDiscounts");
const userTickets_1 = require("../db/schema/userTickets");
const schema_1 = require("../db/schema");
class TicketController {
    /**
     * CREATE Ticket(s)
     * Accepts array or single ticket payload
     */
    static async createTicket(req, res) {
        try {
            const { eventId, ticketType, tickets, discountCodes, } = req.body;
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
                price: ticketType === "free" ? 0 : t.price,
                ticketType,
                isFree: ticketType === "free",
            }));
            // Insert tickets
            const createdTickets = await db_1.db
                .insert(eventTickets_1.eventTickets)
                .values(ticketsToInsert)
                .returning();
            // Handle discount codes only if paid tickets
            let createdDiscounts = [];
            if (ticketType === "paid" && discountCodes?.length) {
                const discountsToInsert = discountCodes
                    .filter((d) => d.code?.trim())
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
                message: "Tickets created successfully",
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
            const eventIdStr = Array.isArray(eventId) ? eventId[0] : eventId;
            const result = await db_1.db
                .select()
                .from(eventTickets_1.eventTickets)
                .where((0, drizzle_orm_1.eq)(eventTickets_1.eventTickets.eventId, eventIdStr));
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
            const ticketIdStr = Array.isArray(ticketId) ? ticketId[0] : ticketId;
            const [ticket] = await db_1.db
                .select()
                .from(eventTickets_1.eventTickets)
                .where((0, drizzle_orm_1.eq)(eventTickets_1.eventTickets.id, ticketIdStr));
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
            const ticketIdStr = Array.isArray(ticketId) ? ticketId[0] : ticketId;
            const data = req.body;
            delete data.id; // Keep ID immutable
            const [updated] = await db_1.db
                .update(eventTickets_1.eventTickets)
                .set(data)
                .where((0, drizzle_orm_1.eq)(eventTickets_1.eventTickets.id, ticketIdStr))
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
            const ticketIdStr = Array.isArray(ticketId) ? ticketId[0] : ticketId;
            const [deleted] = await db_1.db
                .delete(eventTickets_1.eventTickets)
                .where((0, drizzle_orm_1.eq)(eventTickets_1.eventTickets.id, ticketIdStr))
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
    /**
     * GET Tickets purchased by a user
     */
    static async getTicketsByUser(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ message: "Unauthorized" });
            // Join userTickets → eventTickets → events to get ticket + event info
            const tickets = await db_1.db
                .select({
                ticketId: eventTickets_1.eventTickets.id,
                label: eventTickets_1.eventTickets.label,
                price: eventTickets_1.eventTickets.price,
                isFree: eventTickets_1.eventTickets.isFree,
                quantity: userTickets_1.userTickets.quantity,
                purchasedAt: userTickets_1.userTickets.purchasedAt,
                // Event details
                event: {
                    eventId: schema_1.events.id,
                    name: schema_1.events.name,
                    category: schema_1.events.category,
                    eventType: schema_1.events.eventType,
                    imageUrl: schema_1.events.imageUrl,
                    location: schema_1.events.location,
                    eventDate: schema_1.events.eventDate,
                    eventTime: schema_1.events.eventTime,
                    plannerId: schema_1.events.plannerId,
                },
            })
                .from(userTickets_1.userTickets)
                .innerJoin(eventTickets_1.eventTickets, (0, drizzle_orm_1.eq)(userTickets_1.userTickets.ticketId, eventTickets_1.eventTickets.id))
                .innerJoin(schema_1.events, (0, drizzle_orm_1.eq)(eventTickets_1.eventTickets.eventId, schema_1.events.id))
                .where((0, drizzle_orm_1.eq)(userTickets_1.userTickets.userId, userId))
                .orderBy((0, drizzle_orm_1.desc)(userTickets_1.userTickets.purchasedAt));
            return res.json({ tickets });
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({ error: err.message });
        }
    }
    /**
     * GET all tickets
     */
    static async getAllTickets(req, res) {
        try {
            const tickets = await db_1.db.select().from(eventTickets_1.eventTickets);
            return res.json(tickets);
        }
        catch (e) {
            console.log(e);
            res.status(500).json({ error: e.message });
        }
    }
    /**
     * GET tickets stats
     */
    static async getTicketsStats(req, res) {
        try {
            // Get total tickets quantity
            const totalTicketsResult = await db_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT COALESCE(SUM(CAST(quantity AS INTEGER)), 0) as total 
        FROM event_tickets
      `);
            const totalTickets = totalTicketsResult.rows[0].total || 0;
            // Get sold tickets (sum of quantities from user_tickets)
            const soldTicketsResult = await db_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT COALESCE(SUM(CAST(quantity AS INTEGER)), 0) as total 
        FROM user_tickets
      `);
            const soldTickets = soldTicketsResult.rows[0].total || 0;
            // Available tickets = total - sold
            const availableTickets = Math.max(0, totalTickets - soldTickets);
            // Get total revenue from orders
            const revenueResult = await db_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT COALESCE(SUM(CAST(total_amount AS FLOAT)), 0) as total 
        FROM orders 
        WHERE status = ${"PAID"}
      `);
            const totalRevenue = revenueResult.rows[0].total || 0;
            return res.json({
                totalTickets,
                soldTickets,
                availableTickets,
                totalRevenue,
            });
        }
        catch (e) {
            console.log(e);
            res.status(500).json({ error: e.message });
        }
    }
}
exports.TicketController = TicketController;
