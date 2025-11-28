import { Router } from "express";
import usersRoutes from "./usersRoutes"
import { upload } from "../middlewares/upload";
const router = Router()

router.use("/users",  upload.single("avatar"), router)
export default router