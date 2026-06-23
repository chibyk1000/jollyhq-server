// src/controllers/discount.controller.ts
import { Request, Response } from "express";
import { db } from "../db";
import { eventDiscounts } from "../db/schema/eventDiscounts";
import { eq, desc } from "drizzle-orm";

export class DiscountController {
  static async getAllDiscountCodes(req: Request, res: Response) {
    try {
      const discountCodes = await db
        .select()
        .from(eventDiscounts)
        .orderBy(desc(eventDiscounts.createdAt));
      return res.json(discountCodes);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async getDiscountById(req: Request, res: Response) {
    try {
      const { discountId } = req.params;
      const discountIdStr = Array.isArray(discountId) ? discountId[0] : discountId;

      const [discount] = await db
        .select()
        .from(eventDiscounts)
        .where(eq(eventDiscounts.id, parseInt(discountIdStr)));

      if (!discount) {
        return res.status(404).json({ message: "Discount not found" });
      }

      return res.json(discount);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async createDiscount(req: Request, res: Response) {
    try {
      const data = req.body;

      const [created] = await db
        .insert(eventDiscounts)
        .values(data)
        .returning();

      return res.status(201).json(created);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async updateDiscount(req: Request, res: Response) {
    try {
      const { discountId } = req.params;
      const discountIdStr = Array.isArray(discountId) ? discountId[0] : discountId;

      const data = req.body;
      delete data.id;

      const [updated] = await db
        .update(eventDiscounts)
        .set(data)
        .where(eq(eventDiscounts.id, parseInt(discountIdStr)))
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
      const discountIdStr = Array.isArray(discountId) ? discountId[0] : discountId;

      const [deleted] = await db
        .delete(eventDiscounts)
        .where(eq(eventDiscounts.id, parseInt(discountIdStr)))
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
