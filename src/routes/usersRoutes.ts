import { Router } from "express";
import { UserControllers } from "../controllers/users";
import { verifyToken } from "../middlewares/verify";
import { upload } from "../middlewares/upload";
import { TrendingEventsController } from "../controllers/trending";
import { FavoriteController } from "../controllers/favorites";
import { TicketController } from "../controllers/tickets";

const router = Router();
router.post(
  "/",
  verifyToken,
  upload.single("avatar"),
  UserControllers.createUser,
);
router.get("/events/trending", TrendingEventsController.getTrendingEvents);
router.get("/events/favorites/", verifyToken, FavoriteController.getFavorites);
router.get("/wallets", verifyToken, UserControllers.getMyWallet);
router.get("/events/tickets", verifyToken, TicketController.getTicketsByUser);
router.post(
  "/favorites/:eventId/",
  verifyToken,
  FavoriteController.toggleFavorite,
);

router.get("/:id", verifyToken, UserControllers.getProfile);
router.put("/:id", upload.single("avatar"), UserControllers.updateProfile);

export default router;
