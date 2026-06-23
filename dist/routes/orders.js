"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orderController_1 = require("../controllers/orderController");
const verify_1 = require("../middlewares/verify");
const router = (0, express_1.Router)();
router.get("/:orderReference", verify_1.verifyToken, orderController_1.OrderController.getUserOrders);
exports.default = router;
