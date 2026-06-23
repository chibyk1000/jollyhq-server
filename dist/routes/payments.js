"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const walletController_1 = require("../controllers/walletController");
const verify_1 = require("../middlewares/verify");
const router = express_1.default.Router();
// ── Webhook (no auth — Nomba calls this directly) ──────────────────────────
router.post("/webhook", walletController_1.WalletController.handleWebhook);
// ── Checkout (any authenticated user — buying tickets) ─────────────────────
router.post("/checkout", verify_1.verifyToken, walletController_1.WalletController.createCheckoutOrder);
// routes/wallet.routes.ts
router.post("/checkout/service", verify_1.verifyToken, walletController_1.WalletController.createServiceCheckoutOrder);
// ── Wallet (event planners + vendors only) ─────────────────────────────────
router.get("/", verify_1.verifyToken, walletController_1.WalletController.getMyWallet);
router.get("/all", verify_1.verifyToken, walletController_1.WalletController.getAllWallets);
router.post("/withdraw", verify_1.verifyToken, walletController_1.WalletController.requestWithdrawal);
router.get("/withdrawals", verify_1.verifyToken, walletController_1.WalletController.getWithdrawals);
exports.default = router;
