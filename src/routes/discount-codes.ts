import { Router } from "express";
import { DiscountController } from "../controllers/discount";

const router = Router();

// Get all discount codes
router.get("/", DiscountController.getAllDiscountCodes);

// Get single discount code
router.get("/:discountId", DiscountController.getDiscountById);

// Create discount code
router.post("/", DiscountController.createDiscount);

// Update discount code
router.put("/:discountId", DiscountController.updateDiscount);

// Delete discount code
router.delete("/:discountId", DiscountController.deleteDiscount);

export default router;
