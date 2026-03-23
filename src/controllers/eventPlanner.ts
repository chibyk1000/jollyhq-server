import { Request, Response } from "express";
import { uploadToSupabase } from "../utils/upload";
import { db } from "../db";
import { eventPlanners } from "../db/schema/eventPlanners";
import { and, eq } from "drizzle-orm";
import { logger } from "../utils/logger";
import { wallets } from "../db/schema/wallet";
import WalletService from "../services/walletServices";

export class EventPlannerControllers {
  // ── CREATE ────────────────────────────────────────────────────────────────
  static async createEventPlanner(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Guard: one profile per user
      const [existing] = await db
        .select()
        .from(eventPlanners)
        .where(eq(eventPlanners.profileId, userId));

      if (existing) {
        return res
          .status(400)
          .json({ message: "Event planner profile already exists" });
      }

      const {
        businessName,
        businessEmail,
        businessPhone,
        address,
        city,
        state,
        country,
        postalCode,
        website,
        nin,
        bvn,
        instagram,
        facebook,
        twitter,
      } = req.body;

      if (!businessName) {
        return res.status(400).json({ message: "Business name is required" });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      const [logoUrl, idDocumentUrl, businessDocumentUrl] = await Promise.all([
        files?.logo?.[0]
          ? uploadToSupabase(files.logo[0], "logos")
          : Promise.resolve(null),
        files?.idDocument?.[0]
          ? uploadToSupabase(files.idDocument[0], "kyc/user-id")
          : Promise.resolve(null),
        files?.businessDocument?.[0]
          ? uploadToSupabase(files.businessDocument[0], "kyc/business-docs")
          : Promise.resolve(null),
      ]);

      // Create planner profile + wallet atomically
      const { planner, wallet } = await db.transaction(async (tx) => {
        const [planner] = await tx
          .insert(eventPlanners)
          .values({
            profileId: userId,
            businessName,
            businessEmail,
            businessPhone,
            address,
            city,
            state,
            country,
            postalCode,
            website,
            nin,
            bvn,
            instagram,
            facebook,
            twitter,
            logoUrl,
            idDocumentUrl,
            businessDocumentUrl,
          })
          .returning();

        // Provision event_planner wallet inside the same transaction
        const [wallet] = await tx
          .insert(wallets)
          .values({
            userId,
            ownerType: "event_planner",
            balance: 0,
            currency: "NGN",
          })
          .returning();

        return { planner, wallet };
      });

      return res.status(201).json({
        message: "Event planner profile created",
        data: { ...planner, wallet },
      });
    } catch (error: any) {
      console.error("Create event planner error:", error);
      return res.status(500).json({
        message: "Failed to create event planner profile",
        error: error.message,
      });
    }
  }

  // ── GET ONE ───────────────────────────────────────────────────────────────
  static async getEventPlanner(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [data] = await db
        .select({
          planner: eventPlanners,
          wallet: wallets,
        })
        .from(eventPlanners)
        .leftJoin(
          wallets,
          and(
            eq(wallets.userId, eventPlanners.profileId),
            eq(wallets.ownerType, "event_planner"),
          ),
        )
        .where(eq(eventPlanners.profileId, id));

      if (!data) {
        return res.status(404).json({ message: "Event planner not found" });
      }

      return res.status(200).json({
        success: true,
        data: {
          ...data.planner,
          wallet: data.wallet ?? null,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        message: "Failed to get event planner",
        error: error.message,
      });
    }
  }

  // ── GET ALL ───────────────────────────────────────────────────────────────
  static async getEventPlanners(req: Request, res: Response) {
    try {
      const data = await db
        .select({
          planner: eventPlanners,
          wallet: wallets,
        })
        .from(eventPlanners)
        .leftJoin(
          wallets,
          and(
            eq(wallets.userId, eventPlanners.profileId),
            eq(wallets.ownerType, "event_planner"),
          ),
        );

      return res.status(200).json({
        success: true,
        data: data.map((d) => ({ ...d.planner, wallet: d.wallet ?? null })),
      });
    } catch (error: any) {
      return res.status(500).json({
        message: "Failed to get event planners",
        error: error.message,
      });
    }
  }

  // ── UPDATE ────────────────────────────────────────────────────────────────
  static async updateEventPlanner(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const body = req.body;

      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const [current] = await db
        .select()
        .from(eventPlanners)
        .where(eq(eventPlanners.id, id));

      if (!current) {
        return res.status(404).json({ message: "Event planner not found" });
      }

      // Only the owner can update their own profile
      if (current.profileId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const files = req.files as Record<string, Express.Multer.File[]>;

      const [logoUrl, idDocumentUrl, businessDocumentUrl] = await Promise.all([
        files?.logo?.[0]
          ? uploadToSupabase(files.logo[0], "logos")
          : Promise.resolve(current.logoUrl),
        files?.idDocument?.[0]
          ? uploadToSupabase(files.idDocument[0], "kyc/user-id")
          : Promise.resolve(current.idDocumentUrl),
        files?.businessDocument?.[0]
          ? uploadToSupabase(files.businessDocument[0], "kyc/business-docs")
          : Promise.resolve(current.businessDocumentUrl),
      ]);

      const [updated] = await db
        .update(eventPlanners)
        .set({
          ...body,
          logoUrl,
          idDocumentUrl,
          businessDocumentUrl,
          updatedAt: new Date(),
        })
        .where(eq(eventPlanners.id, id))
        .returning();

      return res.status(200).json({
        success: true,
        message: "Event planner updated",
        data: updated,
      });
    } catch (error: any) {
      logger.error(error.message);
      return res
        .status(500)
        .json({ message: "Update failed", error: error.message });
    }
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  static async deleteEventPlanner(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const [current] = await db
        .select()
        .from(eventPlanners)
        .where(eq(eventPlanners.id, id));

      if (!current) {
        return res.status(404).json({ message: "Event planner not found" });
      }

      // Only the owner can delete their own profile
      if (current.profileId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const [deleted] = await db
        .delete(eventPlanners)
        .where(eq(eventPlanners.id, id))
        .returning();

      return res.status(200).json({
        success: true,
        message: "Event planner deleted",
        data: deleted,
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Delete failed", error: error.message });
    }
  }
}
