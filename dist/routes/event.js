"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/event.route.ts
const express_1 = require("express");
const upload_1 = require("../middlewares/upload");
const event_1 = require("../controllers/event");
const verify_1 = require("../middlewares/verify");
const router = (0, express_1.Router)();
// Accepts body + image file
router.post("/", upload_1.upload.single("image"), verify_1.verifySupabaseToken, event_1.EventController.createEvent);
router.patch("/:eventId", upload_1.upload.single("image"), verify_1.verifySupabaseToken, event_1.EventController.updateEvent);
// New routes
router.get("/", verify_1.verifySupabaseToken, event_1.EventController.getAllEvents);
// ⭐️ GET SINGLE EVENT + TICKETS
router.get("/:eventId", verify_1.verifySupabaseToken, event_1.EventController.getEventById);
router.get("/planner/:plannerId", verify_1.verifySupabaseToken, event_1.EventController.getEventsByPlanner);
exports.default = router;
