"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventPlannerControllers = void 0;
const upload_1 = require("../utils/upload");
const db_1 = require("../db");
const eventPlanners_1 = require("../db/schema/eventPlanners");
const drizzle_orm_1 = require("drizzle-orm");
const logger_1 = require("../utils/logger");
const wallet_1 = require("../db/schema/wallet");
class EventPlannerControllers {
    static async createEventPlanner(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ message: "Unauthorized" });
            // Check if user already has a profile
            const existingPlanner = await db_1.db
                .select()
                .from(eventPlanners_1.eventPlanners)
                .where((0, drizzle_orm_1.eq)(eventPlanners_1.eventPlanners.profileId, userId));
            if (existingPlanner.length > 0) {
                return res
                    .status(400)
                    .json({ message: "Event planner profile already exists" });
            }
            const { businessName, businessEmail, businessPhone, address, city, state, country, postalCode, website, nin, bvn, instagram, facebook, twitter, } = req.body;
            if (!businessName)
                return res.status(400).json({ message: "Business name is required" });
            // FILES
            const files = req.files;
            let logoUrl = null;
            let idDocumentUrl = null;
            let businessDocumentUrl = null;
            if (files?.logo?.[0])
                logoUrl = await (0, upload_1.uploadToSupabase)(files.logo[0], "logos");
            if (files?.idDocument?.[0])
                idDocumentUrl = await (0, upload_1.uploadToSupabase)(files.idDocument[0], "kyc/user-id");
            if (files?.businessDocument?.[0])
                businessDocumentUrl = await (0, upload_1.uploadToSupabase)(files.businessDocument[0], "kyc/business-docs");
            // Insert Event Planner into DB
            const [planner] = await db_1.db
                .insert(eventPlanners_1.eventPlanners)
                .values({
                profileId: userId,
                businessName,
                businessEmail,
                businessPhone,
                address,
                city,
                state,
                country,
                postalCode,
                website,
                nin,
                bvn,
                instagram,
                facebook,
                twitter,
                logoUrl,
                idDocumentUrl,
                businessDocumentUrl,
            })
                .returning();
            // Create wallet for the new event planner
            await db_1.db.insert(wallet_1.wallets).values({
                ownerId: planner.id,
                ownerType: "event-planner",
                balance: 0,
                currency: "NGN",
                isActive: true,
            });
            return res.status(200).json({
                message: "Event planner profile created",
                data: planner,
            });
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({
                message: "Failed to create event planner profile",
                error: error.message,
            });
        }
    }
    // GET ONE
    static async getEventPlanner(req, res) {
        try {
            const { id } = req.params;
            const data = await db_1.db
                .select({
                eventPlanner: eventPlanners_1.eventPlanners,
                wallet: wallet_1.wallets,
            })
                .from(eventPlanners_1.eventPlanners)
                .leftJoin(wallet_1.wallets, (0, drizzle_orm_1.eq)(wallet_1.wallets.ownerId, eventPlanners_1.eventPlanners.id))
                .where((0, drizzle_orm_1.eq)(eventPlanners_1.eventPlanners.profileId, id));
            if (data.length === 0) {
                return res.status(404).json({ message: "Event planner not found" });
            }
            console.log(data);
            return res.status(200).json({
                event_planner: {
                    ...data[0].eventPlanner,
                    wallet: data[0].wallet ?? null,
                },
            });
        }
        catch (error) {
            return res.status(500).json({
                message: "Failed to get event planner",
                error: error.message,
            });
        }
    }
    // UPDATE
    static async updateEventPlanner(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            const body = req.body;
            const files = req.files;
            const current = await db_1.db
                .select()
                .from(eventPlanners_1.eventPlanners)
                .where((0, drizzle_orm_1.eq)(eventPlanners_1.eventPlanners.id, id));
            if (current.length === 0)
                return res.status(404).json({ message: "Event planner not found" });
            // Upload new files if provided
            let logoUrl = current[0].logoUrl;
            let idDocumentUrl = current[0].idDocumentUrl;
            let businessDocumentUrl = current[0].businessDocumentUrl;
            if (files?.logo?.[0])
                logoUrl = await (0, upload_1.uploadToSupabase)(files.logo[0], "logos");
            if (files?.idDocument?.[0])
                idDocumentUrl = await (0, upload_1.uploadToSupabase)(files.idDocument[0], "kyc/user-id");
            if (files?.businessDocument?.[0])
                businessDocumentUrl = await (0, upload_1.uploadToSupabase)(files.businessDocument[0], "kyc/business-docs");
            const [updated] = await db_1.db
                .update(eventPlanners_1.eventPlanners)
                .set({
                ...body,
                logoUrl,
                idDocumentUrl,
                businessDocumentUrl,
            })
                .where((0, drizzle_orm_1.eq)(eventPlanners_1.eventPlanners.id, id))
                .returning();
            return res.status(200).json({
                message: "Event Planner updated",
                data: updated,
            });
        }
        catch (error) {
            console.log(error);
            logger_1.logger.error(error.message);
            return res.status(500).json({
                message: "Update failed",
                error: error.message,
            });
        }
    }
    // GET ALL with wallet
    static async getEventPlanners(req, res) {
        try {
            const data = await db_1.db
                .select({
                planner: eventPlanners_1.eventPlanners,
                wallet: wallet_1.wallets,
            })
                .from(eventPlanners_1.eventPlanners);
            return res.status(200).json(data);
        }
        catch (error) {
            return res.status(500).json({
                message: "Failed to get event planners",
                error: error.message,
            });
        }
    }
    // DELETE
    static async deleteEventPlanner(req, res) {
        try {
            const { id } = req.params;
            const [deleted] = await db_1.db
                .delete(eventPlanners_1.eventPlanners)
                .where((0, drizzle_orm_1.eq)(eventPlanners_1.eventPlanners.id, id))
                .returning();
            if (!deleted)
                return res.status(404).json({ message: "Event planner not found" });
            return res.status(200).json({
                message: "Event planner deleted",
                data: deleted,
            });
        }
        catch (error) {
            return res.status(500).json({
                message: "Delete failed",
                error: error.message,
            });
        }
    }
}
exports.EventPlannerControllers = EventPlannerControllers;
