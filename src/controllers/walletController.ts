import { Request, Response } from "express";
import WalletService from "../services/walletServices";
import { generateSignature } from "../utils/calculateHMAC";

export class WalletController {
  static async addCard(req: Request, res: Response) {
    try {
      const { cardNumber, cardExpiryMonth,cardExpiryYear, cardCVV, cardPin } = req.body;
      
      if (!cardNumber || !cardExpiryMonth || !cardExpiryYear || !cardCVV ) {
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
            console.log("Payment successful:", data.transaction);
            break;

          case "payment_failed":
            console.log("Payment failed:", data.transaction);
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
        console.error("Webhook error:", err.message);
        return res.status(500).send("Server error");
      }
 

  }
}