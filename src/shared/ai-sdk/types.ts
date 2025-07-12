// AI SDK types and interfaces for common usage across features

export type AIProvider = 'openai' | 'google' | 'anthropic';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  enableStreaming?: boolean;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
}

export interface AIResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  metadata?: Record<string, any>;
  processingTime: number;
}

export interface AIStreamChunk {
  content: string;
  isComplete: boolean;
  metadata?: Record<string, any>;
}

export interface AIToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface AIToolResult {
  name: string;
  result: any;
  error?: string;
  executionTime?: number;
}

export interface AIConversationContext {
  messages: AIMessage[];
  systemPrompt?: string;
  tools?: AITool[];
  metadata?: Record<string, any>;
}

export interface AITool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (args: Record<string, any>) => Promise<any>;
}

// Feature-specific contexts
export interface ChatContext extends AIConversationContext {
  conversationId?: number;
  userId?: number;
  enableWebSearch?: boolean;
  enableFiles?: boolean;
}

export interface CalendarContext extends AIConversationContext {
  timeZone?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  enableEventCreation?: boolean;
  enableEventModification?: boolean;
}

export interface TodoContext extends AIConversationContext {
  userId?: number;
  projectId?: number;
  enableTaskCreation?: boolean;
  enableTaskModification?: boolean;
  priorityFilter?: string[];
}

// Error types
export class AIError extends Error {
  constructor(
    message: string,
    public provider: AIProvider,
    public originalError?: any
  ) {
    super(message);
    this.name = 'AIError';
  }
}

export class AIRateLimitError extends AIError {
  constructor(provider: AIProvider, retryAfter?: number) {
    super(`Rate limit exceeded for ${provider}`, provider);
    this.name = 'AIRateLimitError';
    this.retryAfter = retryAfter;
  }

  retryAfter?: number;
}

export class AIConfigError extends AIError {
  constructor(message: string, provider: AIProvider) {
    super(`Configuration error: ${message}`, provider);
    this.name = 'AIConfigError';
  }
} 