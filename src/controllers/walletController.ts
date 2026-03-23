import { Request, Response } from "express";
import WalletService, { WalletOwnerType } from "../services/walletServices";
import { generateSignature } from "../utils/calculateHMAC";
import nombaApi from "../services/nomba.service";
import { v4 as uuidv4 } from "uuid";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  chatMembers,
  chats,
  events,
  eventTickets,
  orders,
  vendorBookings,
  vendorServices,
  vendors,
  wallets,
} from "../db/schema";

function resolveOwnerType(raw: unknown): WalletOwnerType | null {
  if (raw === "event_planner" || raw === "vendor") return raw;
  return null;
}

export class WalletController {
  // ── GET /wallet?type=event_planner|vendor ────────────────────────────────
  static async getMyWallet(req: Request, res: Response) {
    try {
      const ownerType = resolveOwnerType(req.query.type);
      if (!ownerType) {
        return res.status(400).json({
          success: false,
          message: "Query param 'type' must be 'event_planner' or 'vendor'",
        });
      }

      const wallet = await WalletService.getWithHistory(
        req.user!.id,
        ownerType,
      );
      if (!wallet) {
        return res
          .status(404)
          .json({ success: false, message: "Wallet not found" });
      }

      return res.json({ success: true, data: wallet });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ── GET /wallet/all ──────────────────────────────────────────────────────
  static async getAllWallets(req: Request, res: Response) {
    try {
      const data = await WalletService.getAllWallets(req.user!.id);
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ── POST /wallet/withdraw ────────────────────────────────────────────────
  static async requestWithdrawal(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const {
        type,
        amount,
        bankCode,
        bankName,
        accountNumber,
        accountName,
        narration,
      } = req.body;

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

      const request = await WalletService.requestWithdrawal({
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
        message:
          "Withdrawal request submitted. You will be notified once processed.",
        data: request,
      });
    } catch (err: any) {
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
  static async getWithdrawals(req: Request, res: Response) {
    try {
      const ownerType = resolveOwnerType(req.query.type);
      if (!ownerType) {
        return res.status(400).json({
          success: false,
          message: "Query param 'type' must be 'event_planner' or 'vendor'",
        });
      }

      const requests = await WalletService.getWithdrawals(
        req.user!.id,
        ownerType,
      );
      return res.json({ success: true, data: requests });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ── POST /wallets/checkout ───────────────────────────────────────────────
  // Ticket purchase — uses orders table
  static async createCheckoutOrder(req: Request, res: Response) {
    try {
      const authUser = req.user!;
      const { ticketId, quantity, email } = req.body;

      if (!ticketId || !quantity || !email) {
        return res.status(400).json({
          success: false,
          message: "ticketId, quantity and email are required",
        });
      }

      const ticket = await db.query.eventTickets.findFirst({
        where: eq(eventTickets.id, ticketId),
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
      const orderReference = uuidv4();

      await db.transaction(async (tx) => {
        await tx.insert(orders).values({
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
          .update(eventTickets)
          .set({ quantity: ticket.quantity - Number(quantity) })
          .where(eq(eventTickets.id, ticketId));
      });

      const response = await nombaApi.post("/v1/checkout/order", {
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
    } catch (err: any) {
      console.error("Checkout error:", err.response?.data || err.message);
      return res
        .status(500)
        .json({ success: false, message: "Checkout failed" });
    }
  }

  // ── POST /wallets/checkout/service ───────────────────────────────────────
  // Vendor service payment — uses vendorBookings table
  static async createServiceCheckoutOrder(req: Request, res: Response) {
    try {
      const authUser = req.user!;
      const { serviceId, email, scheduledDate, notes, eventId } = req.body;

      if (!serviceId || !email) {
        return res.status(400).json({
          success: false,
          message: "serviceId and email are required",
        });
      }

      // 1. Fetch service — amount always from DB
      const service = await db.query.vendorServices.findFirst({
        where: and(
          eq(vendorServices.id, serviceId),
          eq(vendorServices.isActive, true),
        ),
      });

      if (!service) {
        return res
          .status(404)
          .json({ success: false, message: "Service not found or inactive" });
      }

      // 2. Fetch owning vendor
      const vendor = await db.query.vendors.findFirst({
        where: and(
          eq(vendors.id, service.vendorId),
          eq(vendors.isActive, true),
        ),
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
      const paymentRef = uuidv4();

      // 4. Create booking record in pending state
      const [booking] = await db
        .insert(vendorBookings)
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
      const response = await nombaApi.post("/v1/checkout/order", {
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
    } catch (err: any) {
      console.error(
        "Service checkout error:",
        err.response?.data || err.message,
      );
      return res
        .status(500)
        .json({ success: false, message: "Checkout failed" });
    }
  }

  // ── POST /webhook/nomba ──────────────────────────────────────────────────
  static async handleWebhook(req: Request, res: Response) {
    try {
      const signatureFromHeader = req.headers["nomba-signature"] as string;
      const timestamp = req.headers["nomba-timestamp"] as string;

      if (!signatureFromHeader || !timestamp) {
        return res.status(400).send("Missing headers");
      }

      const generatedSignature = generateSignature(
        req.body,
        process.env.NOMBA_WEBHOOK_SECRET!,
        timestamp,
      );

      if (
        generatedSignature.toLowerCase() !== signatureFromHeader.toLowerCase()
      ) {
        return res.status(401).send("Invalid signature");
      }

      const eventType = req.body.event_type;
      const data = req.body.data;

      switch (eventType) {
        case "payment_success": {
          const orderRef = data.order?.orderReference;
          if (!orderRef) break;

          const transactionId = data.transaction.transactionId;

          // ── Try ticket order first ───────────────────────────────────────
          const [paidOrder] = await db
            .update(orders)
            .set({
              status: "PAID",
              isPaid: true,
              transactionId,
              paidAt: new Date(),
            })
            .where(eq(orders.orderReference, orderRef))
            .returning();

          if (paidOrder) {
            // Credit event planner wallet
            if (paidOrder.eventId && paidOrder.ticketId) {
              const event = await db.query.events.findFirst({
                where: eq(events.id, paidOrder.eventId),
              });

              if (event) {
                const plannerWallet = await db.query.wallets.findFirst({
                  where: and(
                    eq(wallets.userId, event.plannerId),
                    eq(wallets.ownerType, "event_planner"),
                  ),
                });

                if (plannerWallet) {
                  await WalletService.credit({
                    userId: event.plannerId,
                    ownerType: "event_planner",
                    amount: Number(paidOrder.totalAmount),
                    source: "ticket_sale",
                    reference: transactionId,
                    narration: `Ticket sale — order ${orderRef}`,
                  });
                }
              }

              // Add buyer to event chat
              const chat = await db.query.chats.findFirst({
                where: eq(chats.eventId, paidOrder.eventId),
              });

              if (chat) {
                await db
                  .insert(chatMembers)
                  .values({ profileId: paidOrder.userId, chatId: chat.id })
                  .onConflictDoNothing();
              }
            }

            break; // handled — exit switch
          }

          // ── Try vendor booking ───────────────────────────────────────────
          const [paidBooking] = await db
            .update(vendorBookings)
            .set({
              isPaid: true,
              status: "accepted", // vendor auto-accepted on payment
              paymentRef: transactionId,
              updatedAt: new Date(),
            })
            .where(eq(vendorBookings.paymentRef, orderRef))
            .returning();

          if (paidBooking) {
            // Credit vendor wallet
            const vendor = await db.query.vendors.findFirst({
              where: eq(vendors.id, paidBooking.vendorId),
            });

            if (vendor) {
              const vendorWallet = await db.query.wallets.findFirst({
                where: and(
                  eq(wallets.userId, vendor.userId),
                  eq(wallets.ownerType, "vendor"),
                ),
              });

              if (vendorWallet) {
                await WalletService.credit({
                  userId: vendor.userId,
                  ownerType: "vendor",
                  amount: paidBooking.amount,
                  source: "vendor_payment",
                  reference: transactionId,
                  narration: `Service booking — ref ${orderRef}`,
                });
              }

              // Open or reuse DM chat between buyer and vendor
              const existingChat = await db.query.chats.findFirst({
                where: and(
                  eq(chats.vendorId, paidBooking.vendorId),
                  eq(chats.isGroup, false),
                ),
              });

              if (existingChat) {
                await db
                  .insert(chatMembers)
                  .values({
                    profileId: paidBooking.userId,
                    chatId: existingChat.id,
                  })
                  .onConflictDoNothing();
              } else {
                await db.transaction(async (tx) => {
                  const [newChat] = await tx
                    .insert(chats)
                    .values({
                      vendorId: paidBooking.vendorId,
                      isGroup: false,
                      directType: "user_vendor",
                    })
                    .returning();

                  await tx.insert(chatMembers).values([
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
          if (!orderRef) break;

          // Try orders first
          const [failedOrder] = await db
            .update(orders)
            .set({ status: "FAILED" })
            .where(eq(orders.orderReference, orderRef))
            .returning();

          if (failedOrder?.ticketId) {
            const ticket = await db.query.eventTickets.findFirst({
              where: eq(eventTickets.id, failedOrder.ticketId),
            });

            if (ticket) {
              await db
                .update(eventTickets)
                .set({
                  quantity: ticket.quantity + Number(failedOrder.quantity),
                })
                .where(eq(eventTickets.id, failedOrder.ticketId));
            }
            break;
          }

          // Try vendor booking
          await db
            .update(vendorBookings)
            .set({ status: "cancelled", cancelledAt: new Date() })
            .where(eq(vendorBookings.paymentRef, orderRef));

          break;
        }

        case "payout_success":
          console.log("Payout successful:", data.transaction.transactionId);
          break;

        default:
          console.log("Unhandled webhook event:", eventType);
      }

      return res.status(200).json({ received: true });
    } catch (err: any) {
      console.error("Webhook error:", err);
      return res.status(500).send("Server error");
    }
  }
}
