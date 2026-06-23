import { Request, Response } from "express";
import { db } from "../db";
import {
  user,
  vendors,
  events,
  orders,
  eventPlanners,
  wallets,
  withdrawalRequests,
  eventDiscounts,
  eventTickets,
  walletTransactions,
} from "../db/schema";
import { eq, desc, asc, and, or, like, sql, gte, lte } from "drizzle-orm";
import { logger } from "../utils/logger";

export class AdminController {
  /**
   * Get dashboard statistics
   */
  static async getDashboardStats(req: Request, res: Response) {
    try {
      const users = await db.select({ count: sql`count(*)` }).from(user);
      const activeUsers = await db
        .select({ count: sql`count(*)` })
        .from(user)
        .where(eq(user.banned, false));
      const bannedUsers = await db
        .select({ count: sql`count(*)` })
        .from(user)
        .where(eq(user.banned, true));
      const vendorsCount = await db
        .select({ count: sql`count(*)` })
        .from(vendors);
      const eventsCount = await db
        .select({ count: sql`count(*)` })
        .from(events);
      const ordersCount = await db
        .select({ count: sql`count(*)` })
        .from(orders);
      const walletsCount = await db
        .select({ count: sql`count(*)` })
        .from(wallets);

      return res.status(200).json({
        success: true,
        data: {
          totalUsers: parseInt((users[0].count as any).toString()),
          activeUsers: parseInt((activeUsers[0].count as any).toString()),
          bannedUsers: parseInt((bannedUsers[0].count as any).toString()),
          totalVendors: parseInt((vendorsCount[0].count as any).toString()),
          totalEvents: parseInt((eventsCount[0].count as any).toString()),
          totalOrders: parseInt((ordersCount[0].count as any).toString()),
          totalWallets: parseInt((walletsCount[0].count as any).toString()),
        },
      });
    } catch (error) {
      logger.error("Error fetching dashboard stats:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch dashboard statistics",
      });
    }
  }

  /**
   * Get all users with filtering and pagination
   */
  static async getAllUsers(req: Request, res: Response) {
    try {
      const {
        page = "1",
        limit = "10",
        search = "",
        banned = "",
        role = "",
        sortBy = "createdAt",
        order = "desc",
      } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const offset = (pageNum - 1) * limitNum;

      let whereConditions: any[] = [];

      if (search) {
        whereConditions.push(
          or(
            like(user.email, `%${search}%`),
            like(user.firstName, `%${search}%`),
            like(user.lastName, `%${search}%`),
            like(user.username, `%${search}%`),
            like(user.phoneNumber, `%${search}%`),
          ),
        );
      }

      if (banned === "true") {
        whereConditions.push(eq(user.banned, true));
      } else if (banned === "false") {
        whereConditions.push(eq(user.banned, false));
      }

      if (role) {
        whereConditions.push(eq(user.role, role as string));
      }

      const finalWhere =
        whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const sortColumn =
        sortBy === "createdAt" ? user.createdAt : user.firstName;
      const orderFunc = order === "asc" ? asc : desc;

      const users = await db
        .select()
        .from(user)
        .where(finalWhere)
        .orderBy(orderFunc(sortColumn))
        .limit(limitNum)
        .offset(offset);

      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(user)
        .where(finalWhere);
      const total = parseInt((countResult[0].count as any).toString());

      return res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      logger.error("Error fetching users:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch users",
      });
    }
  }

  /**
   * Get single user details
   */
  static async getUserDetails(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const userIdStr = Array.isArray(userId) ? userId[0] : userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "User ID is required",
        });
      }

      const userData = await db
        .select()
        .from(user)
        .where(eq(user.id, parseInt(userIdStr)))
        .limit(1);

      if (!userData || userData.length === 0) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      const userWallets = await db
        .select()
        .from(wallets)
        .where(eq(wallets.userId, parseInt(userIdStr)));

      return res.status(200).json({
        success: true,
        data: {
          user: userData[0],
          wallets: userWallets,
        },
      });
    } catch (error) {
      logger.error("Error fetching user details:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch user details",
      });
    }
  }

  /**
   * Ban a user
   */
  static async banUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const userIdStr = Array.isArray(userId) ? userId[0] : userId;
      const { reason, duration } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "User ID is required",
        });
      }

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: "Ban reason is required",
        });
      }

      let banExpires = null;
      if (duration) {
        const now = new Date();
        banExpires = new Date(now.getTime() + duration * 1000);
      }

      const updatedUser = await db
        .update(user)
        .set({
          banned: true,
          banReason: reason,
          banExpires,
          updatedAt: new Date(),
        })
        .where(eq(user.id, parseInt(userIdStr)))
        .returning();

      if (!updatedUser || updatedUser.length === 0) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      logger.info(`User ${userId} banned. Reason: ${reason}`);

      return res.status(200).json({
        success: true,
        message: "User banned successfully",
        data: updatedUser[0],
      });
    } catch (error) {
      logger.error("Error banning user:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to ban user",
      });
    }
  }

  /**
   * Unban a user
   */
  static async unbanUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const userIdStr = Array.isArray(userId) ? userId[0] : userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "User ID is required",
        });
      }

      const updatedUser = await db
        .update(user)
        .set({
          banned: false,
          banReason: null,
          banExpires: null,
          updatedAt: new Date(),
        })
        .where(eq(user.id, parseInt(userIdStr)))
        .returning();

      if (!updatedUser || updatedUser.length === 0) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      logger.info(`User ${userId} unbanned`);

      return res.status(200).json({
        success: true,
        message: "User unbanned successfully",
        data: updatedUser[0],
      });
    } catch (error) {
      logger.error("Error unbanning user:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to unban user",
      });
    }
  }

  /**
   * Update user role
   */
  static async updateUserRole(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const userIdStr = Array.isArray(userId) ? userId[0] : userId;
      const { role } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "User ID is required",
        });
      }

      if (!role) {
        return res.status(400).json({
          success: false,
          error: "Role is required",
        });
      }

      const updatedUser = await db
        .update(user)
        .set({
          role,
          updatedAt: new Date(),
        })
        .where(eq(user.id, parseInt(userIdStr)))
        .returning();

      if (!updatedUser || updatedUser.length === 0) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      logger.info(`User ${userId} role updated to ${role}`);

      return res.status(200).json({
        success: true,
        message: "User role updated successfully",
        data: updatedUser[0],
      });
    } catch (error) {
      logger.error("Error updating user role:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to update user role",
      });
    }
  }

  /**
   * Delete a user (soft delete)
   */
  static async deleteUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const userIdStr = Array.isArray(userId) ? userId[0] : userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "User ID is required",
        });
      }

      const updatedUser = await db
        .update(user)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(user.id, parseInt(userIdStr)))
        .returning();

      if (!updatedUser || updatedUser.length === 0) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      logger.info(`User ${userId} soft deleted`);

      return res.status(200).json({
        success: true,
        message: "User deleted successfully",
        data: updatedUser[0],
      });
    } catch (error) {
      logger.error("Error deleting user:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to delete user",
      });
    }
  }

  /**
   * Restore a deleted user
   */
  static async restoreUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const userIdStr = Array.isArray(userId) ? userId[0] : userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "User ID is required",
        });
      }

      const updatedUser = await db
        .update(user)
        .set({
          deletedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(user.id, parseInt(userIdStr)))
        .returning();

      if (!updatedUser || updatedUser.length === 0) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      logger.info(`User ${userId} restored`);

      return res.status(200).json({
        success: true,
        message: "User restored successfully",
        data: updatedUser[0],
      });
    } catch (error) {
      logger.error("Error restoring user:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to restore user",
      });
    }
  }

  /**
   * Get all vendors with filtering
   */
  static async getAllVendors(req: Request, res: Response) {
    try {
      const {
        page = "1",
        limit = "10",
        verified = "",
        search = "",
        sortBy = "createdAt",
        order = "desc",
      } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const offset = (pageNum - 1) * limitNum;

      let whereConditions: any[] = [];

      if (verified === "true") {
        whereConditions.push(eq(vendors.verified, true));
      } else if (verified === "false") {
        whereConditions.push(eq(vendors.verified, false));
      }

      if (search) {
        whereConditions.push(
          or(
            like(vendors.businessName, `%${search}%`),
            like(vendors.contactEmail, `%${search}%`),
            like(vendors.contactName, `%${search}%`),
          ),
        );
      }

      const finalWhere =
        whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const sortColumn =
        sortBy === "createdAt" ? vendors.createdAt : vendors.businessName;
      const orderFunc = order === "asc" ? asc : desc;

      const vendorsList = await db
        .select()
        .from(vendors)
        .where(finalWhere)
        .orderBy(orderFunc(sortColumn))
        .limit(limitNum)
        .offset(offset);

      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(vendors)
        .where(finalWhere);
      const total = parseInt((countResult[0].count as any).toString());

      return res.status(200).json({
        success: true,
        data: {
          vendors: vendorsList,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      logger.error("Error fetching vendors:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch vendors",
      });
    }
  }

  /**
   * Verify/Unverify a vendor
   */
  static async toggleVendorVerification(req: Request, res: Response) {
    try {
      const { vendorId } = req.params;
      const vendorIdStr = Array.isArray(vendorId) ? vendorId[0] : vendorId;
      const { verified } = req.body;

      if (!vendorId) {
        return res.status(400).json({
          success: false,
          error: "Vendor ID is required",
        });
      }

      if (typeof verified !== "boolean") {
        return res.status(400).json({
          success: false,
          error: "verified must be a boolean",
        });
      }

      const updatedVendor = await db
        .update(vendors)
        .set({
          verified,
          updatedAt: new Date(),
        })
        .where(eq(vendors.id, parseInt(vendorIdStr)))
        .returning();

      if (!updatedVendor || updatedVendor.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Vendor not found",
        });
      }

      logger.info(
        `Vendor ${vendorId} verification status updated to ${verified}`,
      );

      return res.status(200).json({
        success: true,
        message: `Vendor ${verified ? "verified" : "unverified"} successfully`,
        data: updatedVendor[0],
      });
    } catch (error) {
      logger.error("Error toggling vendor verification:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to toggle vendor verification",
      });
    }
  }

  /**
   * Suspend/Activate a vendor
   */
  static async toggleVendorActivity(req: Request, res: Response) {
    try {
      const { vendorId } = req.params;
      const vendorIdStr = Array.isArray(vendorId) ? vendorId[0] : vendorId;
      const { isActive } = req.body;

      if (!vendorId) {
        return res.status(400).json({
          success: false,
          error: "Vendor ID is required",
        });
      }

      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          error: "isActive must be a boolean",
        });
      }

      const updatedVendor = await db
        .update(vendors)
        .set({
          isActive,
          updatedAt: new Date(),
        })
        .where(eq(vendors.id, parseInt(vendorIdStr)))
        .returning();

      if (!updatedVendor || updatedVendor.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Vendor not found",
        });
      }

      logger.info(`Vendor ${vendorId} activity status updated to ${isActive}`);

      return res.status(200).json({
        success: true,
        message: `Vendor ${isActive ? "activated" : "suspended"} successfully`,
        data: updatedVendor[0],
      });
    } catch (error) {
      logger.error("Error toggling vendor activity:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to toggle vendor activity",
      });
    }
  }

  /**
   * Get all events
   */
  static async getAllEvents(req: Request, res: Response) {
    try {
      const {
        page = "1",
        limit = "10",
        search = "",
        sortBy = "createdAt",
        order = "desc",
      } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const offset = (pageNum - 1) * limitNum;

      let whereCondition: any = undefined;

      if (search) {
        whereCondition = or(
          like(events.name, `%${search}%`),
          like(events.description, `%${search}%`),
          like(events.location, `%${search}%`),
        );
      }

      const sortColumn =
        sortBy === "createdAt" ? events.createdAt : events.name;
      const orderFunc = order === "asc" ? asc : desc;

      const eventsList = await db
        .select()
        .from(events)
        .where(whereCondition)
        .orderBy(orderFunc(sortColumn))
        .limit(limitNum)
        .offset(offset);

      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(events)
        .where(whereCondition);
      const total = parseInt((countResult[0].count as any).toString());

      return res.status(200).json({
        success: true,
        data: {
          events: eventsList,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      logger.error("Error fetching events:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch events",
      });
    }
  }

  /**
   * Get all orders
   */
  static async getAllOrders(req: Request, res: Response) {
    try {
      const {
        page = "1",
        limit = "10",
        status = "",
        search = "",
        sortBy = "createdAt",
        order = "desc",
      } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const offset = (pageNum - 1) * limitNum;

      let whereConditions: any[] = [];

      if (status) {
        const validStatuses = ["PENDING", "PAID", "FAILED", "CANCELLED"];
        if (validStatuses.includes(status as string)) {
          whereConditions.push(eq(orders.status, status as any));
        }
      }

      if (search) {
        whereConditions.push(like(orders.orderReference, `%${search}%`));
      }

      const finalWhere =
        whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const sortColumn =
        sortBy === "createdAt" ? orders.createdAt : orders.orderReference;
      const orderFunc = order === "asc" ? asc : desc;

      const ordersList = await db
        .select()
        .from(orders)
        .where(finalWhere)
        .orderBy(orderFunc(sortColumn))
        .limit(limitNum)
        .offset(offset);

      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(orders)
        .where(finalWhere);
      const total = parseInt((countResult[0].count as any).toString());

      return res.status(200).json({
        success: true,
        data: {
          orders: ordersList,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      logger.error("Error fetching orders:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch orders",
      });
    }
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const orderIdStr = Array.isArray(orderId) ? orderId[0] : orderId;
      const { status } = req.body;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          error: "Order ID is required",
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          error: "Status is required",
        });
      }

      const updatedOrder = await db
        .update(orders)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, parseInt(orderIdStr)))
        .returning();

      if (!updatedOrder || updatedOrder.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Order not found",
        });
      }

      logger.info(`Order ${orderId} status updated to ${status}`);

      return res.status(200).json({
        success: true,
        message: "Order status updated successfully",
        data: updatedOrder[0],
      });
    } catch (error) {
      logger.error("Error updating order status:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to update order status",
      });
    }
  }

  /**
   * Get withdrawal requests
   */
  static async getWithdrawalRequests(req: Request, res: Response) {
    try {
      const {
        page = "1",
        limit = "10",
        status = "",
        sortBy = "createdAt",
        order = "desc",
      } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const offset = (pageNum - 1) * limitNum;

      let whereCondition: any = undefined;

      if (status) {
        const validStatuses = ["pending", "approved", "paid", "rejected"];
        if (validStatuses.includes(status as string)) {
          whereCondition = eq(withdrawalRequests.status, status as any);
        }
      }

      const sortColumn =
        sortBy === "createdAt"
          ? withdrawalRequests.createdAt
          : withdrawalRequests.status;
      const orderFunc = order === "asc" ? asc : desc;

      const requests = await db
        .select()
        .from(withdrawalRequests)
        .where(whereCondition)
        .orderBy(orderFunc(sortColumn))
        .limit(limitNum)
        .offset(offset);

      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(withdrawalRequests)
        .where(whereCondition);
      const total = parseInt((countResult[0].count as any).toString());

      return res.status(200).json({
        success: true,
        data: {
          requests,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      logger.error("Error fetching withdrawal requests:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch withdrawal requests",
      });
    }
  }

  /**
   * Approve withdrawal request
   */
  static async approveWithdrawal(req: Request, res: Response) {
    try {
      const { withdrawalId } = req.params;
      const withdrawalIdStr = Array.isArray(withdrawalId) ? withdrawalId[0] : withdrawalId;
      const adminId = (req as any).user?.id;

      if (!withdrawalId) {
        return res.status(400).json({
          success: false,
          error: "Withdrawal ID is required",
        });
      }

      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: "Admin authentication required",
        });
      }

      const updatedRequest = await db
        .update(withdrawalRequests)
        .set({
          status: "approved",
          reviewedBy: adminId,
          updatedAt: new Date(),
        })
        .where(eq(withdrawalRequests.id, parseInt(withdrawalIdStr)))
        .returning();

      if (!updatedRequest || updatedRequest.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Withdrawal request not found",
        });
      }

      logger.info(`Withdrawal ${withdrawalId} approved by admin ${adminId}`);

      return res.status(200).json({
        success: true,
        message: "Withdrawal approved successfully",
        data: updatedRequest[0],
      });
    } catch (error) {
      logger.error("Error approving withdrawal:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to approve withdrawal",
      });
    }
  }

  /**
   * Reject withdrawal request
   */
  static async rejectWithdrawal(req: Request, res: Response) {
    try {
      const { withdrawalId } = req.params;
      const withdrawalIdStr = Array.isArray(withdrawalId) ? withdrawalId[0] : withdrawalId;
      const { reason } = req.body;
      const adminId = (req as any).user?.id;

      if (!withdrawalId) {
        return res.status(400).json({
          success: false,
          error: "Withdrawal ID is required",
        });
      }

      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: "Admin authentication required",
        });
      }

      const updateData: any = {
        status: "rejected",
        reviewedBy: adminId,
        updatedAt: new Date(),
      };

      if (reason) {
        updateData.notes = reason;
      }

      const updatedRequest = await db
        .update(withdrawalRequests)
        .set(updateData)
        .where(eq(withdrawalRequests.id, parseInt(withdrawalIdStr)))
        .returning();

      if (!updatedRequest || updatedRequest.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Withdrawal request not found",
        });
      }

      logger.info(
        `Withdrawal ${withdrawalId} rejected by admin ${adminId}. Reason: ${reason}`,
      );

      return res.status(200).json({
        success: true,
        message: "Withdrawal rejected successfully",
        data: updatedRequest[0],
      });
    } catch (error) {
      logger.error("Error rejecting withdrawal:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to reject withdrawal",
      });
    }
  }

  /**
   * Get all event planners
   */
  static async getAllEventPlanners(req: Request, res: Response) {
    try {
      const {
        page = "1",
        limit = "10",
        search = "",
        verified = "",
        sortBy = "createdAt",
        order = "desc",
      } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const offset = (pageNum - 1) * limitNum;

      let whereConditions: any[] = [];

      if (verified === "true") {
        whereConditions.push(eq(eventPlanners.isVerified, true));
      } else if (verified === "false") {
        whereConditions.push(eq(eventPlanners.isVerified, false));
      }

      if (search) {
        whereConditions.push(
          or(
            like(eventPlanners.businessName, `%${search}%`),
            like(eventPlanners.businessEmail, `%${search}%`),
            like(eventPlanners.businessPhone, `%${search}%`),
          ),
        );
      }

      const finalWhere =
        whereConditions.length > 0 ? and(...whereConditions) : undefined;
      const sortColumn =
        sortBy === "createdAt"
          ? eventPlanners.createdAt
          : eventPlanners.businessName;
      const orderFunc = order === "asc" ? asc : desc;

      const planners = await db
        .select()
        .from(eventPlanners)
        .where(finalWhere)
        .orderBy(orderFunc(sortColumn))
        .limit(limitNum)
        .offset(offset);

      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(eventPlanners)
        .where(finalWhere);
      const total = parseInt((countResult[0].count as any).toString());

      return res.status(200).json({
        success: true,
        data: {
          planners,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      logger.error("Error fetching event planners:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch event planners",
      });
    }
  }

  /**
   * Verify/Unverify event planner
   */
  static async toggleEventPlannerVerification(req: Request, res: Response) {
    try {
      const { plannerId } = req.params;
      const plannerIdStr = Array.isArray(plannerId) ? plannerId[0] : plannerId;
      const { isVerified } = req.body;

      if (!plannerId) {
        return res.status(400).json({
          success: false,
          error: "Planner ID is required",
        });
      }

      if (typeof isVerified !== "boolean") {
        return res.status(400).json({
          success: false,
          error: "isVerified must be a boolean",
        });
      }

      const updatedPlanner = await db
        .update(eventPlanners)
        .set({
          isVerified,
          updatedAt: new Date(),
        })
        .where(eq(eventPlanners.id, parseInt(plannerIdStr)))
        .returning();

      if (!updatedPlanner || updatedPlanner.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Event planner not found",
        });
      }

      logger.info(
        `Event planner ${plannerId} verification status updated to ${isVerified}`,
      );

      return res.status(200).json({
        success: true,
        message: `Event planner ${isVerified ? "verified" : "unverified"} successfully`,
        data: updatedPlanner[0],
      });
    } catch (error) {
      logger.error("Error toggling event planner verification:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to toggle event planner verification",
      });
    }
  }

  /**
   * Get transaction history with filtering
   */
  static async getTransactions(req: Request, res: Response) {
    try {
      const {
        page = "1",
        limit = "10",
        userId = "",
        type = "",
        source = "",
        sortBy = "createdAt",
        order = "desc",
      } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const offset = (pageNum - 1) * limitNum;

      let whereConditions: any[] = [];

      if (userId) {
        const userWallets = await db
          .select({ id: wallets.id })
          .from(wallets)
          .where(eq(wallets.userId, parseInt(userId as string)));

        if (userWallets.length > 0) {
          const walletIds = userWallets.map((w) => w.id);
          whereConditions.push(
            sql`${walletTransactions.walletId} IN (${sql.join(walletIds)})`,
          );
        }
      }

      if (type) {
        whereConditions.push(eq(walletTransactions.type, type as any));
      }

      if (source) {
        whereConditions.push(eq(walletTransactions.source, source as any));
      }

      const finalWhere =
        whereConditions.length > 0 ? and(...whereConditions) : undefined;
      const sortColumn =
        sortBy === "createdAt"
          ? walletTransactions.createdAt
          : walletTransactions.amount;
      const orderFunc = order === "asc" ? asc : desc;

      const transactions = await db
        .select()
        .from(walletTransactions)
        .where(finalWhere)
        .orderBy(orderFunc(sortColumn))
        .limit(limitNum)
        .offset(offset);

      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(walletTransactions)
        .where(finalWhere);
      const total = parseInt((countResult[0].count as any).toString());

      return res.status(200).json({
        success: true,
        data: {
          transactions,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      logger.error("Error fetching transactions:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch transactions",
      });
    }
  }

  /**
   * Get discount codes with filtering
   */
  static async getDiscountCodes(req: Request, res: Response) {
    try {
      const {
        page = "1",
        limit = "10",
        eventId = "",
        search = "",
        sortBy = "createdAt",
        order = "desc",
      } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const offset = (pageNum - 1) * limitNum;

      let whereConditions: any[] = [];

      if (eventId) {
        whereConditions.push(eq(eventDiscounts.eventId, parseInt(eventId as string)));
      }

      if (search) {
        whereConditions.push(like(eventDiscounts.code, `%${search}%`));
      }

      const finalWhere =
        whereConditions.length > 0 ? and(...whereConditions) : undefined;
      const sortColumn =
        sortBy === "createdAt" ? eventDiscounts.createdAt : eventDiscounts.code;
      const orderFunc = order === "asc" ? asc : desc;

      const codes = await db
        .select()
        .from(eventDiscounts)
        .where(finalWhere)
        .orderBy(orderFunc(sortColumn))
        .limit(limitNum)
        .offset(offset);

      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(eventDiscounts)
        .where(finalWhere);
      const total = parseInt((countResult[0].count as any).toString());

      return res.status(200).json({
        success: true,
        data: {
          codes,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      logger.error("Error fetching discount codes:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch discount codes",
      });
    }
  }

  /**
   * Create a discount code
   */
  static async createDiscountCode(req: Request, res: Response) {
    try {
      const { eventId, code, usageLimit } = req.body;

      if (!eventId || !code) {
        return res.status(400).json({
          success: false,
          error: "Event ID and discount code are required",
        });
      }

      const newCode = await db
        .insert(eventDiscounts)
        .values({
          eventId,
          code: code.toUpperCase(),
          usageLimit: usageLimit || null,
          usedCount: 0,
        })
        .returning();

      logger.info(`Discount code ${code} created for event ${eventId}`);

      return res.status(201).json({
        success: true,
        message: "Discount code created successfully",
        data: newCode[0],
      });
    } catch (error) {
      logger.error("Error creating discount code:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to create discount code",
      });
    }
  }

  /**
   * Delete a discount code
   */
  static async deleteDiscountCode(req: Request, res: Response) {
    try {
      const { codeId } = req.params;
      const codeIdStr = Array.isArray(codeId) ? codeId[0] : codeId;

      if (!codeId) {
        return res.status(400).json({
          success: false,
          error: "Code ID is required",
        });
      }

      const deleted = await db
        .delete(eventDiscounts)
        .where(eq(eventDiscounts.id, parseInt(codeIdStr)))
        .returning();

      if (!deleted || deleted.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Discount code not found",
        });
      }

      logger.info(`Discount code ${codeId} deleted`);

      return res.status(200).json({
        success: true,
        message: "Discount code deleted successfully",
        data: deleted[0],
      });
    } catch (error) {
      logger.error("Error deleting discount code:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to delete discount code",
      });
    }
  }

  /**
   * Get wallet transactions for a specific user
   */
  static async getUserTransactions(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const userIdStr = Array.isArray(userId) ? userId[0] : userId;
      const { page = "1", limit = "20" } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "User ID is required",
        });
      }

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const offset = (pageNum - 1) * limitNum;

      const userWallets = await db
        .select()
        .from(wallets)
        .where(eq(wallets.userId, parseInt(userIdStr)));

      if (userWallets.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            transactions: [],
            pagination: {
              page: pageNum,
              limit: limitNum,
              total: 0,
              pages: 0,
            },
          },
        });
      }

      const walletIds = userWallets.map((w) => w.id);

      const transactions = await db
        .select()
        .from(walletTransactions)
        .where(sql`${walletTransactions.walletId} IN (${sql.join(walletIds)})`)
        .orderBy(desc(walletTransactions.createdAt))
        .limit(limitNum)
        .offset(offset);

      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(walletTransactions)
        .where(sql`${walletTransactions.walletId} IN (${sql.join(walletIds)})`);

      const total = parseInt((countResult[0].count as any).toString());

      return res.status(200).json({
        success: true,
        data: {
          transactions,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      logger.error("Error fetching user transactions:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch user transactions",
      });
    }
  }

  /**
   * Get event ticket sales
   */
  static async getEventTicketSales(req: Request, res: Response) {
    try {
      const { eventId } = req.params;
      const { page = "1", limit = "10" } = req.query;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          error: "Event ID is required",
        });
      }

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const offset = (pageNum - 1) * limitNum;

      const tickets = await db
        .select()
        .from(eventTickets)
        .where(eq(eventTickets.eventId, parseInt(eventId as string)))
        .limit(limitNum)
        .offset(offset);

      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(eventTickets)
        .where(eq(eventTickets.eventId, parseInt(eventId as string)));

      const total = parseInt((countResult[0].count as any).toString());

      return res.status(200).json({
        success: true,
        data: {
          tickets,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      logger.error("Error fetching event ticket sales:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch event ticket sales",
      });
    }
  }

  /**
   * Get admin dashboard overview
   */
  static async getAdminOverview(req: Request, res: Response) {
    try {
      const recentUsers = await db
        .select()
        .from(user)
        .orderBy(desc(user.createdAt))
        .limit(5);

      const recentOrders = await db
        .select()
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(5);

      const pendingPlannerVerifications = await db
        .select({ count: sql`count(*)` })
        .from(eventPlanners)
        .where(eq(eventPlanners.isVerified, false));

      const pendingVendorVerifications = await db
        .select({ count: sql`count(*)` })
        .from(vendors)
        .where(eq(vendors.verified, false));

      const totalRevenue = await db.execute(sql`
        SELECT COALESCE(SUM(CAST(total_amount AS FLOAT)), 0) as total 
        FROM "orders" 
        WHERE status = ${"PAID"}
      `);

      return res.status(200).json({
        success: true,
        data: {
          recentUsers,
          recentOrders,
          pendingPlannerVerifications: parseInt(
            (pendingPlannerVerifications[0].count as any).toString(),
          ),
          pendingVendorVerifications: parseInt(
            (pendingVendorVerifications[0].count as any).toString(),
          ),
          totalRevenue: (totalRevenue.rows[0] as any).total || 0,
        },
      });
    } catch (error) {
      logger.error("Error fetching admin overview:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch admin overview",
      });
    }
  }

  /**
   * Get admin dashboard
   */
  static async getDashboard(req: Request, res: Response) {
    try {
      const now = new Date();

      // Get total events count
      const totalEventsResult = await db
        .select({ count: sql`count(*)` })
        .from(events);
      const totalEvents = parseInt((totalEventsResult[0].count as any).toString());

      // Get upcoming events (eventDate > now)
      const upcomingEvents = await db
        .select()
        .from(events)
        .where(gte(events.eventDate, now))
        .orderBy(asc(events.eventDate))
        .limit(10);

      // Get recent events (orderBy createdAt desc)
      const recentEvents = await db
        .select()
        .from(events)
        .orderBy(desc(events.createdAt))
        .limit(10);

      // Get all tickets
      const tickets = await db.select().from(eventTickets);

      // Get active events count (events with eventDate >= now)
      const activeEventsResult = await db
        .select({ count: sql`count(*)` })
        .from(events)
        .where(gte(events.eventDate, now));
      const activeEvents = parseInt((activeEventsResult[0].count as any).toString());

      return res.status(200).json({
        success: true,
        data: {
          totalEvents,
          upcomingEvents,
          upcomingList: upcomingEvents,
          tickets,
          recentEvents,
          activeEvents,
        },
      });
    } catch (error) {
      logger.error("Error fetching dashboard:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch dashboard",
      });
    }
  }

  /**
   * Get transaction summary
   */
  static async getTransactionSummary(req: Request, res: Response) {
    try {
      // Get total transactions count
      const totalResult = await db
        .select({ count: sql`count(*)` })
        .from(orders);
      const total = parseInt((totalResult[0].count as any).toString());

      // Get total revenue from paid orders
      const revenueResult = await db.execute(sql`
        SELECT COALESCE(SUM(CAST(total_amount AS FLOAT)), 0) as total 
        FROM "orders" 
        WHERE status = ${"PAID"}
      `);
      const revenue = (revenueResult.rows[0] as any).total || 0;

      // Get average order value
      const avgResult = await db.execute(sql`
        SELECT COALESCE(AVG(CAST(total_amount AS FLOAT)), 0) as avg 
        FROM "orders" 
        WHERE status = ${"PAID"}
      `);
      const average = (avgResult.rows[0] as any).avg || 0;

      // Get refunds (cancelled orders)
      const refundsResult = await db
        .select({ count: sql`count(*)` })
        .from(orders)
        .where(eq(orders.status, "CANCELLED"));
      const refunds = parseInt((refundsResult[0].count as any).toString());

      // Calculate percentages (simplified - you may want to compare with previous period)
      const totalPercentage = 0;
      const revenuePercentage = 0;
      const averagePercentage = 0;
      const refundsPercentage = total > 0 ? (refunds / total) * 100 : 0;

      return res.status(200).json({
        success: true,
        data: {
          total,
          totalPercentage,
          revenue,
          revenuePercentage,
          average,
          averagePercentage,
          refunds,
          refundsPercentage,
        },
      });
    } catch (error) {
      logger.error("Error fetching transaction summary:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch transaction summary",
      });
    }
  }
}
