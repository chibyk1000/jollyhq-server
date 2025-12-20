"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserControllers = void 0;
const profiles_1 = require("../db/schema/profiles");
const supabase_1 = require("../utils/supabase");
const db_1 = require("../db");
const upload_1 = require("../utils/upload");
const drizzle_orm_1 = require("drizzle-orm");
const eventPlanners_1 = require("../db/schema/eventPlanners");
const vendors_1 = require("../db/schema/vendors");
const wallet_1 = require("../db/schema/wallet");
class UserControllers {
    static async createUser(req, res) {
        try {
            const { id, email, firstName, lastName, username, agreedToTerms, phone, googleId, facebookId, instagramId, } = req.body;
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
            if (phone && typeof phone !== "string") {
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
            const newUser = {
                id: id, // Or generate a UUID here if needed
                email,
                firstName,
                lastName,
                username,
                agreedToTerms,
                phone: phone || null,
                googleId: googleId || null,
                facebookId: facebookId || null,
                instagramId: instagramId || null,
                avatarUrl,
            };
            const result = await db_1.db.insert(profiles_1.profiles).values(newUser).returning();
            return res.status(201).json(result[0]);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Server error" });
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
                .from(profiles_1.profiles)
                .where((0, drizzle_orm_1.eq)(profiles_1.profiles.id, id));
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
                conditions.push((0, drizzle_orm_1.eq)(wallet_1.wallets.ownerId, plannerProfile.id));
            }
            if (vendorProfile?.id) {
                conditions.push((0, drizzle_orm_1.eq)(wallet_1.wallets.ownerId, vendorProfile.id));
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
            console.error(error);
            return res.status(500).json({ error: "Server error" });
        }
    }
    static async updateProfile(req, res) {
        try {
            const { id } = req.params;
            const { firstName, lastName, password } = req.body;
            if (!id || typeof id !== "string") {
                return res.status(400).json({ error: "User ID is required." });
            }
            // ---------- VALIDATION ----------
            if (firstName && typeof firstName !== "string") {
                return res.status(400).json({ error: "First name must be a string." });
            }
            if (lastName && typeof lastName !== "string") {
                return res.status(400).json({ error: "Last name must be a string." });
            }
            if (password && typeof password !== "string") {
                return res.status(400).json({ error: "Password must be a string." });
            }
            if (password && password.length < 8) {
                return res
                    .status(400)
                    .json({ error: "Password must be at least 8 characters long." });
            }
            // ---------- AVATAR UPLOAD ----------
            let avatarUrl;
            const avatarFile = req.file;
            if (avatarFile) {
                avatarUrl = await (0, upload_1.uploadToSupabase)(avatarFile, "avatars");
            }
            // ---------- UPDATE LOCAL DB ----------
            const updateData = {};
            if (firstName)
                updateData.firstName = firstName;
            if (lastName)
                updateData.lastName = lastName;
            if (avatarUrl)
                updateData.avatarUrl = avatarUrl;
            if (Object.keys(updateData).length > 0) {
                await db_1.db.update(profiles_1.profiles).set(updateData).where((0, drizzle_orm_1.eq)(profiles_1.profiles.id, id));
            }
            // ---------- UPDATE SUPABASE AUTH ----------
            const authUpdatePayload = {
                user_metadata: {
                    firstName,
                    lastName,
                },
            };
            if (password) {
                authUpdatePayload.password = password;
            }
            const { error: supabaseError } = await supabase_1.supabase.auth.admin.updateUserById(id, authUpdatePayload);
            if (supabaseError) {
                console.error("Supabase update error:", supabaseError.message);
                return res
                    .status(500)
                    .json({ error: "Failed to update Supabase auth user." });
            }
            // ---------- FETCH UPDATED USER ----------
            const [updatedUser] = await db_1.db
                .select()
                .from(profiles_1.profiles)
                .where((0, drizzle_orm_1.eq)(profiles_1.profiles.id, id));
            return res.status(200).json(updatedUser);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Server error" });
        }
    }
}
exports.UserControllers = UserControllers;
