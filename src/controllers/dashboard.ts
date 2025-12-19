import { Request, Response } from "express";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../db";
import { eventPlanners, events } from "../db/schema";
import { wallets } from "../db/schema/wallet";
import { userTickets } from "../db/schema/userTickets";
import { eventTickets } from "../db/schema/eventTickets";


export class DashboardController {
  // GET /dashboard/:plannerId
  static async getEventPlannerDashboard(req: Request, res: Response) {
    try {
      const { plannerId } = req.params;

      // 1️⃣ Fetch Event Planner + Wallet
      const planner = await db
        .select({
          id: eventPlanners.id,
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
        .select({ balance: wallets.balance })
        .from(wallets)
        .where(eq(wallets.ownerId, plannerId));

      // 2️⃣ Metrics
      const [ticketsSoldResult] = await db
        .select({ total: sql`SUM(${userTickets.quantity})` })
        .from(userTickets)
        .innerJoin(eventTickets, eq(eventTickets.id, userTickets.ticketId))
        .innerJoin(events, eq(events.id, eventTickets.eventId))
        .where(eq(events.plannerId, plannerId));

      const [revenueResult] = await db
        .select({
          revenue: sql`SUM(${eventTickets.price} * ${userTickets.quantity})`,
        })
        .from(userTickets)
        .innerJoin(eventTickets, eq(eventTickets.id, userTickets.ticketId))
        .innerJoin(events, eq(events.id, eventTickets.eventId))
        .where(eq(events.plannerId, plannerId));

      const [totalEvents] = await db
        .select({ count: sql`COUNT(*)` })
        .from(events)
        .where(eq(events.plannerId, plannerId));

      const totalAttendeesResult = ticketsSoldResult;

      // 3️⃣ Upcoming Events (next 5)
     const [upcomingEvents] = await db
       .select({
         id: events.id,
         name: events.name,
         eventDate: events.eventDate,
       })
       .from(events)
       .where(
         and(eq(events.plannerId, plannerId), gte(events.eventDate, new Date()))
       )
       .orderBy(asc(events.eventDate))
       .limit(5)
     

      // 4️⃣ Recent Activity (latest 5 tickets sold)
      const [recentActivity] = await db
        .select({
          type: sql`'ticket_sold'`,
          message: sql`CONCAT(pq.name, ' purchased ', ut.quantity, ' tickets for ', e.name)`,
          time: userTickets.purchasedAt,
        })
        .from(userTickets)
        .innerJoin(eventTickets, eq(eventTickets.id, userTickets.ticketId))
        .innerJoin(events, eq(events.id, eventTickets.eventId))
        .innerJoin(eventPlanners, eq(eventPlanners.id, events.plannerId))
        .innerJoin(wallets, eq(wallets.ownerId, eventPlanners.id)) // optional for more info
        .where(eq(eventPlanners.id, plannerId))
        .orderBy(desc(userTickets.purchasedAt))
        .limit(5);
      // 5️⃣ Ticket sales breakdown (Pie Chart)
      const ticketSalesArray = await db
        .select({
          sold: sql`SUM(ut.quantity)`,
          total: sql`SUM(et.quantity)`,
        })
        .from(eventTickets as any)
        .leftJoin(userTickets as any, eq(eventTickets.id, userTickets.ticketId))
        .innerJoin(events as any, eq(eventTickets.eventId, events.id))
        .where(eq(events.plannerId, plannerId))
       
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
      const revenueMonthly = await db
        .select({
          month: sql`EXTRACT(MONTH FROM ${userTickets.purchasedAt})`,
          revenue: sql`SUM(${eventTickets.price} * ${userTickets.quantity})`,
        })
        .from(userTickets)
        .innerJoin(eventTickets, eq(eventTickets.id, userTickets.ticketId))
        .innerJoin(events, eq(events.id, eventTickets.eventId))
        .where(eq(events.plannerId, plannerId))
        .groupBy(sql`EXTRACT(MONTH FROM ${userTickets.purchasedAt})`)
        .orderBy(asc(sql`EXTRACT(MONTH FROM ${userTickets.purchasedAt})`))
      ;

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
        const monthData = revenueMonthly.find(
          (r) => Number(r.month) === index + 1
        );
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
    } catch (error: any) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }
}
