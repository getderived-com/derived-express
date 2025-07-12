import { prisma } from "../../../shared/db-prisma/prismaClient";
import { MessageType, MessageRole, ToolStatus } from "../../../../generated/prisma";

// Conversation interfaces
export interface CreateConversationData {
  title?: string;
  description?: string;
  userId: number;
  settings?: any;
}

export interface ConversationResponse {
  id: number;
  title: string | null;
  description: string | null;
  isArchived: boolean;
  settings: any;
  createdAt: Date;
  updatedAt: Date;
  participants?: ConversationParticipantResponse[];
  messages?: MessageResponse[];
  _count?: {
    messages: number;
  };
}

export interface ConversationParticipantResponse {
  id: number;
  conversationId: number;
  userId: number;
  role: string;
  joinedAt: Date;
  user?: {
    id: number;
    name: string | null;
    email: string;
    avatar: string | null;
  };
}

// Message interfaces
export interface CreateMessageData {
  conversationId: number;
  userId?: number;
  content: string;
  messageType?: MessageType;
  role: MessageRole;
  model?: string;
  reasoning?: any;
  metadata?: any;
  parentId?: number;
}

export interface MessageResponse {
  id: number;
  conversationId: number;
  userId: number | null;
  content: string;
  messageType: MessageType;
  role: MessageRole;
  model: string | null;
  reasoning: any;
  metadata: any;
  parentId: number | null;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: number;
    name: string | null;
    email: string;
    avatar: string | null;
  } | null;
  files?: FileResponse[];
  sources?: MessageSourceResponse[];
  tools?: MessageToolResponse[];
  parent?: MessageResponse | null;
  replies?: MessageResponse[];
}

// File interfaces
export interface CreateFileData {
  messageId?: number;
  userId?: number;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  path?: string;
  metadata?: any;
}

export interface FileResponse {
  id: number;
  messageId: number | null;
  userId: number | null;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  path: string | null;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

// Message source interfaces
export interface CreateMessageSourceData {
  messageId: number;
  title: string;
  url: string;
  type?: string;
  metadata?: any;
}

export interface MessageSourceResponse {
  id: number;
  messageId: number;
  title: string;
  url: string;
  type: string | null;
  metadata: any;
  createdAt: Date;
}

// Message tool interfaces
export interface CreateMessageToolData {
  messageId: number;
  name: string;
  description?: string;
  status?: ToolStatus;
  parameters?: any;
  result?: string;
  error?: string;
  executionTime?: number;
}

export interface MessageToolResponse {
  id: number;
  messageId: number;
  name: string;
  description: string | null;
  status: ToolStatus;
  parameters: any;
  result: string | null;
  error: string | null;
  executionTime: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationFilters {
  userId?: number;
  isArchived?: boolean;
  search?: string;
}

export interface MessageFilters {
  conversationId?: number;
  userId?: number;
  role?: MessageRole;
  messageType?: MessageType;
  isDeleted?: boolean;
}

export class ChatRepository {
  // Helper methods for JSON serialization
  private serializeJSON(data: any): string | null {
    return data ? JSON.stringify(data) : null;
  }

  private parseJSON(data: string | null): any {
    try {
      return data ? JSON.parse(data) : null;
    } catch {
      return data;
    }
  }

  private transformConversation(conv: any): ConversationResponse {
    return {
      ...conv,
      settings: this.parseJSON(conv.settings),
      participants: conv.participants?.map((p: any) => ({
        ...p,
        user: p.user
      })),
      messages: conv.messages?.map((m: any) => this.transformMessage(m))
    };
  }

  private transformMessage(msg: any): MessageResponse {
    return {
      ...msg,
      reasoning: this.parseJSON(msg.reasoning),
      metadata: this.parseJSON(msg.metadata),
      files: msg.files?.map((f: any) => this.transformFile(f)),
      sources: msg.sources?.map((s: any) => this.transformMessageSource(s)),
      tools: msg.tools?.map((t: any) => this.transformMessageTool(t)),
      parent: msg.parent ? this.transformMessage(msg.parent) : null,
      replies: msg.replies?.map((r: any) => this.transformMessage(r))
    };
  }

  private transformFile(file: any): FileResponse {
    return {
      ...file,
      metadata: this.parseJSON(file.metadata)
    };
  }

  private transformMessageSource(source: any): MessageSourceResponse {
    return {
      ...source,
      metadata: this.parseJSON(source.metadata)
    };
  }

  private transformMessageTool(tool: any): MessageToolResponse {
    return {
      ...tool,
      parameters: this.parseJSON(tool.parameters)
    };
  }

  // Conversation methods
  async createConversation(data: CreateConversationData): Promise<ConversationResponse> {
    const conversation = await prisma.conversation.create({
      data: {
        title: data.title,
        description: data.description,
        settings: this.serializeJSON(data.settings),
        participants: {
          create: {
            userId: data.userId,
            role: "admin"
          }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      }
    });

    return this.transformConversation(conversation);
  }

  async findConversationById(id: number): Promise<ConversationResponse | null> {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      }
    });

    return conversation ? this.transformConversation(conversation) : null;
  }

  async findConversationsByUser(userId: number, filters?: ConversationFilters): Promise<ConversationResponse[]> {
    const where: any = {
      participants: {
        some: {
          userId: userId
        }
      }
    };

    if (filters?.isArchived !== undefined) {
      where.isArchived = filters.isArchived;
    }

    if (filters?.search) {
      where.OR = [
        {
          title: {
            contains: filters.search,
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: filters.search,
            mode: 'insensitive'
          }
        }
      ];
    }

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return conversations.map(conv => this.transformConversation(conv));
  }

  async updateConversation(id: number, data: Partial<CreateConversationData>): Promise<ConversationResponse> {
    const conversation = await prisma.conversation.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        settings: data.settings ? this.serializeJSON(data.settings) : undefined,
        updatedAt: new Date()
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      }
    });

    return this.transformConversation(conversation);
  }

  async deleteConversation(id: number): Promise<ConversationResponse> {
    const conversation = await prisma.conversation.delete({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      }
    });

    return this.transformConversation(conversation);
  }

  // Message methods
  async createMessage(data: CreateMessageData): Promise<MessageResponse> {
    const message = await prisma.message.create({
      data: {
        conversationId: data.conversationId,
        userId: data.userId,
        content: data.content,
        messageType: data.messageType || MessageType.TEXT,
        role: data.role,
        model: data.model,
        reasoning: this.serializeJSON(data.reasoning),
        metadata: this.serializeJSON(data.metadata),
        parentId: data.parentId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        files: true,
        sources: true,
        tools: true,
        parent: true,
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    return this.transformMessage(message);
  }

  async findMessageById(id: number): Promise<MessageResponse | null> {
    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        files: true,
        sources: true,
        tools: true,
        parent: true,
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    return message ? this.transformMessage(message) : null;
  }

  async findMessagesByConversation(conversationId: number, filters?: MessageFilters): Promise<MessageResponse[]> {
    const where: any = {
      conversationId,
      isDeleted: false
    };

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.messageType) {
      where.messageType = filters.messageType;
    }

    if (filters?.isDeleted !== undefined) {
      where.isDeleted = filters.isDeleted;
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        files: true,
        sources: true,
        tools: true,
        parent: true,
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return messages.map(msg => this.transformMessage(msg));
  }

  async updateMessage(id: number, data: Partial<CreateMessageData> & { isEdited?: boolean; isDeleted?: boolean }): Promise<MessageResponse> {
    const message = await prisma.message.update({
      where: { id },
      data: {
        content: data.content,
        reasoning: data.reasoning ? this.serializeJSON(data.reasoning) : undefined,
        metadata: data.metadata ? this.serializeJSON(data.metadata) : undefined,
        isEdited: data.isEdited,
        isDeleted: data.isDeleted,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        files: true,
        sources: true,
        tools: true,
        parent: true,
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    return this.transformMessage(message);
  }

  // File methods
  async createFile(data: CreateFileData): Promise<FileResponse> {
    const file = await prisma.file.create({
      data: {
        messageId: data.messageId,
        userId: data.userId,
        originalName: data.originalName,
        filename: data.filename,
        mimeType: data.mimeType,
        size: data.size,
        url: data.url,
        path: data.path,
        metadata: this.serializeJSON(data.metadata)
      }
    });

    return this.transformFile(file);
  }

  async findFileById(id: number): Promise<FileResponse | null> {
    const file = await prisma.file.findUnique({
      where: { id }
    });

    return file ? this.transformFile(file) : null;
  }

  async findFilesByMessage(messageId: number): Promise<FileResponse[]> {
    const files = await prisma.file.findMany({
      where: { messageId },
      orderBy: { createdAt: 'asc' }
    });

    return files.map(file => this.transformFile(file));
  }

  async findFilesByUser(userId: number): Promise<FileResponse[]> {
    const files = await prisma.file.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return files.map(file => this.transformFile(file));
  }

  async deleteFile(id: number): Promise<FileResponse> {
    const file = await prisma.file.delete({
      where: { id }
    });

    return this.transformFile(file);
  }

  // Message source methods
  async createMessageSource(data: CreateMessageSourceData): Promise<MessageSourceResponse> {
    const source = await prisma.messageSource.create({
      data: {
        messageId: data.messageId,
        title: data.title,
        url: data.url,
        type: data.type,
        metadata: this.serializeJSON(data.metadata)
      }
    });

    return this.transformMessageSource(source);
  }

  async findSourcesByMessage(messageId: number): Promise<MessageSourceResponse[]> {
    const sources = await prisma.messageSource.findMany({
      where: { messageId },
      orderBy: { createdAt: 'asc' }
    });

    return sources.map(source => this.transformMessageSource(source));
  }

  // Message tool methods
  async createMessageTool(data: CreateMessageToolData): Promise<MessageToolResponse> {
    const tool = await prisma.messageTool.create({
      data: {
        messageId: data.messageId,
        name: data.name,
        description: data.description,
        status: data.status || ToolStatus.PENDING,
        parameters: this.serializeJSON(data.parameters),
        result: data.result,
        error: data.error,
        executionTime: data.executionTime
      }
    });

    return this.transformMessageTool(tool);
  }

  async updateMessageTool(id: number, data: Partial<CreateMessageToolData>): Promise<MessageToolResponse> {
    const tool = await prisma.messageTool.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        status: data.status,
        parameters: data.parameters ? this.serializeJSON(data.parameters) : undefined,
        result: data.result,
        error: data.error,
        executionTime: data.executionTime,
        updatedAt: new Date()
      }
    });

    return this.transformMessageTool(tool);
  }

  async findToolsByMessage(messageId: number): Promise<MessageToolResponse[]> {
    const tools = await prisma.messageTool.findMany({
      where: { messageId },
      orderBy: { createdAt: 'asc' }
    });

    return tools.map(tool => this.transformMessageTool(tool));
  }

  // Helper methods
  async isUserInConversation(userId: number, conversationId: number): Promise<boolean> {
    const count = await prisma.conversationParticipant.count({
      where: {
        userId,
        conversationId
      }
    });
    return count > 0;
  }

  async addUserToConversation(userId: number, conversationId: number, role: string = "member"): Promise<ConversationParticipantResponse> {
    const participant = await prisma.conversationParticipant.create({
      data: {
        userId,
        conversationId,
        role
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    });

    return participant;
  }

  async removeUserFromConversation(userId: number, conversationId: number): Promise<ConversationParticipantResponse> {
    const participant = await prisma.conversationParticipant.delete({
      where: {
        conversationId_userId: {
          conversationId,
          userId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    });

    return participant;
  }
} 