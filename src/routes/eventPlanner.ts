import { Router } from "express";
import { UserControllers } from "../controllers/users";
import { verifySupabaseToken } from "../middlewares/verify";
import { upload } from "../middlewares/upload";
import { EventPlannerControllers } from "../controllers/eventPlanner";
import { DashboardController } from "../controllers/dashboard";

const router = Router() 
router.post(
  "/",
  verifySupabaseToken,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "idDocument", maxCount: 1 },
    { name: "businessDocument", maxCount: 1 },
  ]),
  EventPlannerControllers.createEventPlanner
);

// READ
router.get("/", verifySupabaseToken, EventPlannerControllers.getEventPlanners);
router.get(
  "/dashboard/:plannerId",
  verifySupabaseToken,
  DashboardController.getEventPlannerDashboard
);
router.get("/:id", EventPlannerControllers.getEventPlanner);

// UPDATE
router.patch(
  "/:id", 
  verifySupabaseToken,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "idDocument", maxCount: 1 },
    { name: "businessDocument", maxCount: 1 },
  ]),
  EventPlannerControllers.updateEventPlanner
);

// DELETE
router.delete(
  "/:id",
  verifySupabaseToken,
  EventPlannerControllers.deleteEventPlanner
);
export default router