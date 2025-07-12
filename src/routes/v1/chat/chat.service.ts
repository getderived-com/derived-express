import { 
  ChatRepository, 
  type ConversationResponse, 
  type MessageResponse, 
  type CreateConversationData,
  type CreateMessageData,
  type ConversationFilters,
  type MessageFilters
} from "./chat.repo";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../../../shared/utils/http-errors.util";
import { MessageRole, MessageType, ToolStatus } from "../../../../generated/prisma";
import { getDefaultAIService, AIMessage, ChatContext, AIError } from "../../../shared/ai-sdk";

export interface SendMessageData {
  conversationId: number;
  content: string;
  userId: number;
  messageType?: MessageType;
  model?: string;
  metadata?: any;
  parentId?: number;
}

export interface SendMessageResponse {
  userMessage: MessageResponse;
  aiMessage: MessageResponse;
  conversation: ConversationResponse;
}

export interface StreamChunk {
  type: 'content' | 'complete' | 'error';
  content?: string;
  userMessage?: MessageResponse;
  aiMessage?: MessageResponse;
  conversation?: ConversationResponse;
  error?: string;
}

export interface CreateConversationRequest {
  title?: string;
  description?: string;
  userId: number;
  settings?: any;
}

export class ChatService {
  private chatRepo: ChatRepository;

  constructor() {
    this.chatRepo = new ChatRepository();
  }

  async createConversation(data: CreateConversationRequest): Promise<ConversationResponse> {
      const conversationData: CreateConversationData = {
        title: data.title || "New Conversation",
        description: data.description || "" ,
        userId: data.userId,
        settings: data.settings || {}
      };

      return this.chatRepo.createConversation(conversationData);
  }

  async getConversations(userId: number, filters?: ConversationFilters): Promise<ConversationResponse[]> {
    try {
      return await this.chatRepo.findConversationsByUser(userId, filters);
    } catch (error) {
      throw new BadRequestError("Failed to fetch conversations", error);
    }
  }

  async getConversationById(conversationId: number, userId: number): Promise<ConversationResponse> {
    const conversation = await this.chatRepo.findConversationById(conversationId);
    if (!conversation) {
      throw new NotFoundError(`Conversation with ID ${conversationId} not found`);
    }

    const hasAccess = await this.chatRepo.isUserInConversation(userId, conversationId);
    if (!hasAccess) {
      throw new UnauthorizedError("You don't have access to this conversation");
    }

    return conversation;
  }

  async updateConversation(conversationId: number, userId: number, data: Partial<CreateConversationRequest>): Promise<ConversationResponse> {
    await this.getConversationById(conversationId, userId);

    try {
      return await this.chatRepo.updateConversation(conversationId, data);
    } catch (error) {
      throw new BadRequestError("Failed to update conversation", error);
    }
  }

  async deleteConversation(conversationId: number, userId: number): Promise<ConversationResponse> {
    await this.getConversationById(conversationId, userId);

    try {
      return await this.chatRepo.deleteConversation(conversationId);
    } catch (error) {
      throw new BadRequestError("Failed to delete conversation", error);
    }
  }

  async sendMessage(data: SendMessageData): Promise<SendMessageResponse> {
    const conversation = await this.getConversationById(data.conversationId, data.userId);

    try {
      const userMessageData: CreateMessageData = {
        conversationId: data.conversationId,
        userId: data.userId,
        content: data.content,
        messageType: data.messageType || MessageType.TEXT,
        role: MessageRole.USER,
        metadata: data.metadata,
        parentId: data.parentId
      };

      const userMessage = await this.chatRepo.createMessage(userMessageData);

      const aiResponse = await this.generateAIResponse(data.content, data.conversationId, data.model);

      const aiMessageData: CreateMessageData = {
        conversationId: data.conversationId,
        userId: undefined,
        content: aiResponse.content,
        messageType: MessageType.TEXT,
        role: MessageRole.ASSISTANT,
        model: data.model || "gpt-4",
        reasoning: aiResponse.reasoning,
        metadata: {
          processingTime: aiResponse.processingTime,
          tokenCount: aiResponse.tokenCount
        }
      };

      const aiMessage = await this.chatRepo.createMessage(aiMessageData);

      const updatedConversation = await this.chatRepo.updateConversation(data.conversationId, {});

      return {
        userMessage,
        aiMessage,
        conversation: updatedConversation
      };
    } catch (error) {
      throw new BadRequestError("Failed to send message", error);
    }
  }

  async *sendMessageStream(data: SendMessageData): AsyncGenerator<StreamChunk> {
    try {
      const userMessageData: CreateMessageData = {
        conversationId: data.conversationId,
        userId: data.userId,
        content: data.content,
        messageType: data.messageType || MessageType.TEXT,
        role: MessageRole.USER,
        metadata: data.metadata,
        parentId: data.parentId
      };

      const userMessage = await this.chatRepo.createMessage(userMessageData);

      const aiService = getDefaultAIService();
      
      const allMessages = await this.chatRepo.findMessagesByConversation(data.conversationId);
      const messages = allMessages.slice(-20);
      
      const aiMessages: AIMessage[] = messages
        .map(msg => ({
          role: msg.role === MessageRole.USER ? 'user' as const : 'assistant' as const,
          content: msg.content,
          metadata: {
            messageId: msg.id,
            timestamp: msg.createdAt
          }
        }));

      aiMessages.push({
        role: 'user',
        content: data.content,
        metadata: {
          timestamp: new Date()
        }
      });

      const chatContext: ChatContext = {
        messages: aiMessages,
        conversationId: data.conversationId,
        enableWebSearch: false,
        enableFiles: false
      };

      let aiResponseContent = '';
      let processingStartTime = Date.now();

      for await (const chunk of aiService.generateChatStreamingResponse(chatContext)) {
        if (!chunk.isComplete) {
          aiResponseContent += chunk.content;
          yield {
            type: 'content',
            content: chunk.content
          };
        } else {
          const processingTime = Date.now() - processingStartTime;
          const aiMessageData: CreateMessageData = {
            conversationId: data.conversationId,
            userId: undefined,
            content: aiResponseContent,
            messageType: MessageType.TEXT,
            role: MessageRole.ASSISTANT,
            model: data.model || "gpt-4",
            reasoning: {
              model: data.model || "gpt-4"
            },
            metadata: {
              processingTime,
              tokenCount: 0
            }
          };

          const aiMessage = await this.chatRepo.createMessage(aiMessageData);
          const updatedConversation = await this.chatRepo.updateConversation(data.conversationId, {});

          yield {
            type: 'complete',
            userMessage,
            aiMessage,
            conversation: updatedConversation
          };
          
          return;
        }
      }
    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async getMessages(conversationId: number, userId: number, filters?: MessageFilters): Promise<MessageResponse[]> {
    await this.getConversationById(conversationId, userId);

    try {
      const messageFilters = {
        ...filters,
        conversationId
      };

      return await this.chatRepo.findMessagesByConversation(conversationId, messageFilters);
    } catch (error) {
      throw new BadRequestError("Failed to fetch messages", error);
    }
  }

  async getMessageById(messageId: number, userId: number): Promise<MessageResponse> {
    const message = await this.chatRepo.findMessageById(messageId);
    if (!message) {
      throw new NotFoundError(`Message with ID ${messageId} not found`);
    }

    await this.getConversationById(message.conversationId, userId);

    return message;
  }

  async updateMessage(messageId: number, userId: number, data: { content?: string; isEdited?: boolean; isDeleted?: boolean }): Promise<MessageResponse> {
    const message = await this.getMessageById(messageId, userId);

    if (message.userId !== userId) {
      throw new UnauthorizedError("You can only edit your own messages");
    }

    try {
      return await this.chatRepo.updateMessage(messageId, {
        content: data.content,
        isEdited: data.isEdited ?? true,
        isDeleted: data.isDeleted
      });
    } catch (error) {
      throw new BadRequestError("Failed to update message", error);
    }
  }

  async deleteMessage(messageId: number, userId: number): Promise<MessageResponse> {
    return this.updateMessage(messageId, userId, { isDeleted: true });
  }

  private async generateAIResponse(userMessage: string, conversationId: number, model?: string): Promise<{
    content: string;
    reasoning?: any;
    processingTime: number;
    tokenCount: number;
  }> {
    try {
      const aiService = getDefaultAIService();
      
      const allMessages = await this.chatRepo.findMessagesByConversation(conversationId);
      
      const messages = allMessages.slice(-20);
      
      const aiMessages: AIMessage[] = messages
        .reverse()
        .map(msg => ({
          role: msg.role === MessageRole.USER ? 'user' as const : 'assistant' as const,
          content: msg.content,
          metadata: {
            messageId: msg.id,
            timestamp: msg.createdAt
          }
        }));

      aiMessages.push({
        role: 'user',
        content: userMessage,
        metadata: {
          timestamp: new Date()
        }
      });

      const chatContext: ChatContext = {
        messages: aiMessages,
        conversationId,
        enableWebSearch: false,
        enableFiles: false
      };

      const response = await aiService.generateChatResponse(chatContext);
      
      return {
        content: response.content,
        reasoning: {
          model: response.model,
          provider: response.metadata?.provider,
          temperature: response.metadata?.temperature,
          maxTokens: response.metadata?.maxTokens,
          finishReason: response.finishReason
        },
        processingTime: response.processingTime,
        tokenCount: response.usage.totalTokens
      };
    } catch (error) {
      if (error instanceof AIError) {
        console.error('AI Service Error:', error.message);
        
        return {
          content: `I apologize, but I'm experiencing technical difficulties right now. The AI service returned an error: ${error.message}. Please try again in a moment.`,
          reasoning: {
            error: error.message,
            provider: error.provider,
            fallback: true
          },
          processingTime: 0,
          tokenCount: 0
        };
      }
      
      throw error;
    }
  }

  async addUserToConversation(conversationId: number, targetUserId: number, requestingUserId: number, role: string = "member"): Promise<void> {
    await this.getConversationById(conversationId, requestingUserId);

    const isAlreadyMember = await this.chatRepo.isUserInConversation(targetUserId, conversationId);
    if (isAlreadyMember) {
      throw new BadRequestError("User is already a member of this conversation");
    }

    try {
      await this.chatRepo.addUserToConversation(targetUserId, conversationId, role);
    } catch (error) {
      throw new BadRequestError("Failed to add user to conversation", error);
    }
  }

  async removeUserFromConversation(conversationId: number, targetUserId: number, requestingUserId: number): Promise<void> {
    await this.getConversationById(conversationId, requestingUserId);

    const isMember = await this.chatRepo.isUserInConversation(targetUserId, conversationId);
    if (!isMember) {
      throw new BadRequestError("User is not a member of this conversation");
    }

    try {
      await this.chatRepo.removeUserFromConversation(targetUserId, conversationId);
    } catch (error) {
      throw new BadRequestError("Failed to remove user from conversation", error);
    }
  }
} 