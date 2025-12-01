"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserControllers = void 0;
const db_1 = require("../db");
const profiles_1 = require("../db/schema/profiles");
const supabase_1 = require("../utils/supabase");
class UserControllers {
    static async createUser(req, res) {
        try {
            const { id, email, firstName, lastName, username, agreedToTerms, phone, googleId, facebookId, instagramId, } = req.body;
            const file = req.file; // Multer file
            // -------- VALIDATION (same as your code) --------
            if (!id || typeof id !== "string") {
                return res
                    .status(400)
                    .json({ error: "User ID is required and must be a string." });
            }
            if (!email || typeof email !== "string") {
                return res
                    .status(400)
                    .json({ error: "Email is required and must be a string." });
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
            if (!agreedToTerms) {
                return res
                    .status(400)
                    .json({ error: "User must accept Terms & Conditions." });
            }
            // Email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ error: "Invalid email format." });
            }
            // Length checks
            if (firstName.length < 2)
                return res
                    .status(400)
                    .json({ error: "First name must be at least 2 characters." });
            if (lastName.length < 2)
                return res
                    .status(400)
                    .json({ error: "Last name must be at least 2 characters." });
            if (username.length < 3)
                return res
                    .status(400)
                    .json({ error: "Username must be at least 3 characters." });
            // -------- AVATAR UPLOAD --------
            let avatarUrl = null;
            if (file) {
                const filePath = `avatars/${username}-${Date.now()}-${file.originalname}`;
                const { error: uploadError } = await supabase_1.supabase.storage
                    .from("avatars")
                    .upload(filePath, file.buffer, {
                    contentType: file.mimetype,
                });
                if (uploadError) {
                    return res.status(400).json({ error: uploadError.message });
                }
                const { data } = supabase_1.supabase.storage
                    .from("avatars")
                    .getPublicUrl(filePath);
                avatarUrl = data.publicUrl;
            }
            // -------- SAVE USER IN DB --------
            const newUser = await db_1.db
                .insert(profiles_1.profiles)
                .values({
                id,
                firstName,
                lastName,
                email,
                username,
                phone: phone || null,
                agreedToTerms: true,
                googleId: googleId || null,
                facebookId: facebookId || null,
                instagramId: instagramId || null,
                avatarUrl,
            })
                .returning();
            return res
                .status(201)
                .json({ message: "User created successfully", user: newUser });
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Server error" });
        }
    }
}
exports.UserControllers = UserControllers;
