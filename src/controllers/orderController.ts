import { Request, Response } from "express";
import { chatMembers, chats, orders } from "../db/schema";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { logger } from "../utils/logger";

export class OrderController {
  static async getUserOrders(req: Request, res: Response) {
    try {
      const user = req?.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { orderReference } = req.params;
      const orderReferenceStr = Array.isArray(orderReference)
        ? orderReference[0]
        : orderReference;

      const order = await db.query.orders.findFirst({
        where: eq(orders.orderReference, orderReferenceStr),
        with: {
          event: true,
          ticket: true,
        },
      });

      const chat = await db.query.chats.findFirst({
        where: order?.eventId ? eq(chats.eventId, order.eventId) : undefined,
      });
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat not found for this event",
        });
      }

      const member = await db.query.chatMembers.findFirst({
        where: and(
          eq(chatMembers.chatId, chat?.id),
          ...(order?.userId ? [eq(chatMembers.profileId, order.userId)] : []),
          eq(chatMembers.isBanned, false),
        ),
      });

      return res.status(200).json({
        success: true,
        data: order,
        member: member ? member : null,
      });
    } catch (error) {
      logger.error("Get user orders error", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}
