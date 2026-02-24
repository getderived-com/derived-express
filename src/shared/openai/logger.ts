import { logger } from "../logger";
import { OpenAIUsageLogEntry } from "./types";

export interface OpenAIUsageLogger {
  log(entry: OpenAIUsageLogEntry): void;
}

export class WinstonOpenAIUsageLogger implements OpenAIUsageLogger {
  public log(entry: OpenAIUsageLogEntry): void {
    // Do not log prompts, responses, credentials, or raw tool payloads.
    logger.info("[OpenAIUsage]", entry);
  }
}
