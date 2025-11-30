import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../utils/supabase";

import { User } from "@supabase/supabase-js"; // or your own user type

declare global {
  namespace Express {
    interface Request {
      user?: User | null;
    }
  }
}
export async function verifySupabaseToken(req:Request, res:Response, next:NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) return res.status(401).json({ message: "No token" });

  const { data, error } = await supabase.auth.getUser(token);

  if (error) return res.status(403).json({ message: "Invalid token" });

  req.user = data.user;

  next();
}

