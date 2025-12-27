"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const vendor_1 = require("../controllers/vendor");
const verify_1 = require("../middlewares/verify");
const upload_1 = require("../middlewares/upload");
const dashboard_1 = require("../controllers/dashboard");
const router = (0, express_1.Router)();
router.post("/", verify_1.verifySupabaseToken, upload_1.upload.single("image"), vendor_1.VendorsController.create);
router.get("/", verify_1.verifySupabaseToken, vendor_1.VendorsController.getAll);
router.get("/:id", verify_1.verifySupabaseToken, vendor_1.VendorsController.getById);
// Vendor by profile/user ID (with wallet)
router.get("/profile/:id", verify_1.verifySupabaseToken, vendor_1.VendorsController.getByProfile);
router.get("/dashboard/:vendorId", verify_1.verifySupabaseToken, dashboard_1.DashboardController.getVendorDashboard);
router.get("/user/:userId", verify_1.verifySupabaseToken, vendor_1.VendorsController.getByUser);
router.patch("/:id", verify_1.verifySupabaseToken, vendor_1.VendorsController.update);
router.delete("/:id", verify_1.verifySupabaseToken, vendor_1.VendorsController.delete);
exports.default = router;
