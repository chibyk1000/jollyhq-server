import { Router } from "express";
import { OrderController } from "../controllers/orderController";
import { verifyToken } from "../middlewares/verify";

const router = Router();

router.get("/:orderReference", verifyToken, OrderController.getUserOrders )

export default router