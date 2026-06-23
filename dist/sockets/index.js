"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSocketHandlers = registerSocketHandlers;
const socketAuth_1 = require("./socketAuth");
const chat_socket_1 = require("./chat.socket");
function registerSocketHandlers(io) {
    io.use(socketAuth_1.verifySocket);
    io.on("connection", (socket) => {
        console.log("🔌 Connected:", socket.user.id);
        (0, chat_socket_1.chatSocket)(io, socket);
        socket.on("disconnect", () => {
            console.log("❌ Disconnected:", socket.user.id);
        });
    });
}
