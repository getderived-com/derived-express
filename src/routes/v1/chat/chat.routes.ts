import { Router } from "express";
import { validate } from "../../../shared/middlewares/validation.middleware";
import { ChatController } from "./chat.controller";
import {
  sendMessageSchema,
  createConversationSchema,
  updateConversationSchema,
  updateMessageSchema,
  conversationFiltersSchema,
  messageFiltersSchema,
  conversationIdParamSchema,
  messageIdParamSchema,
  addUserToConversationSchema,
  removeUserFromConversationSchema,
  aiSDKSchema
} from "./chat.validation";

const chatRouter: Router = Router();
const chatController = new ChatController();

// GET /api/chat/models - Get supported AI models
chatRouter.get("/models", chatController.getModels);

// Message endpoints
// POST /api/chat/send - Send message to AI
chatRouter.post("/send", validate({
  body: sendMessageSchema
}), chatController.sendMessage);

// POST /api/chat/ai-sdk - AI SDK compatible streaming endpoint
chatRouter.post("/ai-sdk", validate({
  body: aiSDKSchema
}), chatController.sendMessageAISDK);

// GET /api/chat/messages/:id - Get conversation messages
chatRouter.get("/messages/:id", validate({
  params: conversationIdParamSchema,
  query: messageFiltersSchema
}), chatController.getMessages);

// GET /api/chat/messages - Get recent messages (without conversation ID)
chatRouter.get("/messages", validate({
  query: messageFiltersSchema
}), chatController.getRecentMessages);

// GET /api/chat/messages/:id/single - Get single message by ID
chatRouter.get("/messages/:id/single", validate({
  params: messageIdParamSchema
}), chatController.getMessageById);

// PUT /api/chat/messages/:id - Update message
chatRouter.put("/messages/:id", validate({
  params: messageIdParamSchema,
  body: updateMessageSchema
}), chatController.updateMessage);

// DELETE /api/chat/messages/:id - Delete message
chatRouter.delete("/messages/:id", validate({
  params: messageIdParamSchema
}), chatController.deleteMessage);

// Conversation endpoints
// POST /api/chat/conversations - Create new conversation
chatRouter.post("/conversations", validate({
  body: createConversationSchema
}), chatController.createConversation);

// GET /api/chat/conversations - List conversations
chatRouter.get("/conversations", validate({
  query: conversationFiltersSchema
}), chatController.getConversations);

// GET /api/chat/conversations/:id - Get conversation by ID
chatRouter.get("/conversations/:id", validate({
  params: conversationIdParamSchema
}), chatController.getConversationById);

// PUT /api/chat/conversations/:id - Update conversation
chatRouter.put("/conversations/:id", validate({
  params: conversationIdParamSchema,
  body: updateConversationSchema
}), chatController.updateConversation);

// DELETE /api/chat/conversations/:id - Delete conversation
chatRouter.delete("/conversations/:id", validate({
  params: conversationIdParamSchema
}), chatController.deleteConversation);

// Conversation participant management
// POST /api/chat/conversations/:id/participants - Add user to conversation
chatRouter.post("/conversations/:id/participants", validate({
  params: conversationIdParamSchema,
  body: addUserToConversationSchema
}), chatController.addUserToConversation);

// DELETE /api/chat/conversations/:id/participants/:userId - Remove user from conversation
chatRouter.delete("/conversations/:id/participants/:userId", validate({
  params: conversationIdParamSchema.extend({
    userId: removeUserFromConversationSchema.shape.userId
  })
}), chatController.removeUserFromConversation);

export default chatRouter; 