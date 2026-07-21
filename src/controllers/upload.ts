import { Request, Response } from "express";

import { db } from "../db";
import { user as profiles } from "../db/schema/profiles";
import { eq } from "drizzle-orm";
import { uploadFile } from "../utils/upload";
import { logger } from "../utils/logger";

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
        phone,
        googleId,
        facebookId,
        instagramId,
      } = req.body;

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
      let avatarUrl: string | null = null;
      if (file) {
        avatarUrl = await uploadFile(file, "avatars");
      }

      // -------- SAVE USER IN DB --------
      const newUser = await db
        .insert(profiles)
        .values({
          firstName,
          lastName,
          email,
          username,
          phoneNumber: phone || null,
          agreedToTerms: true,
          googleId: googleId || null,
          facebookId: facebookId || null,
          instagramId: instagramId || null,
          image: avatarUrl,
        })
        .returning();

      return res
        .status(201)
        .json({ message: "User created successfully", user: newUser });
    } catch (error) {
      logger.error("Failed to create user", error);
      return res.status(500).json({ error: "Server error" });
    }
  }
}
