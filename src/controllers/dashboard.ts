import { Request, Response } from "express";
import {
  and,
  asc,
  countDistinct,
  desc,
  eq,
  gte,
  lt,
  not,
  sql,
} from "drizzle-orm";
import { db } from "../db";
import { eventPlanners, events, orders, user as profiles } from "../db/schema";
import { wallets } from "../db/schema/wallet";
import { walletTransactions } from "../db/schema/transactions";
import { eventTickets } from "../db/schema/eventTickets";
import { vendors } from "../db/schema/vendors";
import { vendorBookings } from "../db/schema/vendorBooking";
import { vendorServices } from "../db/schema/vendorServices";

export class DashboardController {
  // ── GET /dashboard/:plannerId ──────────────────────────────────────────────
  static async getEventPlannerDashboard(req: Request, res: Response) {
    try {
      const { plannerId } = req.params;

      // ── 1. Planner + wallet ────────────────────────────────────────────────
      const [planner] = await db
        .select({
          id: eventPlanners.id,
          userid: eventPlanners.profileId,
          businessName: eventPlanners.businessName,
          logoUrl: eventPlanners.logoUrl,
          isVerified: eventPlanners.isVerified,
        })
        .from(eventPlanners)
        .where(eq(eventPlanners.id, plannerId));

      if (!planner) {
        return res.status(404).json({ message: "Event planner not found" });
      }

      const [wallet] = await db
        .select({ id: wallets.id, balance: wallets.balance })
        .from(wallets)
        .where(
          and(
            eq(wallets.userId, planner.userid),
            eq(wallets.ownerType, "event_planner"),
          ),
        );

      // ── 2. Core metrics ────────────────────────────────────────────────────
      const [ticketsSoldResult] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${orders.quantity}::int), 0)`,
        })
        .from(orders)
        .innerJoin(events, eq(events.id, orders.eventId))
        .where(and(eq(events.plannerId, plannerId), eq(orders.status, "PAID")));

      const [revenueResult] = await db
        .select({
          revenue: sql<number>`COALESCE(SUM(${orders.totalAmount}::numeric), 0)`,
        })
        .from(orders)
        .innerJoin(events, eq(events.id, orders.eventId))
        .where(and(eq(events.plannerId, plannerId), eq(orders.status, "PAID")));

      const [totalEventsResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(events)
        .where(eq(events.plannerId, plannerId));

      const [cancelledResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(orders)
        .innerJoin(events, eq(events.id, orders.eventId))
        .where(
          and(eq(events.plannerId, plannerId), eq(orders.status, "CANCELLED")),
        );

      const [refundedResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(orders)
        .innerJoin(events, eq(events.id, orders.eventId))
        .where(
          and(eq(events.plannerId, plannerId), eq(orders.status, "FAILED")),
        );

      // ── 3. Upcoming events with ticket sales progress ──────────────────────
      const upcomingEventsRaw = await db
        .select({
          id: events.id,
          name: events.name,
          eventDate: events.eventDate,
          imageUrl: events.imageUrl,
          location: events.location,
        })
        .from(events)
        .where(
          and(
            eq(events.plannerId, plannerId),
            gte(events.eventDate, new Date()),
          ),
        )
        .orderBy(asc(events.eventDate))
        .limit(5);

      // Attach ticket progress to each upcoming event
      const upcomingEvents = await Promise.all(
        upcomingEventsRaw.map(async (event) => {
          const [progress] = await db
            .select({
              totalCapacity: sql<number>`COALESCE(SUM(${eventTickets.quantity}::int), 0)`,
              sold: sql<number>`COALESCE(SUM(${orders.quantity}::int), 0)`,
            })
            .from(eventTickets)
            .leftJoin(
              orders,
              and(
                eq(orders.ticketId, eventTickets.id),
                eq(orders.status, "PAID"),
              ),
            )
            .where(eq(eventTickets.eventId, event.id));

          const capacity = Number(progress?.totalCapacity ?? 0);
          const sold = Number(progress?.sold ?? 0);

          return {
            ...event,
            ticketProgress: {
              sold,
              capacity,
              available: Math.max(capacity - sold, 0),
              percentage:
                capacity > 0 ? Math.round((sold / capacity) * 100) : 0,
            },
          };
        }),
      );

      // ── 4. Best selling ticket type ────────────────────────────────────────
      const bestSellingTickets = await db
        .select({
          ticketId: eventTickets.id,
          label: eventTickets.label,
          eventName: events.name,
          sold: sql<number>`COALESCE(SUM(${orders.quantity}::int), 0)`,
          revenue: sql<number>`COALESCE(SUM(${orders.totalAmount}::numeric), 0)`,
        })
        .from(orders)
        .innerJoin(eventTickets, eq(eventTickets.id, orders.ticketId))
        .innerJoin(events, eq(events.id, orders.eventId))
        .where(and(eq(events.plannerId, plannerId), eq(orders.status, "PAID")))
        .groupBy(eventTickets.id, eventTickets.label, events.name)
        .orderBy(desc(sql`SUM(${orders.quantity}::int)`))
        .limit(5);

      // ── 5. Attendee demographics (city breakdown via profile) ──────────────
      // Uses the orders → profiles join to get unique attendees per city
      const attendeeCities = await db
        .select({
          city: sql<string>`COALESCE(${profiles.phoneNumber}, 'Unknown')`,
          count: sql<number>`COUNT(DISTINCT ${orders.userId})`,
        })
        .from(orders)
        .innerJoin(events, eq(events.id, orders.eventId))
        .innerJoin(profiles, eq(profiles.id, orders.userId))
        .where(and(eq(events.plannerId, plannerId), eq(orders.status, "PAID")))
        .groupBy(profiles.phoneNumber)
        .orderBy(desc(sql`COUNT(DISTINCT ${orders.userId})`))
        .limit(6);

      // Gender / age not in schema yet — return total unique attendees instead
      const [uniqueAttendeesResult] = await db
        .select({
          count: sql<number>`COUNT(DISTINCT ${orders.userId})`,
        })
        .from(orders)
        .innerJoin(events, eq(events.id, orders.eventId))
        .where(and(eq(events.plannerId, plannerId), eq(orders.status, "PAID")));

      // ── 6. Wallet transaction history ──────────────────────────────────────
      const walletTxHistory = wallet?.id
        ? await db
            .select({
              id: walletTransactions.id,
              type: walletTransactions.type,
              source: walletTransactions.source,
              amount: walletTransactions.amount,
              balanceAfter: walletTransactions.balanceAfter,
              narration: walletTransactions.narration,
              createdAt: walletTransactions.createdAt,
            })
            .from(walletTransactions)
            .where(eq(walletTransactions.walletId, wallet.id))
            .orderBy(desc(walletTransactions.createdAt))
            .limit(10)
        : [];

      // ── 7. Recent activity (latest 5 paid orders) ──────────────────────────
      const recentActivity = await db
        .select({
          type: sql<string>`'ticket_sold'`,
          message: sql<string>`CONCAT(${profiles.firstName}, ' ', ${profiles.lastName}, ' purchased ', ${orders.quantity}, ' ticket(s) for ', ${events.name})`,
          time: orders.createdAt,
        })
        .from(orders)
        .innerJoin(events, eq(events.id, orders.eventId))
        .innerJoin(profiles, eq(profiles.id, orders.userId))
        .where(and(eq(events.plannerId, plannerId), eq(orders.status, "PAID")))
        .orderBy(desc(orders.createdAt))
        .limit(5);

      // ── 8. Ticket pie (sold vs available) ─────────────────────────────────
      const [ticketTotals] = await db
        .select({
          totalCapacity: sql<number>`COALESCE(SUM(${eventTickets.quantity}::int), 0)`,
          sold: sql<number>`COALESCE(SUM(${orders.quantity}::int), 0)`,
        })
        .from(eventTickets)
        .innerJoin(events, eq(events.id, eventTickets.eventId))
        .leftJoin(
          orders,
          and(eq(orders.ticketId, eventTickets.id), eq(orders.status, "PAID")),
        )
        .where(eq(events.plannerId, plannerId));

      const soldTotal = Number(ticketTotals?.sold ?? 0);
      const capacityTotal = Number(ticketTotals?.totalCapacity ?? 0);
      const availableTotal = Math.max(capacityTotal - soldTotal, 0);

      const ticketPieData = [
        { name: "Sold", value: soldTotal, color: "#FF6B35" },
        { name: "Available", value: availableTotal, color: "#FFB5A3" },
      ];

      // ── 9. Revenue per month (bar chart) ──────────────────────────────────
      const revenueMonthly = await db
        .select({
          month: sql<number>`EXTRACT(MONTH FROM ${orders.createdAt})`,
          revenue: sql<number>`COALESCE(SUM(${orders.totalAmount}::numeric), 0)`,
        })
        .from(orders)
        .innerJoin(events, eq(events.id, orders.eventId))
        .where(and(eq(events.plannerId, plannerId), eq(orders.status, "PAID")))
        .groupBy(sql`EXTRACT(MONTH FROM ${orders.createdAt})`)
        .orderBy(asc(sql`EXTRACT(MONTH FROM ${orders.createdAt})`));

      const MONTHS = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const revenueChartData = MONTHS.map((month, i) => {
        const match = revenueMonthly.find((r) => Number(r.month) === i + 1);
        return { month, revenue: Number(match?.revenue ?? 0), target: 0 };
      });

      // ── Response ───────────────────────────────────────────────────────────
      return res.json({
        planner: {
          ...planner,
          wallet: { balance: wallet?.balance ?? 0 },
        },
        metrics: {
          ticketsSold: Number(ticketsSoldResult.total ?? 0),
          revenue: Number(revenueResult.revenue ?? 0),
          totalEvents: Number(totalEventsResult.count ?? 0),
          totalAttendees: Number(uniqueAttendeesResult.count ?? 0),
          cancelledOrders: Number(cancelledResult.count ?? 0),
          refundedOrders: Number(refundedResult.count ?? 0),
        },
        upcomingEvents,
        bestSellingTickets,
        attendeeDemographics: {
          totalUnique: Number(uniqueAttendeesResult.count ?? 0),
          cityBreakdown: attendeeCities,
        },
        walletTransactions: walletTxHistory,
        recentActivity,
        ticketPieData,
        revenueChartData,
      });
    } catch (error: any) {
      console.error("Planner dashboard error:", error);
      return res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }

  // ── GET /dashboard/vendor/:vendorId ────────────────────────────────────────
  static async getVendorDashboard(req: Request, res: Response) {
    try {
      const { vendorId } = req.params;

      // ── 1. Vendor + wallet ─────────────────────────────────────────────────
      const [vendor] = await db
        .select({
          id: vendors.id,
          userid: vendors.userId,
          contactName: vendors.contactName,
          category: vendors.category,
          image: vendors.image,
          verified: vendors.verified,
          rating: vendors.rating,
        })
        .from(vendors)
        .where(eq(vendors.id, vendorId));

      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      const [wallet] = await db
        .select({ id: wallets.id, balance: wallets.balance })
        .from(wallets)
        .where(
          and(
            eq(wallets.userId, vendor.userid),
            eq(wallets.ownerType, "vendor"),
          ),
        );

      // ── 2. Core metrics ────────────────────────────────────────────────────
      const [totalBookingsResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(vendorBookings)
        .where(eq(vendorBookings.vendorId, vendorId));

      const [revenueResult] = await db
        .select({
          revenue: sql<number>`COALESCE(SUM(${vendorBookings.amount}), 0)`,
        })
        .from(vendorBookings)
        .where(
          and(
            eq(vendorBookings.vendorId, vendorId),
            eq(vendorBookings.status, "completed"),
          ),
        );

      const [pendingResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(vendorBookings)
        .where(
          and(
            eq(vendorBookings.vendorId, vendorId),
            eq(vendorBookings.status, "pending"),
          ),
        );

      const [acceptedResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(vendorBookings)
        .where(
          and(
            eq(vendorBookings.vendorId, vendorId),
            eq(vendorBookings.status, "accepted"),
          ),
        );

      const [rejectedResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(vendorBookings)
        .where(
          and(
            eq(vendorBookings.vendorId, vendorId),
            eq(vendorBookings.status, "rejected"),
          ),
        );

      const [avgBookingValueResult] = await db
        .select({
          avg: sql<number>`COALESCE(AVG(${vendorBookings.amount}), 0)`,
        })
        .from(vendorBookings)
        .where(eq(vendorBookings.vendorId, vendorId));

      // Acceptance rate
      const totalReviewed =
        Number(acceptedResult.count ?? 0) + Number(rejectedResult.count ?? 0);
      const acceptanceRate =
        totalReviewed > 0
          ? Math.round((Number(acceptedResult.count) / totalReviewed) * 100)
          : 0;

      // ── 3. Customer retention (repeat vs new) ──────────────────────────────
      const clientBookingCounts = await db
        .select({
          userId: vendorBookings.userId,
          count: sql<number>`COUNT(*)`,
        })
        .from(vendorBookings)
        .where(eq(vendorBookings.vendorId, vendorId))
        .groupBy(vendorBookings.userId);

      const repeatClients = clientBookingCounts.filter(
        (c) => Number(c.count) > 1,
      ).length;
      const newClients = clientBookingCounts.filter(
        (c) => Number(c.count) === 1,
      ).length;
      const totalClients = clientBookingCounts.length;

      // ── 4. Top performing services ─────────────────────────────────────────
      const topServices = await db
        .select({
          serviceId: vendorServices.id,
          serviceName: vendorServices.title,
          bookings: sql<number>`COUNT(${vendorBookings.id})`,
          revenue: sql<number>`COALESCE(SUM(${vendorBookings.amount}), 0)`,
        })
        .from(vendorBookings)
        .innerJoin(
          vendorServices,
          eq(vendorServices.id, vendorBookings.serviceId),
        )
        .where(
          and(
            eq(vendorBookings.vendorId, vendorId),
            not(eq(vendorBookings.status, "rejected")),
            not(eq(vendorBookings.status, "cancelled")),
          ),
        )
        .groupBy(vendorServices.id, vendorServices.title)
        .orderBy(desc(sql`SUM(${vendorBookings.amount})`))
        .limit(5);

      // ── 5. Upcoming jobs with service + client name ────────────────────────
      const upcomingJobs = await db
        .select({
          id: vendorBookings.id,
          serviceName: vendorServices.title,
          clientName: sql<string>`CONCAT(${profiles.firstName}, ' ', ${profiles.lastName})`,
          clientImage: profiles.image,
          scheduledDate: vendorBookings.scheduledDate,
          amount: vendorBookings.amount,
          status: vendorBookings.status,
          notes: vendorBookings.notes,
        })
        .from(vendorBookings)
        .leftJoin(
          vendorServices,
          eq(vendorServices.id, vendorBookings.serviceId),
        )
        .innerJoin(profiles, eq(profiles.id, vendorBookings.userId))
        .where(
          and(
            eq(vendorBookings.vendorId, vendorId),
            gte(vendorBookings.scheduledDate, new Date()),
            not(eq(vendorBookings.status, "cancelled")),
            not(eq(vendorBookings.status, "rejected")),
          ),
        )
        .orderBy(asc(vendorBookings.scheduledDate))
        .limit(5);

      // ── 6. Wallet transaction history ──────────────────────────────────────
      const walletTxHistory = wallet?.id
        ? await db
            .select({
              id: walletTransactions.id,
              type: walletTransactions.type,
              source: walletTransactions.source,
              amount: walletTransactions.amount,
              balanceAfter: walletTransactions.balanceAfter,
              narration: walletTransactions.narration,
              createdAt: walletTransactions.createdAt,
            })
            .from(walletTransactions)
            .where(eq(walletTransactions.walletId, wallet.id))
            .orderBy(desc(walletTransactions.createdAt))
            .limit(10)
        : [];

      // ── 7. Recent activity ─────────────────────────────────────────────────
      const recentActivity = await db
        .select({
          type: sql<string>`${vendorBookings.status}`,
          message: sql<string>`CONCAT(${profiles.firstName}, ' ', ${profiles.lastName}, ' booked ', COALESCE(${vendorServices.title}, 'a service'))`,
          time: vendorBookings.createdAt,
          status: vendorBookings.status,
        })
        .from(vendorBookings)
        .leftJoin(
          vendorServices,
          eq(vendorServices.id, vendorBookings.serviceId),
        )
        .innerJoin(profiles, eq(profiles.id, vendorBookings.userId))
        .where(eq(vendorBookings.vendorId, vendorId))
        .orderBy(desc(vendorBookings.createdAt))
        .limit(5);

      // ── 8. Booking status pie ──────────────────────────────────────────────
      const statusStats = await db
        .select({
          status: vendorBookings.status,
          count: sql<number>`COUNT(*)`,
        })
        .from(vendorBookings)
        .where(eq(vendorBookings.vendorId, vendorId))
        .groupBy(vendorBookings.status);

      const bookingPieData = [
        {
          name: "Completed",
          value: Number(
            statusStats.find((s) => s.status === "completed")?.count ?? 0,
          ),
          color: "#22C55E",
        },
        {
          name: "Pending",
          value: Number(
            statusStats.find((s) => s.status === "pending")?.count ?? 0,
          ),
          color: "#F59E0B",
        },
        {
          name: "Accepted",
          value: Number(
            statusStats.find((s) => s.status === "accepted")?.count ?? 0,
          ),
          color: "#3B82F6",
        },
        {
          name: "Cancelled",
          value: Number(
            statusStats.find((s) => s.status === "cancelled")?.count ?? 0,
          ),
          color: "#EF4444",
        },
        {
          name: "Rejected",
          value: Number(
            statusStats.find((s) => s.status === "rejected")?.count ?? 0,
          ),
          color: "#9CA3AF",
        },
      ];

      // ── 9. Revenue per month ───────────────────────────────────────────────
      const revenueMonthly = await db
        .select({
          month: sql<number>`EXTRACT(MONTH FROM ${vendorBookings.createdAt})`,
          revenue: sql<number>`COALESCE(SUM(${vendorBookings.amount}), 0)`,
        })
        .from(vendorBookings)
        .where(
          and(
            eq(vendorBookings.vendorId, vendorId),
            eq(vendorBookings.status, "completed"),
          ),
        )
        .groupBy(sql`EXTRACT(MONTH FROM ${vendorBookings.createdAt})`)
        .orderBy(asc(sql`EXTRACT(MONTH FROM ${vendorBookings.createdAt})`));

      const MONTHS = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const revenueChartData = MONTHS.map((month, i) => {
        const match = revenueMonthly.find((r) => Number(r.month) === i + 1);
        return { month, revenue: Number(match?.revenue ?? 0), target: 0 };
      });

      // ── Response ───────────────────────────────────────────────────────────
      return res.json({
        vendor: {
          ...vendor,
          wallet: { balance: wallet?.balance ?? 0 },
        },
        metrics: {
          totalBookings: Number(totalBookingsResult.count ?? 0),
          revenue: Number(revenueResult.revenue ?? 0),
          pendingBookings: Number(pendingResult.count ?? 0),
          acceptedBookings: Number(acceptedResult.count ?? 0),
          rejectedBookings: Number(rejectedResult.count ?? 0),
          avgBookingValue: Math.round(Number(avgBookingValueResult.avg ?? 0)),
          acceptanceRate,
        },
        customerRetention: {
          totalClients,
          newClients,
          repeatClients,
          retentionRate:
            totalClients > 0
              ? Math.round((repeatClients / totalClients) * 100)
              : 0,
        },
        topServices,
        upcomingJobs,
        walletTransactions: walletTxHistory,
        recentActivity,
        bookingPieData,
        revenueChartData,
      });
    } catch (error: any) {
      console.error("Vendor dashboard error:", error);
      return res.status(500).json({
        message: "Failed to load vendor dashboard",
        error: error.message,
      });
    }
  }
}
