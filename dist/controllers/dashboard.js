"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const wallet_1 = require("../db/schema/wallet");
const userTickets_1 = require("../db/schema/userTickets");
const eventTickets_1 = require("../db/schema/eventTickets");
class DashboardController {
    // GET /dashboard/:plannerId
    static async getEventPlannerDashboard(req, res) {
        try {
            const { plannerId } = req.params;
            // 1️⃣ Fetch Event Planner + Wallet
            const [planner] = await db_1.db
                .select({
                id: schema_1.eventPlanners.id,
                businessName: schema_1.eventPlanners.businessName,
                logoUrl: schema_1.eventPlanners.logoUrl,
                isVerified: schema_1.eventPlanners.isVerified,
            })
                .from(schema_1.eventPlanners)
                .where((0, drizzle_orm_1.eq)(schema_1.eventPlanners.id, plannerId));
            if (!planner) {
                return res.status(404).json({ message: "Event planner not found" });
            }
            const [wallet] = await db_1.db
                .select({ balance: wallet_1.wallets.balance })
                .from(wallet_1.wallets)
                .where((0, drizzle_orm_1.eq)(wallet_1.wallets.ownerId, plannerId));
            // 2️⃣ Metrics
            const [ticketsSoldResult] = await db_1.db
                .select({ total: (0, drizzle_orm_1.sql) `SUM(${userTickets_1.userTickets.quantity})` })
                .from(userTickets_1.userTickets)
                .innerJoin(eventTickets_1.eventTickets, (0, drizzle_orm_1.eq)(eventTickets_1.eventTickets.id, userTickets_1.userTickets.ticketId))
                .innerJoin(schema_1.events, (0, drizzle_orm_1.eq)(schema_1.events.id, eventTickets_1.eventTickets.eventId))
                .where((0, drizzle_orm_1.eq)(schema_1.events.plannerId, plannerId));
            const [revenueResult] = await db_1.db
                .select({
                revenue: (0, drizzle_orm_1.sql) `SUM(${eventTickets_1.eventTickets.price} * ${userTickets_1.userTickets.quantity})`,
            })
                .from(userTickets_1.userTickets)
                .innerJoin(eventTickets_1.eventTickets, (0, drizzle_orm_1.eq)(eventTickets_1.eventTickets.id, userTickets_1.userTickets.ticketId))
                .innerJoin(schema_1.events, (0, drizzle_orm_1.eq)(schema_1.events.id, eventTickets_1.eventTickets.eventId))
                .where((0, drizzle_orm_1.eq)(schema_1.events.plannerId, plannerId));
            const [totalEvents] = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `COUNT(*)` })
                .from(schema_1.events)
                .where((0, drizzle_orm_1.eq)(schema_1.events.plannerId, plannerId));
            const totalAttendeesResult = ticketsSoldResult;
            // 3️⃣ Upcoming Events (next 5)
            const upcomingEvents = await db_1.db
                .select({
                id: schema_1.events.id,
                name: schema_1.events.name,
                eventDate: schema_1.events.eventDate,
            })
                .from(schema_1.events)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.events.plannerId, plannerId), (0, drizzle_orm_1.gte)(schema_1.events.eventDate, new Date())))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.events.eventDate))
                .limit(5);
            // 4️⃣ Recent Activity (latest 5 tickets sold)
            const recentActivity = await db_1.db
                .select({
                type: (0, drizzle_orm_1.sql) `'ticket_sold'`,
                message: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.profiles.firstName}, ' ', ${schema_1.profiles.lastName}, ' purchased ', ${userTickets_1.userTickets.quantity}, ' tickets for ', ${schema_1.events.name})`,
                time: userTickets_1.userTickets.purchasedAt,
            })
                .from(userTickets_1.userTickets)
                .innerJoin(eventTickets_1.eventTickets, (0, drizzle_orm_1.eq)(eventTickets_1.eventTickets.id, userTickets_1.userTickets.ticketId))
                .innerJoin(schema_1.events, (0, drizzle_orm_1.eq)(schema_1.events.id, eventTickets_1.eventTickets.eventId))
                .innerJoin(schema_1.profiles, (0, drizzle_orm_1.eq)(schema_1.profiles.id, userTickets_1.userTickets.userId)) // <- user
                .where((0, drizzle_orm_1.eq)(schema_1.events.plannerId, plannerId))
                .orderBy((0, drizzle_orm_1.desc)(userTickets_1.userTickets.purchasedAt))
                .limit(5);
            // 5️⃣ Ticket sales breakdown (Pie Chart)
            const ticketSalesArray = await db_1.db
                .select({
                sold: (0, drizzle_orm_1.sql) `SUM(${userTickets_1.userTickets.quantity})`,
                total: (0, drizzle_orm_1.sql) `SUM(${eventTickets_1.eventTickets.quantity})`,
            })
                .from(eventTickets_1.eventTickets)
                .leftJoin(userTickets_1.userTickets, (0, drizzle_orm_1.eq)(userTickets_1.userTickets.ticketId, eventTickets_1.eventTickets.id))
                .innerJoin(schema_1.events, (0, drizzle_orm_1.eq)(eventTickets_1.eventTickets.eventId, schema_1.events.id))
                .where((0, drizzle_orm_1.eq)(schema_1.events.plannerId, plannerId));
            const ticketSales = ticketSalesArray[0];
            const sold = Number(ticketSales?.sold || 0);
            const totalTickets = Number(ticketSales?.total || 0);
            const available = totalTickets - sold;
            const fullyBooked = 0;
            const ticketPieData = [
                { name: "Sold", value: sold, color: "#FF6B35" },
                { name: "Available", value: available, color: "#FFB5A3" },
                { name: "Fully Booked", value: fullyBooked, color: "#8B5A3C" },
            ];
            // 6️⃣ Revenue per month (Bar Chart)
            const revenueMonthly = await db_1.db
                .select({
                month: (0, drizzle_orm_1.sql) `EXTRACT(MONTH FROM ${userTickets_1.userTickets.purchasedAt})`,
                revenue: (0, drizzle_orm_1.sql) `SUM(${eventTickets_1.eventTickets.price} * ${userTickets_1.userTickets.quantity})`,
            })
                .from(userTickets_1.userTickets)
                .innerJoin(eventTickets_1.eventTickets, (0, drizzle_orm_1.eq)(eventTickets_1.eventTickets.id, userTickets_1.userTickets.ticketId))
                .innerJoin(schema_1.events, (0, drizzle_orm_1.eq)(schema_1.events.id, eventTickets_1.eventTickets.eventId))
                .where((0, drizzle_orm_1.eq)(schema_1.events.plannerId, plannerId))
                .groupBy((0, drizzle_orm_1.sql) `EXTRACT(MONTH FROM ${userTickets_1.userTickets.purchasedAt})`)
                .orderBy((0, drizzle_orm_1.asc)((0, drizzle_orm_1.sql) `EXTRACT(MONTH FROM ${userTickets_1.userTickets.purchasedAt})`));
            const months = [
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
            const revenueChartData = months.map((name, index) => {
                const monthData = revenueMonthly.find((r) => Number(r.month) === index + 1);
                return {
                    month: name,
                    revenue: Number(monthData?.revenue || 0),
                    target: 0,
                };
            });
            // 5️⃣ Prepare dashboard data
            const dashboardData = {
                planner: {
                    ...planner,
                    wallet: { balance: wallet?.balance || 0 },
                },
                metrics: {
                    ticketsSold: Number(ticketsSoldResult.total || 0),
                    revenue: Number(revenueResult.revenue || 0),
                    totalEvents: Number(totalEvents.count || 0),
                    totalAttendees: Number(totalAttendeesResult.total || 0),
                },
                upcomingEvents,
                recentActivity,
                ticketPieData,
                revenueChartData,
            };
            res.json(dashboardData);
        }
        catch (error) {
            console.error(error);
            res
                .status(500)
                .json({ message: "Internal server error", error: error.message });
        }
    }
}
exports.DashboardController = DashboardController;
