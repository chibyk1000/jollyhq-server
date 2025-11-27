import { Router } from "express";
import usersRoutes from "./usersRoutes"
const router = Router()

router.use("/users", router)
export default router