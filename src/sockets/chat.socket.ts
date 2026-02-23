import { Server, Socket } from "socket.io";
import { db } from "../db";
import { chats, chatMembers, messages, messageReads,  } from "../db/schema";
import { and, asc, desc, eq } from "drizzle-orm";

export function chatSocket(io: Server, socket: Socket) {
  /**
   * JOIN CHAT
   */
  socket.on("join_chat", async (chatId: string) => {
    const userId = socket.user.id;

    const member = await db.query.chatMembers.findFirst({
      where: and(
        eq(chatMembers.chatId, chatId),
        eq(chatMembers.profileId, userId),
        eq(chatMembers.isBanned, false)
      ),
    });

    if (!member) return;

    socket.join(chatId);

const msgs = await db.query.messages.findMany({
  where: eq(messages.chatId, chatId),
  orderBy: asc(messages.createdAt),
  limit: 50,
  with: {
    sender: true, // 🔥 includes full sender profile
  },
});
 

    // ✅ SEND ONLY TO THIS SOCKET
    socket.emit("chat_history", {
      chatId,
      messages: msgs,
    });
  });

  /**
   * GET CHAT HISTORY (separate)
   */
  socket.on("get_chat_history", async (chatId: string) => {
    socket.emit("chat_history", await fetchChatHistory(chatId));
  });

  /**
   * SEND MESSAGE
   */
  socket.on(
    "send_message",
    async ({ chatId, content, type = "text", mediaUrl }) => {
      const member = await db.query.chatMembers.findFirst({
        where: and(
          eq(chatMembers.chatId, chatId),
          eq(chatMembers.profileId, socket.user.id),
          eq(chatMembers.isBanned, false)
        ),
      });
      console.log("mem", socket);

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
    }
  );

  /**
   * READ RECEIPT
   */
  socket.on("message_read", async ({ messageId, chatId }) => {
    await db.insert(messageReads).values({
      messageId,
      profileId: socket.user.id,
    });

    io.to(chatId).emit("message_read", {
      messageId,
      profileId: socket.user.id,
    });
  });

  /**
   * TYPING
   */
  socket.on("typing", ({ chatId }) => {
    socket.to(chatId).emit("typing", {
      profileId: socket.user.id,
    });
  });

  socket.on("stop_typing", ({ chatId }) => {
    socket.to(chatId).emit("stop_typing", {
      profileId: socket.user.id,
    });
  });
}

/**
 * Fetch last 50 messages for a chat
 */
async function fetchChatHistory(chatId: string) {
  const msgs = await db.query.messages.findMany({
    where: eq(messages.chatId, chatId),
    orderBy: asc(messages.createdAt),
    limit: 50,
    with: {
      sender: true, // 🔥 includes full sender profile
    },
  });

  return {
    chatId,
    messages: msgs,
  };
}