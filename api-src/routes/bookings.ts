// routes/bookings.routes.ts
import { Router } from "express";
import { VendorBookingController } from "../controllers/vendorBookings";
import { verifyToken } from "../middlewares/verify";

const router = Router();

// User — their own bookings
router.get("/my", verifyToken, VendorBookingController.getMyBookings);
router.get("/my/:id", verifyToken, VendorBookingController.getBookingById);

// Vendor — bookings they received
router.get("/vendor", verifyToken, VendorBookingController.getVendorBookings);
router.patch(
  "/:id/status",
  verifyToken,
  VendorBookingController.updateBookingStatus,
);

export default router;
