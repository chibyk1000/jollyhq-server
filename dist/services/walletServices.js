"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
class WalletService {
    // ── Get or create ─────────────────────────────────────────────────────────
    static async getOrCreate(userId, ownerType) {
        const existing = await db_1.db.query.wallets.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wallets.userId, parseInt(userId)), (0, drizzle_orm_1.eq)(schema_1.wallets.ownerType, ownerType)),
        });
        if (existing)
            return existing;
        const [wallet] = await db_1.db
            .insert(schema_1.wallets)
            .values({ userId: parseInt(userId), ownerType, balance: 0, currency: "NGN" })
            .returning();
        return wallet;
    }
    // ── Get single wallet with history ────────────────────────────────────────
    static async getWithHistory(userId, ownerType) {
        return db_1.db.query.wallets.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wallets.userId, parseInt(userId)), (0, drizzle_orm_1.eq)(schema_1.wallets.ownerType, ownerType)),
            with: {
                transactions: {
                    orderBy: (t, { desc }) => [desc(t.createdAt)],
                    limit: 20,
                },
                withdrawals: {
                    orderBy: (w, { desc }) => [desc(w.createdAt)],
                    limit: 10,
                },
            },
        });
    }
    // ── Get all wallets for a user (planner + vendor if both exist) ───────────
    static async getAllWallets(userId) {
        return db_1.db.query.wallets.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.wallets.userId, parseInt(userId)),
            with: {
                transactions: {
                    orderBy: (t, { desc }) => [desc(t.createdAt)],
                    limit: 5, // recent snapshot per wallet
                },
                withdrawals: {
                    orderBy: (w, { desc }) => [desc(w.createdAt)],
                    limit: 3,
                },
            },
        });
    }
    // ── Credit ────────────────────────────────────────────────────────────────
    static async credit(params) {
        const wallet = await db_1.db.query.wallets.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wallets.userId, parseInt(params.userId)), (0, drizzle_orm_1.eq)(schema_1.wallets.ownerType, params.ownerType)),
        });
        if (!wallet)
            throw new Error(`No ${params.ownerType} wallet for user ${params.userId}`);
        if (!wallet.isActive)
            throw new Error("Wallet is inactive");
        const balanceBefore = wallet.balance;
        const balanceAfter = balanceBefore + params.amount;
        await db_1.db.transaction(async (tx) => {
            await tx
                .update(schema_1.wallets)
                .set({ balance: balanceAfter })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wallets.userId, parseInt(params.userId)), (0, drizzle_orm_1.eq)(schema_1.wallets.ownerType, params.ownerType)));
            await tx.insert(schema_1.walletTransactions).values({
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
    static async debit(params) {
        const wallet = await db_1.db.query.wallets.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wallets.userId, parseInt(params.userId)), (0, drizzle_orm_1.eq)(schema_1.wallets.ownerType, params.ownerType)),
        });
        if (!wallet)
            throw new Error("Wallet not found");
        if (!wallet.isActive)
            throw new Error("Wallet is inactive");
        if (wallet.balance < params.amount)
            throw new Error("Insufficient balance");
        const balanceBefore = wallet.balance;
        const balanceAfter = balanceBefore - params.amount;
        await db_1.db.transaction(async (tx) => {
            await tx
                .update(schema_1.wallets)
                .set({ balance: balanceAfter })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wallets.userId, parseInt(params.userId)), (0, drizzle_orm_1.eq)(schema_1.wallets.ownerType, params.ownerType)));
            await tx.insert(schema_1.walletTransactions).values({
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
    static async requestWithdrawal(params) {
        const wallet = await db_1.db.query.wallets.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wallets.userId, parseInt(params.userId)), (0, drizzle_orm_1.eq)(schema_1.wallets.ownerType, params.ownerType)),
        });
        if (!wallet)
            throw new Error("Wallet not found");
        if (!wallet.isActive)
            throw new Error("Wallet is inactive");
        if (wallet.balance < params.amount)
            throw new Error("Insufficient balance");
        // Block if a pending withdrawal already exists for this wallet
        const pending = await db_1.db.query.withdrawalRequests.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.withdrawalRequests.walletId, wallet.id), (0, drizzle_orm_1.eq)(schema_1.withdrawalRequests.status, "pending")),
        });
        if (pending) {
            throw new Error("A pending withdrawal request already exists for this wallet");
        }
        const [request] = await db_1.db
            .insert(schema_1.withdrawalRequests)
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
    static async getWithdrawals(userId, ownerType) {
        const wallet = await db_1.db.query.wallets.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wallets.userId, parseInt(userId)), (0, drizzle_orm_1.eq)(schema_1.wallets.ownerType, ownerType)),
        });
        if (!wallet)
            throw new Error("Wallet not found");
        return db_1.db.query.withdrawalRequests.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.withdrawalRequests.walletId, wallet.id),
            orderBy: (w, { desc }) => [desc(w.createdAt)],
        });
    }
}
exports.default = WalletService;
