// controllers/vendorBooking.controller.ts
import { Request, Response } from "express";
import { db } from "../db";
import { vendorBookings, vendorServices, vendors } from "../db/schema";
import { and, desc, eq } from "drizzle-orm";

export class VendorBookingController {
  // ── GET /bookings/my ─────────────────────────────────────────────────────
  // All bookings for the logged-in user
  static async getMyBookings(req: Request, res: Response) {
    try {
      const userId = req.user!.id;

      const bookings = await db.query.vendorBookings.findMany({
        where: eq(vendorBookings.userId, userId),
        orderBy: [desc(vendorBookings.createdAt)],
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
    } catch (err: any) {
      console.error("Get my bookings error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ── GET /bookings/my/:id ──────────────────────────────────────────────────
  // Single booking detail
  static async getBookingById(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const booking = await db.query.vendorBookings.findFirst({
        where: and(
          eq(vendorBookings.id, id),
        //   eq(vendorBookings.userId, userId), // ensure ownership
        ),
        with: {
          service: true,
          vendor: true,
            event: true,
          user:true
        },
      });


      if (!booking) {
        return res
          .status(404)
          .json({ success: false, message: "Booking not found" });
      }

      return res.json({ success: true, data: booking });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ── GET /bookings/vendor ──────────────────────────────────────────────────
  // All bookings received by the logged-in vendor
  static async getVendorBookings(req: Request, res: Response) {
    try {
      const userId = req.user!.id;

      // Resolve vendor from userId
      const vendor = await db.query.vendors.findFirst({
        where: eq(vendors.userId, userId),
        columns: { id: true },
      });

      if (!vendor) {
        return res
          .status(404)
          .json({ success: false, message: "Vendor profile not found" });
      }

      const bookings = await db.query.vendorBookings.findMany({
        where: eq(vendorBookings.vendorId, vendor.id),
        orderBy: [desc(vendorBookings.createdAt)],
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
    } catch (err: any) {
      console.error("Get vendor bookings error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ── PATCH /bookings/:id/status ────────────────────────────────────────────
  // Vendor updates booking status (accept / reject / complete)
  static async updateBookingStatus(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { status } = req.body;

      const allowed = ["accepted", "completed", "rejected", "cancelled"];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${allowed.join(", ")}`,
        });
      }

      // Resolve vendor
      const vendor = await db.query.vendors.findFirst({
        where: eq(vendors.userId, userId),
        columns: { id: true },
      });

      if (!vendor) {
        return res
          .status(404)
          .json({ success: false, message: "Vendor profile not found" });
      }

      // Verify booking belongs to this vendor
      const booking = await db.query.vendorBookings.findFirst({
        where: and(
          eq(vendorBookings.id, id),
          eq(vendorBookings.vendorId, vendor.id),
        ),
      });

      if (!booking) {
        return res
          .status(404)
          .json({ success: false, message: "Booking not found" });
      }

      const [updated] = await db
        .update(vendorBookings)
        .set({
          status,
          cancelledAt:
            status === "cancelled" || status === "rejected"
              ? new Date()
              : undefined,
          updatedAt: new Date(),
        })
        .where(eq(vendorBookings.id, id))
        .returning();

      return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
