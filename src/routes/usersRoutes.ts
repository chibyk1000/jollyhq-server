import { Router } from "express";
import { UserControllers } from "../controllers/users";
import { verifySupabaseToken } from "../middlewares/verify";
import { upload } from "../middlewares/upload";
import { TrendingEventsController } from "../controllers/trending";
import { FavoriteController } from "../controllers/favorites";
import { TicketController } from "../controllers/tickets";

const router = Router()
router.post("/", verifySupabaseToken, upload.single("avatar"), UserControllers.createUser)
router.get("/events/trending",  TrendingEventsController.getTrendingEvents)
router.get("/events/favorites/", verifySupabaseToken,  FavoriteController.getFavorites)
router.get("/events/tickets", verifySupabaseToken, TicketController.getTicketsByUser)
router.post("/favorites/:eventId/", verifySupabaseToken, FavoriteController.toggleFavorite);

router.get("/:id", verifySupabaseToken,  UserControllers.getProfile)
export default router