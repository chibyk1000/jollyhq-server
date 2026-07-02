import { Request, Response } from "express";
import { NewUser as NewProfile, user as profiles } from "../db/schema/profiles";
import { supabase } from "../utils/supabase";
import { db } from "../db";
import { uploadToSupabase } from "../utils/upload";
import { and, asc, desc, eq, gte, inArray, or, sql } from "drizzle-orm";
import { eventPlanners } from "../db/schema/eventPlanners";
import { vendors } from "../db/schema/vendors";
import { wallets } from "../db/schema/wallet";
import { WALLET_OWNER_TYPES } from "../utils/constants";

import { auth } from "../utils/auth";
import { events, eventTickets, orders, favoriteEvents } from "../db/schema";

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
  static async getUserDashboard(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // ── 1. Profile ────────────────────────────────────────────────────────
      const [user] = await db
        .select({
          id: profiles.id,
          firstName: profiles.firstName,
          lastName: profiles.lastName,
          username: profiles.username,
          image: profiles.image,
          email: profiles.email,
        })
        .from(profiles)
        .where(eq(profiles.id, userId));

      if (!user) return res.status(404).json({ message: "User not found" });

      // ── 2. Tickets purchased ──────────────────────────────────────────────
      const userOrders = await db
        .select({
          id: orders.id,
          quantity: orders.quantity,
          totalAmount: orders.totalAmount,
          status: orders.status,
          createdAt: orders.createdAt,
          eventId: orders.eventId,
          ticketId: orders.ticketId,
          // Event info
          eventName: events.name,
          eventDate: events.eventDate,
          eventImage: events.imageUrl,
          eventLocation: events.location,
          // Ticket info
          ticketLabel: eventTickets.label,
        })
        .from(orders)
        .innerJoin(events, eq(events.id, orders.eventId))
        .leftJoin(eventTickets, eq(eventTickets.id, orders.ticketId))
        .where(and(eq(orders.userId, userId), eq(orders.status, "PAID")))
        .orderBy(desc(orders.createdAt))
        .limit(20);

      // ── 3. Stats ──────────────────────────────────────────────────────────
      const [ticketStats] = await db
        .select({
          totalTickets: sql<number>`COALESCE(SUM(${orders.quantity}::int), 0)`,
          totalSpent: sql<number>`COALESCE(SUM(${orders.totalAmount}::numeric), 0)`,
          totalOrders: sql<number>`COUNT(*)`,
        })
        .from(orders)
        .where(and(eq(orders.userId, userId), eq(orders.status, "PAID")));

      // ── 4. Upcoming events the user has a ticket for ───────────────────────
      const upcomingUserEvents = userOrders
        .filter((o) => o.eventDate && new Date(o.eventDate) > new Date())
        .slice(0, 5)
        .map((o) => ({
          orderId: o.id,
          eventId: o.eventId,
          eventName: o.eventName,
          eventDate: o.eventDate,
          eventImage: o.eventImage,
          eventLocation: o.eventLocation,
          ticketLabel: o.ticketLabel,
          quantity: o.quantity,
        }));

      // ── 5. Past events attended ───────────────────────────────────────────
      const pastEvents = userOrders
        .filter((o) => o.eventDate && new Date(o.eventDate) <= new Date())
        .slice(0, 5)
        .map((o) => ({
          orderId: o.id,
          eventId: o.eventId,
          eventName: o.eventName,
          eventDate: o.eventDate,
          eventImage: o.eventImage,
          eventLocation: o.eventLocation,
          ticketLabel: o.ticketLabel,
          quantity: o.quantity,
        }));

      // ── 6. Favourites ─────────────────────────────────────────────────────
      const userFavourites = await db
        .select({
          eventId: events.id,
          eventName: events.name,
          eventDate: events.eventDate,
          eventImage: events.imageUrl,
          eventLocation: events.location,
          category: events.category,
        })
        .from(favoriteEvents)
        .innerJoin(events, eq(events.id, favoriteEvents.eventId))
        .where(eq(favoriteEvents.userId, userId))
        .orderBy(desc(favoriteEvents.createdAt))
        .limit(6);

      // ── 7. Recent spend per month (for mini chart) ────────────────────────
      const spendMonthly = await db
        .select({
          month: sql<number>`EXTRACT(MONTH FROM ${orders.createdAt})`,
          spent: sql<number>`COALESCE(SUM(${orders.totalAmount}::numeric), 0)`,
          tickets: sql<number>`COALESCE(SUM(${orders.quantity}::int), 0)`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.userId, userId),
            eq(orders.status, "PAID"),
            gte(orders.createdAt, sql`NOW() - INTERVAL '6 months'`),
          ),
        )
        .groupBy(sql`EXTRACT(MONTH FROM ${orders.createdAt})`)
        .orderBy(asc(sql`EXTRACT(MONTH FROM ${orders.createdAt})`));

      const MONTHS = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const spendChart = MONTHS.map((month, i) => {
        const match = spendMonthly.find((r) => Number(r.month) === i + 1);
        return {
          month,
          spent: Number(match?.spent ?? 0),
          tickets: Number(match?.tickets ?? 0),
        };
      });

      // ── 8. Role flags ─────────────────────────────────────────────────────
      const [vendorProfile] = await db
        .select({ id: vendors.id })
        .from(vendors)
        .where(eq(vendors.userId, userId));
      const [plannerProfile] = await db
        .select({ id: eventPlanners.id })
        .from(eventPlanners)
        .where(eq(eventPlanners.profileId, userId));

      return res.json({
        user,
        stats: {
          totalTickets: Number(ticketStats.totalTickets ?? 0),
          totalSpent: Number(ticketStats.totalSpent ?? 0),
          totalOrders: Number(ticketStats.totalOrders ?? 0),
          eventsAttended: pastEvents.length,
          upcomingCount: upcomingUserEvents.length,
          favouritesCount: userFavourites.length,
        },
        upcomingEvents: upcomingUserEvents,
        pastEvents,
        favourites: userFavourites,
        spendChart,
        roles: {
          isVendor: Boolean(vendorProfile),
          isPlanner: Boolean(plannerProfile),
        },
      });
    } catch (error: any) {
      console.error("User dashboard error:", error);
      return res.status(500).json({
        message: "Failed to load user dashboard",
        error: error.message,
      });
    }
  }
}
