export interface OpenAIConfig {
  apiKey: string;
  defaultModel: string;
  timeoutMs: number;
  maxRetries: number;
  organization?: string;
  project?: string;
}

export interface OpenAIConfigOverrides {
  apiKey?: string;
  defaultModel?: string;
  timeoutMs?: number;
  maxRetries?: number;
  organization?: string;
  project?: string;
}

export const resolveOpenAIConfig = (
  overrides: OpenAIConfigOverrides = {},
): OpenAIConfig => {
  const apiKey = overrides.apiKey || process.env.OPENAI_API_KEY || "";

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required. Configure it in environment variables or OpenAIConfigOverrides.",
    );
  }

  return {
    apiKey,
    defaultModel:
      overrides.defaultModel || process.env.OPENAI_DEFAULT_MODEL || "gpt-4.1-mini",
    timeoutMs:
      overrides.timeoutMs ||
      Number(process.env.OPENAI_TIMEOUT_MS || 30000),
    maxRetries:
      overrides.maxRetries ||
      Number(process.env.OPENAI_MAX_RETRIES || 2),
    organization: overrides.organization || process.env.OPENAI_ORGANIZATION,
    project: overrides.project || process.env.OPENAI_PROJECT,
  };
};
