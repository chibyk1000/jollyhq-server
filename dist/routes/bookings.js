"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/bookings.routes.ts
const express_1 = require("express");
const vendorBookings_1 = require("../controllers/vendorBookings");
const verify_1 = require("../middlewares/verify");
const router = (0, express_1.Router)();
// User — their own bookings
router.get("/my", verify_1.verifyToken, vendorBookings_1.VendorBookingController.getMyBookings);
router.get("/my/:id", verify_1.verifyToken, vendorBookings_1.VendorBookingController.getBookingById);
// Vendor — bookings they received
router.get("/vendor", verify_1.verifyToken, vendorBookings_1.VendorBookingController.getVendorBookings);
router.patch("/:id/status", verify_1.verifyToken, vendorBookings_1.VendorBookingController.updateBookingStatus);
exports.default = router;
