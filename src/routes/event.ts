// src/routes/event.route.ts
import { Router } from "express";
import { upload } from "../middlewares/upload";
import { EventController } from "../controllers/event";
import { verifyToken } from "../middlewares/verify";

const router = Router();

// Accepts body + image file
router.post(
  "/",
  upload.single("image"),
  verifyToken,
  EventController.createEvent,
);
router.patch(
  "/:eventId",
  upload.single("image"),
  verifyToken,
  EventController.updateEvent,
);

// New routes
router.get("/", verifyToken, EventController.getAllEvents);
// ⭐️ GET SINGLE EVENT + TICKETS
router.get("/:eventId/overview", verifyToken, EventController.getEventOverview);
router.get("/:eventId", verifyToken, EventController.getEventById);

router.get(
  "/planner/:plannerId",
  verifyToken,
  EventController.getEventsByPlanner,
);

export default router;
