import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../utils/supabase";


import { auth } from "../utils/auth";
import { fromNodeHeaders,  } from "better-auth/node";
import { User } from "better-auth/types";

declare global {
  namespace Express {
    interface Request {
      user?: User | null;
    }
  }
}
export async function verifyToken(req: Request, res: Response, next: NextFunction) {

  
  	const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

   

  req.user = session?.user;

  next();
}

