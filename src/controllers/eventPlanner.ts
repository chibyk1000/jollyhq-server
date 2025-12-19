import { Request, Response } from "express";
import { uploadToSupabase } from "../utils/upload";
import { db } from "../db";
import { eventPlanners } from "../db/schema/eventPlanners";
import { eq } from "drizzle-orm";
import { WalletController } from "./wallletController";
import { logger } from "../utils/logger";
import { wallets } from "../db/schema/wallet";

export class EventPlannerControllers {
  static async createEventPlanner(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Check if user already has a profile
      const existingPlanner = await db
        .select()
        .from(eventPlanners)
        .where(eq(eventPlanners.profileId, userId));

      if (existingPlanner.length > 0) {
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

      if (!businessName)
        return res.status(400).json({ message: "Business name is required" });

      // FILES
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      let logoUrl: string | null = null;
      let idDocumentUrl: string | null = null;
      let businessDocumentUrl: string | null = null;

      if (files?.logo?.[0])
        logoUrl = await uploadToSupabase(files.logo[0], "logos");

      if (files?.idDocument?.[0])
        idDocumentUrl = await uploadToSupabase(
          files.idDocument[0],
          "kyc/user-id"
        );

      if (files?.businessDocument?.[0])
        businessDocumentUrl = await uploadToSupabase(
          files.businessDocument[0],
          "kyc/business-docs"
        );

      // Insert Event Planner into DB
      const [planner] = await db
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

      // Create wallet for the new event planner
      await db.insert(wallets).values({
        ownerId: planner.id,
        ownerType: "event-planner",
        balance: 0,
        currency: "NGN",
        isActive: true,
      });

      return res.status(200).json({
        message: "Event planner profile created",
        data: planner,
      });
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({
        message: "Failed to create event planner profile",
        error: error.message,
      });
    }
  }

  // GET ONE
  static async getEventPlanner(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const data = await db
        .select({
          eventPlanner: eventPlanners,
          wallet: wallets,
        })
        .from(eventPlanners)
        .leftJoin(wallets, eq(wallets.ownerId, eventPlanners.id))
        .where(eq(eventPlanners.profileId, id));

      if (data.length === 0) {
        return res.status(404).json({ message: "Event planner not found" });
      }
console.log(data);

      return res.status(200).json({
        event_planner: {
          ...data[0].eventPlanner,
          wallet: data[0].wallet ?? null,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        message: "Failed to get event planner",
        error: error.message,
      });
    }
  }

  // UPDATE
  static async updateEventPlanner(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const body = req.body;
      const files = req.files as Record<string, Express.Multer.File[]>;

      const current = await db
        .select()
        .from(eventPlanners)
        .where(eq(eventPlanners.id, id));

      if (current.length === 0)
        return res.status(404).json({ message: "Event planner not found" });

      // Upload new files if provided
      let logoUrl = current[0].logoUrl;
      let idDocumentUrl = current[0].idDocumentUrl;
      let businessDocumentUrl = current[0].businessDocumentUrl;

      if (files?.logo?.[0])
        logoUrl = await uploadToSupabase(files.logo[0], "logos");

      if (files?.idDocument?.[0])
        idDocumentUrl = await uploadToSupabase(
          files.idDocument[0],
          "kyc/user-id"
        );

      if (files?.businessDocument?.[0])
        businessDocumentUrl = await uploadToSupabase(
          files.businessDocument[0],
          "kyc/business-docs"
        );

      const [updated] = await db
        .update(eventPlanners)
        .set({
          ...body,
          logoUrl,
          idDocumentUrl,
          businessDocumentUrl,
        })
        .where(eq(eventPlanners.id, id))
        .returning();

      return res.status(200).json({
        message: "Event Planner updated",
        data: updated,
      });
    } catch (error: any) {
      console.log(error);

      logger.error(error.message);
      return res.status(500).json({
        message: "Update failed",
        error: error.message,
      });
    }
  }
  // GET ALL with wallet
  static async getEventPlanners(req: Request, res: Response) {
    try {
      const data = await db
        .select({
          planner: eventPlanners,
          wallet: wallets,
        })
        .from(eventPlanners);

      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({
        message: "Failed to get event planners",
        error: error.message,
      });
    }
  }

  // DELETE
  static async deleteEventPlanner(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [deleted] = await db
        .delete(eventPlanners)
        .where(eq(eventPlanners.id, id))
        .returning();

      if (!deleted)
        return res.status(404).json({ message: "Event planner not found" });

      return res.status(200).json({
        message: "Event planner deleted",
        data: deleted,
      });
    } catch (error: any) {
      return res.status(500).json({
        message: "Delete failed",
        error: error.message,
      });
    }
  }
}
