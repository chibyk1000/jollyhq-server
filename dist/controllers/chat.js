"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const chats_1 = require("../db/schema/chats");
const chatMembers_1 = require("../db/schema/chatMembers");
const messages_1 = require("../db/schema/messages");
const schema_1 = require("../db/schema");
/* ---------------------------------------------------
   GET USER CHAT GROUPS
--------------------------------------------------- */
class ChatController {
    static async getMyChats(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const userChats = await db_1.db
                .select({
                chatId: chats_1.chats.id,
                chatName: chats_1.chats.name,
                // context
                eventId: chats_1.chats.eventId,
                vendorId: chats_1.chats.vendorId,
                directType: chats_1.chats.directType,
                isGroup: chats_1.chats.isGroup,
                // event info
                eventName: schema_1.events.name,
                eventLogo: schema_1.events.imageUrl,
                // vendor info
                vendorName: schema_1.vendors.businessName,
                vendorLogo: schema_1.vendors.image,
                // meta
                joinedAt: chatMembers_1.chatMembers.joinedAt,
                membersCount: (0, drizzle_orm_1.sql) `count(${chatMembers_1.chatMembers.id})::int`,
                // last message
                lastMessage: chats_1.chats.lastMessagePreview,
                lastMessageTime: chats_1.chats.lastMessageAt,
            })
                .from(chatMembers_1.chatMembers)
                .innerJoin(chats_1.chats, (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.chatId, chats_1.chats.id))
                // context joins
                .leftJoin(schema_1.events, (0, drizzle_orm_1.eq)(chats_1.chats.eventId, schema_1.events.id))
                .leftJoin(schema_1.vendors, (0, drizzle_orm_1.eq)(chats_1.chats.vendorId, schema_1.vendors.id))
                .where((0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.profileId, parseInt(userId)))
                .groupBy(chats_1.chats.id, chats_1.chats.name, chats_1.chats.eventId, chats_1.chats.vendorId, chats_1.chats.directType, chats_1.chats.isGroup, chats_1.chats.lastMessagePreview, chats_1.chats.lastMessageAt, chatMembers_1.chatMembers.joinedAt, schema_1.events.name, schema_1.events.imageUrl, schema_1.vendors.businessName, schema_1.vendors.image)
                .orderBy((0, drizzle_orm_1.desc)(chats_1.chats.lastMessageAt));
            return res.json(userChats);
        }
        catch (error) {
            console.log(error);
            res.status(500).json({ error: error.message });
        }
    }
    static async findOrCreateDirectChat(req, res) {
        const currentUserId = req?.user?.id;
        const { targetUserId, directType } = req.body;
        if (!currentUserId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (!targetUserId || !directType) {
            return res
                .status(400)
                .json({ error: "targetUserId and directType required" });
        }
        // Guard: can't chat with yourself
        if (currentUserId === targetUserId) {
            return res
                .status(400)
                .json({ error: "Cannot create a chat with yourself." });
        }
        try {
            // targetUserId IS the vendor's user.id (profile id) — verify it exists
            const targetUser = await db_1.db.query.user.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.user.id, targetUserId),
                columns: { id: true },
            });
            if (!targetUser) {
                return res.status(404).json({ error: "Target user not found." });
            }
            // Find the vendor record so we can attach vendorId to the chat
            const vendor = await db_1.db.query.vendors.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.vendors.userId, targetUserId), // ← userId not id
                columns: { id: true },
            });
            // 1. All DM chats of this type the current user is in
            const myMemberships = await db_1.db
                .select({ chatId: chatMembers_1.chatMembers.chatId })
                .from(chatMembers_1.chatMembers)
                .innerJoin(chats_1.chats, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(chats_1.chats.id, chatMembers_1.chatMembers.chatId), (0, drizzle_orm_1.eq)(chats_1.chats.isGroup, false), (0, drizzle_orm_1.eq)(chats_1.chats.directType, directType)))
                .where((0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.profileId, parseInt(currentUserId)));
            const candidateIds = myMemberships.map((m) => m.chatId);
            // 2. Check if target is also in any of those chats
            if (candidateIds.length > 0) {
                const shared = await db_1.db
                    .select({ chatId: chatMembers_1.chatMembers.chatId })
                    .from(chatMembers_1.chatMembers)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.profileId, targetUserId), // ← targetUserId directly
                (0, drizzle_orm_1.inArray)(chatMembers_1.chatMembers.chatId, candidateIds)))
                    .limit(1);
                if (shared.length > 0) {
                    return res.json({ chatId: shared[0].chatId, isNew: false });
                }
            }
            // 3. Create new chat atomically
            const chatId = await db_1.db.transaction(async (tx) => {
                const [chat] = await tx
                    .insert(chats_1.chats)
                    .values({
                    isGroup: false,
                    directType,
                    vendorId: vendor?.id ?? null, // attach vendor context if found
                })
                    .returning();
                await tx.insert(chatMembers_1.chatMembers).values([
                    { chatId: chat.id, profileId: currentUserId, role: "member" },
                    { chatId: chat.id, profileId: targetUserId, role: "member" },
                ]);
                return chat.id;
            });
            return res.json({ chatId, isNew: true });
        }
        catch (err) {
            console.error("findOrCreateDirectChat error:", err);
            return res.status(500).json({ error: "Failed to resolve chat" });
        }
    }
    static async getChatById(req, res) {
        try {
            const userId = req.user?.id;
            const { chatId } = req.params;
            const chatIdStr = Array.isArray(chatId) ? chatId[0] : chatId;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            if (!chatId) {
                return res.status(400).json({ message: "Chat ID is required" });
            }
            // Check if user is a member of this chat
            const membership = await db_1.db
                .select()
                .from(chatMembers_1.chatMembers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.chatId, parseInt(chatIdStr)), (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.profileId, parseInt(userId))))
                .limit(1);
            if (!membership.length) {
                return res.status(403).json({ message: "Access denied" });
            }
            // Fetch chat details with event planner info
            const [chat] = await db_1.db
                .select({
                chatId: chats_1.chats.id,
                chatName: chats_1.chats.name,
                isGroup: chats_1.chats.isGroup,
                createdAt: chats_1.chats.createdAt,
                eventId: chats_1.chats.eventId,
                vendorId: chats_1.chats.vendorId,
                lastMessage: chats_1.chats.lastMessagePreview,
                lastMessageTime: chats_1.chats.lastMessageAt,
                // Event details
                eventName: schema_1.events.name,
                eventLogo: schema_1.events.imageUrl,
                eventType: schema_1.events.eventType,
                eventCategory: schema_1.events.category,
                eventDate: schema_1.events.eventDate,
                eventTime: schema_1.events.eventTime,
                eventLocation: schema_1.events.location,
                eventDescription: schema_1.events.description,
                // Event planner details
                plannerId: schema_1.eventPlanners.id,
                plannerBusinessName: schema_1.eventPlanners.businessName,
                plannerBusinessEmail: schema_1.eventPlanners.businessEmail,
                plannerBusinessPhone: schema_1.eventPlanners.businessPhone,
                plannerLogo: schema_1.eventPlanners.logoUrl,
                plannerInstagram: schema_1.eventPlanners.instagram,
                plannerFacebook: schema_1.eventPlanners.facebook,
                plannerTwitter: schema_1.eventPlanners.twitter,
                plannerCity: schema_1.eventPlanners.city,
                plannerState: schema_1.eventPlanners.state,
                plannerCountry: schema_1.eventPlanners.country,
                plannerIsVerified: schema_1.eventPlanners.isVerified,
                // Vendor details
                vendorName: schema_1.vendors.businessName,
                vendorLogo: schema_1.vendors.image,
                membersCount: (0, drizzle_orm_1.sql) `count(distinct ${chatMembers_1.chatMembers.id})::int`,
            })
                .from(chats_1.chats)
                .leftJoin(schema_1.events, (0, drizzle_orm_1.eq)(chats_1.chats.eventId, schema_1.events.id))
                .leftJoin(schema_1.eventPlanners, (0, drizzle_orm_1.eq)(schema_1.events.plannerId, schema_1.eventPlanners.id))
                .leftJoin(schema_1.vendors, (0, drizzle_orm_1.eq)(chats_1.chats.vendorId, schema_1.vendors.id))
                .innerJoin(chatMembers_1.chatMembers, (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.chatId, chats_1.chats.id))
                .where((0, drizzle_orm_1.eq)(chats_1.chats.id, parseInt(chatIdStr)))
                .groupBy(chats_1.chats.id, chats_1.chats.name, chats_1.chats.isGroup, chats_1.chats.createdAt, chats_1.chats.eventId, chats_1.chats.vendorId, chats_1.chats.lastMessagePreview, chats_1.chats.lastMessageAt, schema_1.events.name, schema_1.events.imageUrl, schema_1.events.eventType, schema_1.events.category, schema_1.events.eventDate, schema_1.events.eventTime, schema_1.events.location, schema_1.events.description, schema_1.eventPlanners.id, schema_1.eventPlanners.businessName, schema_1.eventPlanners.businessEmail, schema_1.eventPlanners.businessPhone, schema_1.eventPlanners.logoUrl, schema_1.eventPlanners.instagram, schema_1.eventPlanners.facebook, schema_1.eventPlanners.twitter, schema_1.eventPlanners.city, schema_1.eventPlanners.state, schema_1.eventPlanners.country, schema_1.eventPlanners.isVerified, schema_1.vendors.businessName, schema_1.vendors.image)
                .limit(1);
            if (!chat) {
                return res.status(404).json({ message: "Chat not found" });
            }
            // Fetch all members with full profile info
            const members = await db_1.db
                .select({
                memberId: chatMembers_1.chatMembers.id,
                profileId: chatMembers_1.chatMembers.profileId,
                joinedAt: chatMembers_1.chatMembers.joinedAt,
                role: chatMembers_1.chatMembers.role,
                isMuted: chatMembers_1.chatMembers.isMuted,
                isBanned: chatMembers_1.chatMembers.isBanned,
                // Profile info
                firstName: schema_1.user.firstName,
                lastName: schema_1.user.lastName,
                username: schema_1.user.username,
                avatar: schema_1.user.image,
                email: schema_1.user.email,
            })
                .from(chatMembers_1.chatMembers)
                .innerJoin(schema_1.user, (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.profileId, schema_1.user.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.chatId, parseInt(chatIdStr)), (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.isBanned, false)))
                .orderBy(chatMembers_1.chatMembers.joinedAt);
            return res.json({ ...chat, members });
        }
        catch (error) {
            console.log(error);
            res.status(500).json({ error: error.message });
        }
    }
    /* ---------------------------------------------------
       GET ALL MESSAGES IN CHAT
    --------------------------------------------------- */
    static async getChatMessages(req, res) {
        try {
            const { chatId } = req.params;
            const chatIdStr = Array.isArray(chatId) ? chatId[0] : chatId;
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            // 1️⃣ Ensure user is a member
            const member = await db_1.db.query.chatMembers.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.chatId, parseInt(chatIdStr)), (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.profileId, parseInt(userId))),
            });
            if (!member) {
                return res.status(403).json({ message: "Access denied" });
            }
            // 2️⃣ Get chat + event details
            const [chat] = await db_1.db
                .select({
                chatId: chats_1.chats.id,
                chatName: chats_1.chats.name,
                eventId: schema_1.events.id,
                eventName: schema_1.events.name,
                eventLogo: schema_1.events.imageUrl,
                eventDate: schema_1.events.eventDate,
                eventTime: schema_1.events.eventTime,
                description: schema_1.events.description,
                location: schema_1.events.location,
            })
                .from(chats_1.chats)
                .leftJoin(schema_1.events, (0, drizzle_orm_1.eq)(chats_1.chats.eventId, schema_1.events.id))
                .where((0, drizzle_orm_1.eq)(chats_1.chats.id, parseInt(chatIdStr)));
            if (!chat) {
                return res.status(404).json({ message: "Chat not found" });
            }
            // 3️⃣ Get members
            const members = await db_1.db
                .select({
                id: chatMembers_1.chatMembers.profileId,
                role: chatMembers_1.chatMembers.role,
                joinedAt: chatMembers_1.chatMembers.joinedAt,
                firstName: schema_1.user.firstName,
                lastName: schema_1.user.lastName,
                username: schema_1.user.username,
            })
                .from(chatMembers_1.chatMembers)
                .innerJoin(schema_1.user, (0, drizzle_orm_1.eq)(schema_1.user.id, chatMembers_1.chatMembers.profileId))
                .where((0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.chatId, parseInt(chatIdStr)));
            // 3️⃣ Get messages
            const chatMessages = await db_1.db
                .select()
                .from(messages_1.messages)
                .where((0, drizzle_orm_1.eq)(messages_1.messages.chatId, parseInt(chatIdStr)))
                .orderBy((0, drizzle_orm_1.desc)(messages_1.messages.createdAt));
            // 4️⃣ Final response
            return res.json({
                chat: {
                    id: chat.chatId,
                    name: chat.chatName,
                    event: chat.eventId
                        ? {
                            id: chat.eventId,
                            name: chat.eventName,
                            imageUrl: chat.eventLogo,
                            date: chat?.eventDate,
                            time: chat.eventTime,
                            location: chat.location,
                            description: chat.description,
                        }
                        : null,
                },
                members,
                messages: chatMessages,
            });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }
    /* ---------------------------------------------------
       SEND MESSAGE
    --------------------------------------------------- */
    static async sendMessage(req, res) {
        try {
            const { chatId, content, type } = req.body;
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            if (!chatId || !content)
                return res.status(400).json({ message: "Invalid payload" });
            const member = await db_1.db.query.chatMembers.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.chatId, parseInt(chatId)), (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.profileId, parseInt(userId))),
            });
            if (!member || member.isBanned)
                return res.status(403).json({ message: "Not allowed" });
            const [message] = await db_1.db
                .insert(messages_1.messages)
                .values({
                chatId: parseInt(chatId),
                senderId: parseInt(userId),
                content,
                type: type || "text",
            })
                .returning();
            return res.status(201).json(message);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    /* ---------------------------------------------------
       MARK MESSAGE AS READ
    --------------------------------------------------- */
    static async markAsRead(req, res) {
        try {
            const { messageId } = req.body;
            const userId = req.user?.id;
            if (!userId || !messageId)
                return res.status(400).json({ message: "Invalid request" });
            await db_1.db.insert(schema_1.messageReads).values({
                messageId: parseInt(messageId),
                profileId: parseInt(userId),
            });
            return res.status(200).json({ success: true });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    /* ---------------------------------------------------
       ADD USER TO CHAT (ADMIN ONLY)
    --------------------------------------------------- */
    static async addMember(req, res) {
        try {
            const { chatId, profileId } = req.body;
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const admin = await db_1.db.query.chatMembers.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.chatId, parseInt(chatId)), (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.profileId, parseInt(userId)), (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.role, "admin")),
            });
            if (!admin)
                return res.status(403).json({ message: "Admins only" });
            await db_1.db.insert(chatMembers_1.chatMembers).values({ chatId: parseInt(chatId), profileId: parseInt(profileId) });
            return res.json({ message: "Member added successfully" });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    /* ---------------------------------------------------
       REMOVE MEMBER (ADMIN ONLY)
    --------------------------------------------------- */
    static async removeMember(req, res) {
        try {
            const { chatId, profileId } = req.body;
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const admin = await db_1.db.query.chatMembers.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.chatId, parseInt(chatId)), (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.profileId, parseInt(userId)), (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.role, "admin")),
            });
            if (!admin)
                return res.status(403).json({ message: "Admins only" });
            await db_1.db
                .delete(chatMembers_1.chatMembers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.chatId, parseInt(chatId)), (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.profileId, parseInt(profileId))));
            return res.json({ message: "User removed" });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    /* ---------------------------------------------------
       PROMOTE USER TO ADMIN
    --------------------------------------------------- */
    static async promoteToAdmin(req, res) {
        try {
            const { chatId, profileId } = req.body;
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const admin = await db_1.db.query.chatMembers.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.chatId, parseInt(chatId)), (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.profileId, parseInt(userId)), (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.role, "admin")),
            });
            if (!admin)
                return res.status(403).json({ message: "Admins only" });
            await db_1.db
                .update(chatMembers_1.chatMembers)
                .set({ role: "admin" })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.chatId, parseInt(chatId)), (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.profileId, parseInt(profileId))));
            return res.json({ message: "User is now admin" });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
exports.ChatController = ChatController;
