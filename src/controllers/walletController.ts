import { Request, Response } from "express";
import WalletService from "../services/walletServices";
import { generateSignature } from "../utils/calculateHMAC";
import nombaApi from "../services/nomba.service";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { chatMembers, chats, eventTickets, orders } from "../db/schema";

export class WalletController {
  static async addCard(req: Request, res: Response) {
    try {
      const { cardNumber, cardExpiryMonth, cardExpiryYear, cardCVV, cardPin } =
        req.body;

      if (!cardNumber || !cardExpiryMonth || !cardExpiryYear || !cardCVV) {
        return res.status(400).json({ error: "Missing required card fields" });
      }
      console.log(req.body);

      const walletService = new WalletService();

      const result = await walletService.addCreditCard({
        cardNumber,
        cardCVV: Number(cardCVV),
        cardExpiryMonth,
        cardExpiryYear,

        cardPin: cardPin || "", // optional
      });

      return res.status(200).json({
        code: "00",
        message: "Card added successfully",
        data: result,
      });
    } catch (error: any) {
      console.error("Add card error:", error);
      return res.status(500).json({
        code: "99",
        description: "Failed to add card",
        error: error.message || "Internal server error",
      });
    }
  }
  static async handleWebhook(req: Request, res: Response) {
    try {
      const signatureFromHeader = req.headers["nomba-signature"] as string;
      const timestamp = req.headers["nomba-timestamp"] as string;

      if (!signatureFromHeader || !timestamp) {
        return res.status(400).send("Missing headers");
      }

      const secret = process.env.NOMBA_WEBHOOK_SECRET!;
      const rawPayload = req.body;

      const generatedSignature = generateSignature(
        rawPayload,
        secret,
        timestamp,
      );

      // Compare signatures
      if (
        generatedSignature.toLowerCase() !== signatureFromHeader.toLowerCase()
      ) {
        console.error("Invalid webhook signature");
        return res.status(401).send("Invalid signature");
      }

      // ✅ Signature is valid
      const event = req.body.event_type;
      const data = req.body.data;

      console.log("Webhook verified:", event);

      // Handle events
      switch (event) {
        case "payment_success":
       
        const order =   await db
            .update(orders)
            .set({
              status: "PAID",
              isPaid: true,
              transactionId:data.transaction.transactionId,
              paidAt: new Date(),
            })
          .where(eq(orders.orderReference, data.order.orderReference)).returning();
          const chat = await db.query.chats.findFirst({
            where: eq(chats.eventId, order[0].eventId),
          });

          if (chat) {
            await db
              .insert(chatMembers)
              .values({
                profileId: order[0].userId,

                chatId: chat.id,
              })
              .onConflictDoNothing();
          }
          break;

        case "payment_failed":
          console.log("Payment failed:", data);
          break;

        case "payout_success":
          console.log("Payout successful:", data.transaction);
          break;

        default:
          console.log("Unhandled event:", event);
      }

      // IMPORTANT: Always return 200
      return res.status(200).json({ received: true });
    } catch (err: any) {
      console.error("Webhook error:", err);
      return res.status(500).send("Server error");
    }
  }
  static async createCheckoutOrder(req: Request, res: Response) {
    try {
      const { ticketId, quantity, email, userId } = req.body;
     
      
      const user = req?.user
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }
      // 1️⃣ Validate ticket exists
      const ticket = await db.query.eventTickets.findFirst({
        where: eq(eventTickets.id, ticketId),
      });

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found",
        });
      }

            if (ticket?.quantity < 1) {
              return res.status(400).json({
                success: false,
                message: "Ticket is sold out",
              });
            }

      // 2️⃣ Calculate total from DB (NEVER trust frontend amount)
      const totalAmount = Number(ticket.price) * Number(quantity);

      // 3️⃣ Generate order reference
      const orderReference = uuidv4();

      // 4️⃣ Create order in DB (PENDING)
      await db.insert(orders).values({
        userId:user?.id,
        eventId: ticket.eventId,
        ticketId,
        quantity: quantity.toString(),
        totalAmount: totalAmount.toString(),
        currency: "NGN",
        orderReference,
        status: "PENDING",
        isPaid: false,
      });

      await db
        .update(eventTickets)
        .set({
          quantity: Number(ticket.quantity) - Number(quantity),
        })
        .where(eq(eventTickets.id, ticketId));
      // 5️⃣ Create Nomba checkout
      const response = await nombaApi.post("/v1/checkout/order", {
        order: {
          orderReference,
          callbackUrl: `jollyhq://payment-success?ref=${orderReference}`,
          customerEmail:email,
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

    } catch (error: any) {
      console.error(
        "Nomba Checkout Error:",
        error.response?.data || error.message,
      );

      return res.status(500).json({
        success: false,
        message: error.response?.data || "Checkout failed",
      });
    }
  }
}