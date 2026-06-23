"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySocket = verifySocket;
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
async function verifySocket(socket, next) {
    try {
        const token = socket.handshake.auth?.accessToken;
        if (!token) {
            return next(new Error("Unauthorized"));
        }
        console.log("Socket auth token:", socket.handshake.auth);
        const user = await db_1.db.query.user.findFirst({
            where: (profiles) => (0, drizzle_orm_1.eq)(profiles.id, socket.handshake.auth.userId),
        });
        socket.user = user;
        return next();
    }
    catch (error) {
        console.error("Socket auth error:", error);
        return next(new Error("Unauthorized"));
    }
}
