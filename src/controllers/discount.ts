// src/controllers/discount.controller.ts
import { Request, Response } from "express";
import { db } from "../db";
import { eventDiscounts } from "../db/schema/eventDiscounts";
import { eq } from "drizzle-orm";

export class DiscountController {
  static async updateDiscount(req: Request, res: Response) {
    try {
      const { discountId } = req.params;

      const data = req.body;
      delete data.id;

      const [updated] = await db
        .update(eventDiscounts)
        .set(data)
        .where(eq(eventDiscounts.id, discountId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Discount not found" });
      }

      return res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async deleteDiscount(req: Request, res: Response) {
    try {
      const { discountId } = req.params;

      const [deleted] = await db
        .delete(eventDiscounts)
        .where(eq(eventDiscounts.id, discountId))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Discount not found" });
      }

      return res.json({ message: "Discount deleted" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
}
