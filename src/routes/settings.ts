import { Router } from "express";
import { verifySupabaseToken } from "../middlewares/verify";
import { UserSettingsController } from "../controllers/settings";


const router = Router();

router.get("/", verifySupabaseToken , UserSettingsController.getSettings);
router.put("/", verifySupabaseToken, UserSettingsController.updateSettings);
router.post(
  "/switch-mode",
  verifySupabaseToken,
  UserSettingsController.switchAccountMode
);

export default router;
