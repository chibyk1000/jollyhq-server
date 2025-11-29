import { Router } from "express";
import usersRoutes from "./usersRoutes"
import plannerRoutes from "./eventPlanner"

const router = Router()

router.use("/users",   usersRoutes)
router.use("/event-planners",   plannerRoutes)
export default router