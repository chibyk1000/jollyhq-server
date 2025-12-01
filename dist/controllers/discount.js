"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscountController = void 0;
const db_1 = require("../db");
const eventDiscounts_1 = require("../db/schema/eventDiscounts");
const drizzle_orm_1 = require("drizzle-orm");
class DiscountController {
    static async updateDiscount(req, res) {
        try {
            const { discountId } = req.params;
            const data = req.body;
            delete data.id;
            const [updated] = await db_1.db
                .update(eventDiscounts_1.eventDiscounts)
                .set(data)
                .where((0, drizzle_orm_1.eq)(eventDiscounts_1.eventDiscounts.id, discountId))
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
            const [deleted] = await db_1.db
                .delete(eventDiscounts_1.eventDiscounts)
                .where((0, drizzle_orm_1.eq)(eventDiscounts_1.eventDiscounts.id, discountId))
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
