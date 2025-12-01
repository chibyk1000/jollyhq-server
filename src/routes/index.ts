import { Router } from "express";
import usersRoutes from "./usersRoutes"
import plannerRoutes from "./eventPlanner"
import eventRoutes from "./event"
import ticketsRoutes from "./tickets"

const router = Router()

router.use("/users",   usersRoutes)
router.use("/tickets",   ticketsRoutes)
router.use("/events",   eventRoutes)
router.use("/event-planners",   plannerRoutes)
export default router