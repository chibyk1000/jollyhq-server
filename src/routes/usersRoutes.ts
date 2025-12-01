import { Router } from "express";
import { UserControllers } from "../controllers/users";
import { verifySupabaseToken } from "../middlewares/verify";
import { upload } from "../middlewares/upload";
import { TrendingEventsController } from "../controllers/trending";
import { FavoriteController } from "../controllers/favorites";

const router = Router()
router.post("/", verifySupabaseToken, upload.single("avatar"), UserControllers.createUser)
router.get("/events/trending", verifySupabaseToken,  TrendingEventsController.getTrendingEvents)
router.get("events/favorites/", verifySupabaseToken,  FavoriteController.getFavorites)
router.post("events/favorites/", verifySupabaseToken,  FavoriteController.addFavorite)
router.delete("events/favorites/", verifySupabaseToken,  FavoriteController.addFavorite)
router.get("/:id", verifySupabaseToken,  UserControllers.getProfile)
export default router