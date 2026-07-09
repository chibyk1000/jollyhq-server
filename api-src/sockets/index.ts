import { Server } from "socket.io";
import { verifySocket } from "./socketAuth";
import { chatSocket } from "./chat.socket";


declare module "socket.io" {
  interface Socket {

  }
}
export function registerSocketHandlers(io: Server) {
  io.use(verifySocket);

  io.on("connection", (socket) => {
    console.log("🔌 Connected:", socket.user.id);

    chatSocket(io, socket);

    socket.on("disconnect", () => {
      console.log("❌ Disconnected:", socket.user.id);
    });
  });
}
