import { AuthenticatedSocket } from "../types/socket";

import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../utils/auth";
import { logger } from "../utils/logger";
import { db } from "../db";
import { eq } from "drizzle-orm";


export async function verifySocket(
  socket: AuthenticatedSocket,
  next: (err?: Error) => void,
) {
  try {
    const token = socket.handshake.auth?.accessToken;

    if (!token) {
      return next(new Error("Unauthorized"));
    }
console.log("Socket auth token:", socket.handshake.auth);

const user  = await db.query.user.findFirst({
  where: (profiles) => eq(profiles.id, socket.handshake.auth.userId),
});
    socket.user = user;

    return next();
  } catch (error) {
    console.error("Socket auth error:", error);
    return next(new Error("Unauthorized"));
  }
}
