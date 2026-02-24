import { randomUUID } from "crypto";
import OpenAI from "openai";
import { OpenAIConfigOverrides, resolveOpenAIConfig } from "./config";
import { createOpenAIClient } from "./client";
import { OpenAIServiceError, mapOpenAIError } from "./errors";
import { WinstonOpenAIUsageLogger, OpenAIUsageLogger } from "./logger";
import { mapMcpServersToOpenAITools } from "./mcp-adapter";
import {
  buildToolHandlerMap,
  mapToolHandlersToOpenAITools,
  parseToolArguments,
} from "./tooling";
import {
  OpenAIMcpServerDefinition,
  OpenAIRequestOptions,
  OpenAIStreamEvent,
  OpenAITextRequest,
  OpenAITextResponse,
  OpenAIToolHandler,
  JSONValue,
} from "./types";

interface BaseRequestContext {
  requestId: string;
  model: string;
  operation: "response" | "response_stream" | "tool_call" | "mcp";
  metadata?: Record<string, JSONValue>;
}

/**
 * Shared OpenAI service for internal repository usage.
 * This class centralizes configuration, structured errors, and usage logging.
 */
export class OpenAIService {
  private readonly client: OpenAI;
  private readonly logger: OpenAIUsageLogger;
  private readonly defaultModel: string;

  constructor(
    configOverrides: OpenAIConfigOverrides = {},
    usageLogger: OpenAIUsageLogger = new WinstonOpenAIUsageLogger(),
  ) {
    const config = resolveOpenAIConfig(configOverrides);
    this.client = createOpenAIClient(config);
    this.defaultModel = config.defaultModel;
    this.logger = usageLogger;
  }

  /**
   * Execute a standard non-streaming OpenAI response request.
   */
  public async createResponse(
    request: OpenAITextRequest,
    options?: {
      toolHandlers?: OpenAIToolHandler[];
      mcpServers?: OpenAIMcpServerDefinition[];
    },
  ): Promise<OpenAITextResponse> {
    const context = this.createContext("response", request);
    const startedAt = Date.now();

    this.logStarted(context);

    try {
      const response = await this.client.responses.create({
        model: context.model,
        input: request.input,
        instructions: request.instructions,
        temperature: request.temperature,
        max_output_tokens: request.maxOutputTokens,
        tools: [
          ...mapToolHandlersToOpenAITools(options?.toolHandlers),
          ...mapMcpServersToOpenAITools(options?.mcpServers),
        ] as any,
      } as any);

      const result = this.normalizeResponse(response as any, context.model);
      this.logSuccess(context, startedAt, result.usage?.totalTokens);
      return result;
    } catch (error) {
      const mappedError = mapOpenAIError(error, {
        operation: context.operation,
        requestId: context.requestId,
      });

      this.logFailure(context, startedAt, mappedError.code);
      throw mappedError;
    }
  }

  /**
   * Execute a streaming OpenAI response request.
   */
  public async *streamResponse(
    request: OpenAITextRequest,
    options?: {
      toolHandlers?: OpenAIToolHandler[];
      mcpServers?: OpenAIMcpServerDefinition[];
    },
  ): AsyncGenerator<OpenAIStreamEvent, void, void> {
    const context = this.createContext("response_stream", request);
    const startedAt = Date.now();

    this.logStarted(context);

    try {
      const stream = await this.client.responses.create({
        model: context.model,
        input: request.input,
        instructions: request.instructions,
        temperature: request.temperature,
        max_output_tokens: request.maxOutputTokens,
        stream: true,
        tools: [
          ...mapToolHandlersToOpenAITools(options?.toolHandlers),
          ...mapMcpServersToOpenAITools(options?.mcpServers),
        ] as any,
      } as any);

      for await (const event of stream as any) {
        const eventType = String(event?.type || "");

        if (eventType === "response.output_text.delta") {
          yield {
            type: "delta",
            textDelta: String(event?.delta || ""),
          };
          continue;
        }

        if (eventType === "response.function_call_arguments.delta") {
          yield {
            type: "tool_call",
            toolName: String(event?.name || ""),
            toolArguments: String(event?.delta || ""),
          };
          continue;
        }

        if (eventType === "response.completed") {
          yield { type: "done" };
        }
      }

      this.logSuccess(context, startedAt);
    } catch (error) {
      const mappedError = mapOpenAIError(error, {
        operation: context.operation,
        requestId: context.requestId,
      });

      this.logFailure(context, startedAt, mappedError.code);
      yield {
        type: "error",
        errorMessage: mappedError.message,
      };
      throw mappedError;
    }
  }

  /**
   * Execute a request with typed tool handlers.
   * The method performs tool invocation loops until the model returns final text output.
   */
  public async createResponseWithTools(
    request: OpenAITextRequest,
    toolHandlers: OpenAIToolHandler[],
  ): Promise<OpenAITextResponse> {
    const context = this.createContext("tool_call", request);
    const startedAt = Date.now();

    this.logStarted(context);

    try {
      const handlerMap = buildToolHandlerMap(toolHandlers);
      const tools = mapToolHandlersToOpenAITools(toolHandlers);

      let response = (await this.client.responses.create({
        model: context.model,
        input: request.input,
        instructions: request.instructions,
        temperature: request.temperature,
        max_output_tokens: request.maxOutputTokens,
        tools: tools as any,
      } as any)) as any;

      // Continue until the model stops asking for tool execution.
      while (Array.isArray(response?.output)) {
        const toolCalls = response.output.filter(
          (outputItem: any) => outputItem?.type === "function_call",
        );

        if (toolCalls.length === 0) {
          break;
        }

        const toolOutputs = [] as Array<Record<string, unknown>>;

        for (const toolCall of toolCalls) {
          const toolName = String(toolCall?.name || "");
          const callId = String(toolCall?.call_id || "");
          const toolHandler = handlerMap.get(toolName);

          if (!toolHandler) {
            throw new OpenAIServiceError(
              `Tool handler is not registered for '${toolName}'`,
              "tool",
              "TOOL_HANDLER_NOT_FOUND",
              false,
              {
                operation: "tool_call",
                requestId: context.requestId,
              },
            );
          }

          const args = parseToolArguments(String(toolCall?.arguments || "{}"));
          const handlerResult = await toolHandler.handler(args, { callId, toolName });

          toolOutputs.push({
            type: "function_call_output",
            call_id: callId,
            output: JSON.stringify(handlerResult),
          });
        }

        response = await this.client.responses.create({
          model: context.model,
          previous_response_id: response.id,
          input: toolOutputs,
          tools: tools as any,
        } as any);
      }

      const result = this.normalizeResponse(response, context.model);
      this.logSuccess(context, startedAt, result.usage?.totalTokens);
      return result;
    } catch (error) {
      const mappedError = mapOpenAIError(error, {
        operation: context.operation,
        requestId: context.requestId,
      });

      this.logFailure(context, startedAt, mappedError.code);
      throw mappedError;
    }
  }

  /**
   * Execute a request with MCP server adapters mapped as OpenAI tools.
   */
  public async createResponseWithMcp(
    request: OpenAITextRequest,
    mcpServers: OpenAIMcpServerDefinition[],
  ): Promise<OpenAITextResponse> {
    return this.createResponse(
      {
        ...request,
      },
      {
        mcpServers,
      },
    );
  }

  private createContext(
    operation: BaseRequestContext["operation"],
    request: OpenAIRequestOptions,
  ): BaseRequestContext {
    return {
      requestId: randomUUID(),
      model: request.model || this.defaultModel,
      operation,
      metadata: request.metadata,
    };
  }

  private normalizeResponse(response: any, model: string): OpenAITextResponse {
    return {
      id: String(response?.id || randomUUID()),
      model,
      text: String(response?.output_text || ""),
      usage: {
        inputTokens: response?.usage?.input_tokens,
        outputTokens: response?.usage?.output_tokens,
        totalTokens: response?.usage?.total_tokens,
      },
    };
  }

  private logStarted(context: BaseRequestContext): void {
    this.logger.log({
      requestId: context.requestId,
      operation: context.operation,
      model: context.model,
      outcome: "started",
      metadata: context.metadata,
    });
  }

  private logSuccess(
    context: BaseRequestContext,
    startedAt: number,
    totalTokens?: number,
  ): void {
    this.logger.log({
      requestId: context.requestId,
      operation: context.operation,
      model: context.model,
      outcome: "success",
      latencyMs: Date.now() - startedAt,
      metadata: {
        ...(context.metadata || {}),
        totalTokens: totalTokens ?? 0,
      },
    });
  }

  private logFailure(
    context: BaseRequestContext,
    startedAt: number,
    errorCode: string,
  ): void {
    this.logger.log({
      requestId: context.requestId,
      operation: context.operation,
      model: context.model,
      outcome: "failure",
      latencyMs: Date.now() - startedAt,
      errorCode,
      metadata: context.metadata,
    });
  }
}
