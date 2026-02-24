import { OpenAIToolHandler, JSONValue } from "./types";

export const mapToolHandlersToOpenAITools = (
  toolHandlers: OpenAIToolHandler[] = [],
): Array<Record<string, unknown>> => {
  return toolHandlers.map((toolHandler) => ({
    type: "function",
    name: toolHandler.definition.name,
    description: toolHandler.definition.description,
    parameters: toolHandler.definition.inputSchema,
  }));
};

export const buildToolHandlerMap = (
  toolHandlers: OpenAIToolHandler[] = [],
): Map<string, OpenAIToolHandler> => {
  return new Map(toolHandlers.map((handler) => [handler.definition.name, handler]));
};

export const parseToolArguments = (argumentsJson: string): Record<string, JSONValue> => {
  if (!argumentsJson || !argumentsJson.trim()) {
    return {};
  }

  const parsed = JSON.parse(argumentsJson);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {};
  }

  return parsed as Record<string, JSONValue>;
};
