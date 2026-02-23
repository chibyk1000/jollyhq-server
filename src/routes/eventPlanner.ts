import { Router } from "express";
import { UserControllers } from "../controllers/users";
import { verifyToken } from "../middlewares/verify";
import { upload } from "../middlewares/upload";
import { EventPlannerControllers } from "../controllers/eventPlanner";
import { DashboardController } from "../controllers/dashboard";

const router = Router();
router.post(
  "/",
  verifyToken,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "idDocument", maxCount: 1 },
    { name: "businessDocument", maxCount: 1 },
  ]),
  EventPlannerControllers.createEventPlanner,
);

// READ
router.get("/", verifyToken, EventPlannerControllers.getEventPlanners);
router.get(
  "/dashboard/:plannerId",
  verifyToken,
  DashboardController.getEventPlannerDashboard,
);
router.get("/:id", EventPlannerControllers.getEventPlanner);

// UPDATE
router.patch(
  "/:id",
  verifyToken,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "idDocument", maxCount: 1 },
    { name: "businessDocument", maxCount: 1 },
  ]),
  EventPlannerControllers.updateEventPlanner,
);

// DELETE
router.delete("/:id", verifyToken, EventPlannerControllers.deleteEventPlanner);
export default router;
