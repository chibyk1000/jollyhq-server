
import express from "express";
import { WalletController } from "../controllers/walletController";
import { verifySupabaseToken } from "../middlewares/verify";



const router = express.Router();

router.post("/credit-card", verifySupabaseToken, WalletController.addCard)

router.post("/webhook", WalletController.handleWebhook);




export default router