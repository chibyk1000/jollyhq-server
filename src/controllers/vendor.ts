import { Request, Response } from "express";
import { db } from "../db";
import { vendors } from "../db/schema/vendors";
import { eq, and, isNull, desc, sql, inArray } from "drizzle-orm";
import { uploadToSupabase } from "../utils/upload";
import { wallets } from "../db/schema/wallet";
import { vendorServices } from "../db/schema/vendorServices";
import { chatMembers, chats, messages, user } from "../db/schema";

export class VendorsController {
  // ── CREATE ────────────────────────────────────────────────────────────────
  static async create(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Guard: one vendor profile per user
      const [existing] = await db
        .select()
        .from(vendors)
        .where(and(eq(vendors.userId, userId), isNull(vendors.deletedAt)));

      if (existing) {
        return res
          .status(400)
          .json({ message: "Vendor profile already exists" });
      }

      const {
        businessName,
        contactName,
        contactEmail,
        contactPhone,
        category,
        description,
        priceRange,
        location,
        city,
        responseTime,
      } = req.body;

      if (
        !contactName ||
        !contactEmail ||
        !contactPhone ||
        !category ||
        !priceRange ||
        !location ||
        !responseTime
      ) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Vendor image is required" });
      }

      const imageUrl = await uploadToSupabase(req.file, "vendors");

      // Create vendor + wallet atomically
      const { vendor, wallet } = await db.transaction(async (tx) => {
        const [vendor] = await tx
          .insert(vendors)
          .values({
            userId,
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
          .insert(wallets)
          .values({
            userId,
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
    } catch (error: any) {
      console.error("Create vendor error:", error);
      return res
        .status(500)
        .json({ message: "Failed to create vendor", error: error.message });
    }
  }

  // ── GET ALL (active, not deleted) ─────────────────────────────────────────
  static async getAll(_req: Request, res: Response) {
    try {
      const data = await db
        .select()
        .from(vendors)
        .where(and(eq(vendors.isActive, true), isNull(vendors.deletedAt)));

      return res.json({ success: true, data });
    } catch (error: any) {
      console.error("Get vendors error:", error);
      return res
        .status(500)
        .json({ message: "Failed to fetch vendors", error: error.message });
    }
  }

  // ── GET BY ID ─────────────────────────────────────────────────────────────
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [vendor] = await db
        .select()
        .from(vendors)
        .where(and(eq(vendors.id, id), isNull(vendors.deletedAt)));

      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      const services = await db
        .select()
        .from(vendorServices)
        .where(eq(vendorServices.vendorId, vendor.id));

      return res.json({ success: true, data: { ...vendor, services } });
    } catch (error: any) {
      console.error("Get vendor error:", error);
      return res
        .status(500)
        .json({ message: "Failed to fetch vendor", error: error.message });
    }
  }

  // ── GET BY USER ID ────────────────────────────────────────────────────────
  static async getByUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const [vendor] = await db
        .select()
        .from(vendors)
        .where(and(eq(vendors.userId, userId), isNull(vendors.deletedAt)));

      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      return res.json({ success: true, data: vendor });
    } catch (error: any) {
      console.error("Get vendor by user error:", error);
      return res
        .status(500)
        .json({ message: "Failed to fetch vendor", error: error.message });
    }
  }

  // ── GET BY PROFILE (with wallet) ──────────────────────────────────────────
  static async getByProfile(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [data] = await db
        .select({
          vendor: vendors,
          wallet: wallets,
        })
        .from(vendors)
        .leftJoin(
          wallets,
          and(
            eq(wallets.userId, id),
            eq(wallets.ownerType, "vendor"), // ← scoped to vendor wallet only
          ),
        )
        .where(and(eq(vendors.userId, id), isNull(vendors.deletedAt)));

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
    } catch (error: any) {
      console.error("Get vendor profile error:", error);
      return res
        .status(500)
        .json({ message: "Failed to get vendor", error: error.message });
    }
  }

  // ── UPDATE ────────────────────────────────────────────────────────────────
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const [current] = await db
        .select()
        .from(vendors)
        .where(and(eq(vendors.id, id), isNull(vendors.deletedAt)));

      if (!current) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      // Only the owner can update
      if (current.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const imageUrl = req.file
        ? await uploadToSupabase(req.file, "vendors")
        : current.image;

      // Build update payload — only include defined fields
      const updateData: Partial<typeof vendors.$inferInsert> = {
        updatedAt: new Date(),
        image: imageUrl,
      };

      const fields: Array<keyof typeof vendors.$inferInsert> = [
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
          (updateData as any)[field] = req.body[field];
        }
      }

      if (req.body.isActive !== undefined) {
        updateData.isActive =
          req.body.isActive === "true" || req.body.isActive === true;
      }

      const [updated] = await db
        .update(vendors)
        .set(updateData)
        .where(and(eq(vendors.id, id), isNull(vendors.deletedAt)))
        .returning();

      return res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error("Update vendor error:", error);
      return res
        .status(500)
        .json({ message: "Failed to update vendor", error: error.message });
    }
  }

  // ── SOFT DELETE ───────────────────────────────────────────────────────────
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const [current] = await db
        .select()
        .from(vendors)
        .where(and(eq(vendors.id, id), isNull(vendors.deletedAt)));

      if (!current) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      // Only the owner can delete
      if (current.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await db
        .update(vendors)
        .set({ deletedAt: new Date(), isActive: false })
        .where(eq(vendors.id, id));

      return res.json({
        success: true,
        message: "Vendor deleted successfully",
      });
    } catch (error: any) {
      console.error("Delete vendor error:", error);
      return res
        .status(500)
        .json({ message: "Failed to delete vendor", error: error.message });
    }
  }

  // ── GET VENDOR CHATS ──────────────────────────────────────────────────────
  static async getVendorChats(req: Request, res: Response) {
    try {
      const { vendorId } = req.params;

      // 1. Verify vendor exists
      const [vendor] = await db
        .select({ id: vendors.id })
        .from(vendors)
        .where(and(eq(vendors.id, vendorId), isNull(vendors.deletedAt)));

      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      // 2. Fetch all chats for this vendor — one row per chat
      //    Last message is resolved via a correlated subquery so we never
      //    get one row per message
      const vendorChats = await db
        .select({
          id: chats.id,
          name: chats.name,
          isGroup: chats.isGroup,
          directType: chats.directType,
          vendorId: chats.vendorId,
          eventId: chats.eventId,
          lastMessagePreview: chats.lastMessagePreview,
          lastMessageAt: chats.lastMessageAt,
          createdAt: chats.createdAt,
        })
        .from(chats)
        .where(eq(chats.vendorId, vendorId))
        .orderBy(desc(chats.lastMessageAt));

      if (vendorChats.length === 0) {
        return res.status(200).json({ success: true, data: [] });
      }

      const chatIds = vendorChats.map((c) => c.id);

      // 3. Fetch all members with full profile info in one query
      const allMembers = await db
        .select({
          chatId: chatMembers.chatId,
          memberId: chatMembers.id,
          profileId: chatMembers.profileId,
          role: chatMembers.role,
          isMuted: chatMembers.isMuted,
          joinedAt: chatMembers.joinedAt,
          // Profile fields
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          avatar: user.image,
          username: user.username,
        })
        .from(chatMembers)
        .innerJoin(user, eq(user.id, chatMembers.profileId))
        .where(
          and(
            inArray(chatMembers.chatId, chatIds),
            eq(chatMembers.isBanned, false),
          ),
        );

      // 4. Fetch the single most recent message per chat using a
      //    DISTINCT ON query — far more efficient than joining all messages
      const lastMessages = await db.execute(sql`
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
      WHERE m.chat_id = ANY(${sql.raw(`ARRAY[${chatIds.map((id) => `'${id}'`).join(",")}]::uuid[]`)})
      ORDER BY m.chat_id, m.created_at DESC
    `);

      // 5. Build lookup maps for O(1) assembly
      const membersByChatId = new Map<string, any[]>();
      for (const m of allMembers) {
        if (!membersByChatId.has(m.chatId)) {
          membersByChatId.set(m.chatId, []);
        }
        membersByChatId.get(m.chatId)!.push({
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

      const lastMessageByChatId = new Map<string, any>();
      for (const msg of lastMessages.rows as any[]) {
        lastMessageByChatId.set(msg.chatId, msg);
      }

      // 6. Assemble final response
      const data = vendorChats.map((chat) => ({
        ...chat,
        members: membersByChatId.get(chat.id) ?? [],
        lastMessage: lastMessageByChatId.get(chat.id) ?? null,
      }));

      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error("Get vendor chats error:", error);
      return res.status(500).json({
        message: "Failed to fetch vendor chats",
        error: error.message,
      });
    }
  }
}
