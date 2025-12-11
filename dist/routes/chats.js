"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const chat_1 = require("../controllers/chat");
const verify_1 = require("../middlewares/verify");
const router = express_1.default.Router();
/* -------------------------
   CHAT LIST
-------------------------- */
// Get all chats user belongs to
router.get("/", verify_1.verifySupabaseToken, chat_1.ChatController.getMyChats);
/* -------------------------
   CHAT MESSAGES
-------------------------- */
// Fetch all messages in a chat
router.get("/:chatId/messages", verify_1.verifySupabaseToken, chat_1.ChatController.getChatMessages);
// Send message
router.post("/send", verify_1.verifySupabaseToken, chat_1.ChatController.sendMessage);
// Mark message as read
router.post("/read", verify_1.verifySupabaseToken, chat_1.ChatController.markAsRead);
/* -------------------------
   ADMIN CONTROLS
-------------------------- */
// Add a user to group
router.post("/add-member", verify_1.verifySupabaseToken, chat_1.ChatController.addMember);
// Remove a user
router.delete("/remove-member", verify_1.verifySupabaseToken, chat_1.ChatController.removeMember);
// Promote to admin
router.post("/promote", verify_1.verifySupabaseToken, chat_1.ChatController.promoteToAdmin);
exports.default = router;
