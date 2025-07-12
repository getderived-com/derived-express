import { z } from "zod";

export const messageTypeSchema = z.enum(["TEXT", "IMAGE", "FILE", "SYSTEM", "ERROR"]);
export const messageRoleSchema = z.enum(["USER", "ASSISTANT", "SYSTEM"]);

export const sendMessageSchema = z.object({
  conversationId: z
    .coerce
    .number()
    .int("Conversation ID must be an integer")
    .positive("Conversation ID must be positive"),
  content: z
    .string()
    .min(1, "Message content is required")
    .max(10000, "Message content must not exceed 10,000 characters")
    .trim(),
  messageType: messageTypeSchema.optional(),
  model: z
    .string()
    .min(1, "Model name cannot be empty")
    .max(100, "Model name must not exceed 100 characters")
    .optional(),
  metadata: z.record(z.any()).optional(),
  parentId: z
    .coerce
    .number()
    .int("Parent ID must be an integer")
    .positive("Parent ID must be positive")
    .optional()
});

export const createConversationSchema = z.object({
  title: z
    .string()
    .min(1, "Title cannot be empty")
    .max(200, "Title must not exceed 200 characters")
    .trim()
    .optional(),
  description: z
    .string()
    .max(1000, "Description must not exceed 1,000 characters")
    .trim()
    .optional(),
  settings: z.record(z.any()).optional()
});

export const updateConversationSchema = z.object({
  title: z
    .string()
    .min(1, "Title cannot be empty")
    .max(200, "Title must not exceed 200 characters")
    .trim()
    .optional(),
  description: z
    .string()
    .max(1000, "Description must not exceed 1,000 characters")
    .trim()
    .optional(),
  settings: z.record(z.any()).optional()
}).refine(
  (data) => data.title !== undefined || data.description !== undefined || data.settings !== undefined,
  "At least one field (title, description, or settings) must be provided for update"
);

export const updateMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message content cannot be empty")
    .max(10000, "Message content must not exceed 10,000 characters")
    .trim()
    .optional(),
  isEdited: z.boolean().optional(),
  isDeleted: z.boolean().optional()
}).refine(
  (data) => data.content !== undefined || data.isEdited !== undefined || data.isDeleted !== undefined,
  "At least one field must be provided for update"
);

export const conversationFiltersSchema = z.object({
  isArchived: z
    .string()
    .transform((val) => val === "true")
    .pipe(z.boolean())
    .optional(),
  search: z
    .string()
    .min(1, "Search term cannot be empty")
    .max(100, "Search term must not exceed 100 characters")
    .trim()
    .optional()
});

export const messageFiltersSchema = z.object({
  role: messageRoleSchema.optional(),
  messageType: messageTypeSchema.optional(),
  isDeleted: z
    .string()
    .transform((val) => val === "true")
    .pipe(z.boolean())
    .optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100))
    .optional(),
  offset: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(0))
    .optional()
});

export const conversationIdParamSchema = z.object({
  id: z
    .coerce
    .number()
    .int("Conversation ID must be an integer")
    .positive("Conversation ID must be positive")
});

export const messageIdParamSchema = z.object({
  id: z
    .coerce
    .number()
    .int("Message ID must be an integer")
    .positive("Message ID must be positive")
});

export const addUserToConversationSchema = z.object({
  targetUserId: z
    .coerce
    .number()
    .int("User ID must be an integer")
    .positive("User ID must be positive"),
  role: z
    .string()
    .min(1, "Role cannot be empty")
    .max(50, "Role must not exceed 50 characters")
    .trim()
    .default("member")
});

export const removeUserFromConversationSchema = z.object({
  userId: z
    .coerce
    .number()
    .int("User ID must be an integer")
    .positive("User ID must be positive")
});

export const aiSDKMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1, "Message content is required"),
  id: z.string().optional(),
  createdAt: z.string().optional()
});

export const aiSDKSchema = z.object({
  messages: z
    .array(aiSDKMessageSchema)
    .min(1, "At least one message is required")
    .max(100, "Cannot send more than 100 messages at once"),
  model: z
    .string()
    .min(1, "Model name cannot be empty")
    .max(100, "Model name must not exceed 100 characters")
    .optional(),
  conversationId: z
    .coerce
    .number()
    .int("Conversation ID must be an integer")
    .optional(),
  temperature: z
    .number()
    .min(0, "Temperature must be at least 0")
    .max(2, "Temperature must not exceed 2")
    .optional(),
  maxTokens: z
    .number()
    .int("Max tokens must be an integer")
    .min(1, "Max tokens must be at least 1")
    .max(32000, "Max tokens must not exceed 32,000")
    .optional(),
  stream: z.boolean().optional()
}); 