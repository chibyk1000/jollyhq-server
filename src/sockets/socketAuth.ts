import { Socket } from "socket.io";
import { supabase } from "../utils/supabase";

export async function supabaseSocketAuth(
  socket: Socket,
  next: (err?: Error) => void
) {
  try {
    const accessToken = socket.handshake.auth?.accessToken;

    if (!accessToken) {
      return next(new Error("No access token"));
    }

    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user) {
      return next(new Error("Invalid Supabase token"));
    }

    socket.user = data.user; // attach Supabase user
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
}
