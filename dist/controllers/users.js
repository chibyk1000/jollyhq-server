"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserControllers = void 0;
const profiles_1 = require("../db/schema/profiles");
const db_1 = require("../db");
const upload_1 = require("../utils/upload");
const drizzle_orm_1 = require("drizzle-orm");
const eventPlanners_1 = require("../db/schema/eventPlanners");
const vendors_1 = require("../db/schema/vendors");
const wallet_1 = require("../db/schema/wallet");
const auth_1 = require("../utils/auth");
const schema_1 = require("../db/schema");
const logger_1 = require("../utils/logger");
class UserControllers {
    static async createUser(req, res) {
        try {
            const { id, email, firstName, lastName, username, agreedToTerms, phoneNumber, googleId, facebookId, instagramId, } = req.body;
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
            if (JSON.parse(agreedToTerms) !== true) {
                return res.status(400).json({
                    error: "User must accept Terms & Conditions before creating an account.",
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
            const avatarUrl = await (0, upload_1.uploadToSupabase)(avatarFile, "avatars");
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
        }
        catch (error) {
            logger_1.logger.error("Failed to create user", error);
            return res.status(500).json({ error: "Server error" });
        }
    }
    static async verifyEmail(req, res) {
        try {
            if (!req.body.otp) {
                return res.status(400).json({ message: "otp is required" });
            }
            if (!req.body.email) {
                return res.status(400).json({ message: "otp is required" });
            }
            const data = await auth_1.auth.api.checkVerificationOTP({
                body: {
                    email: req.body.email, // required
                    type: "email-verification", // required
                    otp: req.body.otp, // required
                },
            });
            return res.json({ message: "success" });
        }
        catch (err) {
            return res.status(500).json({ message: "internal server error" });
        }
    }
    static async getProfile(req, res) {
        try {
            const { id } = req.params;
            if (!id || typeof id !== "string") {
                return res.status(400).json({ error: "User ID is required." });
            }
            // Check if user exists
            const [user] = await db_1.db
                .select()
                .from(profiles_1.user)
                .where((0, drizzle_orm_1.eq)(profiles_1.user.id, id));
            if (!user) {
                return res.status(404).json({ error: "User not found." });
            }
            // Check if user has a vendor profile
            const [vendorProfile] = await db_1.db
                .select()
                .from(vendors_1.vendors)
                .where((0, drizzle_orm_1.eq)(vendors_1.vendors.userId, id));
            // Check if user has an event planner profile
            const [plannerProfile] = await db_1.db
                .select()
                .from(eventPlanners_1.eventPlanners)
                .where((0, drizzle_orm_1.eq)(eventPlanners_1.eventPlanners.profileId, id));
            const hasVendorProfile = Boolean(vendorProfile);
            const hasPlannerProfile = Boolean(plannerProfile);
            // Check for wallet
            const conditions = [];
            if (plannerProfile?.id) {
                conditions.push((0, drizzle_orm_1.eq)(wallet_1.wallets.userId, plannerProfile.id));
            }
            if (vendorProfile?.id) {
                conditions.push((0, drizzle_orm_1.eq)(wallet_1.wallets.userId, vendorProfile.id));
            }
            let wallet = null;
            if (conditions.length > 0) {
                [wallet] = await db_1.db
                    .select()
                    .from(wallet_1.wallets)
                    .where((0, drizzle_orm_1.or)(...conditions));
            }
            const hasWallet = Boolean(wallet);
            return res.status(200).json({
                user,
                hasVendorProfile,
                hasPlannerProfile,
                hasWallet,
            });
        }
        catch (error) {
            logger_1.logger.error("Failed to get user profile", error);
            return res.status(500).json({ error: "Server error" });
        }
    }
    static async updateProfile(req, res) {
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
            const updateData = {};
            if (firstName !== undefined)
                updateData.firstName = firstName;
            if (lastName !== undefined)
                updateData.lastName = lastName;
            if (username !== undefined)
                updateData.username = username;
            // ---------- AVATAR UPLOAD ----------
            if (req.file) {
                const avatarUrl = await (0, upload_1.uploadToSupabase)(req.file, "avatars");
                updateData.image = avatarUrl;
            }
            if (Object.keys(updateData).length === 0 && !password) {
                return res.status(400).json({ error: "Nothing to update." });
            }
            // ---------- UPDATE LOCAL DB ----------
            if (Object.keys(updateData).length > 0) {
                await db_1.db.update(profiles_1.user).set(updateData).where((0, drizzle_orm_1.eq)(profiles_1.user.id, id));
            }
            // ---------- UPDATE AUTH PASSWORD (if needed) ----------
            // TODO: Update Supabase Auth password here
            // await supabase.auth.admin.updateUserById(id, { password });
            // ---------- FETCH UPDATED USER ----------
            const [updatedUser] = await db_1.db
                .select()
                .from(profiles_1.user)
                .where((0, drizzle_orm_1.eq)(profiles_1.user.id, id));
            return res.status(200).json(updatedUser);
        }
        catch (error) {
            logger_1.logger.error("Update profile error", error);
            return res.status(500).json({ error: "Server error" });
        }
    }
    static async getUserDashboard(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ message: "Unauthorized" });
            // ── 1. Profile ────────────────────────────────────────────────────────
            const [user] = await db_1.db
                .select({
                id: profiles_1.user.id,
                firstName: profiles_1.user.firstName,
                lastName: profiles_1.user.lastName,
                username: profiles_1.user.username,
                image: profiles_1.user.image,
                email: profiles_1.user.email,
            })
                .from(profiles_1.user)
                .where((0, drizzle_orm_1.eq)(profiles_1.user.id, userId));
            if (!user)
                return res.status(404).json({ message: "User not found" });
            // ── 2. Tickets purchased ──────────────────────────────────────────────
            const userOrders = await db_1.db
                .select({
                id: schema_1.orders.id,
                quantity: schema_1.orders.quantity,
                totalAmount: schema_1.orders.totalAmount,
                status: schema_1.orders.status,
                createdAt: schema_1.orders.createdAt,
                eventId: schema_1.orders.eventId,
                ticketId: schema_1.orders.ticketId,
                // Event info
                eventName: schema_1.events.name,
                eventDate: schema_1.events.eventDate,
                eventImage: schema_1.events.imageUrl,
                eventLocation: schema_1.events.location,
                // Ticket info
                ticketLabel: schema_1.eventTickets.label,
            })
                .from(schema_1.orders)
                .innerJoin(schema_1.events, (0, drizzle_orm_1.eq)(schema_1.events.id, schema_1.orders.eventId))
                .leftJoin(schema_1.eventTickets, (0, drizzle_orm_1.eq)(schema_1.eventTickets.id, schema_1.orders.ticketId))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.userId, userId), (0, drizzle_orm_1.eq)(schema_1.orders.status, "PAID")))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.orders.createdAt))
                .limit(20);
            // ── 3. Stats ──────────────────────────────────────────────────────────
            const [ticketStats] = await db_1.db
                .select({
                totalTickets: (0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.orders.quantity}::int), 0)`,
                totalSpent: (0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.orders.totalAmount}::numeric), 0)`,
                totalOrders: (0, drizzle_orm_1.sql) `COUNT(*)`,
            })
                .from(schema_1.orders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.userId, userId), (0, drizzle_orm_1.eq)(schema_1.orders.status, "PAID")));
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
            const userFavourites = await db_1.db
                .select({
                eventId: schema_1.events.id,
                eventName: schema_1.events.name,
                eventDate: schema_1.events.eventDate,
                eventImage: schema_1.events.imageUrl,
                eventLocation: schema_1.events.location,
                category: schema_1.events.category,
            })
                .from(schema_1.favoriteEvents)
                .innerJoin(schema_1.events, (0, drizzle_orm_1.eq)(schema_1.events.id, schema_1.favoriteEvents.eventId))
                .where((0, drizzle_orm_1.eq)(schema_1.favoriteEvents.userId, userId))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.favoriteEvents.createdAt))
                .limit(6);
            // ── 7. Recent spend per month (for mini chart) ────────────────────────
            const spendMonthly = await db_1.db
                .select({
                month: (0, drizzle_orm_1.sql) `EXTRACT(MONTH FROM ${schema_1.orders.createdAt})`,
                spent: (0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.orders.totalAmount}::numeric), 0)`,
                tickets: (0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.orders.quantity}::int), 0)`,
            })
                .from(schema_1.orders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.userId, userId), (0, drizzle_orm_1.eq)(schema_1.orders.status, "PAID"), (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, (0, drizzle_orm_1.sql) `NOW() - INTERVAL '6 months'`)))
                .groupBy((0, drizzle_orm_1.sql) `EXTRACT(MONTH FROM ${schema_1.orders.createdAt})`)
                .orderBy((0, drizzle_orm_1.asc)((0, drizzle_orm_1.sql) `EXTRACT(MONTH FROM ${schema_1.orders.createdAt})`));
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
            const [vendorProfile] = await db_1.db
                .select({ id: vendors_1.vendors.id })
                .from(vendors_1.vendors)
                .where((0, drizzle_orm_1.eq)(vendors_1.vendors.userId, userId));
            const [plannerProfile] = await db_1.db
                .select({ id: eventPlanners_1.eventPlanners.id })
                .from(eventPlanners_1.eventPlanners)
                .where((0, drizzle_orm_1.eq)(eventPlanners_1.eventPlanners.profileId, userId));
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
        }
        catch (error) {
            logger_1.logger.error("User dashboard error", error);
            return res.status(500).json({
                message: "Failed to load user dashboard",
                error: error.message,
            });
        }
    }
}
exports.UserControllers = UserControllers;
