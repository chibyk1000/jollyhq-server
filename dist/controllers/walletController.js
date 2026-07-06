"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletController = void 0;
const walletServices_1 = __importDefault(require("../services/walletServices"));
const calculateHMAC_1 = require("../utils/calculateHMAC");
const nomba_service_1 = __importDefault(require("../services/nomba.service"));
const uuid_1 = require("uuid");
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const logger_1 = require("../utils/logger");
function resolveOwnerType(raw) {
    if (raw === "event_planner" || raw === "vendor")
        return raw;
    return null;
}
class WalletController {
    // ── GET /wallet?type=event_planner|vendor ────────────────────────────────
    static async getMyWallet(req, res) {
        try {
            const ownerType = resolveOwnerType(req.query.type);
            if (!ownerType) {
                return res.status(400).json({
                    success: false,
                    message: "Query param 'type' must be 'event_planner' or 'vendor'",
                });
            }
            const wallet = await walletServices_1.default.getWithHistory(req.user.id, ownerType);
            if (!wallet) {
                return res
                    .status(404)
                    .json({ success: false, message: "Wallet not found" });
            }
            return res.json({ success: true, data: wallet });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    // ── GET /wallet/all ──────────────────────────────────────────────────────
    static async getAllWallets(req, res) {
        try {
            const data = await walletServices_1.default.getAllWallets(req.user.id);
            return res.json({ success: true, data });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    // ── POST /wallet/withdraw ────────────────────────────────────────────────
    static async requestWithdrawal(req, res) {
        try {
            const userId = req.user.id;
            const { type, amount, bankCode, bankName, accountNumber, accountName, narration, } = req.body;
            const ownerType = resolveOwnerType(type);
            if (!ownerType) {
                return res.status(400).json({
                    success: false,
                    message: "'type' must be 'event_planner' or 'vendor'",
                });
            }
            if (!amount || isNaN(amount) || Number(amount) <= 0) {
                return res
                    .status(400)
                    .json({ success: false, message: "Invalid amount" });
            }
            if (!bankCode || !bankName || !accountNumber || !accountName) {
                return res
                    .status(400)
                    .json({ success: false, message: "Bank details required" });
            }
            const request = await walletServices_1.default.requestWithdrawal({
                userId,
                ownerType,
                amount: Number(amount),
                bankCode,
                bankName,
                accountNumber,
                accountName,
                narration,
            });
            return res.status(201).json({
                success: true,
                message: "Withdrawal request submitted. You will be notified once processed.",
                data: request,
            });
        }
        catch (err) {
            const status = err.message.includes("Insufficient")
                ? 400
                : err.message.includes("pending")
                    ? 400
                    : err.message.includes("not found")
                        ? 404
                        : 500;
            return res.status(status).json({ success: false, message: err.message });
        }
    }
    // ── GET /wallet/withdrawals?type=event_planner|vendor ───────────────────
    static async getWithdrawals(req, res) {
        try {
            const ownerType = resolveOwnerType(req.query.type);
            if (!ownerType) {
                return res.status(400).json({
                    success: false,
                    message: "Query param 'type' must be 'event_planner' or 'vendor'",
                });
            }
            const requests = await walletServices_1.default.getWithdrawals(req.user.id, ownerType);
            return res.json({ success: true, data: requests });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    // ── POST /wallets/checkout ───────────────────────────────────────────────
    // Ticket purchase — uses orders table
    static async createCheckoutOrder(req, res) {
        try {
            const authUser = req.user;
            const { ticketId, quantity, email } = req.body;
            if (!ticketId || !quantity || !email) {
                return res.status(400).json({
                    success: false,
                    message: "ticketId, quantity and email are required",
                });
            }
            const ticket = await db_1.db.query.eventTickets.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.eventTickets.id, ticketId),
            });
            if (!ticket) {
                return res
                    .status(404)
                    .json({ success: false, message: "Ticket not found" });
            }
            if (ticket.quantity < Number(quantity)) {
                return res
                    .status(400)
                    .json({ success: false, message: "Not enough tickets available" });
            }
            const totalAmount = Number(ticket.price) * Number(quantity);
            const orderReference = (0, uuid_1.v4)();
            await db_1.db.transaction(async (tx) => {
                await tx.insert(schema_1.orders).values({
                    userId: authUser.id,
                    eventId: ticket.eventId,
                    ticketId,
                    quantity: quantity.toString(),
                    totalAmount: totalAmount.toString(),
                    currency: "NGN",
                    orderReference,
                    status: "PENDING",
                    isPaid: false,
                });
                await tx
                    .update(schema_1.eventTickets)
                    .set({ quantity: ticket.quantity - Number(quantity) })
                    .where((0, drizzle_orm_1.eq)(schema_1.eventTickets.id, ticketId));
            });
            const response = await nomba_service_1.default.post("/v1/checkout/order", {
                order: {
                    orderReference,
                    callbackUrl: `jollyhq://payment-success?ref=${orderReference}`,
                    customerEmail: email,
                    amount: totalAmount.toFixed(2),
                    currency: "NGN",
                    accountId: process.env.NOMBA_ACCOUNT_ID,
                },
            });
            return res.status(200).json({
                success: true,
                checkoutUrl: response.data?.data?.checkoutLink,
                orderReference,
            });
        }
        catch (err) {
            logger_1.logger.error("Checkout error", err.response?.data || err.message);
            return res
                .status(500)
                .json({ success: false, message: "Checkout failed" });
        }
    }
    // ── POST /wallets/checkout/service ───────────────────────────────────────
    // Vendor service payment — uses vendorBookings table
    static async createServiceCheckoutOrder(req, res) {
        try {
            const authUser = req.user;
            const { serviceId, email, scheduledDate, notes, eventId } = req.body;
            if (!serviceId || !email) {
                return res.status(400).json({
                    success: false,
                    message: "serviceId and email are required",
                });
            }
            // 1. Fetch service — amount always from DB
            const service = await db_1.db.query.vendorServices.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.vendorServices.id, serviceId), (0, drizzle_orm_1.eq)(schema_1.vendorServices.isActive, true)),
            });
            if (!service) {
                return res
                    .status(404)
                    .json({ success: false, message: "Service not found or inactive" });
            }
            // 2. Fetch owning vendor
            const vendor = await db_1.db.query.vendors.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.vendors.id, service.vendorId), (0, drizzle_orm_1.eq)(schema_1.vendors.isActive, true)),
            });
            if (!vendor) {
                return res
                    .status(404)
                    .json({ success: false, message: "Vendor not found" });
            }
            // 3. Block vendor from paying for their own service
            if (vendor.userId === authUser.id) {
                return res.status(400).json({
                    success: false,
                    message: "You cannot pay for your own service",
                });
            }
            const totalAmount = Number(service.price);
            const paymentRef = (0, uuid_1.v4)();
            // 4. Create booking record in pending state
            const [booking] = await db_1.db
                .insert(schema_1.vendorBookings)
                .values({
                vendorId: vendor.id,
                serviceId: service.id,
                userId: authUser.id,
                eventId: eventId && eventId.trim() !== "" ? eventId : null,
                quantity: 1,
                amount: totalAmount,
                scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
                notes: notes ?? null,
                status: "pending",
                isPaid: false,
                paymentRef,
            })
                .returning();
            // 5. Create Nomba checkout
            const response = await nomba_service_1.default.post("/v1/checkout/order", {
                order: {
                    orderReference: paymentRef,
                    callbackUrl: `jollyhq://payment-success?ref=${paymentRef}`,
                    customerEmail: email,
                    amount: totalAmount.toFixed(2),
                    currency: "NGN",
                    accountId: process.env.NOMBA_ACCOUNT_ID,
                },
            });
            return res.status(200).json({
                success: true,
                checkoutUrl: response.data?.data?.checkoutLink,
                bookingId: booking.id,
                orderReference: paymentRef,
            });
        }
        catch (err) {
            logger_1.logger.error("Service checkout error", err.response?.data || err.message);
            return res
                .status(500)
                .json({ success: false, message: "Checkout failed" });
        }
    }
    // ── POST /webhook/nomba ──────────────────────────────────────────────────
    static async handleWebhook(req, res) {
        try {
            const signatureFromHeader = req.headers["nomba-signature"];
            const timestamp = req.headers["nomba-timestamp"];
            if (!signatureFromHeader || !timestamp) {
                return res.status(400).send("Missing headers");
            }
            const generatedSignature = (0, calculateHMAC_1.generateSignature)(req.body, process.env.NOMBA_WEBHOOK_SECRET, timestamp);
            if (generatedSignature.toLowerCase() !== signatureFromHeader.toLowerCase()) {
                return res.status(401).send("Invalid signature");
            }
            const eventType = req.body.event_type;
            const data = req.body.data;
            switch (eventType) {
                case "payment_success": {
                    const orderRef = data.order?.orderReference;
                    if (!orderRef)
                        break;
                    const transactionId = data.transaction.transactionId;
                    // ── Try ticket order first ───────────────────────────────────────
                    const [paidOrder] = await db_1.db
                        .update(schema_1.orders)
                        .set({
                        status: "PAID",
                        isPaid: true,
                        transactionId,
                        paidAt: new Date(),
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.orders.orderReference, orderRef))
                        .returning();
                    if (paidOrder) {
                        // Credit event planner wallet
                        if (paidOrder.eventId && paidOrder.ticketId) {
                            const event = await db_1.db.query.events.findFirst({
                                where: (0, drizzle_orm_1.eq)(schema_1.events.id, paidOrder.eventId),
                            });
                            if (event) {
                                const plannerWallet = await db_1.db.query.wallets.findFirst({
                                    where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wallets.userId, event.plannerId), (0, drizzle_orm_1.eq)(schema_1.wallets.ownerType, "event_planner")),
                                });
                                if (plannerWallet) {
                                    await walletServices_1.default.credit({
                                        userId: event.plannerId.toString(),
                                        ownerType: "event_planner",
                                        amount: Number(paidOrder.totalAmount),
                                        source: "ticket_sale",
                                        reference: transactionId,
                                        narration: `Ticket sale — order ${orderRef}`,
                                    });
                                }
                            }
                            // Add buyer to event chat
                            const chat = await db_1.db.query.chats.findFirst({
                                where: (0, drizzle_orm_1.eq)(schema_1.chats.eventId, paidOrder.eventId),
                            });
                            if (chat) {
                                await db_1.db
                                    .insert(schema_1.chatMembers)
                                    .values({ profileId: paidOrder.userId, chatId: chat.id })
                                    .onConflictDoNothing();
                            }
                        }
                        break; // handled — exit switch
                    }
                    // ── Try vendor booking ───────────────────────────────────────────
                    const [paidBooking] = await db_1.db
                        .update(schema_1.vendorBookings)
                        .set({
                        isPaid: true,
                        status: "accepted", // vendor auto-accepted on payment
                        paymentRef: transactionId,
                        updatedAt: new Date(),
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.vendorBookings.paymentRef, orderRef))
                        .returning();
                    if (paidBooking) {
                        // Credit vendor wallet
                        const vendor = await db_1.db.query.vendors.findFirst({
                            where: (0, drizzle_orm_1.eq)(schema_1.vendors.id, paidBooking.vendorId),
                        });
                        if (vendor) {
                            const vendorWallet = await db_1.db.query.wallets.findFirst({
                                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wallets.userId, vendor.userId), (0, drizzle_orm_1.eq)(schema_1.wallets.ownerType, "vendor")),
                            });
                            if (vendorWallet) {
                                await walletServices_1.default.credit({
                                    userId: vendor.userId.toString(),
                                    ownerType: "vendor",
                                    amount: paidBooking.amount,
                                    source: "vendor_payment",
                                    reference: transactionId,
                                    narration: `Service booking — ref ${orderRef}`,
                                });
                            }
                            // Open or reuse DM chat between buyer and vendor
                            const existingChat = await db_1.db.query.chats.findFirst({
                                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.chats.vendorId, paidBooking.vendorId), (0, drizzle_orm_1.eq)(schema_1.chats.isGroup, false)),
                            });
                            if (existingChat) {
                                await db_1.db
                                    .insert(schema_1.chatMembers)
                                    .values({
                                    profileId: paidBooking.userId,
                                    chatId: existingChat.id,
                                })
                                    .onConflictDoNothing();
                            }
                            else {
                                await db_1.db.transaction(async (tx) => {
                                    const [newChat] = await tx
                                        .insert(schema_1.chats)
                                        .values({
                                        vendorId: paidBooking.vendorId,
                                        isGroup: false,
                                        directType: "user_vendor",
                                    })
                                        .returning();
                                    await tx.insert(schema_1.chatMembers).values([
                                        {
                                            profileId: paidBooking.userId,
                                            chatId: newChat.id,
                                            role: "member",
                                        },
                                        {
                                            profileId: vendor.userId,
                                            chatId: newChat.id,
                                            role: "member",
                                        },
                                    ]);
                                });
                            }
                        }
                    }
                    break;
                }
                case "payment_failed": {
                    const orderRef = data.order?.orderReference;
                    if (!orderRef)
                        break;
                    // Try orders first
                    const [failedOrder] = await db_1.db
                        .update(schema_1.orders)
                        .set({ status: "FAILED" })
                        .where((0, drizzle_orm_1.eq)(schema_1.orders.orderReference, orderRef))
                        .returning();
                    if (failedOrder?.ticketId) {
                        const ticket = await db_1.db.query.eventTickets.findFirst({
                            where: (0, drizzle_orm_1.eq)(schema_1.eventTickets.id, failedOrder.ticketId),
                        });
                        if (ticket) {
                            await db_1.db
                                .update(schema_1.eventTickets)
                                .set({
                                quantity: ticket.quantity + Number(failedOrder.quantity),
                            })
                                .where((0, drizzle_orm_1.eq)(schema_1.eventTickets.id, failedOrder.ticketId));
                        }
                        break;
                    }
                    // Try vendor booking
                    await db_1.db
                        .update(schema_1.vendorBookings)
                        .set({ status: "cancelled", cancelledAt: new Date() })
                        .where((0, drizzle_orm_1.eq)(schema_1.vendorBookings.paymentRef, orderRef));
                    break;
                }
                case "payout_success":
                    logger_1.logger.info("Payout successful", {
                        transactionId: data.transaction.transactionId,
                    });
                    break;
                default:
                    logger_1.logger.info("Unhandled webhook event", { eventType });
            }
            return res.status(200).json({ received: true });
        }
        catch (err) {
            logger_1.logger.error("Webhook error", err);
            return res.status(500).send("Server error");
        }
    }
}
exports.WalletController = WalletController;
