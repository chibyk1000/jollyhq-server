import { Router } from "express";
import { UserControllers } from "../controllers/users";
import { verifySupabaseToken } from "../middlewares/verify";
import { upload } from "../middlewares/upload";

const router = Router()
router.post("/", verifySupabaseToken, upload.single("avatar"), UserControllers.createUser)
router.get("/:id", verifySupabaseToken,  UserControllers.getProfile)
export default router