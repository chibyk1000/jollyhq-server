"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const logger_1 = require("../utils/logger");
class AdminController {
    /**
     * Get dashboard statistics
     */
    static async getDashboardStats(req, res) {
        try {
            const users = await db_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema_1.user);
            const activeUsers = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.user)
                .where((0, drizzle_orm_1.eq)(schema_1.user.banned, false));
            const bannedUsers = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.user)
                .where((0, drizzle_orm_1.eq)(schema_1.user.banned, true));
            const vendorsCount = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.vendors);
            const eventsCount = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.events);
            const ordersCount = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.orders);
            const walletsCount = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.wallets);
            return res.status(200).json({
                success: true,
                data: {
                    totalUsers: parseInt(users[0].count.toString()),
                    activeUsers: parseInt(activeUsers[0].count.toString()),
                    bannedUsers: parseInt(bannedUsers[0].count.toString()),
                    totalVendors: parseInt(vendorsCount[0].count.toString()),
                    totalEvents: parseInt(eventsCount[0].count.toString()),
                    totalOrders: parseInt(ordersCount[0].count.toString()),
                    totalWallets: parseInt(walletsCount[0].count.toString()),
                },
            });
        }
        catch (error) {
            logger_1.logger.error("Error fetching dashboard stats:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to fetch dashboard statistics",
            });
        }
    }
    /**
     * Get all users with filtering and pagination
     */
    static async getAllUsers(req, res) {
        try {
            const { page = "1", limit = "10", search = "", banned = "", role = "", sortBy = "createdAt", order = "desc", } = req.query;
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 10;
            const offset = (pageNum - 1) * limitNum;
            let whereConditions = [];
            if (search) {
                whereConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.user.email, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.user.firstName, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.user.lastName, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.user.username, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.user.phoneNumber, `%${search}%`)));
            }
            if (banned === "true") {
                whereConditions.push((0, drizzle_orm_1.eq)(schema_1.user.banned, true));
            }
            else if (banned === "false") {
                whereConditions.push((0, drizzle_orm_1.eq)(schema_1.user.banned, false));
            }
            if (role) {
                whereConditions.push((0, drizzle_orm_1.eq)(schema_1.user.role, role));
            }
            const finalWhere = whereConditions.length > 0 ? (0, drizzle_orm_1.and)(...whereConditions) : undefined;
            const sortColumn = sortBy === "createdAt" ? schema_1.user.createdAt : schema_1.user.firstName;
            const orderFunc = order === "asc" ? drizzle_orm_1.asc : drizzle_orm_1.desc;
            const users = await db_1.db
                .select()
                .from(schema_1.user)
                .where(finalWhere)
                .orderBy(orderFunc(sortColumn))
                .limit(limitNum)
                .offset(offset);
            const countResult = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.user)
                .where(finalWhere);
            const total = parseInt(countResult[0].count.toString());
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
        }
        catch (error) {
            logger_1.logger.error("Error fetching users:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to fetch users",
            });
        }
    }
    /**
     * Get single user details
     */
    static async getUserDetails(req, res) {
        try {
            const { userId } = req.params;
            const userIdStr = Array.isArray(userId) ? userId[0] : userId;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: "User ID is required",
                });
            }
            const userData = await db_1.db
                .select()
                .from(schema_1.user)
                .where((0, drizzle_orm_1.eq)(schema_1.user.id, userIdStr))
                .limit(1);
            if (!userData || userData.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: "User not found",
                });
            }
            const userWallets = await db_1.db
                .select()
                .from(schema_1.wallets)
                .where((0, drizzle_orm_1.eq)(schema_1.wallets.userId, userIdStr));
            return res.status(200).json({
                success: true,
                data: {
                    user: userData[0],
                    wallets: userWallets,
                },
            });
        }
        catch (error) {
            logger_1.logger.error("Error fetching user details:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to fetch user details",
            });
        }
    }
    /**
     * Ban a user
     */
    static async banUser(req, res) {
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
            const updatedUser = await db_1.db
                .update(schema_1.user)
                .set({
                banned: true,
                banReason: reason,
                banExpires,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.user.id, userIdStr))
                .returning();
            if (!updatedUser || updatedUser.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: "User not found",
                });
            }
            logger_1.logger.info(`User ${userId} banned. Reason: ${reason}`);
            return res.status(200).json({
                success: true,
                message: "User banned successfully",
                data: updatedUser[0],
            });
        }
        catch (error) {
            logger_1.logger.error("Error banning user:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to ban user",
            });
        }
    }
    /**
     * Unban a user
     */
    static async unbanUser(req, res) {
        try {
            const { userId } = req.params;
            const userIdStr = Array.isArray(userId) ? userId[0] : userId;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: "User ID is required",
                });
            }
            const updatedUser = await db_1.db
                .update(schema_1.user)
                .set({
                banned: false,
                banReason: null,
                banExpires: null,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.user.id, userIdStr))
                .returning();
            if (!updatedUser || updatedUser.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: "User not found",
                });
            }
            logger_1.logger.info(`User ${userId} unbanned`);
            return res.status(200).json({
                success: true,
                message: "User unbanned successfully",
                data: updatedUser[0],
            });
        }
        catch (error) {
            logger_1.logger.error("Error unbanning user:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to unban user",
            });
        }
    }
    /**
     * Update user role
     */
    static async updateUserRole(req, res) {
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
            const updatedUser = await db_1.db
                .update(schema_1.user)
                .set({
                role,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.user.id, userIdStr))
                .returning();
            if (!updatedUser || updatedUser.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: "User not found",
                });
            }
            logger_1.logger.info(`User ${userId} role updated to ${role}`);
            return res.status(200).json({
                success: true,
                message: "User role updated successfully",
                data: updatedUser[0],
            });
        }
        catch (error) {
            logger_1.logger.error("Error updating user role:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to update user role",
            });
        }
    }
    /**
     * Delete a user (soft delete)
     */
    static async deleteUser(req, res) {
        try {
            const { userId } = req.params;
            const userIdStr = Array.isArray(userId) ? userId[0] : userId;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: "User ID is required",
                });
            }
            const updatedUser = await db_1.db
                .update(schema_1.user)
                .set({
                deletedAt: new Date(),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.user.id, userIdStr))
                .returning();
            if (!updatedUser || updatedUser.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: "User not found",
                });
            }
            logger_1.logger.info(`User ${userId} soft deleted`);
            return res.status(200).json({
                success: true,
                message: "User deleted successfully",
                data: updatedUser[0],
            });
        }
        catch (error) {
            logger_1.logger.error("Error deleting user:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to delete user",
            });
        }
    }
    /**
     * Restore a deleted user
     */
    static async restoreUser(req, res) {
        try {
            const { userId } = req.params;
            const userIdStr = Array.isArray(userId) ? userId[0] : userId;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: "User ID is required",
                });
            }
            const updatedUser = await db_1.db
                .update(schema_1.user)
                .set({
                deletedAt: null,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.user.id, userIdStr))
                .returning();
            if (!updatedUser || updatedUser.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: "User not found",
                });
            }
            logger_1.logger.info(`User ${userId} restored`);
            return res.status(200).json({
                success: true,
                message: "User restored successfully",
                data: updatedUser[0],
            });
        }
        catch (error) {
            logger_1.logger.error("Error restoring user:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to restore user",
            });
        }
    }
    /**
     * Get all vendors with filtering
     */
    static async getAllVendors(req, res) {
        try {
            const { page = "1", limit = "10", verified = "", search = "", sortBy = "createdAt", order = "desc", } = req.query;
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 10;
            const offset = (pageNum - 1) * limitNum;
            let whereConditions = [];
            if (verified === "true") {
                whereConditions.push((0, drizzle_orm_1.eq)(schema_1.vendors.verified, true));
            }
            else if (verified === "false") {
                whereConditions.push((0, drizzle_orm_1.eq)(schema_1.vendors.verified, false));
            }
            if (search) {
                whereConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.vendors.businessName, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.vendors.contactEmail, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.vendors.contactName, `%${search}%`)));
            }
            const finalWhere = whereConditions.length > 0 ? (0, drizzle_orm_1.and)(...whereConditions) : undefined;
            const sortColumn = sortBy === "createdAt" ? schema_1.vendors.createdAt : schema_1.vendors.businessName;
            const orderFunc = order === "asc" ? drizzle_orm_1.asc : drizzle_orm_1.desc;
            const vendorsList = await db_1.db
                .select()
                .from(schema_1.vendors)
                .where(finalWhere)
                .orderBy(orderFunc(sortColumn))
                .limit(limitNum)
                .offset(offset);
            const countResult = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.vendors)
                .where(finalWhere);
            const total = parseInt(countResult[0].count.toString());
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
        }
        catch (error) {
            logger_1.logger.error("Error fetching vendors:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to fetch vendors",
            });
        }
    }
    /**
     * Verify/Unverify a vendor
     */
    static async toggleVendorVerification(req, res) {
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
            const updatedVendor = await db_1.db
                .update(schema_1.vendors)
                .set({
                verified,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.vendors.id, vendorIdStr))
                .returning();
            if (!updatedVendor || updatedVendor.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: "Vendor not found",
                });
            }
            logger_1.logger.info(`Vendor ${vendorId} verification status updated to ${verified}`);
            return res.status(200).json({
                success: true,
                message: `Vendor ${verified ? "verified" : "unverified"} successfully`,
                data: updatedVendor[0],
            });
        }
        catch (error) {
            logger_1.logger.error("Error toggling vendor verification:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to toggle vendor verification",
            });
        }
    }
    /**
     * Suspend/Activate a vendor
     */
    static async toggleVendorActivity(req, res) {
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
            const updatedVendor = await db_1.db
                .update(schema_1.vendors)
                .set({
                isActive,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.vendors.id, vendorIdStr))
                .returning();
            if (!updatedVendor || updatedVendor.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: "Vendor not found",
                });
            }
            logger_1.logger.info(`Vendor ${vendorId} activity status updated to ${isActive}`);
            return res.status(200).json({
                success: true,
                message: `Vendor ${isActive ? "activated" : "suspended"} successfully`,
                data: updatedVendor[0],
            });
        }
        catch (error) {
            logger_1.logger.error("Error toggling vendor activity:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to toggle vendor activity",
            });
        }
    }
    /**
     * Get all events
     */
    static async getAllEvents(req, res) {
        try {
            const { page = "1", limit = "10", search = "", sortBy = "createdAt", order = "desc", } = req.query;
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 10;
            const offset = (pageNum - 1) * limitNum;
            let whereCondition = undefined;
            if (search) {
                whereCondition = (0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.events.name, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.events.description, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.events.location, `%${search}%`));
            }
            const sortColumn = sortBy === "createdAt" ? schema_1.events.createdAt : schema_1.events.name;
            const orderFunc = order === "asc" ? drizzle_orm_1.asc : drizzle_orm_1.desc;
            const eventsList = await db_1.db
                .select()
                .from(schema_1.events)
                .where(whereCondition)
                .orderBy(orderFunc(sortColumn))
                .limit(limitNum)
                .offset(offset);
            const countResult = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.events)
                .where(whereCondition);
            const total = parseInt(countResult[0].count.toString());
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
        }
        catch (error) {
            logger_1.logger.error("Error fetching events:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to fetch events",
            });
        }
    }
    /**
     * Get all orders
     */
    static async getAllOrders(req, res) {
        try {
            const { page = "1", limit = "10", status = "", search = "", sortBy = "createdAt", order = "desc", } = req.query;
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 10;
            const offset = (pageNum - 1) * limitNum;
            let whereConditions = [];
            if (status) {
                const validStatuses = ["PENDING", "PAID", "FAILED", "CANCELLED"];
                if (validStatuses.includes(status)) {
                    whereConditions.push((0, drizzle_orm_1.eq)(schema_1.orders.status, status));
                }
            }
            if (search) {
                whereConditions.push((0, drizzle_orm_1.like)(schema_1.orders.orderReference, `%${search}%`));
            }
            const finalWhere = whereConditions.length > 0 ? (0, drizzle_orm_1.and)(...whereConditions) : undefined;
            const sortColumn = sortBy === "createdAt" ? schema_1.orders.createdAt : schema_1.orders.orderReference;
            const orderFunc = order === "asc" ? drizzle_orm_1.asc : drizzle_orm_1.desc;
            const ordersList = await db_1.db
                .select()
                .from(schema_1.orders)
                .where(finalWhere)
                .orderBy(orderFunc(sortColumn))
                .limit(limitNum)
                .offset(offset);
            const countResult = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.orders)
                .where(finalWhere);
            const total = parseInt(countResult[0].count.toString());
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
        }
        catch (error) {
            logger_1.logger.error("Error fetching orders:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to fetch orders",
            });
        }
    }
    /**
     * Update order status
     */
    static async updateOrderStatus(req, res) {
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
            const updatedOrder = await db_1.db
                .update(schema_1.orders)
                .set({
                status,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.orders.id, orderIdStr))
                .returning();
            if (!updatedOrder || updatedOrder.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: "Order not found",
                });
            }
            logger_1.logger.info(`Order ${orderId} status updated to ${status}`);
            return res.status(200).json({
                success: true,
                message: "Order status updated successfully",
                data: updatedOrder[0],
            });
        }
        catch (error) {
            logger_1.logger.error("Error updating order status:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to update order status",
            });
        }
    }
    /**
     * Get withdrawal requests
     */
    static async getWithdrawalRequests(req, res) {
        try {
            const { page = "1", limit = "10", status = "", sortBy = "createdAt", order = "desc", } = req.query;
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 10;
            const offset = (pageNum - 1) * limitNum;
            let whereCondition = undefined;
            if (status) {
                const validStatuses = ["pending", "approved", "paid", "rejected"];
                if (validStatuses.includes(status)) {
                    whereCondition = (0, drizzle_orm_1.eq)(schema_1.withdrawalRequests.status, status);
                }
            }
            const sortColumn = sortBy === "createdAt"
                ? schema_1.withdrawalRequests.createdAt
                : schema_1.withdrawalRequests.status;
            const orderFunc = order === "asc" ? drizzle_orm_1.asc : drizzle_orm_1.desc;
            const requests = await db_1.db
                .select()
                .from(schema_1.withdrawalRequests)
                .where(whereCondition)
                .orderBy(orderFunc(sortColumn))
                .limit(limitNum)
                .offset(offset);
            const countResult = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.withdrawalRequests)
                .where(whereCondition);
            const total = parseInt(countResult[0].count.toString());
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
        }
        catch (error) {
            logger_1.logger.error("Error fetching withdrawal requests:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to fetch withdrawal requests",
            });
        }
    }
    /**
     * Approve withdrawal request
     */
    static async approveWithdrawal(req, res) {
        try {
            const { withdrawalId } = req.params;
            const withdrawalIdStr = Array.isArray(withdrawalId)
                ? withdrawalId[0]
                : withdrawalId;
            const adminId = req.user?.id;
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
            const updatedRequest = await db_1.db
                .update(schema_1.withdrawalRequests)
                .set({
                status: "approved",
                reviewedBy: adminId,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.withdrawalRequests.id, withdrawalIdStr))
                .returning();
            if (!updatedRequest || updatedRequest.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: "Withdrawal request not found",
                });
            }
            logger_1.logger.info(`Withdrawal ${withdrawalId} approved by admin ${adminId}`);
            return res.status(200).json({
                success: true,
                message: "Withdrawal approved successfully",
                data: updatedRequest[0],
            });
        }
        catch (error) {
            logger_1.logger.error("Error approving withdrawal:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to approve withdrawal",
            });
        }
    }
    /**
     * Reject withdrawal request
     */
    static async rejectWithdrawal(req, res) {
        try {
            const { withdrawalId } = req.params;
            const withdrawalIdStr = Array.isArray(withdrawalId)
                ? withdrawalId[0]
                : withdrawalId;
            const { reason } = req.body;
            const adminId = req.user?.id;
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
            const updateData = {
                status: "rejected",
                reviewedBy: adminId,
                updatedAt: new Date(),
            };
            if (reason) {
                updateData.notes = reason;
            }
            const updatedRequest = await db_1.db
                .update(schema_1.withdrawalRequests)
                .set(updateData)
                .where((0, drizzle_orm_1.eq)(schema_1.withdrawalRequests.id, withdrawalIdStr))
                .returning();
            if (!updatedRequest || updatedRequest.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: "Withdrawal request not found",
                });
            }
            logger_1.logger.info(`Withdrawal ${withdrawalId} rejected by admin ${adminId}. Reason: ${reason}`);
            return res.status(200).json({
                success: true,
                message: "Withdrawal rejected successfully",
                data: updatedRequest[0],
            });
        }
        catch (error) {
            logger_1.logger.error("Error rejecting withdrawal:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to reject withdrawal",
            });
        }
    }
    /**
     * Get all event planners
     */
    static async getAllEventPlanners(req, res) {
        try {
            const { page = "1", limit = "10", search = "", verified = "", sortBy = "createdAt", order = "desc", } = req.query;
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 10;
            const offset = (pageNum - 1) * limitNum;
            let whereConditions = [];
            if (verified === "true") {
                whereConditions.push((0, drizzle_orm_1.eq)(schema_1.eventPlanners.isVerified, true));
            }
            else if (verified === "false") {
                whereConditions.push((0, drizzle_orm_1.eq)(schema_1.eventPlanners.isVerified, false));
            }
            if (search) {
                whereConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.eventPlanners.businessName, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.eventPlanners.businessEmail, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.eventPlanners.businessPhone, `%${search}%`)));
            }
            const finalWhere = whereConditions.length > 0 ? (0, drizzle_orm_1.and)(...whereConditions) : undefined;
            const sortColumn = sortBy === "createdAt"
                ? schema_1.eventPlanners.createdAt
                : schema_1.eventPlanners.businessName;
            const orderFunc = order === "asc" ? drizzle_orm_1.asc : drizzle_orm_1.desc;
            const planners = await db_1.db
                .select()
                .from(schema_1.eventPlanners)
                .where(finalWhere)
                .orderBy(orderFunc(sortColumn))
                .limit(limitNum)
                .offset(offset);
            const countResult = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.eventPlanners)
                .where(finalWhere);
            const total = parseInt(countResult[0].count.toString());
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
        }
        catch (error) {
            logger_1.logger.error("Error fetching event planners:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to fetch event planners",
            });
        }
    }
    /**
     * Verify/Unverify event planner
     */
    static async toggleEventPlannerVerification(req, res) {
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
            const updatedPlanner = await db_1.db
                .update(schema_1.eventPlanners)
                .set({
                isVerified,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.eventPlanners.id, plannerIdStr))
                .returning();
            if (!updatedPlanner || updatedPlanner.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: "Event planner not found",
                });
            }
            logger_1.logger.info(`Event planner ${plannerId} verification status updated to ${isVerified}`);
            return res.status(200).json({
                success: true,
                message: `Event planner ${isVerified ? "verified" : "unverified"} successfully`,
                data: updatedPlanner[0],
            });
        }
        catch (error) {
            logger_1.logger.error("Error toggling event planner verification:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to toggle event planner verification",
            });
        }
    }
    /**
     * Get transaction history with filtering
     */
    static async getTransactions(req, res) {
        try {
            const { page = "1", limit = "10", userId = "", type = "", source = "", sortBy = "createdAt", order = "desc", } = req.query;
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 10;
            const offset = (pageNum - 1) * limitNum;
            let whereConditions = [];
            if (userId) {
                const userWallets = await db_1.db
                    .select({ id: schema_1.wallets.id })
                    .from(schema_1.wallets)
                    .where((0, drizzle_orm_1.eq)(schema_1.wallets.userId, userId));
                if (userWallets.length > 0) {
                    const walletIds = userWallets.map((w) => w.id);
                    whereConditions.push((0, drizzle_orm_1.sql) `${schema_1.walletTransactions.walletId} IN (${drizzle_orm_1.sql.join(walletIds)})`);
                }
            }
            if (type) {
                whereConditions.push((0, drizzle_orm_1.eq)(schema_1.walletTransactions.type, type));
            }
            if (source) {
                whereConditions.push((0, drizzle_orm_1.eq)(schema_1.walletTransactions.source, source));
            }
            const finalWhere = whereConditions.length > 0 ? (0, drizzle_orm_1.and)(...whereConditions) : undefined;
            const sortColumn = sortBy === "createdAt"
                ? schema_1.walletTransactions.createdAt
                : schema_1.walletTransactions.amount;
            const orderFunc = order === "asc" ? drizzle_orm_1.asc : drizzle_orm_1.desc;
            const transactions = await db_1.db
                .select()
                .from(schema_1.walletTransactions)
                .where(finalWhere)
                .orderBy(orderFunc(sortColumn))
                .limit(limitNum)
                .offset(offset);
            const countResult = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.walletTransactions)
                .where(finalWhere);
            const total = parseInt(countResult[0].count.toString());
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
        }
        catch (error) {
            logger_1.logger.error("Error fetching transactions:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to fetch transactions",
            });
        }
    }
    /**
     * Get discount codes with filtering
     */
    static async getDiscountCodes(req, res) {
        try {
            const { page = "1", limit = "10", eventId = "", search = "", sortBy = "createdAt", order = "desc", } = req.query;
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 10;
            const offset = (pageNum - 1) * limitNum;
            let whereConditions = [];
            if (eventId) {
                whereConditions.push((0, drizzle_orm_1.eq)(schema_1.eventDiscounts.eventId, eventId));
            }
            if (search) {
                whereConditions.push((0, drizzle_orm_1.like)(schema_1.eventDiscounts.code, `%${search}%`));
            }
            const finalWhere = whereConditions.length > 0 ? (0, drizzle_orm_1.and)(...whereConditions) : undefined;
            const sortColumn = sortBy === "createdAt" ? schema_1.eventDiscounts.createdAt : schema_1.eventDiscounts.code;
            const orderFunc = order === "asc" ? drizzle_orm_1.asc : drizzle_orm_1.desc;
            const codes = await db_1.db
                .select()
                .from(schema_1.eventDiscounts)
                .where(finalWhere)
                .orderBy(orderFunc(sortColumn))
                .limit(limitNum)
                .offset(offset);
            const countResult = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.eventDiscounts)
                .where(finalWhere);
            const total = parseInt(countResult[0].count.toString());
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
        }
        catch (error) {
            logger_1.logger.error("Error fetching discount codes:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to fetch discount codes",
            });
        }
    }
    /**
     * Create a discount code
     */
    static async createDiscountCode(req, res) {
        try {
            const { eventId, code, usageLimit } = req.body;
            if (!eventId || !code) {
                return res.status(400).json({
                    success: false,
                    error: "Event ID and discount code are required",
                });
            }
            const newCode = await db_1.db
                .insert(schema_1.eventDiscounts)
                .values({
                eventId,
                code: code.toUpperCase(),
                usageLimit: usageLimit || null,
                usedCount: 0,
            })
                .returning();
            logger_1.logger.info(`Discount code ${code} created for event ${eventId}`);
            return res.status(201).json({
                success: true,
                message: "Discount code created successfully",
                data: newCode[0],
            });
        }
        catch (error) {
            logger_1.logger.error("Error creating discount code:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to create discount code",
            });
        }
    }
    /**
     * Delete a discount code
     */
    static async deleteDiscountCode(req, res) {
        try {
            const { codeId } = req.params;
            const codeIdStr = Array.isArray(codeId) ? codeId[0] : codeId;
            if (!codeId) {
                return res.status(400).json({
                    success: false,
                    error: "Code ID is required",
                });
            }
            const deleted = await db_1.db
                .delete(schema_1.eventDiscounts)
                .where((0, drizzle_orm_1.eq)(schema_1.eventDiscounts.id, codeIdStr))
                .returning();
            if (!deleted || deleted.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: "Discount code not found",
                });
            }
            logger_1.logger.info(`Discount code ${codeId} deleted`);
            return res.status(200).json({
                success: true,
                message: "Discount code deleted successfully",
                data: deleted[0],
            });
        }
        catch (error) {
            logger_1.logger.error("Error deleting discount code:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to delete discount code",
            });
        }
    }
    /**
     * Get wallet transactions for a specific user
     */
    static async getUserTransactions(req, res) {
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
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 20;
            const offset = (pageNum - 1) * limitNum;
            const userWallets = await db_1.db
                .select()
                .from(schema_1.wallets)
                .where((0, drizzle_orm_1.eq)(schema_1.wallets.userId, userIdStr));
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
            const transactions = await db_1.db
                .select()
                .from(schema_1.walletTransactions)
                .where((0, drizzle_orm_1.sql) `${schema_1.walletTransactions.walletId} IN (${drizzle_orm_1.sql.join(walletIds)})`)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.walletTransactions.createdAt))
                .limit(limitNum)
                .offset(offset);
            const countResult = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.walletTransactions)
                .where((0, drizzle_orm_1.sql) `${schema_1.walletTransactions.walletId} IN (${drizzle_orm_1.sql.join(walletIds)})`);
            const total = parseInt(countResult[0].count.toString());
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
        }
        catch (error) {
            logger_1.logger.error("Error fetching user transactions:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to fetch user transactions",
            });
        }
    }
    /**
     * Get event ticket sales
     */
    static async getEventTicketSales(req, res) {
        try {
            const { eventId } = req.params;
            const { page = "1", limit = "10" } = req.query;
            if (!eventId) {
                return res.status(400).json({
                    success: false,
                    error: "Event ID is required",
                });
            }
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 10;
            const offset = (pageNum - 1) * limitNum;
            const tickets = await db_1.db
                .select()
                .from(schema_1.eventTickets)
                .where((0, drizzle_orm_1.eq)(schema_1.eventTickets.eventId, eventId))
                .limit(limitNum)
                .offset(offset);
            const countResult = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.eventTickets)
                .where((0, drizzle_orm_1.eq)(schema_1.eventTickets.eventId, eventId));
            const total = parseInt(countResult[0].count.toString());
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
        }
        catch (error) {
            logger_1.logger.error("Error fetching event ticket sales:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to fetch event ticket sales",
            });
        }
    }
    /**
     * Get admin dashboard overview
     */
    static async getAdminOverview(req, res) {
        try {
            const recentUsers = await db_1.db
                .select()
                .from(schema_1.user)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.user.createdAt))
                .limit(5);
            const recentOrders = await db_1.db
                .select()
                .from(schema_1.orders)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.orders.createdAt))
                .limit(5);
            const pendingPlannerVerifications = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.eventPlanners)
                .where((0, drizzle_orm_1.eq)(schema_1.eventPlanners.isVerified, false));
            const pendingVendorVerifications = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.vendors)
                .where((0, drizzle_orm_1.eq)(schema_1.vendors.verified, false));
            const totalRevenue = await db_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT COALESCE(SUM(CAST(total_amount AS FLOAT)), 0) as total 
        FROM "orders" 
        WHERE status = ${"PAID"}
      `);
            return res.status(200).json({
                success: true,
                data: {
                    recentUsers,
                    recentOrders,
                    pendingPlannerVerifications: parseInt(pendingPlannerVerifications[0].count.toString()),
                    pendingVendorVerifications: parseInt(pendingVendorVerifications[0].count.toString()),
                    totalRevenue: totalRevenue.rows[0].total || 0,
                },
            });
        }
        catch (error) {
            logger_1.logger.error("Error fetching admin overview:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to fetch admin overview",
            });
        }
    }
    /**
     * Get admin dashboard
     */
    static async getDashboard(req, res) {
        try {
            const now = new Date();
            // Get total events count
            const totalEventsResult = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.events);
            const totalEvents = parseInt(totalEventsResult[0].count.toString());
            // Get upcoming events (eventDate > now)
            const upcomingEvents = await db_1.db
                .select()
                .from(schema_1.events)
                .where((0, drizzle_orm_1.gte)(schema_1.events.eventDate, now))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.events.eventDate))
                .limit(10);
            // Get recent events (orderBy createdAt desc)
            const recentEvents = await db_1.db
                .select()
                .from(schema_1.events)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.events.createdAt))
                .limit(10);
            // Get all tickets
            const tickets = await db_1.db.select().from(schema_1.eventTickets);
            // Get active events count (events with eventDate >= now)
            const activeEventsResult = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.events)
                .where((0, drizzle_orm_1.gte)(schema_1.events.eventDate, now));
            const activeEvents = parseInt(activeEventsResult[0].count.toString());
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
        }
        catch (error) {
            logger_1.logger.error("Error fetching dashboard:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to fetch dashboard",
            });
        }
    }
    /**
     * Get transaction summary
     */
    static async getTransactionSummary(req, res) {
        try {
            // Get total transactions count
            const totalResult = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.orders);
            const total = parseInt(totalResult[0].count.toString());
            // Get total revenue from paid orders
            const revenueResult = await db_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT COALESCE(SUM(CAST(total_amount AS FLOAT)), 0) as total 
        FROM "orders" 
        WHERE status = ${"PAID"}
      `);
            const revenue = revenueResult.rows[0].total || 0;
            // Get average order value
            const avgResult = await db_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT COALESCE(AVG(CAST(total_amount AS FLOAT)), 0) as avg 
        FROM "orders" 
        WHERE status = ${"PAID"}
      `);
            const average = avgResult.rows[0].avg || 0;
            // Get refunds (cancelled orders)
            const refundsResult = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.orders)
                .where((0, drizzle_orm_1.eq)(schema_1.orders.status, "CANCELLED"));
            const refunds = parseInt(refundsResult[0].count.toString());
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
        }
        catch (error) {
            logger_1.logger.error("Error fetching transaction summary:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to fetch transaction summary",
            });
        }
    }
}
exports.AdminController = AdminController;
