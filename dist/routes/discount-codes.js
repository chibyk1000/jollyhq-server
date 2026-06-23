"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const discount_1 = require("../controllers/discount");
const router = (0, express_1.Router)();
// Get all discount codes
router.get("/", discount_1.DiscountController.getAllDiscountCodes);
// Get single discount code
router.get("/:discountId", discount_1.DiscountController.getDiscountById);
// Create discount code
router.post("/", discount_1.DiscountController.createDiscount);
// Update discount code
router.put("/:discountId", discount_1.DiscountController.updateDiscount);
// Delete discount code
router.delete("/:discountId", discount_1.DiscountController.deleteDiscount);
exports.default = router;
