import { Request, Response } from "express";
import { ChatService } from "./chat.service";
import { success } from "../../../shared/api-response/response-handler";
import { asyncHandler } from "../../../shared/utils/async-handler.util";
import { BadRequestError } from "../../../shared/utils/http-errors.util";
import { getDefaultAIService } from "../../../shared/ai-sdk";
import { getAvailableProviders, isProviderAvailable } from "../../../shared/ai-sdk/config";
import { MessageType } from "../../../../generated/prisma";

export class ChatController {
  private chatService: ChatService;

  constructor() {
    this.chatService = new ChatService();
  }

  private parseIntId(idStr: string, fieldName: string): number {
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      throw new BadRequestError(`Invalid ${fieldName} ID`);
    }
    return id;
  }

  sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new BadRequestError("User ID is required");
    }

    const messageData = {
      ...req.body,
      userId,
      conversationId: req.body.conversationId ? this.parseIntId(req.body.conversationId.toString(), "conversation") : req.body.conversationId,
      parentId: req.body.parentId ? this.parseIntId(req.body.parentId.toString(), "parent message") : req.body.parentId
    };

    const result = await this.chatService.sendMessage(messageData);

    success(res, result, "Message sent successfully");
  });

  getMessages = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new BadRequestError("User ID is required");
    }

    const { id: conversationIdStr } = req.params;
    const filters = req.query;

    if (!conversationIdStr) {
      throw new BadRequestError("Conversation ID is required");
    }

    const conversationId = this.parseIntId(conversationIdStr, "conversation");

    const messages = await this.chatService.getMessages(conversationId, userId, filters);

    success(res, { rows: messages, count: messages.length }, "Messages retrieved successfully");
  });

  getRecentMessages = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new BadRequestError("User ID is required");
    }

    success(res, { rows: [], count: 0 }, "Recent messages retrieved successfully");
  });

  createConversation = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new BadRequestError("User ID is required");
    }

    const conversationData = {
      ...req.body,
      userId
    };

    const result = await this.chatService.createConversation(conversationData);

    success(res, result, "Conversation created successfully");
  });

  getConversations = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new BadRequestError("User ID is required");
    }

    const filters = req.query;

    const conversations = await this.chatService.getConversations(userId, filters);

    success(res, { rows: conversations, count: conversations.length }, "Conversations retrieved successfully");
  });

  getConversationById = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new BadRequestError("User ID is required");
    }

    const { id: idStr } = req.params;
    const id = this.parseIntId(idStr, "conversation");

    const conversation = await this.chatService.getConversationById(id, userId);

    success(res, conversation, "Conversation retrieved successfully");
  });

  updateConversation = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new BadRequestError("User ID is required");
    }

    const { id: idStr } = req.params;
    const id = this.parseIntId(idStr, "conversation");

    const result = await this.chatService.updateConversation(id, userId, req.body);

    success(res, result, "Conversation updated successfully");
  });

  deleteConversation = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new BadRequestError("User ID is required");
    }

    const { id: idStr } = req.params;
    const id = this.parseIntId(idStr, "conversation");

    const result = await this.chatService.deleteConversation(id, userId);

    success(res, result, "Conversation deleted successfully");
  });

  getMessageById = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new BadRequestError("User ID is required");
    }

    const { id: idStr } = req.params;
    const id = this.parseIntId(idStr, "message");

    const message = await this.chatService.getMessageById(id, userId);

    success(res, message, "Message retrieved successfully");
  });

  updateMessage = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new BadRequestError("User ID is required");
    }

    const { id: idStr } = req.params;
    const id = this.parseIntId(idStr, "message");

    const result = await this.chatService.updateMessage(id, userId, req.body);

    success(res, result, "Message updated successfully");
  });

  deleteMessage = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new BadRequestError("User ID is required");
    }

    const { id: idStr } = req.params;
    const id = this.parseIntId(idStr, "message");

    const result = await this.chatService.deleteMessage(id, userId);

    success(res, result, "Message deleted successfully");
  });

  addUserToConversation = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new BadRequestError("User ID is required");
    }

    const { id: idStr } = req.params;
    const conversationId = this.parseIntId(idStr, "conversation");
    const { targetUserId, role } = req.body;

    if (!targetUserId) {
      throw new BadRequestError("Target user ID is required");
    }

    const targetUserIdInt = this.parseIntId(targetUserId.toString(), "target user");

    await this.chatService.addUserToConversation(conversationId, targetUserIdInt, userId, role);

    success(res, null, "User added to conversation successfully");
  });

  removeUserFromConversation = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new BadRequestError("User ID is required");
    }

    const { id: idStr, userId: targetUserIdStr } = req.params;
    const conversationId = this.parseIntId(idStr, "conversation");
    const targetUserId = this.parseIntId(targetUserIdStr, "target user");

    await this.chatService.removeUserFromConversation(conversationId, targetUserId, userId);

    success(res, null, "User removed from conversation successfully");
  });

  sendMessageAISDK = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new BadRequestError("User ID is required");
    }

    const { messages, model, conversationId } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new BadRequestError("Messages array is required");
    }

    const lastMessage = messages[messages.length - 1];
    
    if (!lastMessage.content) {
      throw new BadRequestError("Message content is required");
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    try {
      let activeConversationId = conversationId;

      if (!activeConversationId) {
        const newConversation = await this.chatService.createConversation({
          title: lastMessage.content.substring(0, 50) + "...",
          userId
        });
        activeConversationId = newConversation.id;
        
        res.write(`event: conversation_created\n`);
        res.write(`data: ${JSON.stringify({ conversationId: activeConversationId })}\n\n`);
      }

      const aiService = getDefaultAIService();
      
      const dbMessages = await this.chatService.getMessages(activeConversationId, userId);
      
      const aiMessages = dbMessages.map((msg: any) => ({
        role: msg.role.toLowerCase(),
        content: msg.content,
      }));

      aiMessages.push({
        role: 'user',
        content: lastMessage.content
      });

      const streamResult = this.chatService.sendMessageStream({
        conversationId: activeConversationId,
        content: lastMessage.content,
        userId,
        messageType: MessageType.TEXT,
        model: model || "gpt-4"
      });

      res.write(`event: ai_start\n`);
      res.write(`data: ${JSON.stringify({ message: "AI response starting..." })}\n\n`);

      for await (const chunk of streamResult) {
        if (chunk.type === 'content') {
          res.write(`event: content\n`);
          res.write(`data: ${JSON.stringify({ content: chunk.content })}\n\n`);
        } else if (chunk.type === 'complete') {
          res.write(`event: complete\n`);
          res.write(`data: ${JSON.stringify({ 
            conversationId: activeConversationId,
            userMessage: chunk.userMessage,
            aiMessage: chunk.aiMessage,
            processingTime: Date.now() - Date.now()
          })}\n\n`);
          
          break;
        } else if (chunk.type === 'error') {
          res.write(`event: error\n`);
          res.write(`data: ${JSON.stringify({ error: chunk.error })}\n\n`);
          res.end();
          return;
        }
      }
      
      res.write(`event: end\n`);
      res.write(`data: ${JSON.stringify({ message: "Stream completed" })}\n\n`);
      res.end();
    } catch (error) {
      console.error('Streaming error:', error);
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Streaming failed' })}\n\n`);
      res.end();
    }
  });

  getModels = asyncHandler(async (req: Request, res: Response) => {
    const supportedModels = {
      openai: [
        {
          id: "gpt-4",
          name: "GPT-4",
          provider: "openai",
          description: "Most capable GPT-4 model, great for complex tasks",
          maxTokens: 8192,
          supportsStreaming: true,
          isDefault: true
        },
        {
          id: "gpt-4-turbo",
          name: "GPT-4 Turbo",
          provider: "openai", 
          description: "Latest GPT-4 model with improved speed and capabilities",
          maxTokens: 128000,
          supportsStreaming: true,
          isDefault: false
        },
        {
          id: "gpt-3.5-turbo",
          name: "GPT-3.5 Turbo",
          provider: "openai",
          description: "Fast and efficient model for most conversational tasks",
          maxTokens: 4096,
          supportsStreaming: true,
          isDefault: false
        }
      ],
      google: [
        {
          id: "gemini-1.5-flash",
          name: "Gemini 1.5 Flash",
          provider: "google",
          description: "Fast and efficient Gemini model for quick responses",
          maxTokens: 8192,
          supportsStreaming: true,
          isDefault: true
        },
        {
          id: "gemini-1.5-pro",
          name: "Gemini 1.5 Pro",
          provider: "google",
          description: "Most capable Gemini model for complex reasoning tasks",
          maxTokens: 32768,
          supportsStreaming: true,
          isDefault: false
        },
        {
          id: "gemini-1.0-pro",
          name: "Gemini 1.0 Pro",
          provider: "google",
          description: "Previous generation Gemini model",
          maxTokens: 30720,
          supportsStreaming: true,
          isDefault: false
        }
      ],
      anthropic: [
        {
          id: "claude-3-haiku-20240307",
          name: "Claude 3 Haiku",
          provider: "anthropic",
          description: "Fast and efficient Claude model for quick tasks",
          maxTokens: 200000,
          supportsStreaming: true,
          isDefault: true
        },
        {
          id: "claude-3-sonnet-20240229",
          name: "Claude 3 Sonnet",
          provider: "anthropic",
          description: "Balanced Claude model for most tasks",
          maxTokens: 200000,
          supportsStreaming: true,
          isDefault: false
        },
        {
          id: "claude-3-opus-20240229",
          name: "Claude 3 Opus",
          provider: "anthropic",
          description: "Most capable Claude model for complex reasoning",
          maxTokens: 200000,
          supportsStreaming: true,
          isDefault: false
        }
      ]
    };

    const availableProviders = getAvailableProviders();

    const availableModels: any[] = [];
    const providerStatus: Record<string, boolean> = {};

    Object.entries(supportedModels).forEach(([provider, models]) => {
      const isAvailable = isProviderAvailable(provider as any);
      providerStatus[provider] = isAvailable;
      
      if (isAvailable) {
        availableModels.push(...models.map(model => ({
          ...model,
          available: true
        })));
      } else {
        availableModels.push(...models.map(model => ({
          ...model,
          available: false
        })));
      }
    });

    const response = {
      rows: availableModels,
      providers: {
        available: availableProviders,
        status: providerStatus
      },
      count: availableModels.length,
      available: availableModels.filter(model => model.available).length
    };

    success(res, response, "Supported models retrieved successfully");
  });
} 