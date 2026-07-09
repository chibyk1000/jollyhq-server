import { Router } from "express";
import { verifyToken } from "../middlewares/verify";
import { UserSettingsController } from "../controllers/settings";

const router = Router();

router.get("/", verifyToken, UserSettingsController.getSettings);
router.put("/", verifyToken, UserSettingsController.updateSettings);
router.post(
  "/switch-mode",
  verifyToken,
  UserSettingsController.switchAccountMode,
);

export default router;
