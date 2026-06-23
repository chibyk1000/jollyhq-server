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
    // ── CREATE ────────────────────────────────────────────────────────────────
    static async createEventPlanner(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ message: "Unauthorized" });
            // Guard: one profile per user
            const [existing] = await db_1.db
                .select()
                .from(eventPlanners_1.eventPlanners)
                .where((0, drizzle_orm_1.eq)(eventPlanners_1.eventPlanners.profileId, parseInt(userId)));
            if (existing) {
                return res
                    .status(400)
                    .json({ message: "Event planner profile already exists" });
            }
            const { businessName, businessEmail, businessPhone, address, city, state, country, postalCode, website, nin, bvn, instagram, facebook, twitter, } = req.body;
            if (!businessName) {
                return res.status(400).json({ message: "Business name is required" });
            }
            const files = req.files;
            const [logoUrl, idDocumentUrl, businessDocumentUrl] = await Promise.all([
                files?.logo?.[0]
                    ? (0, upload_1.uploadToSupabase)(files.logo[0], "logos")
                    : Promise.resolve(null),
                files?.idDocument?.[0]
                    ? (0, upload_1.uploadToSupabase)(files.idDocument[0], "kyc/user-id")
                    : Promise.resolve(null),
                files?.businessDocument?.[0]
                    ? (0, upload_1.uploadToSupabase)(files.businessDocument[0], "kyc/business-docs")
                    : Promise.resolve(null),
            ]);
            // Create planner profile + wallet atomically
            const { planner, wallet } = await db_1.db.transaction(async (tx) => {
                const [planner] = await tx
                    .insert(eventPlanners_1.eventPlanners)
                    .values({
                    profileId: parseInt(userId),
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
                // Provision event_planner wallet inside the same transaction
                const [wallet] = await tx
                    .insert(wallet_1.wallets)
                    .values({
                    userId: parseInt(userId),
                    ownerType: "event_planner",
                    balance: 0,
                    currency: "NGN",
                })
                    .returning();
                return { planner, wallet };
            });
            return res.status(201).json({
                message: "Event planner profile created",
                data: { ...planner, wallet },
            });
        }
        catch (error) {
            console.error("Create event planner error:", error);
            return res.status(500).json({
                message: "Failed to create event planner profile",
                error: error.message,
            });
        }
    }
    // ── GET ONE ───────────────────────────────────────────────────────────────
    static async getEventPlanner(req, res) {
        try {
            const { id } = req.params;
            const idStr = Array.isArray(id) ? id[0] : id;
            const [data] = await db_1.db
                .select({
                planner: eventPlanners_1.eventPlanners,
                wallet: wallet_1.wallets,
            })
                .from(eventPlanners_1.eventPlanners)
                .leftJoin(wallet_1.wallets, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(wallet_1.wallets.userId, eventPlanners_1.eventPlanners.profileId), (0, drizzle_orm_1.eq)(wallet_1.wallets.ownerType, "event_planner")))
                .where((0, drizzle_orm_1.eq)(eventPlanners_1.eventPlanners.profileId, parseInt(idStr)));
            if (!data) {
                return res.status(404).json({ message: "Event planner not found" });
            }
            return res.status(200).json({
                success: true,
                data: {
                    ...data.planner,
                    wallet: data.wallet ?? null,
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
    // ── GET ALL ───────────────────────────────────────────────────────────────
    static async getEventPlanners(req, res) {
        try {
            const data = await db_1.db
                .select({
                planner: eventPlanners_1.eventPlanners,
                wallet: wallet_1.wallets,
            })
                .from(eventPlanners_1.eventPlanners)
                .leftJoin(wallet_1.wallets, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(wallet_1.wallets.userId, eventPlanners_1.eventPlanners.profileId), (0, drizzle_orm_1.eq)(wallet_1.wallets.ownerType, "event_planner")));
            return res.status(200).json({
                success: true,
                data: data.map((d) => ({ ...d.planner, wallet: d.wallet ?? null })),
            });
        }
        catch (error) {
            return res.status(500).json({
                message: "Failed to get event planners",
                error: error.message,
            });
        }
    }
    // ── UPDATE ────────────────────────────────────────────────────────────────
    static async updateEventPlanner(req, res) {
        try {
            const { id } = req.params;
            const idStr = Array.isArray(id) ? id[0] : id;
            const userId = req.user?.id;
            const body = req.body;
            if (!userId)
                return res.status(401).json({ message: "Unauthorized" });
            const [current] = await db_1.db
                .select()
                .from(eventPlanners_1.eventPlanners)
                .where((0, drizzle_orm_1.eq)(eventPlanners_1.eventPlanners.id, parseInt(idStr)));
            if (!current) {
                return res.status(404).json({ message: "Event planner not found" });
            }
            // Only the owner can update their own profile
            if (current.profileId !== parseInt(userId)) {
                return res.status(403).json({ message: "Access denied" });
            }
            const files = req.files;
            const [logoUrl, idDocumentUrl, businessDocumentUrl] = await Promise.all([
                files?.logo?.[0]
                    ? (0, upload_1.uploadToSupabase)(files.logo[0], "logos")
                    : Promise.resolve(current.logoUrl),
                files?.idDocument?.[0]
                    ? (0, upload_1.uploadToSupabase)(files.idDocument[0], "kyc/user-id")
                    : Promise.resolve(current.idDocumentUrl),
                files?.businessDocument?.[0]
                    ? (0, upload_1.uploadToSupabase)(files.businessDocument[0], "kyc/business-docs")
                    : Promise.resolve(current.businessDocumentUrl),
            ]);
            const [updated] = await db_1.db
                .update(eventPlanners_1.eventPlanners)
                .set({
                ...body,
                logoUrl,
                idDocumentUrl,
                businessDocumentUrl,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(eventPlanners_1.eventPlanners.id, parseInt(idStr)))
                .returning();
            return res.status(200).json({
                success: true,
                message: "Event planner updated",
                data: updated,
            });
        }
        catch (error) {
            logger_1.logger.error(error.message);
            return res
                .status(500)
                .json({ message: "Update failed", error: error.message });
        }
    }
    // ── DELETE ────────────────────────────────────────────────────────────────
    static async deleteEventPlanner(req, res) {
        try {
            const { id } = req.params;
            const idStr = Array.isArray(id) ? id[0] : id;
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ message: "Unauthorized" });
            const [current] = await db_1.db
                .select()
                .from(eventPlanners_1.eventPlanners)
                .where((0, drizzle_orm_1.eq)(eventPlanners_1.eventPlanners.id, parseInt(idStr)));
            if (!current) {
                return res.status(404).json({ message: "Event planner not found" });
            }
            // Only the owner can delete their own profile
            if (current.profileId !== parseInt(userId)) {
                return res.status(403).json({ message: "Access denied" });
            }
            const [deleted] = await db_1.db
                .delete(eventPlanners_1.eventPlanners)
                .where((0, drizzle_orm_1.eq)(eventPlanners_1.eventPlanners.id, parseInt(idStr)))
                .returning();
            return res.status(200).json({
                success: true,
                message: "Event planner deleted",
                data: deleted,
            });
        }
        catch (error) {
            return res
                .status(500)
                .json({ message: "Delete failed", error: error.message });
        }
    }
}
exports.EventPlannerControllers = EventPlannerControllers;
