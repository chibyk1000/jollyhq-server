"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscountController = void 0;
const db_1 = require("../db");
const eventDiscounts_1 = require("../db/schema/eventDiscounts");
const drizzle_orm_1 = require("drizzle-orm");
class DiscountController {
    static async getAllDiscountCodes(req, res) {
        try {
            const discountCodes = await db_1.db
                .select()
                .from(eventDiscounts_1.eventDiscounts)
                .orderBy((0, drizzle_orm_1.desc)(eventDiscounts_1.eventDiscounts.createdAt));
            return res.json(discountCodes);
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
    static async getDiscountById(req, res) {
        try {
            const { discountId } = req.params;
            const discountIdStr = Array.isArray(discountId) ? discountId[0] : discountId;
            const [discount] = await db_1.db
                .select()
                .from(eventDiscounts_1.eventDiscounts)
                .where((0, drizzle_orm_1.eq)(eventDiscounts_1.eventDiscounts.id, parseInt(discountIdStr)));
            if (!discount) {
                return res.status(404).json({ message: "Discount not found" });
            }
            return res.json(discount);
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
    static async createDiscount(req, res) {
        try {
            const data = req.body;
            const [created] = await db_1.db
                .insert(eventDiscounts_1.eventDiscounts)
                .values(data)
                .returning();
            return res.status(201).json(created);
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
    static async updateDiscount(req, res) {
        try {
            const { discountId } = req.params;
            const discountIdStr = Array.isArray(discountId) ? discountId[0] : discountId;
            const data = req.body;
            delete data.id;
            const [updated] = await db_1.db
                .update(eventDiscounts_1.eventDiscounts)
                .set(data)
                .where((0, drizzle_orm_1.eq)(eventDiscounts_1.eventDiscounts.id, parseInt(discountIdStr)))
                .returning();
            if (!updated) {
                return res.status(404).json({ message: "Discount not found" });
            }
            return res.json(updated);
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
    static async deleteDiscount(req, res) {
        try {
            const { discountId } = req.params;
            const discountIdStr = Array.isArray(discountId) ? discountId[0] : discountId;
            const [deleted] = await db_1.db
                .delete(eventDiscounts_1.eventDiscounts)
                .where((0, drizzle_orm_1.eq)(eventDiscounts_1.eventDiscounts.id, parseInt(discountIdStr)))
                .returning();
            if (!deleted) {
                return res.status(404).json({ message: "Discount not found" });
            }
            return res.json({ message: "Discount deleted" });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
}
exports.DiscountController = DiscountController;
