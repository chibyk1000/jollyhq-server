import { Request, Response } from "express";
import { db } from "../db";
import { and, eq, desc, sql, inArray } from "drizzle-orm";
import { chats } from "../db/schema/chats";
import { chatMembers } from "../db/schema/chatMembers";
import { messages } from "../db/schema/messages";
import { eventPlanners, events, messageReads, user as profiles, user, vendors } from "../db/schema";

/* ---------------------------------------------------
   GET USER CHAT GROUPS
--------------------------------------------------- */
export class ChatController {
  static async getMyChats(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userChats = await db
        .select({
          chatId: chats.id,
          chatName: chats.name,

          // context
          eventId: chats.eventId,
          vendorId: chats.vendorId,
          directType: chats.directType,
          isGroup: chats.isGroup,

          // event info
          eventName: events.name,
          eventLogo: events.imageUrl,

          // vendor info
          vendorName: vendors.businessName,
          vendorLogo: vendors.image,

          // meta
          joinedAt: chatMembers.joinedAt,
          membersCount: sql<number>`count(${chatMembers.id})::int`,

          // last message
          lastMessage: chats.lastMessagePreview,
          lastMessageTime: chats.lastMessageAt,
        })
        .from(chatMembers)
        .innerJoin(chats, eq(chatMembers.chatId, chats.id))

        // context joins
        .leftJoin(events, eq(chats.eventId, events.id))
        .leftJoin(vendors, eq(chats.vendorId, vendors.id))

        .where(eq(chatMembers.profileId, userId))

        .groupBy(
          chats.id,
          chats.name,
          chats.eventId,
          chats.vendorId,
          chats.directType,
          chats.isGroup,
          chats.lastMessagePreview,
          chats.lastMessageAt,

          chatMembers.joinedAt,

          events.name,
          events.imageUrl,

          vendors.businessName,
          vendors.image,
        )

        .orderBy(desc(chats.lastMessageAt));

      return res.json(userChats);
    } catch (error: any) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  }
  static async findOrCreateDirectChat(req: Request, res: Response) {
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
      const targetUser = await db.query.user.findFirst({
        where: eq(profiles.id, targetUserId),
        columns: { id: true },
      });

      if (!targetUser) {
        return res.status(404).json({ error: "Target user not found." });
      }

      // Find the vendor record so we can attach vendorId to the chat
      const vendor = await db.query.vendors.findFirst({
        where: eq(vendors.userId, targetUserId), // ← userId not id
        columns: { id: true },
      });

      // 1. All DM chats of this type the current user is in
      const myMemberships = await db
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
        .where(eq(chatMembers.profileId, currentUserId));

      const candidateIds = myMemberships.map((m) => m.chatId);

      // 2. Check if target is also in any of those chats
      if (candidateIds.length > 0) {
        const shared = await db
          .select({ chatId: chatMembers.chatId })
          .from(chatMembers)
          .where(
            and(
              eq(chatMembers.profileId, targetUserId), // ← targetUserId directly
              inArray(chatMembers.chatId, candidateIds),
            ),
          )
          .limit(1);

        if (shared.length > 0) {
          return res.json({ chatId: shared[0].chatId, isNew: false });
        }
      }

      // 3. Create new chat atomically
      const chatId = await db.transaction(async (tx) => {
        const [chat] = await tx
          .insert(chats)
          .values({
            isGroup: false,
            directType,
            vendorId: vendor?.id ?? null, // attach vendor context if found
          })
          .returning();

        await tx.insert(chatMembers).values([
          { chatId: chat.id, profileId: currentUserId, role: "member" },
          { chatId: chat.id, profileId: targetUserId, role: "member" },
        ]);

        return chat.id;
      });

      return res.json({ chatId, isNew: true });
    } catch (err) {
      console.error("findOrCreateDirectChat error:", err);
      return res.status(500).json({ error: "Failed to resolve chat" });
    }
  }
  static async getChatById(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { chatId } = req.params;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!chatId) {
        return res.status(400).json({ message: "Chat ID is required" });
      }

      // Check if user is a member of this chat
      const membership = await db
        .select()
        .from(chatMembers)
        .where(
          and(
            eq(chatMembers.chatId, chatId),
            eq(chatMembers.profileId, userId),
          ),
        )
        .limit(1);

      if (!membership.length) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Fetch chat details with event planner info
      const [chat] = await db
        .select({
          chatId: chats.id,
          chatName: chats.name,
          isGroup: chats.isGroup,
          createdAt: chats.createdAt,
          eventId: chats.eventId,
          vendorId: chats.vendorId,
          lastMessage: chats.lastMessagePreview,
          lastMessageTime: chats.lastMessageAt,

          // Event details
          eventName: events.name,
          eventLogo: events.imageUrl,
          eventType: events.eventType,
          eventCategory: events.category,
          eventDate: events.eventDate,
          eventTime: events.eventTime,
          eventLocation: events.location,
          eventDescription: events.description,

          // Event planner details
          plannerId: eventPlanners.id,
          plannerBusinessName: eventPlanners.businessName,
          plannerBusinessEmail: eventPlanners.businessEmail,
          plannerBusinessPhone: eventPlanners.businessPhone,
          plannerLogo: eventPlanners.logoUrl,
          plannerInstagram: eventPlanners.instagram,
          plannerFacebook: eventPlanners.facebook,
          plannerTwitter: eventPlanners.twitter,
          plannerCity: eventPlanners.city,
          plannerState: eventPlanners.state,
          plannerCountry: eventPlanners.country,
          plannerIsVerified: eventPlanners.isVerified,

          // Vendor details
          vendorName: vendors.businessName,
          vendorLogo: vendors.image,

          membersCount: sql<number>`count(distinct ${chatMembers.id})::int`,
        })
        .from(chats)
        .leftJoin(events, eq(chats.eventId, events.id))
        .leftJoin(eventPlanners, eq(events.plannerId, eventPlanners.id))
        .leftJoin(vendors, eq(chats.vendorId, vendors.id))
        .innerJoin(chatMembers, eq(chatMembers.chatId, chats.id))
        .where(eq(chats.id, chatId))
        .groupBy(
          chats.id,
          chats.name,
          chats.isGroup,
          chats.createdAt,
          chats.eventId,
          chats.vendorId,
          chats.lastMessagePreview,
          chats.lastMessageAt,
          events.name,
          events.imageUrl,
          events.eventType,
          events.category,
          events.eventDate,
          events.eventTime,
          events.location,
          events.description,
          eventPlanners.id,
          eventPlanners.businessName,
          eventPlanners.businessEmail,
          eventPlanners.businessPhone,
          eventPlanners.logoUrl,
          eventPlanners.instagram,
          eventPlanners.facebook,
          eventPlanners.twitter,
          eventPlanners.city,
          eventPlanners.state,
          eventPlanners.country,
          eventPlanners.isVerified,
          vendors.businessName,
          vendors.image,
        )
        .limit(1);

      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      // Fetch all members with full profile info
      const members = await db
        .select({
          memberId: chatMembers.id,
          profileId: chatMembers.profileId,
          joinedAt: chatMembers.joinedAt,
          role: chatMembers.role,
          isMuted: chatMembers.isMuted,
          isBanned: chatMembers.isBanned,
          // Profile info
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          avatar: user.image,
          email: user.email,
        })
        .from(chatMembers)
        .innerJoin(user, eq(chatMembers.profileId, user.id))
        .where(
          and(eq(chatMembers.chatId, chatId), eq(chatMembers.isBanned, false)),
        )
        .orderBy(chatMembers.joinedAt);

      return res.json({ ...chat, members });
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
          eq(chatMembers.profileId, userId),
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
                location: chat.location,
                description: chat.description,
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
          eq(chatMembers.profileId, userId),
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
          eq(chatMembers.role, "admin"),
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
          eq(chatMembers.role, "admin"),
        ),
      });

      if (!admin) return res.status(403).json({ message: "Admins only" });

      await db
        .delete(chatMembers)
        .where(
          and(
            eq(chatMembers.chatId, chatId),
            eq(chatMembers.profileId, profileId),
          ),
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
          eq(chatMembers.role, "admin"),
        ),
      });

      if (!admin) return res.status(403).json({ message: "Admins only" });

      await db
        .update(chatMembers)
        .set({ role: "admin" })
        .where(
          and(
            eq(chatMembers.chatId, chatId),
            eq(chatMembers.profileId, profileId),
          ),
        );

      return res.json({ message: "User is now admin" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
