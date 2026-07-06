"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorBookingController = void 0;
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const logger_1 = require("../utils/logger");
class VendorBookingController {
    // ── GET /bookings/my ─────────────────────────────────────────────────────
    // All bookings for the logged-in user
    static async getMyBookings(req, res) {
        try {
            const userId = req.user.id;
            const bookings = await db_1.db.query.vendorBookings.findMany({
                where: (0, drizzle_orm_1.eq)(schema_1.vendorBookings.userId, userId),
                orderBy: [(0, drizzle_orm_1.desc)(schema_1.vendorBookings.createdAt)],
                with: {
                    service: {
                        columns: {
                            id: true,
                            title: true,
                            category: true,
                            price: true,
                            priceType: true,
                            image: true,
                            durationMinutes: true,
                            deliveryTime: true,
                        },
                    },
                    vendor: {
                        columns: {
                            id: true,
                            userId: true,
                            businessName: true,
                            contactName: true,
                            image: true,
                            location: true,
                            city: true,
                            rating: true,
                            verified: true,
                        },
                    },
                    event: {
                        columns: {
                            id: true,
                            name: true,
                            eventDate: true,
                            imageUrl: true,
                        },
                    },
                },
            });
            return res.json({ success: true, data: bookings });
        }
        catch (err) {
            logger_1.logger.error("Get my bookings error", err);
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    // ── GET /bookings/my/:id ──────────────────────────────────────────────────
    // Single booking detail
    static async getBookingById(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const idStr = Array.isArray(id) ? id[0] : id;
            const booking = await db_1.db.query.vendorBookings.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.vendorBookings.id, idStr)),
                with: {
                    service: true,
                    vendor: true,
                    event: true,
                    user: true
                },
            });
            if (!booking) {
                return res
                    .status(404)
                    .json({ success: false, message: "Booking not found" });
            }
            return res.json({ success: true, data: booking });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    // ── GET /bookings/vendor ──────────────────────────────────────────────────
    // All bookings received by the logged-in vendor
    static async getVendorBookings(req, res) {
        try {
            const userId = req.user.id;
            // Resolve vendor from userId
            const vendor = await db_1.db.query.vendors.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.vendors.userId, userId),
                columns: { id: true },
            });
            if (!vendor) {
                return res
                    .status(404)
                    .json({ success: false, message: "Vendor profile not found" });
            }
            const bookings = await db_1.db.query.vendorBookings.findMany({
                where: (0, drizzle_orm_1.eq)(schema_1.vendorBookings.vendorId, vendor.id),
                orderBy: [(0, drizzle_orm_1.desc)(schema_1.vendorBookings.createdAt)],
                with: {
                    service: {
                        columns: {
                            id: true,
                            title: true,
                            category: true,
                            price: true,
                            priceType: true,
                            image: true,
                        },
                    },
                    user: {
                        columns: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            image: true,
                            phoneNumber: true,
                        },
                    },
                    event: {
                        columns: {
                            id: true,
                            name: true,
                            eventDate: true,
                            imageUrl: true,
                        },
                    },
                },
            });
            return res.json({ success: true, data: bookings });
        }
        catch (err) {
            logger_1.logger.error("Get vendor bookings error", err);
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    // ── PATCH /bookings/:id/status ────────────────────────────────────────────
    // Vendor updates booking status (accept / reject / complete)
    static async updateBookingStatus(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const idStr = Array.isArray(id) ? id[0] : id;
            const { status } = req.body;
            const allowed = ["accepted", "completed", "rejected", "cancelled"];
            if (!allowed.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `Status must be one of: ${allowed.join(", ")}`,
                });
            }
            // Resolve vendor
            const vendor = await db_1.db.query.vendors.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.vendors.userId, userId),
                columns: { id: true },
            });
            if (!vendor) {
                return res
                    .status(404)
                    .json({ success: false, message: "Vendor profile not found" });
            }
            // Verify booking belongs to this vendor
            const booking = await db_1.db.query.vendorBookings.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.vendorBookings.id, idStr), (0, drizzle_orm_1.eq)(schema_1.vendorBookings.vendorId, vendor.id)),
            });
            if (!booking) {
                return res
                    .status(404)
                    .json({ success: false, message: "Booking not found" });
            }
            const [updated] = await db_1.db
                .update(schema_1.vendorBookings)
                .set({
                status,
                cancelledAt: status === "cancelled" || status === "rejected"
                    ? new Date()
                    : undefined,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.vendorBookings.id, idStr))
                .returning();
            return res.json({ success: true, data: updated });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
}
exports.VendorBookingController = VendorBookingController;
