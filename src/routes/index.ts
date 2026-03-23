import { Router } from "express";
import usersRoutes from "./usersRoutes"
import chatsRoutes from "./chats"
import plannerRoutes from "./eventPlanner"
import vendorServicesRoutes from "./vendor-services"
import vendor from "./vendor"
import eventRoutes from "./event"
import ticketsRoutes from "./tickets"
import settingsRoutes from "./settings"
import authRoutes from "./auth"
import walletRoutes from "./payments"
import ordersRoutes from "./orders"
import bookingRoutes from "./bookings";
const router = Router()
// app.ts / index.ts
router.use("/bookings", bookingRoutes);
router.use("/users",   usersRoutes)
router.use("/orders",   ordersRoutes)
router.use("/auth",   authRoutes)
router.use("/wallets",   walletRoutes)
router.use("/vendors",   vendor)
router.use("/vendor-services",   vendorServicesRoutes)
router.use("/settings",   settingsRoutes)
router.use("/chats",   chatsRoutes)
router.use("/tickets",   ticketsRoutes)
router.use("/events",   eventRoutes)
router.use("/event-planners",   plannerRoutes)
export default router