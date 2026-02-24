export type OpenAIErrorCategory =
  | "config"
  | "auth"
  | "rate_limit"
  | "timeout"
  | "network"
  | "provider"
  | "tool"
  | "mcp"
  | "unknown";

export interface OpenAIErrorMetadata {
  operation: "response" | "response_stream" | "tool_call" | "mcp";
  requestId: string;
  providerStatus?: number;
  originalMessage?: string;
}

export class OpenAIServiceError extends Error {
  public readonly category: OpenAIErrorCategory;
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly metadata: OpenAIErrorMetadata;

  constructor(
    message: string,
    category: OpenAIErrorCategory,
    code: string,
    retryable: boolean,
    metadata: OpenAIErrorMetadata,
  ) {
    super(message);
    this.name = "OpenAIServiceError";
    this.category = category;
    this.code = code;
    this.retryable = retryable;
    this.metadata = metadata;
  }
}

export const mapOpenAIError = (
  error: unknown,
  metadata: OpenAIErrorMetadata,
): OpenAIServiceError => {
  if (error instanceof OpenAIServiceError) {
    return error;
  }

  const raw = error as {
    message?: string;
    status?: number;
    code?: string;
    name?: string;
    type?: string;
  };

  const status = raw?.status;
  const message = raw?.message || "OpenAI request failed";

  if (metadata.operation === "tool_call") {
    return new OpenAIServiceError(message, "tool", "TOOL_EXECUTION_FAILED", false, {
      ...metadata,
      providerStatus: status,
      originalMessage: message,
    });
  }

  if (metadata.operation === "mcp") {
    return new OpenAIServiceError(message, "mcp", "MCP_EXECUTION_FAILED", true, {
      ...metadata,
      providerStatus: status,
      originalMessage: message,
    });
  }

  if (status === 401 || status === 403) {
    return new OpenAIServiceError(message, "auth", "OPENAI_AUTH_ERROR", false, {
      ...metadata,
      providerStatus: status,
      originalMessage: message,
    });
  }

  if (status === 429) {
    return new OpenAIServiceError(message, "rate_limit", "OPENAI_RATE_LIMITED", true, {
      ...metadata,
      providerStatus: status,
      originalMessage: message,
    });
  }

  if (status && status >= 500) {
    return new OpenAIServiceError(message, "provider", "OPENAI_PROVIDER_ERROR", true, {
      ...metadata,
      providerStatus: status,
      originalMessage: message,
    });
  }

  if (raw?.name === "AbortError") {
    return new OpenAIServiceError(message, "timeout", "OPENAI_TIMEOUT", true, {
      ...metadata,
      providerStatus: status,
      originalMessage: message,
    });
  }

  if (raw?.code === "ECONNRESET" || raw?.code === "ENOTFOUND") {
    return new OpenAIServiceError(message, "network", "OPENAI_NETWORK_ERROR", true, {
      ...metadata,
      providerStatus: status,
      originalMessage: message,
    });
  }

  return new OpenAIServiceError(message, "unknown", "OPENAI_UNKNOWN_ERROR", false, {
    ...metadata,
    providerStatus: status,
    originalMessage: message,
  });
};
