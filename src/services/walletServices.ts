import { db } from "../db";
import { wallets, walletTransactions, withdrawalRequests } from "../db/schema";
import { and, desc, eq } from "drizzle-orm";

export type WalletOwnerType = "event_planner" | "vendor";
export type CreditSource = "ticket_sale" | "vendor_payment";
export type DebitSource = "withdrawal_payout" | "refund_reversal";

export default class WalletService {
  // ── Get or create ─────────────────────────────────────────────────────────
  static async getOrCreate(userId: string, ownerType: WalletOwnerType) {
    const existing = await db.query.wallets.findFirst({
      where: and(eq(wallets.userId, userId), eq(wallets.ownerType, ownerType)),
    });

    if (existing) return existing;

    const [wallet] = await db
      .insert(wallets)
      .values({ userId, ownerType, balance: 0, currency: "NGN" })
      .returning();

    return wallet;
  }

  // ── Get single wallet with history ────────────────────────────────────────
  static async getWithHistory(userId: string, ownerType: WalletOwnerType) {
    return db.query.wallets.findFirst({
      where: and(eq(wallets.userId, userId), eq(wallets.ownerType, ownerType)),
      with: {
        transactions: {
          orderBy: (t: any, { desc }: any) => [desc(t.createdAt)],
          limit: 20,
        },
        withdrawals: {
          orderBy: (w: any, { desc }: any) => [desc(w.createdAt)],
          limit: 10,
        },
      },
    });
  }

  // ── Get all wallets for a user (planner + vendor if both exist) ───────────
  static async getAllWallets(userId: string) {
    return db.query.wallets.findMany({
      where: eq(wallets.userId, userId),
      with: {
        transactions: {
          orderBy: (t: any, { desc }: any) => [desc(t.createdAt)],
          limit: 5, // recent snapshot per wallet
        },
        withdrawals: {
          orderBy: (w: any, { desc }: any) => [desc(w.createdAt)],
          limit: 3,
        },
      },
    });
  }

  // ── Credit ────────────────────────────────────────────────────────────────
  static async credit(params: {
    userId: string;
    ownerType: WalletOwnerType;
    amount: number;
    source: CreditSource;
    reference: string;
    narration?: string;
  }) {
    const wallet = await db.query.wallets.findFirst({
      where: and(
        eq(wallets.userId, params.userId),
        eq(wallets.ownerType, params.ownerType),
      ),
    });

    if (!wallet)
      throw new Error(
        `No ${params.ownerType} wallet for user ${params.userId}`,
      );
    if (!wallet.isActive) throw new Error("Wallet is inactive");

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + params.amount;

    await db.transaction(async (tx) => {
      await tx
        .update(wallets)
        .set({ balance: balanceAfter })
        .where(
          and(
            eq(wallets.userId, params.userId),
            eq(wallets.ownerType, params.ownerType),
          ),
        );

      await tx.insert(walletTransactions).values({
        walletId: wallet.id,
        type: "credit",
        source: params.source,
        amount: params.amount,
        balanceBefore,
        balanceAfter,
        reference: params.reference,
        narration: params.narration ?? "Credit",
      });
    });

    return balanceAfter;
  }

  // ── Debit ─────────────────────────────────────────────────────────────────
  static async debit(params: {
    userId: string;
    ownerType: WalletOwnerType;
    amount: number;
    source: DebitSource;
    reference: string;
    narration?: string;
  }) {
    const wallet = await db.query.wallets.findFirst({
      where: and(
        eq(wallets.userId, params.userId),
        eq(wallets.ownerType, params.ownerType),
      ),
    });

    if (!wallet) throw new Error("Wallet not found");
    if (!wallet.isActive) throw new Error("Wallet is inactive");
    if (wallet.balance < params.amount) throw new Error("Insufficient balance");

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - params.amount;

    await db.transaction(async (tx) => {
      await tx
        .update(wallets)
        .set({ balance: balanceAfter })
        .where(
          and(
            eq(wallets.userId, params.userId),
            eq(wallets.ownerType, params.ownerType),
          ),
        );

      await tx.insert(walletTransactions).values({
        walletId: wallet.id,
        type: "debit",
        source: params.source,
        amount: params.amount,
        balanceBefore,
        balanceAfter,
        reference: params.reference,
        narration: params.narration ?? "Debit",
      });
    });

    return balanceAfter;
  }

  // ── Request withdrawal ────────────────────────────────────────────────────
  static async requestWithdrawal(params: {
    userId: string;
    ownerType: WalletOwnerType;
    amount: number;
    bankCode: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    narration?: string;
  }) {
    const wallet = await db.query.wallets.findFirst({
      where: and(
        eq(wallets.userId, params.userId),
        eq(wallets.ownerType, params.ownerType),
      ),
    });

    if (!wallet) throw new Error("Wallet not found");
    if (!wallet.isActive) throw new Error("Wallet is inactive");
    if (wallet.balance < params.amount) throw new Error("Insufficient balance");

    // Block if a pending withdrawal already exists for this wallet
    const pending = await db.query.withdrawalRequests.findFirst({
      where: and(
        eq(withdrawalRequests.walletId, wallet.id),
        eq(withdrawalRequests.status, "pending"),
      ),
    });

    if (pending) {
      throw new Error(
        "A pending withdrawal request already exists for this wallet",
      );
    }

    const [request] = await db
      .insert(withdrawalRequests)
      .values({
        walletId: wallet.id,
        amount: params.amount,
        status: "pending",
        bankCode: params.bankCode,
        bankName: params.bankName,
        accountNumber: params.accountNumber,
        accountName: params.accountName,
        narration: params.narration ?? "Withdrawal request",
      })
      .returning();

    return request;
  }

  // ── Get withdrawal history for one wallet ─────────────────────────────────
  static async getWithdrawals(userId: string, ownerType: WalletOwnerType) {
    const wallet = await db.query.wallets.findFirst({
      where: and(eq(wallets.userId, userId), eq(wallets.ownerType, ownerType)),
    });

    if (!wallet) throw new Error("Wallet not found");

    return db.query.withdrawalRequests.findMany({
      where: eq(withdrawalRequests.walletId, wallet.id),
      orderBy: (w, { desc }) => [desc(w.createdAt)],
    });
  }
}
