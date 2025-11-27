import { Router } from "express";
import { UserControllers } from "../controllers/users";

const router = Router()
router.post("/", UserControllers.createUser)
export default router