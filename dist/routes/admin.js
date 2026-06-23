"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_1 = require("../controllers/admin");
const auth_1 = require("../utils/auth");
const router = (0, express_1.Router)();
/**
 * Admin authorization middleware
 * Verify user is admin before allowing access
 */
const adminMiddleware = async (req, res, next) => {
    try {
        // Get session from better-auth
        const session = await auth_1.auth.api.getSession({ headers: req.headers });
        if (!session || !session.user) {
            return res.status(401).json({
                success: false,
                error: "Authentication required",
            });
        }
        // Check if user has admin role
        if (session.user.role !== "admin" && session.user.role !== "superadmin") {
            return res.status(403).json({
                success: false,
                error: "Admin access required",
            });
        }
        // Attach user to request
        req.user = session.user;
        next();
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: "Authorization check failed",
        });
    }
};
// Apply admin middleware to all routes
router.use(adminMiddleware);
/**
 * Dashboard & Statistics
 */
router.get("/dashboard", admin_1.AdminController.getDashboard);
router.get("/dashboard/stats", admin_1.AdminController.getDashboardStats);
router.get("/transactions/summary", admin_1.AdminController.getTransactionSummary);
/**
 * User Management
 */
router.get("/users", admin_1.AdminController.getAllUsers);
router.get("/users/:userId", admin_1.AdminController.getUserDetails);
router.post("/users/:userId/ban", admin_1.AdminController.banUser);
router.post("/users/:userId/unban", admin_1.AdminController.unbanUser);
router.patch("/users/:userId/role", admin_1.AdminController.updateUserRole);
router.delete("/users/:userId", admin_1.AdminController.deleteUser);
router.post("/users/:userId/restore", admin_1.AdminController.restoreUser);
/**
 * Vendor Management
 */
router.get("/vendors", admin_1.AdminController.getAllVendors);
router.patch("/vendors/:vendorId/verify", admin_1.AdminController.toggleVendorVerification);
router.patch("/vendors/:vendorId/activity", admin_1.AdminController.toggleVendorActivity);
/**
 * Events Management
 */
router.get("/events", admin_1.AdminController.getAllEvents);
router.get("/events/:eventId/tickets", admin_1.AdminController.getEventTicketSales);
/**
 * Orders Management
 */
router.get("/orders", admin_1.AdminController.getAllOrders);
router.patch("/orders/:orderId/status", admin_1.AdminController.updateOrderStatus);
/**
 * Event Planner Management
 */
router.get("/event-planners", admin_1.AdminController.getAllEventPlanners);
router.patch("/event-planners/:plannerId/verify", admin_1.AdminController.toggleEventPlannerVerification);
/**
 * Transaction Management
 */
router.get("/transactions", admin_1.AdminController.getTransactions);
router.get("/users/:userId/transactions", admin_1.AdminController.getUserTransactions);
/**
 * Discount Code Management
 */
router.get("/discount-codes", admin_1.AdminController.getDiscountCodes);
router.post("/discount-codes", admin_1.AdminController.createDiscountCode);
router.delete("/discount-codes/:codeId", admin_1.AdminController.deleteDiscountCode);
/**
 * Admin Overview
 */
router.get("/overview", admin_1.AdminController.getAdminOverview);
/**
 * Withdrawal Management
 */
router.get("/withdrawals", admin_1.AdminController.getWithdrawalRequests);
router.post("/withdrawals/:withdrawalId/approve", admin_1.AdminController.approveWithdrawal);
router.post("/withdrawals/:withdrawalId/reject", admin_1.AdminController.rejectWithdrawal);
exports.default = router;
