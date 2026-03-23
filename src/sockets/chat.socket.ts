import { Server, Socket } from "socket.io";
import { db } from "../db";
import { chats, chatMembers, messages, messageReads } from "../db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";

export function chatSocket(io: Server, socket: Socket) {
  /**
   * JOIN CHAT (group or existing DM)
   */
  socket.on("join_chat", async (chatId: string) => {
    const userId = socket.user.id;

    const member = await db.query.chatMembers.findFirst({
      where: and(
        eq(chatMembers.chatId, chatId),
        eq(chatMembers.profileId, userId),
        eq(chatMembers.isBanned, false),
      ),
    });

    if (!member) return;

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
  socket.on(
    "start_direct_chat",
    async ({
      targetUserId,
      directType,
    }: {
      targetUserId: string;
      directType: "user_vendor" | "vendor_planner";
    }) => {
      try {
        const { chatId, isNew } = await findOrCreateDirectChat(
          socket.user.id,
          targetUserId,
          directType,
        );
console.log("chatId",chatId)
        socket.join(chatId);
        socket.emit("direct_chat_ready", { chatId, isNew });

        if (!isNew) {
          socket.emit("chat_history", await fetchChatHistory(chatId));
        }
      } catch (err) {
        socket.emit("error", {
          event: "start_direct_chat",
          message: (err as Error).message,
        });
      }
    },
  );

  /**
   * GET CHAT HISTORY
   */
  socket.on("get_chat_history", async (chatId: string) => {
    socket.emit("chat_history", await fetchChatHistory(chatId));
  });

  /**
   * SEND MESSAGE
   */
  socket.on(
    "send_message",
    async ({
      chatId,
      content,
      type = "text",
      mediaUrl,
    }: {
      chatId: string;
      content: string;
      type?: string;
      mediaUrl?: string;
    }) => {
      const member = await db.query.chatMembers.findFirst({
        where: and(
          eq(chatMembers.chatId, chatId),
          eq(chatMembers.profileId, socket.user.id),
          eq(chatMembers.isBanned, false),
        ),
      });

      if (!member) return;

      const [message] = await db
        .insert(messages)
        .values({
          chatId,
          senderId: socket.user.id,
          content,
          type,
          mediaUrl,
          status: "sent",
        })
        .returning();

      await db
        .update(chats)
        .set({
          lastMessageAt: message.createdAt,
          lastMessagePreview: content?.slice(0, 100),
        })
        .where(eq(chats.id, chatId));

      io.to(chatId).emit("new_message", message);
    },
  );

  /**
   * READ RECEIPT
   */
  socket.on("message_read", async ({ messageId, chatId }) => {
    await db
      .insert(messageReads)
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
async function findOrCreateDirectChat(
  userAId: string,
  userBId: string,
  directType: "user_vendor" | "vendor_planner",
): Promise<{ chatId: string; isNew: boolean }> {
  // 1. All DM chats of this directType that userA belongs to
  const userAMemberships = await db
    .select({ chatId: chatMembers.chatId })
    .from(chatMembers)
    .innerJoin(
      chats,
      and(
        eq(chats.id, chatMembers.chatId),
        eq(chats.isGroup, false),
        eq(chats.directType, directType),
      ),
    )
    .where(eq(chatMembers.profileId, userAId));

  const candidateChatIds = userAMemberships.map((m) => m.chatId);

  // 2. Check whether userB is in any of those same chats
  if (candidateChatIds.length > 0) {
    const shared = await db
      .select({ chatId: chatMembers.chatId })
      .from(chatMembers)
      .where(
        and(
          eq(chatMembers.profileId, userBId),
          inArray(chatMembers.chatId, candidateChatIds),
        ),
      )
      .limit(1);

    if (shared.length > 0) {
      return { chatId: shared[0].chatId, isNew: false };
    }
  }

  // 3. No existing DM — create chat + both members atomically
  const chatId = await db.transaction(async (tx) => {
    const [chat] = await tx
      .insert(chats)
      .values({ isGroup: false, directType })
      .returning();

    await tx.insert(chatMembers).values([
      { chatId: chat.id, profileId: userAId, role: "member" },
      { chatId: chat.id, profileId: userBId, role: "member" },
    ]);

    return chat.id;
  });

  return { chatId, isNew: true };
}

/**
 * Fetch the last 50 messages for a chat, oldest first.
 */
async function fetchChatHistory(chatId: string) {
  const msgs = await db.query.messages.findMany({
    where: eq(messages.chatId, chatId),
    orderBy: asc(messages.createdAt),
    limit: 50,
    with: { sender: true },
  });

  return { chatId, messages: msgs };
}
