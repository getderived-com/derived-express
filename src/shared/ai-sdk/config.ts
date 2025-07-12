import { APP_SETTINGS } from "../app-settings";
import { AIConfig, AIProvider, AIConfigError } from "./types";

// Environment variables for AI providers
const {
  OPENAI_API_KEY,
  GOOGLE_AI_API_KEY,
  ANTHROPIC_API_KEY,
  DEFAULT_AI_PROVIDER = 'google',
  DEFAULT_AI_MODEL,
  AI_TEMPERATURE = '0.7',
  AI_MAX_TOKENS = '4000',
} = process.env;

// Default models for each provider
const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: 'gpt-4',
  google: 'gemini-1.5-flash',
  anthropic: 'claude-3-haiku-20240307'
};

// Provider configurations
export const AI_PROVIDERS: Record<AIProvider, Omit<AIConfig, 'apiKey'>> = {
  openai: {
    provider: 'openai',
    model: DEFAULT_MODELS.openai,
    temperature: parseFloat(AI_TEMPERATURE),
    maxTokens: parseInt(AI_MAX_TOKENS),
    enableStreaming: true,
  },
  google: {
    provider: 'google',
    model: DEFAULT_MODELS.google,
    temperature: parseFloat(AI_TEMPERATURE),
    maxTokens: parseInt(AI_MAX_TOKENS),
    enableStreaming: true,
  },
  anthropic: {
    provider: 'anthropic',
    model: DEFAULT_MODELS.anthropic,
    temperature: parseFloat(AI_TEMPERATURE),
    maxTokens: parseInt(AI_MAX_TOKENS),
    enableStreaming: true,
  }
};

/**
 * Get AI configuration for the specified provider
 */
export function getAIConfig(provider?: AIProvider, overrides?: Partial<AIConfig>): AIConfig {
  const selectedProvider = provider || (DEFAULT_AI_PROVIDER as AIProvider);
  
  // Validate provider is supported
  if (!isValidProvider(selectedProvider)) {
    throw new AIConfigError(`Unsupported AI provider: ${selectedProvider}. Supported providers: ${Object.keys(AI_PROVIDERS).join(', ')}`, selectedProvider);
  }

  const apiKey = getAPIKey(selectedProvider);
  if (!apiKey) {
    throw new AIConfigError(`Missing API key for provider: ${selectedProvider}. Please set the corresponding environment variable.`, selectedProvider);
  }

  const baseConfig = AI_PROVIDERS[selectedProvider];
  
  return {
    ...baseConfig,
    apiKey,
    model: overrides?.model || DEFAULT_AI_MODEL || baseConfig.model,
    temperature: overrides?.temperature ?? baseConfig.temperature,
    maxTokens: overrides?.maxTokens ?? baseConfig.maxTokens,
    systemPrompt: overrides?.systemPrompt,
    enableStreaming: overrides?.enableStreaming ?? baseConfig.enableStreaming,
    ...overrides
  };
}

/**
 * Get API key for the specified provider
 */
function getAPIKey(provider: AIProvider): string | undefined {
  switch (provider) {
    case 'openai':
      return OPENAI_API_KEY;
    case 'google':
      return GOOGLE_AI_API_KEY;
    case 'anthropic':
      return ANTHROPIC_API_KEY;
    default:
      return undefined;
  }
}

/**
 * Check if provider is valid (exists in our supported list)
 */
function isValidProvider(provider: string): provider is AIProvider {
  return provider in AI_PROVIDERS;
}

/**
 * Validate AI configuration
 */
export function validateAIConfig(config: AIConfig): void {
  if (!isValidProvider(config.provider)) {
    throw new AIConfigError(`Unsupported AI provider: ${config.provider}. Supported providers: ${Object.keys(AI_PROVIDERS).join(', ')}`, config.provider);
  }

  if (!config.apiKey) {
    throw new AIConfigError(`Missing API key for provider: ${config.provider}`, config.provider);
  }

  if (!config.model) {
    throw new AIConfigError(`Missing model for provider: ${config.provider}`, config.provider);
  }

  if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
    throw new AIConfigError(`Temperature must be between 0 and 2`, config.provider);
  }

  if (config.maxTokens !== undefined && config.maxTokens <= 0) {
    throw new AIConfigError(`Max tokens must be greater than 0`, config.provider);
  }
}

/**
 * Get all available providers (those with API keys configured)
 */
export function getAvailableProviders(): AIProvider[] {
  const availableProviders: AIProvider[] = [];
  
  if (OPENAI_API_KEY) {
    availableProviders.push('openai');
  }
  if (GOOGLE_AI_API_KEY) {
    availableProviders.push('google');
  }
  if (ANTHROPIC_API_KEY) {
    availableProviders.push('anthropic');
  }
  
  return availableProviders;
}

/**
 * Check if a specific provider is available (has API key configured)
 */
export function isProviderAvailable(provider: AIProvider): boolean {
  return getAPIKey(provider) !== undefined;
}

/**
 * Get the best available provider (prioritizing the default, then fallback order)
 */
export function getBestAvailableProvider(): AIProvider {
  const defaultProvider = DEFAULT_AI_PROVIDER as AIProvider;
  
  // Try default provider first
  if (isProviderAvailable(defaultProvider)) {
    return defaultProvider;
  }
  
  // Fallback order: google -> openai -> anthropic
  const fallbackOrder: AIProvider[] = ['google', 'openai', 'anthropic'];
  
  for (const provider of fallbackOrder) {
    if (isProviderAvailable(provider)) {
      return provider;
    }
  }
  
  throw new AIConfigError('No AI providers available. Please configure at least one API key.', 'google');
}

/**
 * Feature-specific system prompts
 */
export const SYSTEM_PROMPTS = {
  chat: "You are a helpful AI assistant. Provide accurate, helpful, and concise responses to user questions.",
  
  calendar: `You are an AI assistant specialized in calendar and scheduling. You can help users:
- Create, modify, and delete events
- Find available time slots
- Schedule meetings
- Set reminders
- Analyze calendar patterns
Always ask for clarification if event details are ambiguous.`,

  todo: `You are an AI assistant specialized in task and project management. You can help users:
- Create, organize, and prioritize tasks
- Break down complex projects into smaller tasks
- Set deadlines and reminders
- Track progress
- Suggest productivity improvements
Focus on actionable and clear task descriptions.`,

  default: "You are a helpful AI assistant."
};

/**
 * Get system prompt for a specific feature
 */
export function getSystemPrompt(feature: keyof typeof SYSTEM_PROMPTS = 'default'): string {
  return SYSTEM_PROMPTS[feature] || SYSTEM_PROMPTS.default;
} 