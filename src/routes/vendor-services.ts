import { Router } from "express";
import { verifySupabaseToken } from "../middlewares/verify";
import { createVendorService, deleteVendorService, getAllVendorServices, getVendorServiceById, getVendorServicesByVendor, toggleVendorServiceStatus, updateVendorService } from "../controllers/vendorService";
import { upload } from "../middlewares/upload";

const router = Router();
router.post(
  "/",
  verifySupabaseToken,
  upload.single("image"),
  createVendorService
);
router.get("/", getAllVendorServices);
router.get("/vendor/:vendorId", getVendorServicesByVendor);
router.get("/:id", getVendorServiceById);
router.patch("/:id", upload.single("image"), updateVendorService);
router.patch("/:id/status", toggleVendorServiceStatus);
router.delete("/:id", deleteVendorService);

export default router