import OpenAI from 'openai';
import { z } from 'zod';

import { getAIConfig, getSystemPrompt, validateAIConfig } from './config';
import {
  AIConfig,
  AIError,
  AIMessage,
  AIProvider,
  AIRateLimitError,
  AIResponse,
  AIStreamChunk,
  CalendarContext,
  ChatContext,
  TodoContext
} from './types';

export class AIService {
  private config: AIConfig;
  private openai: OpenAI | null = null;

  constructor(provider?: AIProvider, overrides?: Partial<AIConfig>) {
    this.config = getAIConfig(provider, overrides);
    validateAIConfig(this.config);
    this.initializeClient();
  }

  /**
   * Initialize the appropriate AI client based on provider
   */
  private initializeClient() {
    if (this.config.provider === 'openai') {
      this.openai = new OpenAI({
        apiKey: this.config.apiKey,
      });
    } else if (this.config.provider === 'google') {
      this.openai = new OpenAI({
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
        apiKey: this.config.apiKey,
      });
    } else {
      throw new AIError(`Only OpenAI and Google provider is supported. Received: ${this.config.provider}`, this.config.provider);
    }
  }

  /**
   * Convert internal message format to OpenAI format
   */
  private formatMessages(messages: AIMessage[], systemPrompt?: string): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const formattedMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
    
    // Add system message if provided
    if (systemPrompt) {
      formattedMessages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // Add conversation messages
    formattedMessages.push(...messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    })));

    return formattedMessages;
  }

  /**
   * Generate a single response from AI
   */
  async generateResponse(
    messages: AIMessage[],
    systemPrompt?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      if (!this.openai) {
        throw new AIError('OpenAI client not initialized', this.config.provider);
      }

      const formattedMessages = this.formatMessages(messages, systemPrompt || this.config.systemPrompt);

      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: formattedMessages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });

      const processingTime = Date.now() - startTime;
      const choice = completion.choices[0];

      return {
        content: choice.message.content || '',
        model: this.config.model,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
        finishReason: choice.finish_reason || 'stop',
        metadata: {
          provider: this.config.provider,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
        },
        processingTime,
      };
    } catch (error: any) {
      if (error.status === 429) {
        throw new AIRateLimitError(this.config.provider, error.headers?.['retry-after']);
      }
      throw new AIError(
        `Failed to generate response: ${error.message}`,
        this.config.provider,
        error
      );
    }
  }

  /**
   * Generate streaming response from AI
   */
  async *generateStreamingResponse(
    messages: AIMessage[],
    systemPrompt?: string
  ): AsyncGenerator<AIStreamChunk> {
    try {
      if (!this.openai) {
        throw new AIError('OpenAI client not initialized', this.config.provider);
      }

      const formattedMessages = this.formatMessages(messages, systemPrompt || this.config.systemPrompt);

      const stream = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: formattedMessages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        
        if (choice?.delta?.content) {
          yield {
            content: choice.delta.content,
            isComplete: false,
            metadata: {
              provider: this.config.provider,
              model: this.config.model,
            },
          };
        }

        if (choice?.finish_reason) {
          // Final chunk with complete status
          yield {
            content: '',
            isComplete: true,
            metadata: {
              provider: this.config.provider,
              model: this.config.model,
              finishReason: choice.finish_reason,
            },
          };
          break;
        }
      }
    } catch (error: any) {
      if (error.status === 429) {
        throw new AIRateLimitError(this.config.provider, error.headers?.['retry-after']);
      }
      throw new AIError(
        `Failed to generate streaming response: ${error.message}`,
        this.config.provider,
        error
      );
    }
  }

  /**
   * Generate structured object response using function calling
   */
  async generateStructuredResponse<T>(
    messages: AIMessage[],
    schema: z.ZodSchema<T>,
    systemPrompt?: string
  ): Promise<T> {
    try {
      if (!this.openai) {
        throw new AIError('OpenAI client not initialized', this.config.provider);
      }

      const formattedMessages = this.formatMessages(messages, systemPrompt || this.config.systemPrompt);

      // Create a function definition from the Zod schema
      const functionName = 'structured_response';
      const functionDefinition: OpenAI.Chat.Completions.ChatCompletionTool = {
        type: 'function',
        function: {
          name: functionName,
          description: 'Generate a structured response according to the provided schema',
          parameters: this.zodToJsonSchema(schema),
        },
      };

      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: formattedMessages,
        tools: [functionDefinition],
        tool_choice: { type: 'function', function: { name: functionName } },
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });

      const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        throw new AIError('No structured response generated', this.config.provider);
      }

      const parsed = JSON.parse(toolCall.function.arguments);
      return schema.parse(parsed);
    } catch (error: any) {
      if (error.status === 429) {
        throw new AIRateLimitError(this.config.provider, error.headers?.['retry-after']);
      }
      throw new AIError(
        `Failed to generate structured response: ${error.message}`,
        this.config.provider,
        error
      );
    }
  }

  /**
   * Simple Zod to JSON Schema converter
   */
  private zodToJsonSchema(schema: z.ZodSchema<any>): any {
    // This is a simplified converter - you might want to use a more robust library like zod-to-json-schema
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape;
      const properties: any = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = this.zodToJsonSchema(value as z.ZodSchema<any>);
        if (!(value as any).isOptional()) {
          required.push(key);
        }
      }

      return {
        type: 'object',
        properties,
        required,
      };
    }

    if (schema instanceof z.ZodString) {
      return { type: 'string' };
    }

    if (schema instanceof z.ZodNumber) {
      return { type: 'number' };
    }

    if (schema instanceof z.ZodBoolean) {
      return { type: 'boolean' };
    }

    if (schema instanceof z.ZodArray) {
      return {
        type: 'array',
        items: this.zodToJsonSchema(schema.element),
      };
    }

    // Fallback for other types
    return { type: 'string' };
  }

  /**
   * Chat-specific methods
   */
  async generateChatResponse(context: ChatContext): Promise<AIResponse> {
    const systemPrompt = context.systemPrompt || getSystemPrompt('chat');
    return this.generateResponse(context.messages, systemPrompt);
  }

  async *generateChatStreamingResponse(
    context: ChatContext
  ): AsyncGenerator<AIStreamChunk> {
    const systemPrompt = context.systemPrompt || getSystemPrompt('chat');
    yield* this.generateStreamingResponse(context.messages, systemPrompt);
  }

  /**
   * Calendar-specific methods
   */
  async generateCalendarResponse(context: CalendarContext): Promise<AIResponse> {
    const systemPrompt = context.systemPrompt || getSystemPrompt('calendar');
    return this.generateResponse(context.messages, systemPrompt);
  }

  async generateCalendarAction<T>(
    context: CalendarContext,
    schema: z.ZodSchema<T>
  ): Promise<T> {
    const systemPrompt = context.systemPrompt || getSystemPrompt('calendar');
    return this.generateStructuredResponse(context.messages, schema, systemPrompt);
  }

  /**
   * Todo-specific methods
   */
  async generateTodoResponse(context: TodoContext): Promise<AIResponse> {
    const systemPrompt = context.systemPrompt || getSystemPrompt('todo');
    return this.generateResponse(context.messages, systemPrompt);
  }

  async generateTodoAction<T>(
    context: TodoContext,
    schema: z.ZodSchema<T>
  ): Promise<T> {
    const systemPrompt = context.systemPrompt || getSystemPrompt('todo');
    return this.generateStructuredResponse(context.messages, schema, systemPrompt);
  }

  /**
   * Update configuration
   */
  updateConfig(overrides: Partial<AIConfig>): void {
    this.config = { ...this.config, ...overrides };
    validateAIConfig(this.config);
    this.initializeClient();
  }

  /**
   * Get current configuration
   */
  getConfig(): AIConfig {
    return { ...this.config };
  }
}

// Factory functions
export function createAIService(
  provider?: AIProvider,
  overrides?: Partial<AIConfig>
): AIService {
  return new AIService(provider, overrides);
}

// Default service instance
let defaultService: AIService | null = null;

export function getDefaultAIService(): AIService {
  if (!defaultService) {
    defaultService = createAIService();
  }
  return defaultService;
} 