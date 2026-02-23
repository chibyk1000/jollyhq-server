import express from "express";
import { WalletController } from "../controllers/walletController";
import { verifyToken } from "../middlewares/verify";

const router = express.Router();

router.post("/credit-card", verifyToken, WalletController.addCard);

router.post("/webhook", WalletController.handleWebhook);

router.post("/checkout", verifyToken, WalletController.createCheckoutOrder);

export default router;
