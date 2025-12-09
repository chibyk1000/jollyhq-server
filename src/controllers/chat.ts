import { Request, Response } from "express";
import { db } from "../db";
import { and, eq, desc } from "drizzle-orm";
import { chats } from "../db/schema/chats";
import { chatMembers } from "../db/schema/chatMembers";
import { messages } from "../db/schema/messages";
import { messageReads } from "../db/schema";


/* ---------------------------------------------------
   GET USER CHAT GROUPS
--------------------------------------------------- */
export class ChatController {
  static async getMyChats(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const userChats = await db
        .select({
          chatId: chats.id,
          name: chats.name,
          eventId: chats.eventId,
          joinedAt: chatMembers.joinedAt,
        })
        .from(chatMembers)
        .innerJoin(chats, eq(chatMembers.chatId, chats.id))
        .where(eq(chatMembers.profileId, userId))
        .orderBy(desc(chatMembers.joinedAt));

      return res.json(userChats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /* ---------------------------------------------------
     GET ALL MESSAGES IN CHAT
  --------------------------------------------------- */
  static async getChatMessages(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const userId = req.user?.id;

      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Ensure user is a member
      const member = await db.query.chatMembers.findFirst({
        where: and(
          eq(chatMembers.chatId, chatId),
          eq(chatMembers.profileId, userId)
        ),
      });

      if (!member) return res.status(403).json({ message: "Access denied" });

      const chatMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.chatId, chatId))
        .orderBy(desc(messages.createdAt));

      return res.json(chatMessages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /* ---------------------------------------------------
     SEND MESSAGE
  --------------------------------------------------- */
  static async sendMessage(req: Request, res: Response) {
    try {
      const { chatId, content, type } = req.body;
      const userId = req.user?.id;
if (!userId) {
  return res.status(401).json({ message: "Unauthorized" });
}
      if (!chatId || !content)
        return res.status(400).json({ message: "Invalid payload" });

      const member = await db.query.chatMembers.findFirst({
        where: and(
          eq(chatMembers.chatId, chatId),
          eq(chatMembers.profileId, userId)
        ),
      });

      if (!member || member.isBanned)
        return res.status(403).json({ message: "Not allowed" });

      const [message] = await db
        .insert(messages)
        .values({
          chatId,
          senderId: userId,
          content,
          type: type || "text",
        })
        .returning();

      return res.status(201).json(message);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /* ---------------------------------------------------
     MARK MESSAGE AS READ
  --------------------------------------------------- */
  static async markAsRead(req: Request, res: Response) {
    try {
      const { messageId } = req.body;
      const userId = req.user?.id;

      if (!userId || !messageId)
        return res.status(400).json({ message: "Invalid request" });

      await db.insert(messageReads).values({
        messageId,
        profileId: userId,
      });

      return res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /* ---------------------------------------------------
     ADD USER TO CHAT (ADMIN ONLY)
  --------------------------------------------------- */
  static async addMember(req: Request, res: Response) {
    try {
      const { chatId, profileId } = req.body;
      const userId = req.user?.id;
if (!userId) {
  return res.status(401).json({ message: "Unauthorized" });
}
      const admin = await db.query.chatMembers.findFirst({
        where: and(
          eq(chatMembers.chatId, chatId),
          eq(chatMembers.profileId, userId),
          eq(chatMembers.role, "admin")
        ),
      });

      if (!admin) return res.status(403).json({ message: "Admins only" });

      await db.insert(chatMembers).values({ chatId, profileId });

      return res.json({ message: "Member added successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /* ---------------------------------------------------
     REMOVE MEMBER (ADMIN ONLY)
  --------------------------------------------------- */
  static async removeMember(req: Request, res: Response) {
    try {
      const { chatId, profileId } = req.body;
        const userId = req.user?.id;
        
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

      const admin = await db.query.chatMembers.findFirst({
        where: and(
          eq(chatMembers.chatId, chatId),
          eq(chatMembers.profileId, userId),
          eq(chatMembers.role, "admin")
        ),
      });

      if (!admin) return res.status(403).json({ message: "Admins only" });

      await db
        .delete(chatMembers)
        .where(
          and(
            eq(chatMembers.chatId, chatId),
            eq(chatMembers.profileId, profileId)
          )
        );

      return res.json({ message: "User removed" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /* ---------------------------------------------------
     PROMOTE USER TO ADMIN
  --------------------------------------------------- */
  static async promoteToAdmin(req: Request, res: Response) {
    try {
      const { chatId, profileId } = req.body;
      const userId = req.user?.id;
if (!userId) {
  return res.status(401).json({ message: "Unauthorized" });
}
      const admin = await db.query.chatMembers.findFirst({
        where: and(
          eq(chatMembers.chatId, chatId),
          eq(chatMembers.profileId, userId),
          eq(chatMembers.role, "admin")
        ),
      });

      if (!admin) return res.status(403).json({ message: "Admins only" });

      await db
        .update(chatMembers)
        .set({ role: "admin" })
        .where(
          and(
            eq(chatMembers.chatId, chatId),
            eq(chatMembers.profileId, profileId)
          )
        );

      return res.json({ message: "User is now admin" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
