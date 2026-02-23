"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const users_1 = require("../controllers/users");
const verify_1 = require("../middlewares/verify");
const upload_1 = require("../middlewares/upload");
const trending_1 = require("../controllers/trending");
const favorites_1 = require("../controllers/favorites");
const tickets_1 = require("../controllers/tickets");
const router = (0, express_1.Router)();
router.post(
  "/",
  verify_1.verifyToken,
  upload_1.upload.single("avatar"),
  users_1.UserControllers.createUser,
);
router.get(
  "/events/trending",
  trending_1.TrendingEventsController.getTrendingEvents,
);
router.get(
  "/events/favorites/",
  verify_1.verifyToken,
  favorites_1.FavoriteController.getFavorites,
);
router.get(
  "/events/tickets",
  verify_1.verifyToken,
  tickets_1.TicketController.getTicketsByUser,
);
router.post(
  "/favorites/:eventId/",
  verify_1.verifyToken,
  favorites_1.FavoriteController.toggleFavorite,
);
router.get("/:id", verify_1.verifyToken, users_1.UserControllers.getProfile);
router.put(
  "/:id",
  upload_1.upload.single("avatar"),
  users_1.UserControllers.updateProfile,
);
exports.default = router;
