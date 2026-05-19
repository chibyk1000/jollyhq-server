import { Router, Request, Response, NextFunction } from "express";
import { AdminController } from "../controllers/admin";
import { auth } from "../utils/auth";

const router = Router();

/**
 * Admin authorization middleware
 * Verify user is admin before allowing access
 */
const adminMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get session from better-auth
    const session = await auth.api.getSession({ headers: req.headers as any });

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
    (req as any).user = session.user;

    next();
  } catch (error) {
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
router.get("/dashboard/stats", AdminController.getDashboardStats);

/**
 * User Management
 */
router.get("/users", AdminController.getAllUsers);
router.get("/users/:userId", AdminController.getUserDetails);
router.post("/users/:userId/ban", AdminController.banUser);
router.post("/users/:userId/unban", AdminController.unbanUser);
router.patch("/users/:userId/role", AdminController.updateUserRole);
router.delete("/users/:userId", AdminController.deleteUser);
router.post("/users/:userId/restore", AdminController.restoreUser);

/**
 * Vendor Management
 */
router.get("/vendors", AdminController.getAllVendors);
router.patch(
  "/vendors/:vendorId/verify",
  AdminController.toggleVendorVerification,
);
router.patch(
  "/vendors/:vendorId/activity",
  AdminController.toggleVendorActivity,
);

/**
 * Events Management
 */
router.get("/events", AdminController.getAllEvents);
router.get("/events/:eventId/tickets", AdminController.getEventTicketSales);

/**
 * Orders Management
 */
router.get("/orders", AdminController.getAllOrders);
router.patch("/orders/:orderId/status", AdminController.updateOrderStatus);

/**
 * Event Planner Management
 */
router.get("/event-planners", AdminController.getAllEventPlanners);
router.patch(
  "/event-planners/:plannerId/verify",
  AdminController.toggleEventPlannerVerification,
);

/**
 * Transaction Management
 */
router.get("/transactions", AdminController.getTransactions);
router.get("/users/:userId/transactions", AdminController.getUserTransactions);

/**
 * Discount Code Management
 */
router.get("/discount-codes", AdminController.getDiscountCodes);
router.post("/discount-codes", AdminController.createDiscountCode);
router.delete("/discount-codes/:codeId", AdminController.deleteDiscountCode);

/**
 * Admin Overview
 */
router.get("/overview", AdminController.getAdminOverview);

/**
 * Withdrawal Management
 */
router.get("/withdrawals", AdminController.getWithdrawalRequests);
router.post(
  "/withdrawals/:withdrawalId/approve",
  AdminController.approveWithdrawal,
);
router.post(
  "/withdrawals/:withdrawalId/reject",
  AdminController.rejectWithdrawal,
);

export default router;
