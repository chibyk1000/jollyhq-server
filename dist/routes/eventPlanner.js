"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verify_1 = require("../middlewares/verify");
const upload_1 = require("../middlewares/upload");
const eventPlanner_1 = require("../controllers/eventPlanner");
const dashboard_1 = require("../controllers/dashboard");
const router = (0, express_1.Router)();
router.post("/", verify_1.verifySupabaseToken, upload_1.upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "idDocument", maxCount: 1 },
    { name: "businessDocument", maxCount: 1 },
]), eventPlanner_1.EventPlannerControllers.createEventPlanner);
// READ
router.get("/", verify_1.verifySupabaseToken, eventPlanner_1.EventPlannerControllers.getEventPlanners);
router.get("/dashboard/:plannerId", verify_1.verifySupabaseToken, dashboard_1.DashboardController.getEventPlannerDashboard);
router.get("/:id", eventPlanner_1.EventPlannerControllers.getEventPlanner);
// UPDATE
router.patch("/:id", verify_1.verifySupabaseToken, upload_1.upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "idDocument", maxCount: 1 },
    { name: "businessDocument", maxCount: 1 },
]), eventPlanner_1.EventPlannerControllers.updateEventPlanner);
// DELETE
router.delete("/:id", verify_1.verifySupabaseToken, eventPlanner_1.EventPlannerControllers.deleteEventPlanner);
exports.default = router;
