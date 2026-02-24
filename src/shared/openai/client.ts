import OpenAI from "openai";
import { OpenAIConfig } from "./config";

export const createOpenAIClient = (config: OpenAIConfig): OpenAI => {
  return new OpenAI({
    apiKey: config.apiKey,
    organization: config.organization,
    project: config.project,
    maxRetries: config.maxRetries,
    timeout: config.timeoutMs,
  });
};
