export type JSONPrimitive = string | number | boolean | null;
export type JSONValue = JSONPrimitive | JSONValue[] | { [key: string]: JSONValue };

export interface OpenAIRequestOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  metadata?: Record<string, JSONValue>;
}

export interface OpenAITextRequest extends OpenAIRequestOptions {
  input: string;
  instructions?: string;
}

export interface OpenAIToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, JSONValue>;
}

export interface OpenAIMcpServerDefinition {
  serverLabel: string;
  serverUrl: string;
  allowedTools?: string[];
  headers?: Record<string, string>;
}

export interface OpenAIToolHandlerContext {
  callId: string;
  toolName: string;
}

export interface OpenAIToolHandler {
  definition: OpenAIToolDefinition;
  handler: (
    args: Record<string, JSONValue>,
    context: OpenAIToolHandlerContext,
  ) => Promise<JSONValue>;
}

export interface OpenAITextResponse {
  id: string;
  model: string;
  text: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export type OpenAIStreamEventType = "delta" | "done" | "tool_call" | "error";

export interface OpenAIStreamEvent {
  type: OpenAIStreamEventType;
  textDelta?: string;
  toolName?: string;
  toolArguments?: string;
  errorMessage?: string;
}

export interface OpenAIUsageLogEntry {
  requestId: string;
  operation: "response" | "response_stream" | "tool_call" | "mcp";
  model: string;
  outcome: "started" | "success" | "failure";
  latencyMs?: number;
  errorCode?: string;
  metadata?: Record<string, JSONValue>;
}
