"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventController = void 0;
const db_1 = require("../db");
const events_1 = require("../db/schema/events");
const eventPlanners_1 = require("../db/schema/eventPlanners");
const drizzle_orm_1 = require("drizzle-orm");
const upload_1 = require("../utils/upload");
const eventTickets_1 = require("../db/schema/eventTickets");
class EventController {
    // ---------------- CREATE EVENT ----------------
    static async createEvent(req, res) {
        try {
            const { eventType, name, eventDate, eventTime, location, description, category, } = req.body;
            const user = req.user;
            if (!user?.id)
                return res.status(401).json({ message: "Unauthorized" });
            const [planner] = await db_1.db
                .select()
                .from(eventPlanners_1.eventPlanners)
                .where((0, drizzle_orm_1.eq)(eventPlanners_1.eventPlanners.profileId, user.id));
            if (!planner) {
                return res.status(403).json({
                    message: "You must register as an event planner before creating events.",
                });
            }
            let imageUrl = null;
            if (req.file) {
                imageUrl = await (0, upload_1.uploadToSupabase)(req.file, "events/images");
            }
            const [newEvent] = await db_1.db
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
            res
                .status(201)
                .json({ message: "Event created successfully", event: newEvent });
        }
        catch (error) {
            console.error(error);
            res
                .status(500)
                .json({ error: error.message || "Failed to create event" });
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
            const allEvents = await db_1.db.select().from(events_1.events);
            res.json({ events: allEvents });
        }
        catch (error) {
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
            const plannerEvents = await db_1.db
                .select()
                .from(events_1.events)
                .where((0, drizzle_orm_1.eq)(events_1.events.plannerId, planner.id));
            res.json({ events: plannerEvents });
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
                    image: eventPlanners_1.eventPlanners.logoUrl
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
                    planner: event.planner
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
