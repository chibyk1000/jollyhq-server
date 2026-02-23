import { Request, Response } from "express";
import { chatMembers, chats, orders } from "../db/schema";
import { and, eq } from "drizzle-orm";
import { db } from "../db";

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

      const order = await db.query.orders.findFirst({
        where: eq(orders.orderReference, req.params.orderReference),
        with: {
          event: true,
          ticket: true,
          },
      });
        
     
          const chat = await db.query.chats.findFirst({
            where: eq(chats.eventId, order?.eventId || ""),
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
              eq(chatMembers.profileId, order?.userId as string),
              eq(chatMembers.isBanned, false),
            ),
          });

      return res.status(200).json({
        success: true,
          data: order,
        member: member ? member: null,
      });
    } catch (error) {
      console.error("Get user orders error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}
