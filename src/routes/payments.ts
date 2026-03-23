import express from "express";
import { WalletController } from "../controllers/walletController";
import { verifyToken } from "../middlewares/verify";

const router = express.Router();

// ── Webhook (no auth — Nomba calls this directly) ──────────────────────────
router.post("/webhook", WalletController.handleWebhook);

// ── Checkout (any authenticated user — buying tickets) ─────────────────────
router.post("/checkout", verifyToken, WalletController.createCheckoutOrder);
// routes/wallet.routes.ts
router.post("/checkout/service", verifyToken, WalletController.createServiceCheckoutOrder);
// ── Wallet (event planners + vendors only) ─────────────────────────────────
router.get("/", verifyToken, WalletController.getMyWallet);
router.get("/all", verifyToken, WalletController.getAllWallets);
router.post("/withdraw", verifyToken, WalletController.requestWithdrawal);
router.get("/withdrawals", verifyToken, WalletController.getWithdrawals);

export default router;
