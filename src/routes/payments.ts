import express from "express";
import { WalletController } from "../controllers/walletController";
import { verifyToken } from "../middlewares/verify";

const router = express.Router();

router.post("/credit-card", verifyToken, WalletController.addCard);

router.post("/webhook", WalletController.handleWebhook);

router.post("/checkout", verifyToken, WalletController.createCheckoutOrder);
router.post("/payment-intent", verifyToken, WalletController.paymentIntent);

export default router;
