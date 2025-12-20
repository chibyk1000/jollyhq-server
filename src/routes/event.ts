// src/routes/event.route.ts
import { Router } from "express";
import { upload } from "../middlewares/upload";
import { EventController } from "../controllers/event";
import { verifySupabaseToken } from "../middlewares/verify";


const router = Router();

// Accepts body + image file
router.post("/", upload.single("image"), verifySupabaseToken, EventController.createEvent);
router.patch("/:eventId", upload.single("image"), verifySupabaseToken, EventController.updateEvent);

// New routes
router.get("/", verifySupabaseToken, EventController.getAllEvents);
// ⭐️ GET SINGLE EVENT + TICKETS
router.get(
  "/:eventId/overview",
  verifySupabaseToken,
  EventController.getEventOverview
);
router.get(
  "/:eventId",
  verifySupabaseToken,
  EventController.getEventById
);

router.get("/planner/:plannerId",verifySupabaseToken, EventController.getEventsByPlanner);

export default router;  
