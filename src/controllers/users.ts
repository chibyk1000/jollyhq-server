import { Request, Response } from "express";
import { NewProfile } from "../db/schema";

export class UserControllers {
  static createUser(req: Request, res: Response) {
    try {
      const {
        email,
        firstName,
        lastName,
        username,
        agreedToTerms,
        phone,
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
      if (agreedToTerms !== true) {
        return res.status(400).json({
          error:
            "User must accept Terms & Conditions before creating an account.",
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

      // -------- IF YOU PASSED ALL VALIDATION --------
      return res.status(200).json({ message: "User validated successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Server error" });
    }
  }
}
