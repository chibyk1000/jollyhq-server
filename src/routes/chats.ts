import express from "express";
import { ChatController } from "../controllers/chat";
import { verifySupabaseToken } from "../middlewares/verify";


const router = express.Router();

/* -------------------------
   CHAT LIST
-------------------------- */

// Get all chats user belongs to
router.get("/", verifySupabaseToken, ChatController.getMyChats);

/* -------------------------
   CHAT MESSAGES
-------------------------- */

// Fetch all messages in a chat
router.get("/:chatId/messages", verifySupabaseToken, ChatController.getChatMessages);

// Send message
router.post("/send", verifySupabaseToken, ChatController.sendMessage);

// Mark message as read
router.post("/read", verifySupabaseToken, ChatController.markAsRead);

/* -------------------------
   ADMIN CONTROLS
-------------------------- */

// Add a user to group
router.post("/add-member", verifySupabaseToken, ChatController.addMember);

// Remove a user
router.delete("/remove-member", verifySupabaseToken, ChatController.removeMember);

// Promote to admin
router.post("/promote", verifySupabaseToken, ChatController.promoteToAdmin);

export default router;
