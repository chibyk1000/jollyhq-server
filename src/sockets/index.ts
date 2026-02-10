import { Server } from "socket.io";
import { supabaseSocketAuth } from "./socketAuth";
import { chatSocket } from "./chat.socket";
import { User } from "@supabase/supabase-js";

declare module "socket.io" {
  interface Socket {
    user: User;
  }
}
export function registerSocketHandlers(io: Server) {
  io.use(supabaseSocketAuth);

  io.on("connection", (socket) => {
    console.log("🔌 Connected:", socket.user.id);

    chatSocket(io, socket);

    socket.on("disconnect", () => {
      console.log("❌ Disconnected:", socket.user.id);
    });
  });
}
