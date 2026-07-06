"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderController = void 0;
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../db");
const logger_1 = require("../utils/logger");
class OrderController {
    static async getUserOrders(req, res) {
        try {
            const user = req?.user;
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            const { orderReference } = req.params;
            const orderReferenceStr = Array.isArray(orderReference) ? orderReference[0] : orderReference;
            const order = await db_1.db.query.orders.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.orders.orderReference, orderReferenceStr),
                with: {
                    event: true,
                    ticket: true,
                },
            });
            const chat = await db_1.db.query.chats.findFirst({
                where: order?.eventId ? (0, drizzle_orm_1.eq)(schema_1.chats.eventId, order.eventId) : undefined,
            });
            if (!chat) {
                return res.status(404).json({
                    success: false,
                    message: "Chat not found for this event",
                });
            }
            const member = await db_1.db.query.chatMembers.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.chatMembers.chatId, chat?.id), ...(order?.userId ? [(0, drizzle_orm_1.eq)(schema_1.chatMembers.profileId, order.userId)] : []), (0, drizzle_orm_1.eq)(schema_1.chatMembers.isBanned, false)),
            });
            return res.status(200).json({
                success: true,
                data: order,
                member: member ? member : null,
            });
        }
        catch (error) {
            logger_1.logger.error("Get user orders error", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
}
exports.OrderController = OrderController;
