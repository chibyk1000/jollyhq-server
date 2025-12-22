"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSettingsController = void 0;
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const settings_1 = require("../db/schema/settings");
class UserSettingsController {
    // ===============================
    // GET USER SETTINGS
    // ===============================
    static async getSettings(req, res) {
        try {
            const userId = req.user?.id;
            const settings = await db_1.db
                .select()
                .from(settings_1.userSettings)
                .where((0, drizzle_orm_1.eq)(settings_1.userSettings.userId, userId))
                .limit(1);
            // Auto-create settings if missing
            if (!settings.length) {
                const [created] = await db_1.db
                    .insert(settings_1.userSettings)
                    .values({ userId: userId })
                    .returning();
                return res.json({ settings: created });
            }
            return res.json({ settings: settings[0] });
        }
        catch (error) {
            console.log(error);
            return res.status(500).json({
                message: "Failed to fetch settings",
                error: error.message,
            });
        }
    }
    // ===============================
    // UPDATE SETTINGS (toggles)
    // ===============================
    static async updateSettings(req, res) {
        try {
            const userId = req.user?.id;
            const { notificationsEnabled, darkModeEnabled, language, plannerModeEnabled, vendorModeEnabled, activeAccountMode, } = req.body;
            const [updated] = await db_1.db
                .insert(settings_1.userSettings)
                .values({
                userId,
                notificationsEnabled,
                darkModeEnabled,
                language,
                plannerModeEnabled,
                vendorModeEnabled,
                activeAccountMode,
            })
                .onConflictDoUpdate({
                target: settings_1.userSettings.userId,
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
        }
        catch (error) {
            console.log(error);
            return res.status(500).json({
                message: "Failed to update settings",
                error: error.message,
            });
        }
    }
    // ===============================
    // SWITCH ACCOUNT MODE (exclusive)
    // ===============================
    static async switchAccountMode(req, res) {
        try {
            const userId = req.user?.id;
            const { mode } = req.body;
            // Enforce exclusivity
            const update = {
                activeAccountMode: mode,
            };
            if (mode === "planner") {
                update.plannerModeEnabled = true;
            }
            if (mode === "vendor") {
                update.vendorModeEnabled = true;
            }
            const [updated] = await db_1.db
                .update(settings_1.userSettings)
                .set(update)
                .where((0, drizzle_orm_1.eq)(settings_1.userSettings.userId, userId))
                .returning();
            return res.json({ settings: updated });
        }
        catch (error) {
            console.log(error);
            return res.status(500).json({
                message: "Failed to switch account mode",
                error: error.message,
            });
        }
    }
}
exports.UserSettingsController = UserSettingsController;
