import { Request, Response } from "express";
import { db } from "../db"; // adjust path
import { vendors } from "../db/schema/vendors";
import { eq, and, isNull, desc } from "drizzle-orm";
import { uploadToSupabase } from "../utils/upload";
import { wallets } from "../db/schema/wallet";
import { vendorServices } from "../db/schema/vendorServices";
import { chatMembers, chats, messages } from "../db/schema";

export class VendorsController {
  /**
   * CREATE vendor
   */
  static async create(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
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

      let imageUrl: string | null = null;

      // Because you're using upload.single("image")
      if (req.file) {
        imageUrl = await uploadToSupabase(req.file, "vendors");
      }

      const [vendor] = await db
        .insert(vendors)
        .values({
          userId: userId as string,
          businessName,
          contactName,
          contactEmail,
          contactPhone,
          category,
          description,
          image: imageUrl as string, // ✅ now defined
          priceRange,
          location,
          city,
          responseTime,
        })
        .returning();
      // Create wallet for the new event planner
  
      return res.status(201).json(vendor);
    } catch (error) {
      console.error("Create vendor error:", error);
      return res.status(500).json({ message: "Failed to create vendor" });
    }
  }

  /**
   * GET all vendors (active, not deleted)
   */
  static async getAll(_req: Request, res: Response) {
    try {
      const data = await db
        .select()
        .from(vendors)
        .where(and(eq(vendors.isActive, true), isNull(vendors.deletedAt)));

      return res.json(data);
    } catch (error) {
      console.error("Get vendors error:", error);
      return res.status(500).json({ message: "Failed to fetch vendors" });
    }
  }

  /**
   * GET vendor by ID
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Fetch vendor
      const [vendor] = await db
        .select()
        .from(vendors)
        .where(and(eq(vendors.id, id), isNull(vendors.deletedAt)));

      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      // Fetch vendor services
      const services = await db
        .select()
        .from(vendorServices)
        .where(eq(vendorServices.vendorId, vendor.id));

      return res.json({
        ...vendor,
        services,
      });
    } catch (error) {
      console.error("Get vendor error:", error);
      return res.status(500).json({ message: "Failed to fetch vendor" });
    }
  }

  /**
   * GET vendor by userId
   */
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

      return res.json(vendor);
    } catch (error) {
      console.error("Get vendor by user error:", error);
      return res.status(500).json({ message: "Failed to fetch vendor" });
    }
  }

  /**
   * UPDATE vendor
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;

      let imageUrl: string | undefined;

      // 1️⃣ Upload image if present
      if (req.file) {
        imageUrl = await uploadToSupabase(req.file, "vendors");
      }

      // 2️⃣ Build update payload safely
      const updateData: Partial<typeof vendors.$inferInsert> = {
        businessName: req.body.businessName,
        category: req.body.category,
        description: req.body.description,
        contactName: req.body.contactName,
        contactEmail: req.body.contactEmail,
        contactPhone: req.body.contactPhone,
        priceRange: req.body.priceRange,
        responseTime: req.body.responseTime,
        location: req.body.location,
        city: req.body.city,
        isActive:
          req.body.isActive !== undefined
            ? req.body.isActive === "true"
            : undefined,
        updatedAt: new Date(),
      };

      // 3️⃣ Attach image only if uploaded
      if (imageUrl) {
        updateData.image = imageUrl;
      }

      // 4️⃣ Remove undefined fields
      Object.keys(updateData).forEach(
        (key) =>
          updateData[key as keyof typeof updateData] === undefined &&
          delete updateData[key as keyof typeof updateData]
      );

      const [vendor] = await db
        .update(vendors)
        .set(updateData)
        .where(and(eq(vendors.id, id), isNull(vendors.deletedAt)))
        .returning();

      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      return res.json(vendor);
    } catch (error) {
      console.error("Update vendor error:", error);
      return res.status(500).json({ message: "Failed to update vendor" });
    }
  }

  /**
   * SOFT DELETE vendor
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [vendor] = await db
        .update(vendors)
        .set({
          deletedAt: new Date(),
          isActive: false,
        })
        .where(eq(vendors.id, id))
        .returning();

      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      return res.json({ message: "Vendor deleted successfully" });
    } catch (error) {
      console.error("Delete vendor error:", error);
      return res.status(500).json({ message: "Failed to delete vendor" });
    }
  }
  /**
   * GET all chats for a vendor
   */
  static async getVendorChats(req: Request, res: Response) {
    try {
      const { vendorId } = req.params;

      // Ensure vendor exists
      const [vendor] = await db
        .select()
        .from(vendors)
        .where(and(eq(vendors.id, vendorId), isNull(vendors.deletedAt)));

      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      // Fetch chats linked to this vendor
      const vendorChats = await db
        .select({
          chat: chats,
          member: chatMembers,
          lastMessage: messages,
        })
        .from(chats)
        .leftJoin(chatMembers, eq(chatMembers.chatId, chats.id))
        .leftJoin(messages, eq(messages.chatId, chats.id))
        .where(eq(chats.vendorId, vendorId))
        .orderBy(desc(chats.createdAt));

      /**
       * Group members & messages by chat
       */
      const chatMap = new Map<string, any>();

      for (const row of vendorChats) {
        const chatId = row.chat.id;

        if (!chatMap.has(chatId)) {
          chatMap.set(chatId, {
            ...row.chat,
            members: [],
            lastMessage: null,
          });
        }

        if (row.member) {
          chatMap.get(chatId).members.push(row.member);
        }

        if (row.lastMessage) {
          chatMap.get(chatId).lastMessage = row.lastMessage;
        }
      }

      return res.status(200).json({
        chats: Array.from(chatMap.values()),
      });
    } catch (error) {
      console.error("Get vendor chats error:", error);
      return res.status(500).json({
        message: "Failed to fetch vendor chats",
      });
    }
  }

  static async getByProfile(req: Request, res: Response) {
    try {
      const { id } = req.params; // profileId OR userId (see note below)

      const data = await db
        .select({
          vendor: vendors,
          wallet: wallets,
        })
        .from(vendors)
        .leftJoin(wallets, eq(wallets.userId, id))
        .where(
          and(
            eq(vendors.userId, id), // 👈 vendor belongs to this user/profile
            isNull(vendors.deletedAt)
          )
        );

      if (data.length === 0) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      return res.status(200).json({
        vendor: {
          ...data[0].vendor,
          wallet: data[0].wallet ?? null,
        },
      });
    } catch (error: any) {
      console.error("Get vendor error:", error);
      return res.status(500).json({
        message: "Failed to get vendor",
        error: error.message,
      });
    }
  }
}
