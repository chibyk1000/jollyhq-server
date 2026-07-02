"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatSocket = chatSocket;
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
function chatSocket(io, socket) {
    /**
     * JOIN CHAT (group or existing DM)
     */
    socket.on("join_chat", async (chatId) => {
        const userId = socket.user.id;
        const member = await db_1.db.query.chatMembers.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.chatMembers.chatId, chatId), (0, drizzle_orm_1.eq)(schema_1.chatMembers.profileId, userId), (0, drizzle_orm_1.eq)(schema_1.chatMembers.isBanned, false)),
        });
        if (!member)
            return;
        socket.join(chatId);
        socket.emit("chat_history", await fetchChatHistory(chatId));
    });
    /**
     * START DIRECT CHAT
     *
     * Works for user↔vendor and vendor↔planner flows.
     * Finds an existing DM or creates one on the fly.
     * After this resolves, the client uses the returned chatId
     * with the normal send_message / typing / message_read events.
     *
     * Payload:
     *   targetUserId — profile id of the other party
     *   directType   — "user_vendor" | "vendor_planner"
     *
     * Emits: "direct_chat_ready" → { chatId, isNew }
     */
    socket.on("start_direct_chat", async ({ targetUserId, directType, }) => {
        try {
            const { chatId, isNew } = await findOrCreateDirectChat(String(socket.user.id), targetUserId, directType);
            console.log("chatId", chatId);
            socket.join(chatId);
            socket.emit("direct_chat_ready", { chatId, isNew });
            if (!isNew) {
                socket.emit("chat_history", await fetchChatHistory(chatId));
            }
        }
        catch (err) {
            socket.emit("error", {
                event: "start_direct_chat",
                message: err.message,
            });
        }
    });
    /**
     * GET CHAT HISTORY
     */
    socket.on("get_chat_history", async (chatId) => {
        socket.emit("chat_history", await fetchChatHistory(chatId));
    });
    /**
     * SEND MESSAGE
     */
    socket.on("send_message", async ({ chatId, content, type = "text", mediaUrl, }) => {
        const member = await db_1.db.query.chatMembers.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.chatMembers.chatId, chatId), (0, drizzle_orm_1.eq)(schema_1.chatMembers.profileId, socket.user.id), (0, drizzle_orm_1.eq)(schema_1.chatMembers.isBanned, false)),
        });
        if (!member)
            return;
        const [message] = await db_1.db
            .insert(schema_1.messages)
            .values({
            chatId: chatId,
            senderId: socket.user.id,
            content,
            type,
            mediaUrl,
            status: "sent",
        })
            .returning();
        await db_1.db
            .update(schema_1.chats)
            .set({
            lastMessageAt: message.createdAt,
            lastMessagePreview: content?.slice(0, 100),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.chats.id, chatId));
        io.to(chatId).emit("new_message", message);
    });
    /**
     * READ RECEIPT
     */
    socket.on("message_read", async ({ messageId, chatId }) => {
        await db_1.db
            .insert(schema_1.messageReads)
            .values({ messageId, profileId: socket.user.id })
            .onConflictDoNothing();
        io.to(chatId).emit("message_read", {
            messageId,
            profileId: socket.user.id,
        });
    });
    /**
     * TYPING INDICATORS
     */
    socket.on("typing", ({ chatId }) => {
        socket.to(chatId).emit("typing", { profileId: socket.user.id });
    });
    socket.on("stop_typing", ({ chatId }) => {
        socket.to(chatId).emit("stop_typing", { profileId: socket.user.id });
    });
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/**
 * Find an existing 1-to-1 chat between two users, or create one.
 *
 * Uses an innerJoin instead of `with: { chat: { where } }` since Drizzle's
 * relational `with` does not support filtering on the related table.
 */
async function findOrCreateDirectChat(userAId, userBId, directType) {
    // 1. All DM chats of this directType that userA belongs to
    const userAMemberships = await db_1.db
        .select({ chatId: schema_1.chatMembers.chatId })
        .from(schema_1.chatMembers)
        .innerJoin(schema_1.chats, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.chats.id, schema_1.chatMembers.chatId), (0, drizzle_orm_1.eq)(schema_1.chats.isGroup, false), (0, drizzle_orm_1.eq)(schema_1.chats.directType, directType)))
        .where((0, drizzle_orm_1.eq)(schema_1.chatMembers.profileId, userAId));
    const candidateChatIds = userAMemberships.map((m) => m.chatId);
    // 2. Check whether userB is in any of those same chats
    if (candidateChatIds.length > 0) {
        const shared = await db_1.db
            .select({ chatId: schema_1.chatMembers.chatId })
            .from(schema_1.chatMembers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.chatMembers.profileId, userBId), (0, drizzle_orm_1.inArray)(schema_1.chatMembers.chatId, candidateChatIds)))
            .limit(1);
        if (shared.length > 0) {
            return { chatId: String(shared[0].chatId), isNew: false };
        }
    }
    // 3. No existing DM — create chat + both members atomically
    const chatId = await db_1.db.transaction(async (tx) => {
        const [chat] = await tx
            .insert(schema_1.chats)
            .values({ isGroup: false, directType })
            .returning();
        await tx.insert(schema_1.chatMembers).values([
            { chatId: chat.id, profileId: userAId, role: "member" },
            { chatId: chat.id, profileId: userBId, role: "member" },
        ]);
        return chat.id;
    });
    return { chatId: String(chatId), isNew: true };
}
/**
 * Fetch the last 50 messages for a chat, oldest first.
 */
async function fetchChatHistory(chatId) {
    const msgs = await db_1.db.query.messages.findMany({
        where: (0, drizzle_orm_1.eq)(schema_1.messages.chatId, chatId),
        orderBy: (0, drizzle_orm_1.asc)(schema_1.messages.createdAt),
        limit: 50,
        with: { sender: true },
    });
    return { chatId, messages: msgs };
}
