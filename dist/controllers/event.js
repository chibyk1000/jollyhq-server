"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventController = void 0;
const db_1 = require("../db");
const events_1 = require("../db/schema/events");
const eventPlanners_1 = require("../db/schema/eventPlanners");
const drizzle_orm_1 = require("drizzle-orm");
const upload_1 = require("../utils/upload");
const eventTickets_1 = require("../db/schema/eventTickets");
const chatMembers_1 = require("../db/schema/chatMembers");
const chats_1 = require("../db/schema/chats");
const transactions_1 = require("../db/schema/transactions");
const wallet_1 = require("../db/schema/wallet");
const logger_1 = require("../utils/logger");
class EventController {
    // ── CREATE EVENT ──────────────────────────────────────────────────────────
    static async createEvent(req, res) {
        try {
            const { eventType, name, eventDate, eventTime, location, description, category, } = req.body;
            const user = req.user;
            if (!user?.id) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const [planner] = await db_1.db
                .select()
                .from(eventPlanners_1.eventPlanners)
                .where((0, drizzle_orm_1.eq)(eventPlanners_1.eventPlanners.profileId, parseInt(user.id)));
            if (!planner) {
                return res.status(403).json({
                    message: "You must register as an event planner before creating events.",
                });
            }
            let imageUrl = null;
            if (req.file) {
                imageUrl = await (0, upload_1.uploadToSupabase)(req.file, "events/images");
            }
            const result = await db_1.db.transaction(async (tx) => {
                const [newEvent] = await tx
                    .insert(events_1.events)
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
                    .insert(chats_1.chats)
                    .values({
                    eventId: newEvent.id,
                    name: `${name} Group`,
                    isGroup: true,
                })
                    .returning();
                await tx.insert(chatMembers_1.chatMembers).values({
                    chatId: newChat.id,
                    profileId: parseInt(user.id),
                    role: "admin",
                });
                return { newEvent, newChat };
            });
            return res.status(201).json({
                message: "Event and group chat created successfully",
                event: result.newEvent,
                chat: result.newChat,
            });
        }
        catch (error) {
            console.error("Create Event Error:", error);
            return res
                .status(500)
                .json({ message: "Failed to create event", error: error.message });
        }
    }
    // ── UPDATE EVENT ──────────────────────────────────────────────────────────
    static async updateEvent(req, res) {
        try {
            const { eventId } = req.params;
            const eventIdStr = Array.isArray(eventId) ? eventId[0] : eventId;
            const updateData = req.body;
            // Only the planner who owns this event may update it
            const user = req.user;
            if (!user?.id)
                return res.status(401).json({ message: "Unauthorized" });
            const [planner] = await db_1.db
                .select()
                .from(eventPlanners_1.eventPlanners)
                .where((0, drizzle_orm_1.eq)(eventPlanners_1.eventPlanners.profileId, parseInt(user.id)));
            if (!planner) {
                return res.status(403).json({ message: "Not an event planner" });
            }
            const [existing] = await db_1.db
                .select()
                .from(events_1.events)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(events_1.events.id, parseInt(eventIdStr)), (0, drizzle_orm_1.eq)(events_1.events.plannerId, planner.id)));
            if (!existing) {
                return res
                    .status(404)
                    .json({ message: "Event not found or access denied" });
            }
            if (req.file) {
                updateData.imageUrl = await (0, upload_1.uploadToSupabase)(req.file, "events/images");
            }
            const [updated] = await db_1.db
                .update(events_1.events)
                .set({ ...updateData, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(events_1.events.id, parseInt(eventIdStr)))
                .returning();
            return res.json({ success: true, data: updated });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    // ── GET ALL EVENTS ────────────────────────────────────────────────────────
    static async getAllEvents(req, res) {
        try {
            const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
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
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        }
    }
    // ── GET EVENTS BY PLANNER ─────────────────────────────────────────────────
    static async getEventsByPlanner(req, res) {
        try {
            const { plannerId } = req.params;
            const plannerIdStr = Array.isArray(plannerId) ? plannerId[0] : plannerId;
            const [planner] = await db_1.db
                .select()
                .from(eventPlanners_1.eventPlanners)
                .where((0, drizzle_orm_1.eq)(eventPlanners_1.eventPlanners.profileId, parseInt(plannerIdStr)));
            if (!planner) {
                return res.status(404).json({ message: "Event planner not found" });
            }
            // Single query — no N+1
            const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
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
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    // ── GET EVENT BY ID ───────────────────────────────────────────────────────
    static async getEventById(req, res) {
        try {
            const { eventId } = req.params;
            const eventIdStr = Array.isArray(eventId) ? eventId[0] : eventId;
            if (!eventId) {
                return res.status(400).json({ message: "Event ID is required" });
            }
            const [event] = await db_1.db
                .select({
                event: events_1.events,
                planner: {
                    id: eventPlanners_1.eventPlanners.id,
                    profileId: eventPlanners_1.eventPlanners.profileId,
                    name: eventPlanners_1.eventPlanners.businessName,
                    image: eventPlanners_1.eventPlanners.logoUrl,
                },
            })
                .from(events_1.events)
                .leftJoin(eventPlanners_1.eventPlanners, (0, drizzle_orm_1.eq)(events_1.events.plannerId, eventPlanners_1.eventPlanners.id))
                .where((0, drizzle_orm_1.eq)(events_1.events.id, parseInt(eventIdStr)));
            if (!event) {
                return res.status(404).json({ message: "Event not found" });
            }
            const tickets = await db_1.db
                .select()
                .from(eventTickets_1.eventTickets)
                .where((0, drizzle_orm_1.eq)(eventTickets_1.eventTickets.eventId, parseInt(eventIdStr)));
            return res.json({
                success: true,
                data: {
                    ...event.event,
                    planner: event.planner,
                    tickets,
                },
            });
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        }
    }
    // ── GET EVENT OVERVIEW (planner dashboard) ────────────────────────────────
    static async getEventOverview(req, res) {
        try {
            const { eventId } = req.params;
            const eventIdStr = Array.isArray(eventId) ? eventId[0] : eventId;
            // ── Event ──────────────────────────────────────────────────────────────
            const [event] = await db_1.db
                .select({
                id: events_1.events.id,
                name: events_1.events.name,
                imageUrl: events_1.events.imageUrl,
                eventDate: events_1.events.eventDate,
                eventTime: events_1.events.eventTime,
                location: events_1.events.location,
                plannerId: events_1.events.plannerId,
            })
                .from(events_1.events)
                .where((0, drizzle_orm_1.eq)(events_1.events.id, parseInt(eventIdStr)));
            if (!event) {
                return res.status(404).json({ message: "Event not found" });
            }
            // ── Tickets ────────────────────────────────────────────────────────────
            const tickets = await db_1.db
                .select({
                id: eventTickets_1.eventTickets.id,
                label: eventTickets_1.eventTickets.label,
                quantity: eventTickets_1.eventTickets.quantity,
                price: eventTickets_1.eventTickets.price,
                isFree: eventTickets_1.eventTickets.isFree,
            })
                .from(eventTickets_1.eventTickets)
                .where((0, drizzle_orm_1.eq)(eventTickets_1.eventTickets.eventId, parseInt(eventIdStr)));
            // ── Sales via orders table ─────────────────────────────────────────────
            // Use orders (PAID status) as the source of truth for sales
            const salesResult = await db_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT
          o.ticket_id                       AS "ticketId",
          SUM(o.quantity::int)              AS "sold",
          SUM(o.total_amount::numeric)      AS "revenue"
        FROM orders o
        WHERE o.event_id   = ${parseInt(eventIdStr)}
          AND o.status     = 'PAID'
        GROUP BY o.ticket_id
      `);
            const salesMap = Object.fromEntries(salesResult.rows.map((r) => [
                r.ticketId,
                { sold: Number(r.sold), revenue: Number(r.revenue) },
            ]));
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
            const plannerWallet = await db_1.db.query.wallets.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(wallet_1.wallets.userId, event.plannerId), (0, drizzle_orm_1.eq)(wallet_1.wallets.ownerType, "event_planner")),
            });
            const txRows = plannerWallet
                ? await db_1.db
                    .select({
                    amount: transactions_1.walletTransactions.amount,
                    type: transactions_1.walletTransactions.type,
                    source: transactions_1.walletTransactions.source,
                })
                    .from(transactions_1.walletTransactions)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(transactions_1.walletTransactions.walletId, plannerWallet.id), (0, drizzle_orm_1.eq)(transactions_1.walletTransactions.source, "ticket_sale")))
                : [];
            const totalRevenue = txRows
                .filter((t) => t.type === "credit")
                .reduce((a, b) => a + Number(b.amount), 0);
            // ── Order payment stats ────────────────────────────────────────────────
            const orderStats = await db_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT
          status,
          COUNT(*)            AS count,
          SUM(total_amount::numeric) AS total
        FROM orders
        WHERE event_id = ${parseInt(eventIdStr)}
        GROUP BY status
      `);
            const statsMap = Object.fromEntries(orderStats.rows.map((r) => [
                r.status,
                { count: Number(r.count), total: Number(r.total) },
            ]));
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
        }
        catch (error) {
            logger_1.logger.error(error);
            return res.status(500).json({ error: error.message });
        }
    }
}
exports.EventController = EventController;
