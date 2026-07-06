"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorsController = void 0;
const db_1 = require("../db");
const vendors_1 = require("../db/schema/vendors");
const drizzle_orm_1 = require("drizzle-orm");
const upload_1 = require("../utils/upload");
const wallet_1 = require("../db/schema/wallet");
const vendorServices_1 = require("../db/schema/vendorServices");
const schema_1 = require("../db/schema");
const logger_1 = require("../utils/logger");
class VendorsController {
    // ── CREATE ────────────────────────────────────────────────────────────────
    static async create(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ message: "Unauthorized" });
            // Guard: one vendor profile per user
            const [existing] = await db_1.db
                .select()
                .from(vendors_1.vendors)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(vendors_1.vendors.userId, userId), (0, drizzle_orm_1.isNull)(vendors_1.vendors.deletedAt)));
            if (existing) {
                return res
                    .status(400)
                    .json({ message: "Vendor profile already exists" });
            }
            const { businessName, contactName, contactEmail, contactPhone, category, description, priceRange, location, city, responseTime, } = req.body;
            if (!contactName ||
                !contactEmail ||
                !contactPhone ||
                !category ||
                !priceRange ||
                !location ||
                !responseTime) {
                return res.status(400).json({ message: "Missing required fields" });
            }
            if (!req.file) {
                return res.status(400).json({ message: "Vendor image is required" });
            }
            const imageUrl = await (0, upload_1.uploadToSupabase)(req.file, "vendors");
            // Create vendor + wallet atomically
            const { vendor, wallet } = await db_1.db.transaction(async (tx) => {
                const [vendor] = await tx
                    .insert(vendors_1.vendors)
                    .values({
                    userId: userId,
                    businessName,
                    contactName,
                    contactEmail,
                    contactPhone,
                    category,
                    description,
                    image: imageUrl,
                    priceRange,
                    location,
                    city,
                    responseTime,
                })
                    .returning();
                const [wallet] = await tx
                    .insert(wallet_1.wallets)
                    .values({
                    userId: userId,
                    ownerType: "vendor",
                    balance: 0,
                    currency: "NGN",
                })
                    .returning();
                return { vendor, wallet };
            });
            return res.status(201).json({
                success: true,
                data: { ...vendor, wallet },
            });
        }
        catch (error) {
            logger_1.logger.error("Create vendor error", error);
            return res
                .status(500)
                .json({ message: "Failed to create vendor", error: error.message });
        }
    }
    // ── GET ALL (active, not deleted) ─────────────────────────────────────────
    static async getAll(_req, res) {
        try {
            const data = await db_1.db
                .select()
                .from(vendors_1.vendors)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(vendors_1.vendors.isActive, true), (0, drizzle_orm_1.isNull)(vendors_1.vendors.deletedAt)));
            return res.json({ success: true, data });
        }
        catch (error) {
            logger_1.logger.error("Get vendors error", error);
            return res
                .status(500)
                .json({ message: "Failed to fetch vendors", error: error.message });
        }
    }
    // ── GET BY ID ─────────────────────────────────────────────────────────────
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const idStr = Array.isArray(id) ? id[0] : id;
            const [vendor] = await db_1.db
                .select()
                .from(vendors_1.vendors)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(vendors_1.vendors.id, idStr), (0, drizzle_orm_1.isNull)(vendors_1.vendors.deletedAt)));
            if (!vendor) {
                return res.status(404).json({ message: "Vendor not found" });
            }
            const services = await db_1.db
                .select()
                .from(vendorServices_1.vendorServices)
                .where((0, drizzle_orm_1.eq)(vendorServices_1.vendorServices.vendorId, vendor.id));
            return res.json({ success: true, data: { ...vendor, services } });
        }
        catch (error) {
            logger_1.logger.error("Get vendor error", error);
            return res
                .status(500)
                .json({ message: "Failed to fetch vendor", error: error.message });
        }
    }
    // ── GET BY USER ID ────────────────────────────────────────────────────────
    static async getByUser(req, res) {
        try {
            const { userId } = req.params;
            const userIdStr = Array.isArray(userId) ? userId[0] : userId;
            const [vendor] = await db_1.db
                .select()
                .from(vendors_1.vendors)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(vendors_1.vendors.userId, userIdStr), (0, drizzle_orm_1.isNull)(vendors_1.vendors.deletedAt)));
            if (!vendor) {
                return res.status(404).json({ message: "Vendor not found" });
            }
            return res.json({ success: true, data: vendor });
        }
        catch (error) {
            logger_1.logger.error("Get vendor by user error", error);
            return res
                .status(500)
                .json({ message: "Failed to fetch vendor", error: error.message });
        }
    }
    // ── GET BY PROFILE (with wallet) ──────────────────────────────────────────
    static async getByProfile(req, res) {
        try {
            const { id } = req.params;
            const idStr = Array.isArray(id) ? id[0] : id;
            const [data] = await db_1.db
                .select({
                vendor: vendors_1.vendors,
                wallet: wallet_1.wallets,
            })
                .from(vendors_1.vendors)
                .leftJoin(wallet_1.wallets, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(wallet_1.wallets.userId, idStr), (0, drizzle_orm_1.eq)(wallet_1.wallets.ownerType, "vendor")))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(vendors_1.vendors.userId, idStr), (0, drizzle_orm_1.isNull)(vendors_1.vendors.deletedAt)));
            if (!data) {
                return res.status(404).json({ message: "Vendor not found" });
            }
            return res.status(200).json({
                success: true,
                data: {
                    ...data.vendor,
                    wallet: data.wallet ?? null,
                },
            });
        }
        catch (error) {
            logger_1.logger.error("Get vendor profile error", error);
            return res
                .status(500)
                .json({ message: "Failed to get vendor", error: error.message });
        }
    }
    // ── UPDATE ────────────────────────────────────────────────────────────────
    static async update(req, res) {
        try {
            const { id } = req.params;
            const idStr = Array.isArray(id) ? id[0] : id;
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ message: "Unauthorized" });
            const [current] = await db_1.db
                .select()
                .from(vendors_1.vendors)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(vendors_1.vendors.id, idStr), (0, drizzle_orm_1.isNull)(vendors_1.vendors.deletedAt)));
            if (!current) {
                return res.status(404).json({ message: "Vendor not found" });
            }
            // Only the owner can update
            if (current.userId !== userId) {
                return res.status(403).json({ message: "Access denied" });
            }
            const imageUrl = req.file
                ? await (0, upload_1.uploadToSupabase)(req.file, "vendors")
                : current.image;
            // Build update payload — only include defined fields
            const updateData = {
                updatedAt: new Date(),
                image: imageUrl,
            };
            const fields = [
                "businessName",
                "category",
                "description",
                "contactName",
                "contactEmail",
                "contactPhone",
                "priceRange",
                "responseTime",
                "location",
                "city",
            ];
            for (const field of fields) {
                if (req.body[field] !== undefined) {
                    updateData[field] = req.body[field];
                }
            }
            if (req.body.isActive !== undefined) {
                updateData.isActive =
                    req.body.isActive === "true" || req.body.isActive === true;
            }
            const [updated] = await db_1.db
                .update(vendors_1.vendors)
                .set(updateData)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(vendors_1.vendors.id, idStr), (0, drizzle_orm_1.isNull)(vendors_1.vendors.deletedAt)))
                .returning();
            return res.json({ success: true, data: updated });
        }
        catch (error) {
            logger_1.logger.error("Update vendor error", error);
            return res
                .status(500)
                .json({ message: "Failed to update vendor", error: error.message });
        }
    }
    // ── SOFT DELETE ───────────────────────────────────────────────────────────
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const idStr = Array.isArray(id) ? id[0] : id;
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ message: "Unauthorized" });
            const [current] = await db_1.db
                .select()
                .from(vendors_1.vendors)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(vendors_1.vendors.id, idStr), (0, drizzle_orm_1.isNull)(vendors_1.vendors.deletedAt)));
            if (!current) {
                return res.status(404).json({ message: "Vendor not found" });
            }
            // Only the owner can delete
            if (current.userId !== userId) {
                return res.status(403).json({ message: "Access denied" });
            }
            await db_1.db
                .update(vendors_1.vendors)
                .set({ deletedAt: new Date(), isActive: false })
                .where((0, drizzle_orm_1.eq)(vendors_1.vendors.id, idStr));
            return res.json({
                success: true,
                message: "Vendor deleted successfully",
            });
        }
        catch (error) {
            logger_1.logger.error("Delete vendor error", error);
            return res
                .status(500)
                .json({ message: "Failed to delete vendor", error: error.message });
        }
    }
    // ── GET VENDOR CHATS ──────────────────────────────────────────────────────
    static async getVendorChats(req, res) {
        try {
            const { vendorId } = req.params;
            const vendorIdStr = Array.isArray(vendorId) ? vendorId[0] : vendorId;
            // 1. Verify vendor exists
            const [vendor] = await db_1.db
                .select({ id: vendors_1.vendors.id })
                .from(vendors_1.vendors)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(vendors_1.vendors.id, vendorIdStr), (0, drizzle_orm_1.isNull)(vendors_1.vendors.deletedAt)));
            if (!vendor) {
                return res.status(404).json({ message: "Vendor not found" });
            }
            // 2. Fetch all chats for this vendor — one row per chat
            //    Last message is resolved via a correlated subquery so we never
            //    get one row per message
            const vendorChats = await db_1.db
                .select({
                id: schema_1.chats.id,
                name: schema_1.chats.name,
                isGroup: schema_1.chats.isGroup,
                directType: schema_1.chats.directType,
                vendorId: schema_1.chats.vendorId,
                eventId: schema_1.chats.eventId,
                lastMessagePreview: schema_1.chats.lastMessagePreview,
                lastMessageAt: schema_1.chats.lastMessageAt,
                createdAt: schema_1.chats.createdAt,
            })
                .from(schema_1.chats)
                .where((0, drizzle_orm_1.eq)(schema_1.chats.vendorId, vendorIdStr))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.chats.lastMessageAt));
            if (vendorChats.length === 0) {
                return res.status(200).json({ success: true, data: [] });
            }
            const chatIds = vendorChats.map((c) => c.id);
            // 3. Fetch all members with full profile info in one query
            const allMembers = await db_1.db
                .select({
                chatId: schema_1.chatMembers.chatId,
                memberId: schema_1.chatMembers.id,
                profileId: schema_1.chatMembers.profileId,
                role: schema_1.chatMembers.role,
                isMuted: schema_1.chatMembers.isMuted,
                joinedAt: schema_1.chatMembers.joinedAt,
                // Profile fields
                firstName: schema_1.user.firstName,
                lastName: schema_1.user.lastName,
                email: schema_1.user.email,
                avatar: schema_1.user.image,
                username: schema_1.user.username,
            })
                .from(schema_1.chatMembers)
                .innerJoin(schema_1.user, (0, drizzle_orm_1.eq)(schema_1.user.id, schema_1.chatMembers.profileId))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.chatMembers.chatId, chatIds), (0, drizzle_orm_1.eq)(schema_1.chatMembers.isBanned, false)));
            // 4. Fetch the single most recent message per chat using a
            //    DISTINCT ON query — far more efficient than joining all messages
            const lastMessages = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT DISTINCT ON (m.chat_id)
        m.id,
        m.chat_id   AS "chatId",
        m.sender_id AS "senderId",
        m.content,
        m.type,
        m.media_url AS "mediaUrl",
        m.status,
        m.created_at AS "createdAt",
        u.first_name AS "senderFirstName",
        u.last_name  AS "senderLastName",
        u.image      AS "senderAvatar"
      FROM messages m
      LEFT JOIN "user" u ON u.id = m.sender_id
      WHERE m.chat_id = ANY(${drizzle_orm_1.sql.raw(`ARRAY[${chatIds.map((id) => `'${id}'`).join(",")}]::uuid[]`)})
      ORDER BY m.chat_id, m.created_at DESC
    `);
            // 5. Build lookup maps for O(1) assembly
            const membersByChatId = new Map();
            for (const m of allMembers) {
                const chatIdStr = String(m.chatId);
                if (!membersByChatId.has(chatIdStr)) {
                    membersByChatId.set(chatIdStr, []);
                }
                membersByChatId.get(chatIdStr).push({
                    memberId: m.memberId,
                    profileId: m.profileId,
                    role: m.role,
                    isMuted: m.isMuted,
                    joinedAt: m.joinedAt,
                    firstName: m.firstName,
                    lastName: m.lastName,
                    email: m.email,
                    avatar: m.avatar,
                    username: m.username,
                });
            }
            const lastMessageByChatId = new Map();
            for (const msg of lastMessages.rows) {
                const chatIdStr = String(msg.chatId);
                lastMessageByChatId.set(chatIdStr, msg);
            }
            // 6. Assemble final response
            const data = vendorChats.map((chat) => {
                const chatIdStr = String(chat.id);
                return {
                    ...chat,
                    members: membersByChatId.get(chatIdStr) ?? [],
                    lastMessage: lastMessageByChatId.get(chatIdStr) ?? null,
                };
            });
            return res.status(200).json({ success: true, data });
        }
        catch (error) {
            logger_1.logger.error("Get vendor chats error", error);
            return res.status(500).json({
                message: "Failed to fetch vendor chats",
                error: error.message,
            });
        }
    }
}
exports.VendorsController = VendorsController;
