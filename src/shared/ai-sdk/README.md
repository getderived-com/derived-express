# AI SDK Library

A common AI SDK library for integrating various AI providers (OpenAI, Google Gemini, Anthropic) across different features like chat, calendar, and todo applications.

## Features

- **Multi-provider support**: OpenAI, Google Gemini, Anthropic Claude
- **Streaming responses**: Real-time AI responses with Server-Sent Events
- **Type-safe**: Full TypeScript support with comprehensive interfaces
- **Feature-specific contexts**: Specialized contexts for chat, calendar, and todo features
- **Error handling**: Robust error handling with custom error types
- **Configuration management**: Environment-based configuration with validation

## Setup

### 1. Environment Variables

Add the following to your `.env` file:

```env
# AI Provider API Keys
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# AI Configuration
DEFAULT_AI_PROVIDER=google
DEFAULT_AI_MODEL=gemini-1.5-flash
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=4000
```

### 2. Get API Keys

- **OpenAI**: https://platform.openai.com/api-keys
- **Google AI**: https://makersuite.google.com/app/apikey
- **Anthropic**: https://console.anthropic.com/

## Usage

### Basic Usage

```typescript
import { createAIService, getDefaultAIService } from '../shared/ai-sdk';

// Using default service (configured via environment)
const aiService = getDefaultAIService();

// Creating a custom service
const customService = createAIService('google', {
  model: 'gemini-1.5-pro',
  temperature: 0.8
});
```

### Chat Feature

```typescript
import { AIService, ChatContext } from '../shared/ai-sdk';

const aiService = getDefaultAIService();

// Simple chat response
const chatContext: ChatContext = {
  messages: [
    { role: 'user', content: 'Hello, how are you?' }
  ],
  conversationId: 123,
  userId: 456
};

const response = await aiService.generateChatResponse(chatContext);
console.log(response.content);

// Streaming chat response
for await (const chunk of aiService.generateChatStreamingResponse(chatContext)) {
  if (!chunk.isComplete) {
    process.stdout.write(chunk.content);
  } else {
    console.log('\n--- Response complete ---');
    console.log('Usage:', chunk.metadata?.usage);
  }
}
```

### Calendar Feature

```typescript
import { CalendarContext } from '../shared/ai-sdk';
import { z } from 'zod';

// Define schema for calendar actions
const EventSchema = z.object({
  title: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  description: z.string().optional()
});

const calendarContext: CalendarContext = {
  messages: [
    { role: 'user', content: 'Schedule a meeting for tomorrow at 2 PM' }
  ],
  timeZone: 'America/New_York',
  enableEventCreation: true
};

// Get structured response
const event = await aiService.generateCalendarAction(calendarContext, EventSchema);
console.log('Created event:', event);
```

### Todo Feature

```typescript
import { TodoContext } from '../shared/ai-sdk';
import { z } from 'zod';

const TaskSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string().optional()
});

const todoContext: TodoContext = {
  messages: [
    { role: 'user', content: 'Create a high priority task to review the quarterly report' }
  ],
  userId: 456,
  enableTaskCreation: true
};

const task = await aiService.generateTodoAction(todoContext, TaskSchema);
console.log('Created task:', task);
```

### Error Handling

```typescript
import { AIError, AIRateLimitError, AIConfigError } from '../shared/ai-sdk';

try {
  const response = await aiService.generateResponse(messages);
} catch (error) {
  if (error instanceof AIRateLimitError) {
    console.log(`Rate limited. Retry after: ${error.retryAfter} seconds`);
  } else if (error instanceof AIConfigError) {
    console.log('Configuration error:', error.message);
  } else if (error instanceof AIError) {
    console.log(`AI error from ${error.provider}:`, error.message);
  }
}
```

## API Endpoints

### Chat Endpoints

#### Standard Chat
```
POST /api/v1/chat/send
```

Request body:
```json
{
  "conversationId": 123,
  "content": "Hello, how are you?",
  "model": "gemini-1.5-flash"
}
```

#### Streaming Chat
```
POST /api/v1/chat/stream
```

Request body: Same as standard chat

Response: Server-Sent Events stream with events:
- `start`: Stream initialization
- `content`: Incremental content chunks
- `complete`: Final response with metadata
- `error`: Error messages
- `end`: Stream completion

### Using Streaming in Frontend

```javascript
const eventSource = new EventSource('/api/v1/chat/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    conversationId: 123,
    content: 'Hello!'
  })
});

eventSource.addEventListener('content', (event) => {
  const data = JSON.parse(event.data);
  // Append data.content to your UI
});

eventSource.addEventListener('complete', (event) => {
  const data = JSON.parse(event.data);
  // Handle completion, save messages, etc.
});

eventSource.addEventListener('error', (event) => {
  const data = JSON.parse(event.data);
  console.error('Stream error:', data.error);
});
```

## Configuration

### Provider-specific Models

```typescript
// OpenAI models
const openaiService = createAIService('openai', {
  model: 'gpt-4-turbo',
  temperature: 0.7
});

// Google Gemini models
const googleService = createAIService('google', {
  model: 'gemini-1.5-pro',
  temperature: 0.8
});

// Anthropic Claude models
const anthropicService = createAIService('anthropic', {
  model: 'claude-3-haiku-20240307',
  temperature: 0.6
});
```

### System Prompts

```typescript
import { getSystemPrompt } from '../shared/ai-sdk';

// Feature-specific prompts
const chatPrompt = getSystemPrompt('chat');
const calendarPrompt = getSystemPrompt('calendar');
const todoPrompt = getSystemPrompt('todo');

// Custom system prompt
const customContext: ChatContext = {
  messages: [...],
  systemPrompt: 'You are a helpful assistant specialized in...'
};
```

## Architecture

```
src/shared/ai-sdk/
├── index.ts          # Main exports
├── types.ts          # TypeScript interfaces and types
├── config.ts         # Configuration management
├── ai-service.ts     # Core AI service implementation
└── README.md         # This documentation
```

## Extensions

To add a new AI provider:

1. Add the provider to `AIProvider` type in `types.ts`
2. Add configuration in `config.ts`
3. Implement provider in `ai-service.ts` `getModelInstance()` method
4. Add environment variable support

To add a new feature context:

1. Create interface extending `AIConversationContext` in `types.ts`
2. Add feature-specific methods to `AIService` class
3. Add system prompt in `config.ts`

## License

This AI SDK library is part of the Express application and follows the same license terms. 