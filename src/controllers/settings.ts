import { Request, Response } from "express";
import { db } from "../db";

import { eq } from "drizzle-orm";
import { userSettings } from "../db/schema/settings";

export class UserSettingsController {
  // ===============================
  // GET USER SETTINGS
  // ===============================
  static async getSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const settings = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId as string))
        .limit(1);

      // Auto-create settings if missing
      if (!settings.length) {
        const [created] = await db
          .insert(userSettings)
          .values({ userId:userId as string })
          .returning();

        return res.json({ settings: created });
      }

      return res.json({ settings: settings[0] });
    } catch (error: any) {
      return res.status(500).json({
        message: "Failed to fetch settings",
        error: error.message,
      });
    }
  }

  // ===============================
  // UPDATE SETTINGS (toggles)
  // ===============================
  static async updateSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id as string;

      const {
        notificationsEnabled,
        darkModeEnabled,
        language,
        plannerModeEnabled,
        vendorModeEnabled,
        activeAccountMode,
      } = req.body;

      const [updated] = await db
        .insert(userSettings)
        .values({
          userId ,
          notificationsEnabled,
          darkModeEnabled,
          language,
          plannerModeEnabled,
          vendorModeEnabled,
          activeAccountMode,
        })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: {
            notificationsEnabled,
            darkModeEnabled,
            language,
            plannerModeEnabled,
            vendorModeEnabled,
            activeAccountMode,
            updatedAt: new Date(),
          },
        })
        .returning();

      return res.json({ settings: updated });
    } catch (error: any) {
      return res.status(500).json({
        message: "Failed to update settings",
        error: error.message,
      });
    }
  }

  // ===============================
  // SWITCH ACCOUNT MODE (exclusive)
  // ===============================
  static async switchAccountMode(req: Request, res: Response) {
    try {
      const userId = req.user?.id as string;
      const { mode } = req.body as {
        mode: "planner" | "vendor" | null;
      };

      // Enforce exclusivity
      const update: any = {
        activeAccountMode: mode,
      };

      if (mode === "planner") {
        update.plannerModeEnabled = true;
      }

      if (mode === "vendor") {
        update.vendorModeEnabled = true;
      }

      const [updated] = await db
        .update(userSettings)
        .set(update)
        .where(eq(userSettings.userId, userId))
        .returning();

      return res.json({ settings: updated });
    } catch (error: any) {
      return res.status(500).json({
        message: "Failed to switch account mode",
        error: error.message,
      });
    }
  }
}
