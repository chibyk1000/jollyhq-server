"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserControllers = void 0;
const profiles_1 = require("../db/schema/profiles");
const db_1 = require("../db");
const upload_1 = require("../utils/upload");
const drizzle_orm_1 = require("drizzle-orm");
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
            // Fetch user from database
            const [user] = await db_1.db
                .select()
                .from(profiles_1.profiles)
                .where((0, drizzle_orm_1.eq)(profiles_1.profiles.id, id));
            if (!user) {
                return res.status(404).json({ error: "User not found." });
            }
            return res.status(200).json({ user });
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Server error" });
        }
    }
}
exports.UserControllers = UserControllers;
