import { Request, Response } from "express";
// @ts-ignore – flutterwave-node-v3 has no type definitions
import Flutterwave from "flutterwave-node-v3";
import db from "../db";
import { temporaryVA, user, wallet, walletTransaction } from "../db/schema";
import { desc, eq } from "drizzle-orm";

const flw = new Flutterwave(
  process.env.FLW_PUBLIC_KEY as string,
  process.env.FLW_SECRET_KEY as string
);

export class WalletController {
  /**
   * Create a virtual wallet
   * @route POST /wallet/create
   */
  static async createWallet(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user;
      // console.log(req.user);
      
      if (!userId?.id) {
        return res.status(400).json({ message: "userId is required" });
      }
      const { amount } = req.body;

      const [existingUser] = await db
        .select()
        .from(user)
        .where(eq(user.id, userId.id));
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const fullName = `${existingUser.firstname} ${existingUser.lastname}`;
      const txRef = `JOLLYHQ-${userId.id}-${Date.now()}`;
      if (!amount) {
        return res.status(400).json({ message: "amount is required" });
      }
      const payload = {
        email: existingUser.email,
        is_permanent: false,
        tx_ref: txRef,
        narration: `${fullName} wallet top-up`,
        amount,
      };

      const response = await flw.VirtualAcct.create(payload);
      if (!response || !response.data) {
        console.error("⚠️ Invalid Flutterwave response:", response);
        return res
          .status(502)
          .json({ message: "Failed to create virtual account" });
      }

      const {
        account_number,
        bank_name,
        account_id,
        amount: amt,
      } = response.data;

  
      

      await db.insert(temporaryVA).values({
        userId:userId.id,
        txRef,
        accountNumber: account_number,
        bankName: bank_name,
       
        amount: amt,
      });
      // Step 4: Return response
      return res.status(201).json({
        message: "Temporary virtual account created successfully",
        tx_ref: txRef,
        account_number,
        bank_name,
      });
    } catch (error: any) {
      console.error("❌ Error creating wallet:", error);
      return res.status(500).json({ message: error.message });
    }
  }

  /**
   * Handle Flutterwave webhook events
   * @route POST /flw-webhook
   */

  static async flutterwaveWebhook(req: Request, res: Response) {
    const secretHash = process.env.FLW_SECRET_HASH;
    const signature = req.headers["verif-hash"] as string | undefined;

    if (!signature || signature !== secretHash) {
      console.warn("⚠️ Invalid webhook signature");
      return res.status(401).end();
    }

    const payload = req.body;

    try {
      if (
        payload.event === "charge.completed" &&
        payload.data.status === "successful"
      ) {
        const {
          amount,
          currency,
          tx_ref,
          flw_ref,
          narration,
          account_id,
          payment_type,
        } = payload.data;
        const { bankname, originatorname, originatoraccountnumber } =
          payload.meta_data || {};

        // Step 1: Validate matching temporary VA
        const [tempVA] = await db
          .select()
          .from(temporaryVA)
          .where(eq(temporaryVA.txRef, tx_ref));

        if (!tempVA) {
          console.warn("⚠️ Webhook received for unknown tx_ref:", tx_ref);
          return res.status(200).send("Ignored: Unknown tx_ref");
        }

        if (tempVA.isUsed) {
          console.warn("⚠️ Webhook for already used VA:", tx_ref);
          return res.status(200).send("Ignored: VA already used");
        }

        // Step 2: Record transaction (idempotent check by flw_ref)
        const [existingTxn] = await db
          .select()
          .from(walletTransaction)
          .where(eq(walletTransaction.flwRef, flw_ref));

        if (existingTxn) {
          console.log("ℹ️ Transaction already recorded:", flw_ref);
          return res.status(200).send("OK");
        }

        await db.insert(walletTransaction).values({
          userId: tempVA.userId,
          txRef: tx_ref,
          flwRef: flw_ref,
          type: "credit",
          amount: parseFloat(amount),
          currency: currency || "NGN",
          status: "successful",
          narration,
          bankName: bankname,
          originatorName: originatorname,
          originatorAccount: originatoraccountnumber,
        });

        // Step 3: Update or create wallet
        const [userWallet] = await db
          .select()
          .from(wallet)
          .where(eq(wallet.userId, tempVA.userId));

        if (userWallet) {
          const newBalance = Number(userWallet.balance) + Number(amount);
          await db
            .update(wallet)
            .set({ balance: newBalance })
            .where(eq(wallet.userId, tempVA.userId));
        } else {
          await db.insert(wallet).values({
            userId: tempVA.userId,
            balance: parseFloat(amount),
          });
        }

        // Step 4: Mark VA as used (optional — to prevent reuse)
        await db
          .update(temporaryVA)
          .set({ isUsed: true })
          .where(eq(temporaryVA.id, tempVA.id));

        console.log(`💰 Wallet credited: ₦${amount} for user ${tempVA.userId}`);
      }

      res.status(200).send("Webhook processed");
    } catch (error: any) {
      console.error("❌ Webhook processing error:", error.message);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Get the user's wallet balance
   * @route GET /wallet/:userId/balance
   */
  static async getWalletBalance(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.userId, 10);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid userId parameter" });
      }

      const [existingUser] = await db
        .select()
        .from(user)
        .where(eq(user.id, userId));

      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const [walletRecord] = await db
        .select()
        .from(wallet)
        .where(eq(wallet.userId, userId));

      // console.log(walletRecord);
      
      const balance = walletRecord ? walletRecord.balance : 0;

      return res.json({
        user: {
          id: existingUser.id,
          name: `${existingUser.firstname} ${existingUser.lastname}`,
          email: existingUser.email,
        },
        balance: parseFloat(balance.toString()),
        currency: walletRecord?.currency || "NGN",
      });
    } catch (error: any) {
      console.error("❌ Error fetching wallet balance:", error.message);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  /**
   * Get the user's wallet transaction history
   * @route GET /wallet/:userId/transactions
   */
  static async getWalletTransactions(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.userId, 10);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid userId parameter" });
      }

      const transactions = await db
        .select()
        .from(walletTransaction)
        .where(eq(walletTransaction.userId, userId))
        .orderBy(desc(walletTransaction.createdAt));

      return res.json({
        count: transactions.length,
        transactions: transactions.map((txn) => ({
          id: txn.id,
          tx_ref: txn.txRef,
          flw_ref: txn.flwRef,
          type: txn.type,
          amount: parseFloat(txn.amount.toString()),
          status: txn.status,
          narration: txn.narration,
          bank_name: txn.bankName,
          originator_name: txn.originatorName,
          originator_account: txn.originatorAccount,
          date: txn.createdAt,
        })),
      });
    } catch (error: any) {
      console.error("❌ Error fetching wallet transactions:", error.message);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
}
