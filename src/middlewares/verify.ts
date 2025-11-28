import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../utils/supabase";


export async function verifySupabaseToken(req:Request, res:Response, next:NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) return res.status(401).json({ message: "No token" });

  const { data, error } = await supabase.auth.getUser(token);

  if (error) return res.status(403).json({ message: "Invalid token" });

  req.user = data.user;
  next();
}

