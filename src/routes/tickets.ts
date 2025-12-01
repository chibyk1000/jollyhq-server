import { Router } from "express";
import { TicketController } from "../controllers/tickets";
import { verifySupabaseToken } from "../middlewares/verify";


const router = Router();

// Create 1 or many
router.post("/", verifySupabaseToken,  TicketController.createTicket);

// List tickets of an event
router.get("/event/:eventId",  verifySupabaseToken, TicketController.getTicketsByEvent);

// Get single ticket
router.get("/:ticketId", verifySupabaseToken,  TicketController.getTicket);

// Update
router.put("/:ticketId", verifySupabaseToken,  TicketController.updateTicket);

// Delete
router.delete("/:ticketId", verifySupabaseToken,  TicketController.deleteTicket);

export default router;
