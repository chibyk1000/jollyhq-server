import { Router } from "express";
import { VendorsController } from "../controllers/vendor";
import { verifyToken } from "../middlewares/verify";
import { upload } from "../middlewares/upload";
import { DashboardController } from "../controllers/dashboard";

const router = Router();

router.post("/", verifyToken, upload.single("image"), VendorsController.create);
router.get("/", verifyToken, VendorsController.getAll);
router.get("/:id", verifyToken, VendorsController.getById);
// Vendor by profile/user ID (with wallet)
router.get("/profile/:id", verifyToken, VendorsController.getByProfile);

router.get("/:vendorId/chats", VendorsController.getVendorChats);

router.get(
  "/dashboard/:vendorId",
  verifyToken,
  DashboardController.getVendorDashboard,
);
router.get("/user/:userId", verifyToken, VendorsController.getByUser);
router.patch(
  "/:id",
  verifyToken,
  upload.single("image"),
  VendorsController.update,
);
router.delete("/:id", verifyToken, VendorsController.delete);

export default router;
