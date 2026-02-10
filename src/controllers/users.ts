import { Request, Response } from "express";
import { NewUser as NewProfile, user as profiles } from "../db/schema/profiles";
import { supabase } from "../utils/supabase";
import { db } from "../db";
import { uploadToSupabase } from "../utils/upload";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { eventPlanners } from "../db/schema/eventPlanners";
import { vendors } from "../db/schema/vendors";
import { wallets } from "../db/schema/wallet";
import { WALLET_OWNER_TYPES } from "../utils/constants";
import { transactions } from "../db/schema";
import { auth } from "../utils/auth";

export class UserControllers {
  static async createUser(req: Request, res: Response) {
    try {
      const {
        id,
        email,
        firstName,
        lastName,
        username,
        agreedToTerms,
        phoneNumber,
        googleId,
        facebookId,
        instagramId,
      } = req.body as NewProfile;

      // ----- REQUIRED FIELDS -----
      if (!email || typeof email !== "string") {
        return res
          .status(400)
          .json({ error: "Email is required and must be a string." });
      }
      if (!id || typeof id !== "string") {
        return res
          .status(400)
          .json({ error: "ID is required and must be a string." });
      }

      if (!firstName || typeof firstName !== "string") {
        return res
          .status(400)
          .json({ error: "First name is required and must be a string." });
      }

      if (!lastName || typeof lastName !== "string") {
        return res
          .status(400)
          .json({ error: "Last name is required and must be a string." });
      }

      if (!username || typeof username !== "string") {
        return res
          .status(400)
          .json({ error: "Username is required and must be a string." });
      }

      // ----- EMAIL FORMAT -----
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format." });
      }

      // ----- LENGTH RULES -----
      if (firstName.length < 2) {
        return res
          .status(400)
          .json({ error: "First name must be at least 2 characters." });
      }

      if (lastName.length < 2) {
        return res
          .status(400)
          .json({ error: "Last name must be at least 2 characters." });
      }

      if (username.length < 3) {
        return res
          .status(400)
          .json({ error: "Username must be at least 3 characters." });
      }

      // ----- AGREED TO TERMS -----
      if (JSON.parse(agreedToTerms as any) !== true) {
        return res.status(400).json({
          error:
            "User must accept Terms & Conditions before creating an account.",
        });
      }

      // ----- OPTIONAL VALUES -----

      if (phoneNumber && typeof phoneNumber !== "string") {
        return res
          .status(400)
          .json({ error: "Phone number must be a string." });
      }

      if (googleId && typeof googleId !== "string") {
        return res.status(400).json({ error: "googleId must be a string." });
      }

      if (facebookId && typeof facebookId !== "string") {
        return res.status(400).json({ error: "facebookId must be a string." });
      }

      if (instagramId && typeof instagramId !== "string") {
        return res.status(400).json({ error: "instagramId must be a string." });
      }
      const avatarFile = req.file; // from multer

      // ===== Upload avatar to Supabase =====
      if (!avatarFile) {
        return res.status(400).json({ error: "avatar is required" });
      }

      const avatarUrl = await uploadToSupabase(avatarFile, "avatars");

      // ----- INSERT INTO DATABASE -----
      // const newUser: NewProfile = {
      //   id: id, // Or generate a UUID here if needed
      //   email,
      //   firstName,
      //   lastName,
      //   username,
      //   agreedToTerms,

      //   phone: phone || null,
      //   googleId: googleId || null,
      //   facebookId: facebookId || null,
      //   instagramId: instagramId || null,
      //   avatarUrl,
      // };

      // const result = await db.insert(profiles).values(newUser).returning();
      // return res.status(201).json(result[0]);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Server error" });
    }
  }
  static async verifyEmail(req: Request, res: Response) {
    try {
      if (!req.body.otp) {
        return res.status(400).json({ message: "otp is required" });
      }
      if (!req.body.email) {
        return res.status(400).json({ message: "otp is required" });
      }
      const data = await auth.api.checkVerificationOTP({
        body: {
          email: req.body.email, // required
          type: "email-verification", // required
          otp: req.body.otp, // required
        },
      });
      return res.json({ message: "success" });
    } catch (err) {
      return res.status(500).json({ message: "internal server error" });
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "User ID is required." });
      }

      // Check if user exists
      const [user] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, id));

      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      // Check if user has a vendor profile
      const [vendorProfile] = await db
        .select()
        .from(vendors)
        .where(eq(vendors.userId, id));

      // Check if user has an event planner profile
      const [plannerProfile] = await db
        .select()
        .from(eventPlanners)
        .where(eq(eventPlanners.profileId, id));

      const hasVendorProfile = Boolean(vendorProfile);
      const hasPlannerProfile = Boolean(plannerProfile);

      // Check for wallet
      const conditions = [];

      if (plannerProfile?.id) {
        conditions.push(eq(wallets.userId, plannerProfile.id));
      }

      if (vendorProfile?.id) {
        conditions.push(eq(wallets.userId, vendorProfile.id));
      }

      let wallet = null;

      if (conditions.length > 0) {
        [wallet] = await db
          .select()
          .from(wallets)
          .where(or(...conditions));
      }

      const hasWallet = Boolean(wallet);
      return res.status(200).json({
        user,
        hasVendorProfile,
        hasPlannerProfile,
        hasWallet,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Server error" });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { firstName, lastName, password, username } = req.body;

      if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "User ID is required." });
      }

      // ---------- VALIDATION ----------
      if (firstName !== undefined && typeof firstName !== "string") {
        return res.status(400).json({ error: "First name must be a string." });
      }

      if (lastName !== undefined && typeof lastName !== "string") {
        return res.status(400).json({ error: "Last name must be a string." });
      }
      if (username !== undefined && typeof username !== "string") {
        return res.status(400).json({ error: "Username must be a string." });
      }

      if (password !== undefined) {
        if (typeof password !== "string") {
          return res.status(400).json({ error: "Password must be a string." });
        }

        if (password.length < 8) {
          return res
            .status(400)
            .json({ error: "Password must be at least 8 characters long." });
        }
      }

      // ---------- BUILD UPDATE DATA ----------
      const updateData: Partial<NewProfile> = {};

      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (username !== undefined) updateData.username = username;

      // ---------- AVATAR UPLOAD ----------
      if (req.file) {
        const avatarUrl = await uploadToSupabase(req.file, "avatars");
        updateData.image = avatarUrl;
      }

      if (Object.keys(updateData).length === 0 && !password) {
        return res.status(400).json({ error: "Nothing to update." });
      }

      // ---------- UPDATE LOCAL DB ----------
      if (Object.keys(updateData).length > 0) {
        await db.update(profiles).set(updateData).where(eq(profiles.id, id));
      }

      // ---------- UPDATE AUTH PASSWORD (if needed) ----------
      // TODO: Update Supabase Auth password here
      // await supabase.auth.admin.updateUserById(id, { password });

      // ---------- FETCH UPDATED USER ----------
      const [updatedUser] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, id));

      return res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Update profile error:", error);
      return res.status(500).json({ error: "Server error" });
    }
  }

  static async getMyWallet(req: Request, res: Response) {
    try {
      const userId = req.user?.id as string;


      /* =========================
       1️⃣ Fetch user's wallet
    ========================= */
      const wallet = await db.query.wallets.findFirst({
        where: and(eq(wallets.userId, userId)),
      });

      /* =========================
       2️⃣ If no wallet → ask to create
    ========================= */
      if (!wallet) {
        return res.json({
          wallet: null,
          transactions: [],
          needsWallet: true,
          message: "User does not have a wallet. Prompt wallet creation.",
        });
      }

      /* =========================
       3️⃣ Fetch wallet transactions
    ========================= */
      const transactionsRecords = await db.query.transactions.findMany({
        where: eq(transactions.walletId, wallet.id),
        orderBy: (t) => desc(t.createdAt),
        limit: 20,
      });

      /* =========================
       4️⃣ Serialize
    ========================= */
      const serializedWallet = {
        id: wallet.id,
        balance: wallet.balance,
        currency: wallet.currency,
        ownerId: wallet.userId,
      };

      const serializedTransactions = transactionsRecords.map((tx) => ({
        id: tx.id,
        walletId: tx.walletId,
        amount: tx.amount,
        description: tx.description,
        status: tx.status,
        createdAt: tx.createdAt,
      }));

      /* =========================
       5️⃣ Response
    ========================= */
      return res.json({
        wallet: serializedWallet,
        transactions: serializedTransactions,
        needsWallet: false,
        summary: {
          balance: wallet.balance,
          currency: wallet.currency,
          transactionCount: transactionsRecords.length,
        },
      });
    } catch (error) {
      console.error("GET MY WALLET ERROR:", error);
      return res.status(500).json({
        message: "Failed to fetch wallet",
      });
    }
  }
}
