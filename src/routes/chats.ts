import express from "express";
import { ChatController } from "../controllers/chat";
import { verifyToken } from "../middlewares/verify";

const router = express.Router();

/* -------------------------
   CHAT LIST
-------------------------- */

// Get all chats user belongs to
router.get("/", verifyToken, ChatController.getMyChats);

// Get single chat by ID
router.post("/direct", verifyToken, ChatController.findOrCreateDirectChat)
router.get("/:chatId", verifyToken, ChatController.getChatById);
/* -------------------------
   CHAT MESSAGES
-------------------------- */

// Fetch all messages in a chat
router.get("/:chatId/messages", verifyToken, ChatController.getChatMessages);

// Send message
router.post("/send", verifyToken, ChatController.sendMessage);

// Mark message as read
router.post("/read", verifyToken, ChatController.markAsRead);

/* -------------------------
   ADMIN CONTROLS
-------------------------- */

// Add a user to group
router.post("/add-member", verifyToken, ChatController.addMember);

// Remove a user
router.delete("/remove-member", verifyToken, ChatController.removeMember);

// Promote to admin
router.post("/promote", verifyToken, ChatController.promoteToAdmin);

export default router;
