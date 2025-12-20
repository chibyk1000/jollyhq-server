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
            if (!userId)
                return res.status(401).json({ message: "Unauthorized" });
            const userChats = await db_1.db
                .select({
                chatId: chats_1.chats.id,
                chatName: chats_1.chats.name,
                eventId: chats_1.chats.eventId,
                joinedAt: chatMembers_1.chatMembers.joinedAt,
                eventName: schema_1.events.name,
                eventLogo: schema_1.events.imageUrl, // adjust to your column
                membersCount: (0, drizzle_orm_1.sql) `(
          SELECT COUNT(*)
          FROM ${chatMembers_1.chatMembers}
          WHERE ${chatMembers_1.chatMembers.chatId} = ${chats_1.chats.id}
        )`,
            })
                .from(chatMembers_1.chatMembers)
                .innerJoin(chats_1.chats, (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.chatId, chats_1.chats.id))
                .leftJoin(schema_1.events, (0, drizzle_orm_1.eq)(chats_1.chats.eventId, schema_1.events.id))
                .where((0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.profileId, userId))
                .orderBy((0, drizzle_orm_1.desc)(chatMembers_1.chatMembers.joinedAt));
            return res.json(userChats);
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
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            // 1️⃣ Ensure user is a member
            const member = await db_1.db.query.chatMembers.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.chatId, chatId), (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.profileId, userId)),
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
                .where((0, drizzle_orm_1.eq)(chats_1.chats.id, chatId));
            if (!chat) {
                return res.status(404).json({ message: "Chat not found" });
            }
            // 3️⃣ Get members
            const members = await db_1.db
                .select({
                id: chatMembers_1.chatMembers.profileId,
                role: chatMembers_1.chatMembers.role,
                joinedAt: chatMembers_1.chatMembers.joinedAt,
                firstName: schema_1.profiles.firstName,
                lastName: schema_1.profiles.lastName,
                username: schema_1.profiles.username,
                avatarUrl: schema_1.profiles.avatarUrl,
            })
                .from(chatMembers_1.chatMembers)
                .innerJoin(schema_1.profiles, (0, drizzle_orm_1.eq)(schema_1.profiles.id, chatMembers_1.chatMembers.profileId))
                .where((0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.chatId, chatId));
            // 3️⃣ Get messages
            const chatMessages = await db_1.db
                .select()
                .from(messages_1.messages)
                .where((0, drizzle_orm_1.eq)(messages_1.messages.chatId, chatId))
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
                            description: chat.description
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
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.chatId, chatId), (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.profileId, userId)),
            });
            if (!member || member.isBanned)
                return res.status(403).json({ message: "Not allowed" });
            const [message] = await db_1.db
                .insert(messages_1.messages)
                .values({
                chatId,
                senderId: userId,
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
                messageId,
                profileId: userId,
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
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.chatId, chatId), (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.profileId, userId), (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.role, "admin")),
            });
            if (!admin)
                return res.status(403).json({ message: "Admins only" });
            await db_1.db.insert(chatMembers_1.chatMembers).values({ chatId, profileId });
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
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.chatId, chatId), (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.profileId, userId), (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.role, "admin")),
            });
            if (!admin)
                return res.status(403).json({ message: "Admins only" });
            await db_1.db
                .delete(chatMembers_1.chatMembers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.chatId, chatId), (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.profileId, profileId)));
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
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.chatId, chatId), (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.profileId, userId), (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.role, "admin")),
            });
            if (!admin)
                return res.status(403).json({ message: "Admins only" });
            await db_1.db
                .update(chatMembers_1.chatMembers)
                .set({ role: "admin" })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.chatId, chatId), (0, drizzle_orm_1.eq)(chatMembers_1.chatMembers.profileId, profileId)));
            return res.json({ message: "User is now admin" });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
exports.ChatController = ChatController;
