"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tickets_1 = require("../controllers/tickets");
const verify_1 = require("../middlewares/verify");
const router = (0, express_1.Router)();
// Create 1 or many
router.post("/", verify_1.verifySupabaseToken, tickets_1.TicketController.createTicket);
// List tickets of an event
router.get("/event/:eventId", verify_1.verifySupabaseToken, tickets_1.TicketController.getTicketsByEvent);
// Get single ticket
router.get("/:ticketId", verify_1.verifySupabaseToken, tickets_1.TicketController.getTicket);
// Update
router.put("/:ticketId", verify_1.verifySupabaseToken, tickets_1.TicketController.updateTicket);
// Delete
router.delete("/:ticketId", verify_1.verifySupabaseToken, tickets_1.TicketController.deleteTicket);
exports.default = router;
