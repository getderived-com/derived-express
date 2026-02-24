import { OpenAIMcpServerDefinition } from "./types";

export const mapMcpServersToOpenAITools = (
  servers: OpenAIMcpServerDefinition[] = [],
): Array<Record<string, unknown>> => {
  return servers.map((server) => ({
    type: "mcp",
    server_label: server.serverLabel,
    server_url: server.serverUrl,
    allowed_tools: server.allowedTools,
    headers: server.headers,
  }));
};
