import { Request, Response } from "express";
import { db } from "../db";
import { and, eq, desc, sql } from "drizzle-orm";
import { chats } from "../db/schema/chats";
import { chatMembers } from "../db/schema/chatMembers";
import { messages } from "../db/schema/messages";
import { events, messageReads, profiles } from "../db/schema";


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
          chatName: chats.name,
          eventId: chats.eventId,
          joinedAt: chatMembers.joinedAt,
          eventName: events.name,
          eventLogo: events.imageUrl, // adjust to your column
          membersCount: sql<number>`(
          SELECT COUNT(*)
          FROM ${chatMembers}
          WHERE ${chatMembers.chatId} = ${chats.id}
        )`,
        })
        .from(chatMembers)
        .innerJoin(chats, eq(chatMembers.chatId, chats.id))
        .leftJoin(events, eq(chats.eventId, events.id))
        .where(eq(chatMembers.profileId, userId))
        .orderBy(desc(chatMembers.joinedAt));

      return res.json(userChats);
    } catch (error: any) {
      console.log(error);

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

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // 1️⃣ Ensure user is a member
      const member = await db.query.chatMembers.findFirst({
        where: and(
          eq(chatMembers.chatId, chatId),
          eq(chatMembers.profileId, userId)
        ),
      });

      if (!member) {
        return res.status(403).json({ message: "Access denied" });
      }

      // 2️⃣ Get chat + event details
      const [chat] = await db
        .select({
          chatId: chats.id,
          chatName: chats.name,
          eventId: events.id,
          eventName: events.name,
          eventLogo: events.imageUrl,
          eventDate: events.eventDate,
          eventTime: events.eventTime,
          description: events.description,
          location: events.location,
          
        })
        .from(chats)
        .leftJoin(events, eq(chats.eventId, events.id))
        .where(eq(chats.id, chatId));

      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
    
      
        // 3️⃣ Get members
  const members = await db
    .select({
      id: chatMembers.profileId,
      role: chatMembers.role,
      joinedAt: chatMembers.joinedAt,

      firstName: profiles.firstName,
      lastName: profiles.lastName,
      username: profiles.username,
      avatarUrl: profiles.avatarUrl,
    })
    .from(chatMembers)
    .innerJoin(profiles, eq(profiles.id, chatMembers.profileId))
    .where(eq(chatMembers.chatId, chatId));


      // 3️⃣ Get messages
      const chatMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.chatId, chatId))
        .orderBy(desc(messages.createdAt));

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
                location:chat.location,
                description:chat.description
              }
            : null,
        },
        members,
        messages: chatMessages,
      });
    } catch (error: any) {
      console.error(error);
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
