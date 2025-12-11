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
class EventController {
    // ---------------- CREATE EVENT ----------------
    static async createEvent(req, res) {
        try {
            const { eventType, name, eventDate, eventTime, location, description, category, } = req.body;
            const user = req.user;
            if (!user?.id) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            // ✅ Ensure user is an Event Planner
            const [planner] = await db_1.db
                .select()
                .from(eventPlanners_1.eventPlanners)
                .where((0, drizzle_orm_1.eq)(eventPlanners_1.eventPlanners.profileId, user.id));
            if (!planner) {
                return res.status(403).json({
                    message: "You must register as an event planner before creating events.",
                });
            }
            // ✅ Upload event image (if provided)
            let imageUrl = null;
            if (req.file) {
                imageUrl = await (0, upload_1.uploadToSupabase)(req.file, "events/images");
            }
            // ✅ TRANSACTION (Event + Chat + Admin Member)
            const result = await db_1.db.transaction(async (tx) => {
                // 1. Create Event
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
                // 2. Create Chat for Event
                const [newChat] = await tx
                    .insert(chats_1.chats)
                    .values({
                    eventId: newEvent.id,
                    name: `${name} Group`,
                    isGroup: true,
                })
                    .returning();
                // 3. Add Event Planner as Admin
                await tx.insert(chatMembers_1.chatMembers).values({
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
        }
        catch (error) {
            console.error("Create Event Error:", error);
            return res.status(500).json({
                message: "Failed to create event",
                error: error.message,
            });
        }
    }
    // ---------------- UPDATE EVENT ----------------
    static async updateEvent(req, res) {
        try {
            const { eventId } = req.params;
            const updateData = req.body;
            if (req.file) {
                updateData.imageUrl = await (0, upload_1.uploadToSupabase)(req.file, "events/images");
            }
            const [updated] = await db_1.db
                .update(events_1.events)
                .set(updateData)
                .where((0, drizzle_orm_1.eq)(events_1.events.id, eventId))
                .returning();
            if (!updated)
                return res.status(404).json({ message: "Event not found" });
            res.json(updated);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    // ---------------- GET ALL EVENTS ----------------
    static async getAllEvents(req, res) {
        try {
            const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
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
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }
    // ---------------- GET EVENTS BY PLANNER ----------------
    static async getEventsByPlanner(req, res) {
        try {
            const { plannerId } = req.params;
            const plannerExists = await db_1.db
                .select()
                .from(eventPlanners_1.eventPlanners)
                .where((0, drizzle_orm_1.eq)(eventPlanners_1.eventPlanners.profileId, plannerId));
            if (!plannerExists.length) {
                return res.status(404).json({ message: "Event planner not found" });
            }
            const [planner] = plannerExists;
            // Get all events by this planner
            const plannerEvents = await db_1.db
                .select()
                .from(events_1.events)
                .where((0, drizzle_orm_1.eq)(events_1.events.plannerId, planner.id));
            // For each event, fetch tickets
            const eventsWithTickets = await Promise.all(plannerEvents.map(async (event) => {
                const tickets = await db_1.db
                    .select()
                    .from(eventTickets_1.eventTickets)
                    .where((0, drizzle_orm_1.eq)(eventTickets_1.eventTickets.eventId, event.id));
                return {
                    ...event,
                    tickets, // attach tickets to each event
                };
            }));
            res.json({ events: eventsWithTickets });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    static async getEventById(req, res) {
        try {
            const { eventId } = req.params;
            if (!eventId) {
                return res.status(400).json({ message: "Event ID is required" });
            }
            // 1️⃣ Get event along with planner
            const [event] = await db_1.db
                .select({
                event: events_1.events,
                planner: {
                    id: eventPlanners_1.eventPlanners.id,
                    profileId: eventPlanners_1.eventPlanners.profileId,
                    name: eventPlanners_1.eventPlanners.businessName, // if you have a name column
                    image: eventPlanners_1.eventPlanners.logoUrl,
                },
            })
                .from(events_1.events)
                .leftJoin(eventPlanners_1.eventPlanners, (0, drizzle_orm_1.eq)(events_1.events.plannerId, eventPlanners_1.eventPlanners.id))
                .where((0, drizzle_orm_1.eq)(events_1.events.id, eventId));
            if (!event) {
                return res.status(404).json({ message: "Event not found" });
            }
            // 2️⃣ Get tickets for event
            const tickets = await db_1.db
                .select()
                .from(eventTickets_1.eventTickets)
                .where((0, drizzle_orm_1.eq)(eventTickets_1.eventTickets.eventId, eventId));
            return res.json({
                event: {
                    ...event.event,
                    planner: event.planner,
                },
                tickets,
            });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }
}
exports.EventController = EventController;
