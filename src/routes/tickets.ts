import { Router } from "express";
import { TicketController } from "../controllers/tickets";
import { verifyToken } from "../middlewares/verify";

const router = Router();

// Create 1 or many
router.post("/", verifyToken, TicketController.createTicket);

// List tickets of an event
router.get("/event/:eventId", verifyToken, TicketController.getTicketsByEvent);

// Get single ticket
router.get("/:ticketId", verifyToken, TicketController.getTicket);

// Update
router.put("/:ticketId", verifyToken, TicketController.updateTicket);

// Delete
router.delete("/:ticketId", verifyToken, TicketController.deleteTicket);

export default router;
