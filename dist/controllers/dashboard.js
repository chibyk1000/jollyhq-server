"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const wallet_1 = require("../db/schema/wallet");
const transactions_1 = require("../db/schema/transactions");
const eventTickets_1 = require("../db/schema/eventTickets");
const vendors_1 = require("../db/schema/vendors");
const vendorBooking_1 = require("../db/schema/vendorBooking");
const vendorServices_1 = require("../db/schema/vendorServices");
class DashboardController {
    // ── GET /dashboard/:plannerId ──────────────────────────────────────────────
    static async getEventPlannerDashboard(req, res) {
        try {
            const { plannerId } = req.params;
            const plannerIdStr = Array.isArray(plannerId) ? plannerId[0] : plannerId;
            // ── 1. Planner + wallet ────────────────────────────────────────────────
            const [planner] = await db_1.db
                .select({
                id: schema_1.eventPlanners.id,
                userid: schema_1.eventPlanners.profileId,
                businessName: schema_1.eventPlanners.businessName,
                logoUrl: schema_1.eventPlanners.logoUrl,
                isVerified: schema_1.eventPlanners.isVerified,
            })
                .from(schema_1.eventPlanners)
                .where((0, drizzle_orm_1.eq)(schema_1.eventPlanners.id, plannerIdStr));
            if (!planner) {
                return res.status(404).json({ message: "Event planner not found" });
            }
            const [wallet] = await db_1.db
                .select({ id: wallet_1.wallets.id, balance: wallet_1.wallets.balance })
                .from(wallet_1.wallets)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(wallet_1.wallets.userId, planner.userid), (0, drizzle_orm_1.eq)(wallet_1.wallets.ownerType, "event_planner")));
            // ── 2. Core metrics ────────────────────────────────────────────────────
            const [ticketsSoldResult] = await db_1.db
                .select({
                total: (0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.orders.quantity}::int), 0)`,
            })
                .from(schema_1.orders)
                .innerJoin(schema_1.events, (0, drizzle_orm_1.eq)(schema_1.events.id, schema_1.orders.eventId))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.events.plannerId, plannerIdStr), (0, drizzle_orm_1.eq)(schema_1.orders.status, "PAID")));
            const [revenueResult] = await db_1.db
                .select({
                revenue: (0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.orders.totalAmount}::numeric), 0)`,
            })
                .from(schema_1.orders)
                .innerJoin(schema_1.events, (0, drizzle_orm_1.eq)(schema_1.events.id, schema_1.orders.eventId))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.events.plannerId, plannerIdStr), (0, drizzle_orm_1.eq)(schema_1.orders.status, "PAID")));
            const [totalEventsResult] = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `COUNT(*)` })
                .from(schema_1.events)
                .where((0, drizzle_orm_1.eq)(schema_1.events.plannerId, plannerIdStr));
            const [cancelledResult] = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `COUNT(*)` })
                .from(schema_1.orders)
                .innerJoin(schema_1.events, (0, drizzle_orm_1.eq)(schema_1.events.id, schema_1.orders.eventId))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.events.plannerId, plannerIdStr), (0, drizzle_orm_1.eq)(schema_1.orders.status, "CANCELLED")));
            const [refundedResult] = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `COUNT(*)` })
                .from(schema_1.orders)
                .innerJoin(schema_1.events, (0, drizzle_orm_1.eq)(schema_1.events.id, schema_1.orders.eventId))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.events.plannerId, plannerIdStr), (0, drizzle_orm_1.eq)(schema_1.orders.status, "FAILED")));
            // ── 3. Upcoming events with ticket sales progress ──────────────────────
            const upcomingEventsRaw = await db_1.db
                .select({
                id: schema_1.events.id,
                name: schema_1.events.name,
                eventDate: schema_1.events.eventDate,
                imageUrl: schema_1.events.imageUrl,
                location: schema_1.events.location,
            })
                .from(schema_1.events)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.events.plannerId, plannerIdStr), (0, drizzle_orm_1.gte)(schema_1.events.eventDate, new Date())))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.events.eventDate))
                .limit(5);
            // Attach ticket progress to each upcoming event
            const upcomingEvents = await Promise.all(upcomingEventsRaw.map(async (event) => {
                const [progress] = await db_1.db
                    .select({
                    totalCapacity: (0, drizzle_orm_1.sql) `COALESCE(SUM(${eventTickets_1.eventTickets.quantity}::int), 0)`,
                    sold: (0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.orders.quantity}::int), 0)`,
                })
                    .from(eventTickets_1.eventTickets)
                    .leftJoin(schema_1.orders, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.ticketId, eventTickets_1.eventTickets.id), (0, drizzle_orm_1.eq)(schema_1.orders.status, "PAID")))
                    .where((0, drizzle_orm_1.eq)(eventTickets_1.eventTickets.eventId, event.id));
                const capacity = Number(progress?.totalCapacity ?? 0);
                const sold = Number(progress?.sold ?? 0);
                return {
                    ...event,
                    ticketProgress: {
                        sold,
                        capacity,
                        available: Math.max(capacity - sold, 0),
                        percentage: capacity > 0 ? Math.round((sold / capacity) * 100) : 0,
                    },
                };
            }));
            // ── 4. Best selling ticket type ────────────────────────────────────────
            const bestSellingTickets = await db_1.db
                .select({
                ticketId: eventTickets_1.eventTickets.id,
                label: eventTickets_1.eventTickets.label,
                eventName: schema_1.events.name,
                sold: (0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.orders.quantity}::int), 0)`,
                revenue: (0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.orders.totalAmount}::numeric), 0)`,
            })
                .from(schema_1.orders)
                .innerJoin(eventTickets_1.eventTickets, (0, drizzle_orm_1.eq)(eventTickets_1.eventTickets.id, schema_1.orders.ticketId))
                .innerJoin(schema_1.events, (0, drizzle_orm_1.eq)(schema_1.events.id, schema_1.orders.eventId))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.events.plannerId, plannerIdStr), (0, drizzle_orm_1.eq)(schema_1.orders.status, "PAID")))
                .groupBy(eventTickets_1.eventTickets.id, eventTickets_1.eventTickets.label, schema_1.events.name)
                .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `SUM(${schema_1.orders.quantity}::int)`))
                .limit(5);
            // ── 5. Attendee demographics (city breakdown via profile) ──────────────
            // Uses the orders → profiles join to get unique attendees per city
            const attendeeCities = await db_1.db
                .select({
                city: (0, drizzle_orm_1.sql) `COALESCE(${schema_1.user.phoneNumber}, 'Unknown')`,
                count: (0, drizzle_orm_1.sql) `COUNT(DISTINCT ${schema_1.orders.userId})`,
            })
                .from(schema_1.orders)
                .innerJoin(schema_1.events, (0, drizzle_orm_1.eq)(schema_1.events.id, schema_1.orders.eventId))
                .innerJoin(schema_1.user, (0, drizzle_orm_1.eq)(schema_1.user.id, schema_1.orders.userId))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.events.plannerId, plannerIdStr), (0, drizzle_orm_1.eq)(schema_1.orders.status, "PAID")))
                .groupBy(schema_1.user.phoneNumber)
                .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `COUNT(DISTINCT ${schema_1.orders.userId})`))
                .limit(6);
            // Gender / age not in schema yet — return total unique attendees instead
            const [uniqueAttendeesResult] = await db_1.db
                .select({
                count: (0, drizzle_orm_1.sql) `COUNT(DISTINCT ${schema_1.orders.userId})`,
            })
                .from(schema_1.orders)
                .innerJoin(schema_1.events, (0, drizzle_orm_1.eq)(schema_1.events.id, schema_1.orders.eventId))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.events.plannerId, plannerIdStr), (0, drizzle_orm_1.eq)(schema_1.orders.status, "PAID")));
            // ── 6. Wallet transaction history ──────────────────────────────────────
            const walletTxHistory = wallet?.id
                ? await db_1.db
                    .select({
                    id: transactions_1.walletTransactions.id,
                    type: transactions_1.walletTransactions.type,
                    source: transactions_1.walletTransactions.source,
                    amount: transactions_1.walletTransactions.amount,
                    balanceAfter: transactions_1.walletTransactions.balanceAfter,
                    narration: transactions_1.walletTransactions.narration,
                    createdAt: transactions_1.walletTransactions.createdAt,
                })
                    .from(transactions_1.walletTransactions)
                    .where((0, drizzle_orm_1.eq)(transactions_1.walletTransactions.walletId, wallet.id))
                    .orderBy((0, drizzle_orm_1.desc)(transactions_1.walletTransactions.createdAt))
                    .limit(10)
                : [];
            // ── 7. Recent activity (latest 5 paid orders) ──────────────────────────
            const recentActivity = await db_1.db
                .select({
                type: (0, drizzle_orm_1.sql) `'ticket_sold'`,
                message: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.user.firstName}, ' ', ${schema_1.user.lastName}, ' purchased ', ${schema_1.orders.quantity}, ' ticket(s) for ', ${schema_1.events.name})`,
                time: schema_1.orders.createdAt,
            })
                .from(schema_1.orders)
                .innerJoin(schema_1.events, (0, drizzle_orm_1.eq)(schema_1.events.id, schema_1.orders.eventId))
                .innerJoin(schema_1.user, (0, drizzle_orm_1.eq)(schema_1.user.id, schema_1.orders.userId))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.events.plannerId, plannerIdStr), (0, drizzle_orm_1.eq)(schema_1.orders.status, "PAID")))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.orders.createdAt))
                .limit(5);
            // ── 8. Ticket pie (sold vs available) ─────────────────────────────────
            const [ticketTotals] = await db_1.db
                .select({
                totalCapacity: (0, drizzle_orm_1.sql) `COALESCE(SUM(${eventTickets_1.eventTickets.quantity}::int), 0)`,
                sold: (0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.orders.quantity}::int), 0)`,
            })
                .from(eventTickets_1.eventTickets)
                .innerJoin(schema_1.events, (0, drizzle_orm_1.eq)(schema_1.events.id, eventTickets_1.eventTickets.eventId))
                .leftJoin(schema_1.orders, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.ticketId, eventTickets_1.eventTickets.id), (0, drizzle_orm_1.eq)(schema_1.orders.status, "PAID")))
                .where((0, drizzle_orm_1.eq)(schema_1.events.plannerId, plannerIdStr));
            const soldTotal = Number(ticketTotals?.sold ?? 0);
            const capacityTotal = Number(ticketTotals?.totalCapacity ?? 0);
            const availableTotal = Math.max(capacityTotal - soldTotal, 0);
            const ticketPieData = [
                { name: "Sold", value: soldTotal, color: "#FF6B35" },
                { name: "Available", value: availableTotal, color: "#FFB5A3" },
            ];
            // ── 9. Revenue per month (bar chart) ──────────────────────────────────
            const revenueMonthly = await db_1.db
                .select({
                month: (0, drizzle_orm_1.sql) `EXTRACT(MONTH FROM ${schema_1.orders.createdAt})`,
                revenue: (0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.orders.totalAmount}::numeric), 0)`,
            })
                .from(schema_1.orders)
                .innerJoin(schema_1.events, (0, drizzle_orm_1.eq)(schema_1.events.id, schema_1.orders.eventId))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.events.plannerId, plannerIdStr), (0, drizzle_orm_1.eq)(schema_1.orders.status, "PAID")))
                .groupBy((0, drizzle_orm_1.sql) `EXTRACT(MONTH FROM ${schema_1.orders.createdAt})`)
                .orderBy((0, drizzle_orm_1.asc)((0, drizzle_orm_1.sql) `EXTRACT(MONTH FROM ${schema_1.orders.createdAt})`));
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
        }
        catch (error) {
            console.error("Planner dashboard error:", error);
            return res
                .status(500)
                .json({ message: "Internal server error", error: error.message });
        }
    }
    // ── GET /dashboard/vendor/:vendorId ────────────────────────────────────────
    static async getVendorDashboard(req, res) {
        try {
            const { vendorId } = req.params;
            const vendorIdStr = Array.isArray(vendorId) ? vendorId[0] : vendorId;
            // ── 1. Vendor + wallet ─────────────────────────────────────────────────
            const [vendor] = await db_1.db
                .select({
                id: vendors_1.vendors.id,
                userid: vendors_1.vendors.userId,
                contactName: vendors_1.vendors.contactName,
                category: vendors_1.vendors.category,
                image: vendors_1.vendors.image,
                verified: vendors_1.vendors.verified,
                rating: vendors_1.vendors.rating,
            })
                .from(vendors_1.vendors)
                .where((0, drizzle_orm_1.eq)(vendors_1.vendors.id, vendorIdStr));
            if (!vendor) {
                return res.status(404).json({ message: "Vendor not found" });
            }
            const [wallet] = await db_1.db
                .select({ id: wallet_1.wallets.id, balance: wallet_1.wallets.balance })
                .from(wallet_1.wallets)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(wallet_1.wallets.userId, vendor.userid), (0, drizzle_orm_1.eq)(wallet_1.wallets.ownerType, "vendor")));
            // ── 2. Core metrics ────────────────────────────────────────────────────
            const [totalBookingsResult] = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `COUNT(*)` })
                .from(vendorBooking_1.vendorBookings)
                .where((0, drizzle_orm_1.eq)(vendorBooking_1.vendorBookings.vendorId, vendorIdStr));
            const [revenueResult] = await db_1.db
                .select({
                revenue: (0, drizzle_orm_1.sql) `COALESCE(SUM(${vendorBooking_1.vendorBookings.amount}), 0)`,
            })
                .from(vendorBooking_1.vendorBookings)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(vendorBooking_1.vendorBookings.vendorId, vendorIdStr), (0, drizzle_orm_1.eq)(vendorBooking_1.vendorBookings.status, "completed")));
            const [pendingResult] = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `COUNT(*)` })
                .from(vendorBooking_1.vendorBookings)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(vendorBooking_1.vendorBookings.vendorId, vendorIdStr), (0, drizzle_orm_1.eq)(vendorBooking_1.vendorBookings.status, "pending")));
            const [acceptedResult] = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `COUNT(*)` })
                .from(vendorBooking_1.vendorBookings)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(vendorBooking_1.vendorBookings.vendorId, vendorIdStr), (0, drizzle_orm_1.eq)(vendorBooking_1.vendorBookings.status, "accepted")));
            const [rejectedResult] = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `COUNT(*)` })
                .from(vendorBooking_1.vendorBookings)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(vendorBooking_1.vendorBookings.vendorId, vendorIdStr), (0, drizzle_orm_1.eq)(vendorBooking_1.vendorBookings.status, "rejected")));
            const [avgBookingValueResult] = await db_1.db
                .select({
                avg: (0, drizzle_orm_1.sql) `COALESCE(AVG(${vendorBooking_1.vendorBookings.amount}), 0)`,
            })
                .from(vendorBooking_1.vendorBookings)
                .where((0, drizzle_orm_1.eq)(vendorBooking_1.vendorBookings.vendorId, vendorIdStr));
            // Acceptance rate
            const totalReviewed = Number(acceptedResult.count ?? 0) + Number(rejectedResult.count ?? 0);
            const acceptanceRate = totalReviewed > 0
                ? Math.round((Number(acceptedResult.count) / totalReviewed) * 100)
                : 0;
            // ── 3. Customer retention (repeat vs new) ──────────────────────────────
            const clientBookingCounts = await db_1.db
                .select({
                userId: vendorBooking_1.vendorBookings.userId,
                count: (0, drizzle_orm_1.sql) `COUNT(*)`,
            })
                .from(vendorBooking_1.vendorBookings)
                .where((0, drizzle_orm_1.eq)(vendorBooking_1.vendorBookings.vendorId, vendorIdStr))
                .groupBy(vendorBooking_1.vendorBookings.userId);
            const repeatClients = clientBookingCounts.filter((c) => Number(c.count) > 1).length;
            const newClients = clientBookingCounts.filter((c) => Number(c.count) === 1).length;
            const totalClients = clientBookingCounts.length;
            // ── 4. Top performing services ─────────────────────────────────────────
            const topServices = await db_1.db
                .select({
                serviceId: vendorServices_1.vendorServices.id,
                serviceName: vendorServices_1.vendorServices.title,
                bookings: (0, drizzle_orm_1.sql) `COUNT(${vendorBooking_1.vendorBookings.id})`,
                revenue: (0, drizzle_orm_1.sql) `COALESCE(SUM(${vendorBooking_1.vendorBookings.amount}), 0)`,
            })
                .from(vendorBooking_1.vendorBookings)
                .innerJoin(vendorServices_1.vendorServices, (0, drizzle_orm_1.eq)(vendorServices_1.vendorServices.id, vendorBooking_1.vendorBookings.serviceId))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(vendorBooking_1.vendorBookings.vendorId, vendorIdStr), (0, drizzle_orm_1.not)((0, drizzle_orm_1.eq)(vendorBooking_1.vendorBookings.status, "rejected")), (0, drizzle_orm_1.not)((0, drizzle_orm_1.eq)(vendorBooking_1.vendorBookings.status, "cancelled"))))
                .groupBy(vendorServices_1.vendorServices.id, vendorServices_1.vendorServices.title)
                .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `SUM(${vendorBooking_1.vendorBookings.amount})`))
                .limit(5);
            // ── 5. Upcoming jobs with service + client name ────────────────────────
            const upcomingJobs = await db_1.db
                .select({
                id: vendorBooking_1.vendorBookings.id,
                serviceName: vendorServices_1.vendorServices.title,
                clientName: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.user.firstName}, ' ', ${schema_1.user.lastName})`,
                clientImage: schema_1.user.image,
                scheduledDate: vendorBooking_1.vendorBookings.scheduledDate,
                amount: vendorBooking_1.vendorBookings.amount,
                status: vendorBooking_1.vendorBookings.status,
                notes: vendorBooking_1.vendorBookings.notes,
            })
                .from(vendorBooking_1.vendorBookings)
                .leftJoin(vendorServices_1.vendorServices, (0, drizzle_orm_1.eq)(vendorServices_1.vendorServices.id, vendorBooking_1.vendorBookings.serviceId))
                .innerJoin(schema_1.user, (0, drizzle_orm_1.eq)(schema_1.user.id, vendorBooking_1.vendorBookings.userId))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(vendorBooking_1.vendorBookings.vendorId, vendorIdStr), (0, drizzle_orm_1.gte)(vendorBooking_1.vendorBookings.scheduledDate, new Date()), (0, drizzle_orm_1.not)((0, drizzle_orm_1.eq)(vendorBooking_1.vendorBookings.status, "cancelled")), (0, drizzle_orm_1.not)((0, drizzle_orm_1.eq)(vendorBooking_1.vendorBookings.status, "rejected"))))
                .orderBy((0, drizzle_orm_1.asc)(vendorBooking_1.vendorBookings.scheduledDate))
                .limit(5);
            // ── 6. Wallet transaction history ──────────────────────────────────────
            const walletTxHistory = wallet?.id
                ? await db_1.db
                    .select({
                    id: transactions_1.walletTransactions.id,
                    type: transactions_1.walletTransactions.type,
                    source: transactions_1.walletTransactions.source,
                    amount: transactions_1.walletTransactions.amount,
                    balanceAfter: transactions_1.walletTransactions.balanceAfter,
                    narration: transactions_1.walletTransactions.narration,
                    createdAt: transactions_1.walletTransactions.createdAt,
                })
                    .from(transactions_1.walletTransactions)
                    .where((0, drizzle_orm_1.eq)(transactions_1.walletTransactions.walletId, wallet.id))
                    .orderBy((0, drizzle_orm_1.desc)(transactions_1.walletTransactions.createdAt))
                    .limit(10)
                : [];
            // ── 7. Recent activity ─────────────────────────────────────────────────
            const recentActivity = await db_1.db
                .select({
                type: (0, drizzle_orm_1.sql) `${vendorBooking_1.vendorBookings.status}`,
                message: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.user.firstName}, ' ', ${schema_1.user.lastName}, ' booked ', COALESCE(${vendorServices_1.vendorServices.title}, 'a service'))`,
                time: vendorBooking_1.vendorBookings.createdAt,
                status: vendorBooking_1.vendorBookings.status,
            })
                .from(vendorBooking_1.vendorBookings)
                .leftJoin(vendorServices_1.vendorServices, (0, drizzle_orm_1.eq)(vendorServices_1.vendorServices.id, vendorBooking_1.vendorBookings.serviceId))
                .innerJoin(schema_1.user, (0, drizzle_orm_1.eq)(schema_1.user.id, vendorBooking_1.vendorBookings.userId))
                .where((0, drizzle_orm_1.eq)(vendorBooking_1.vendorBookings.vendorId, vendorIdStr))
                .orderBy((0, drizzle_orm_1.desc)(vendorBooking_1.vendorBookings.createdAt))
                .limit(5);
            // ── 8. Booking status pie ──────────────────────────────────────────────
            const statusStats = await db_1.db
                .select({
                status: vendorBooking_1.vendorBookings.status,
                count: (0, drizzle_orm_1.sql) `COUNT(*)`,
            })
                .from(vendorBooking_1.vendorBookings)
                .where((0, drizzle_orm_1.eq)(vendorBooking_1.vendorBookings.vendorId, vendorIdStr))
                .groupBy(vendorBooking_1.vendorBookings.status);
            const bookingPieData = [
                {
                    name: "Completed",
                    value: Number(statusStats.find((s) => s.status === "completed")?.count ?? 0),
                    color: "#22C55E",
                },
                {
                    name: "Pending",
                    value: Number(statusStats.find((s) => s.status === "pending")?.count ?? 0),
                    color: "#F59E0B",
                },
                {
                    name: "Accepted",
                    value: Number(statusStats.find((s) => s.status === "accepted")?.count ?? 0),
                    color: "#3B82F6",
                },
                {
                    name: "Cancelled",
                    value: Number(statusStats.find((s) => s.status === "cancelled")?.count ?? 0),
                    color: "#EF4444",
                },
                {
                    name: "Rejected",
                    value: Number(statusStats.find((s) => s.status === "rejected")?.count ?? 0),
                    color: "#9CA3AF",
                },
            ];
            // ── 9. Revenue per month ───────────────────────────────────────────────
            const revenueMonthly = await db_1.db
                .select({
                month: (0, drizzle_orm_1.sql) `EXTRACT(MONTH FROM ${vendorBooking_1.vendorBookings.createdAt})`,
                revenue: (0, drizzle_orm_1.sql) `COALESCE(SUM(${vendorBooking_1.vendorBookings.amount}), 0)`,
            })
                .from(vendorBooking_1.vendorBookings)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(vendorBooking_1.vendorBookings.vendorId, vendorIdStr), (0, drizzle_orm_1.eq)(vendorBooking_1.vendorBookings.status, "completed")))
                .groupBy((0, drizzle_orm_1.sql) `EXTRACT(MONTH FROM ${vendorBooking_1.vendorBookings.createdAt})`)
                .orderBy((0, drizzle_orm_1.asc)((0, drizzle_orm_1.sql) `EXTRACT(MONTH FROM ${vendorBooking_1.vendorBookings.createdAt})`));
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
                    retentionRate: totalClients > 0
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
        }
        catch (error) {
            console.error("Vendor dashboard error:", error);
            return res.status(500).json({
                message: "Failed to load vendor dashboard",
                error: error.message,
            });
        }
    }
}
exports.DashboardController = DashboardController;
