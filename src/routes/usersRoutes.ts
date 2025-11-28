import { Router } from "express";
import { UserControllers } from "../controllers/users";
import { verifySupabaseToken } from "../middlewares/verify";

const router = Router()
router.post("/", verifySupabaseToken, UserControllers.createUser)
export default router