export const chatPaths = {
  "/chat/models": {
    get: {
      tags: ["Chat"],
      summary: "Get supported AI models",
      description: "Retrieve a list of available AI models grouped by provider",
      responses: {
        200: {
          description: "List of supported AI models",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "Supported models retrieved successfully" },
                  data: {
                    type: "object",
                    properties: {
                      rows: {
                        type: "array",
                        items: { $ref: "#/components/schemas/AIModel" }
                      },
                      providers: {
                        type: "object",
                        properties: {
                          available: {
                            type: "array",
                            items: { type: "string" }
                          },
                          status: {
                            type: "object",
                            additionalProperties: { type: "boolean" }
                          }
                        }
                      },
                      count: { type: "integer" },
                      available: { type: "integer" }
                    }
                  }
                }
              }
            }
          }
        },
        401: { $ref: "#/components/responses/Unauthorized" },
        500: { $ref: "#/components/responses/InternalServerError" }
      },
      security: [{ BearerAuth: [] }]
    }
  },
  "/chat/send": {
    post: {
      tags: ["Chat"],
      summary: "Send message to AI",
      description: "Send a message to AI and receive an automated response",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/SendMessageRequest" }
          }
        }
      },
      responses: {
        200: {
          description: "Message sent successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "Message sent successfully" },
                  data: { $ref: "#/components/schemas/SendMessageResponse" }
                }
              }
            }
          }
        },
        400: { $ref: "#/components/responses/BadRequest" },
        401: { $ref: "#/components/responses/Unauthorized" },
        404: { $ref: "#/components/responses/NotFound" },
        500: { $ref: "#/components/responses/InternalServerError" }
      },
      security: [{ BearerAuth: [] }]
    }
  },
  "/chat/ai-sdk": {
    post: {
      tags: ["Chat"],
      summary: "AI SDK compatible streaming endpoint",
      description: "Send messages to AI with streaming response compatible with AI SDK",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AISDKRequest" }
          }
        }
      },
      responses: {
        200: {
          description: "Streaming response",
          content: {
            "text/event-stream": {
              schema: {
                type: "string",
                description: "Server-sent events stream"
              }
            }
          }
        },
        400: { $ref: "#/components/responses/BadRequest" },
        401: { $ref: "#/components/responses/Unauthorized" },
        500: { $ref: "#/components/responses/InternalServerError" }
      },
      security: [{ BearerAuth: [] }]
    }
  },
  "/chat/messages/{conversationId}": {
    get: {
      tags: ["Chat"],
      summary: "Get conversation messages",
      description: "Retrieve all messages in a specific conversation",
      parameters: [
        {
          name: "conversationId",
          in: "path",
          required: true,
          description: "Conversation ID",
          schema: { type: "integer", minimum: 1 }
        },
        {
          name: "role",
          in: "query",
          required: false,
          description: "Filter messages by role",
          schema: {
            type: "string",
            enum: ["USER", "ASSISTANT", "SYSTEM"]
          }
        },
        {
          name: "messageType",
          in: "query",
          required: false,
          description: "Filter messages by type",
          schema: {
            type: "string",
            enum: ["TEXT", "IMAGE", "FILE", "SYSTEM", "ERROR"]
          }
        },
        {
          name: "isDeleted",
          in: "query",
          required: false,
          description: "Filter deleted messages",
          schema: { type: "boolean" }
        },
        {
          name: "limit",
          in: "query",
          required: false,
          description: "Number of messages to return",
          schema: { type: "integer", minimum: 1, maximum: 100 }
        },
        {
          name: "offset",
          in: "query",
          required: false,
          description: "Number of messages to skip",
          schema: { type: "integer", minimum: 0 }
        }
      ],
      responses: {
        200: {
          description: "Messages retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "Messages retrieved successfully" },
                  data: {
                    type: "object",
                    properties: {
                      rows: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Message" }
                      },
                      count: { type: "integer" }
                    }
                  }
                }
              }
            }
          }
        },
        400: { $ref: "#/components/responses/BadRequest" },
        401: { $ref: "#/components/responses/Unauthorized" },
        403: { $ref: "#/components/responses/Forbidden" },
        404: { $ref: "#/components/responses/NotFound" },
        500: { $ref: "#/components/responses/InternalServerError" }
      },
      security: [{ BearerAuth: [] }]
    }
  },
  "/chat/messages": {
    get: {
      tags: ["Chat"],
      summary: "Get recent messages",
      description: "Get recent messages across all conversations",
      parameters: [
        {
          name: "role",
          in: "query",
          required: false,
          description: "Filter messages by role",
          schema: {
            type: "string",
            enum: ["USER", "ASSISTANT", "SYSTEM"]
          }
        },
        {
          name: "messageType",
          in: "query",
          required: false,
          description: "Filter messages by type",
          schema: {
            type: "string",
            enum: ["TEXT", "IMAGE", "FILE", "SYSTEM", "ERROR"]
          }
        },
        {
          name: "limit",
          in: "query",
          required: false,
          description: "Number of messages to return",
          schema: { type: "integer", minimum: 1, maximum: 100 }
        },
        {
          name: "offset",
          in: "query",
          required: false,
          description: "Number of messages to skip",
          schema: { type: "integer", minimum: 0 }
        }
      ],
      responses: {
        200: {
          description: "Recent messages retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "Recent messages retrieved successfully" },
                  data: {
                    type: "object",
                    properties: {
                      rows: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Message" }
                      },
                      count: { type: "integer", example: 0 }
                    }
                  }
                }
              }
            }
          }
        },
        401: { $ref: "#/components/responses/Unauthorized" },
        500: { $ref: "#/components/responses/InternalServerError" }
      },
      security: [{ BearerAuth: [] }]
    }
  },
  "/chat/messages/{id}/single": {
    get: {
      tags: ["Chat"],
      summary: "Get single message by ID",
      description: "Retrieve a specific message by its ID",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          description: "Message ID",
          schema: { type: "integer", minimum: 1 }
        }
      ],
      responses: {
        200: {
          description: "Message retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "Message retrieved successfully" },
                  data: { $ref: "#/components/schemas/Message" }
                }
              }
            }
          }
        },
        400: { $ref: "#/components/responses/BadRequest" },
        401: { $ref: "#/components/responses/Unauthorized" },
        403: { $ref: "#/components/responses/Forbidden" },
        404: { $ref: "#/components/responses/NotFound" },
        500: { $ref: "#/components/responses/InternalServerError" }
      },
      security: [{ BearerAuth: [] }]
    }
  },
  "/chat/messages/{messageId}": {
    put: {
      tags: ["Chat"],
      summary: "Update message",
      description: "Update a specific message by its ID",
      parameters: [
        {
          name: "messageId",
          in: "path",
          required: true,
          description: "Message ID",
          schema: { type: "integer", minimum: 1 }
        }
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateMessageRequest" }
          }
        }
      },
      responses: {
        200: {
          description: "Message updated successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "Message updated successfully" },
                  data: { $ref: "#/components/schemas/Message" }
                }
              }
            }
          }
        },
        400: { $ref: "#/components/responses/BadRequest" },
        401: { $ref: "#/components/responses/Unauthorized" },
        403: { $ref: "#/components/responses/Forbidden" },
        404: { $ref: "#/components/responses/NotFound" },
        500: { $ref: "#/components/responses/InternalServerError" }
      },
      security: [{ BearerAuth: [] }]
    },
    delete: {
      tags: ["Chat"],
      summary: "Delete message",
      description: "Delete a specific message by its ID",
      parameters: [
        {
          name: "messageId",
          in: "path",
          required: true,
          description: "Message ID",
          schema: { type: "integer", minimum: 1 }
        }
      ],
      responses: {
        200: {
          description: "Message deleted successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "Message deleted successfully" },
                  data: { $ref: "#/components/schemas/Message" }
                }
              }
            }
          }
        },
        400: { $ref: "#/components/responses/BadRequest" },
        401: { $ref: "#/components/responses/Unauthorized" },
        403: { $ref: "#/components/responses/Forbidden" },
        404: { $ref: "#/components/responses/NotFound" },
        500: { $ref: "#/components/responses/InternalServerError" }
      },
      security: [{ BearerAuth: [] }]
    }
  },
  "/chat/conversations": {
    post: {
      tags: ["Chat"],
      summary: "Create new conversation",
      description: "Create a new conversation",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateConversationRequest" }
          }
        }
      },
      responses: {
        200: {
          description: "Conversation created successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "Conversation created successfully" },
                  data: { $ref: "#/components/schemas/Conversation" }
                }
              }
            }
          }
        },
        400: { $ref: "#/components/responses/BadRequest" },
        401: { $ref: "#/components/responses/Unauthorized" },
        500: { $ref: "#/components/responses/InternalServerError" }
      },
      security: [{ BearerAuth: [] }]
    },
    get: {
      tags: ["Chat"],
      summary: "List conversations",
      description: "Retrieve all conversations for the authenticated user",
      parameters: [
        {
          name: "isArchived",
          in: "query",
          required: false,
          description: "Filter archived conversations",
          schema: { type: "boolean" }
        },
        {
          name: "search",
          in: "query",
          required: false,
          description: "Search conversations by title or description",
          schema: { type: "string", maxLength: 100 }
        }
      ],
      responses: {
        200: {
          description: "Conversations retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "Conversations retrieved successfully" },
                  data: {
                    type: "object",
                    properties: {
                      rows: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Conversation" }
                      },
                      count: { type: "integer" }
                    }
                  }
                }
              }
            }
          }
        },
        401: { $ref: "#/components/responses/Unauthorized" },
        500: { $ref: "#/components/responses/InternalServerError" }
      },
      security: [{ BearerAuth: [] }]
    }
  },
  "/chat/conversations/{id}": {
    get: {
      tags: ["Chat"],
      summary: "Get conversation by ID",
      description: "Retrieve a specific conversation by its ID",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          description: "Conversation ID",
          schema: { type: "integer", minimum: 1 }
        }
      ],
      responses: {
        200: {
          description: "Conversation retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "Conversation retrieved successfully" },
                  data: { $ref: "#/components/schemas/Conversation" }
                }
              }
            }
          }
        },
        400: { $ref: "#/components/responses/BadRequest" },
        401: { $ref: "#/components/responses/Unauthorized" },
        403: { $ref: "#/components/responses/Forbidden" },
        404: { $ref: "#/components/responses/NotFound" },
        500: { $ref: "#/components/responses/InternalServerError" }
      },
      security: [{ BearerAuth: [] }]
    },
    put: {
      tags: ["Chat"],
      summary: "Update conversation",
      description: "Update a specific conversation by its ID",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          description: "Conversation ID",
          schema: { type: "integer", minimum: 1 }
        }
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateConversationRequest" }
          }
        }
      },
      responses: {
        200: {
          description: "Conversation updated successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "Conversation updated successfully" },
                  data: { $ref: "#/components/schemas/Conversation" }
                }
              }
            }
          }
        },
        400: { $ref: "#/components/responses/BadRequest" },
        401: { $ref: "#/components/responses/Unauthorized" },
        403: { $ref: "#/components/responses/Forbidden" },
        404: { $ref: "#/components/responses/NotFound" },
        500: { $ref: "#/components/responses/InternalServerError" }
      },
      security: [{ BearerAuth: [] }]
    },
    delete: {
      tags: ["Chat"],
      summary: "Delete conversation",
      description: "Delete a specific conversation by its ID",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          description: "Conversation ID",
          schema: { type: "integer", minimum: 1 }
        }
      ],
      responses: {
        200: {
          description: "Conversation deleted successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "Conversation deleted successfully" },
                  data: { $ref: "#/components/schemas/Conversation" }
                }
              }
            }
          }
        },
        400: { $ref: "#/components/responses/BadRequest" },
        401: { $ref: "#/components/responses/Unauthorized" },
        403: { $ref: "#/components/responses/Forbidden" },
        404: { $ref: "#/components/responses/NotFound" },
        500: { $ref: "#/components/responses/InternalServerError" }
      },
      security: [{ BearerAuth: [] }]
    }
  },
  "/chat/conversations/{id}/participants": {
    post: {
      tags: ["Chat"],
      summary: "Add user to conversation",
      description: "Add a user to a specific conversation",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          description: "Conversation ID",
          schema: { type: "integer", minimum: 1 }
        }
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AddUserToConversationRequest" }
          }
        }
      },
      responses: {
        200: {
          description: "User added to conversation successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "User added to conversation successfully" },
                  data: { type: "null" }
                }
              }
            }
          }
        },
        400: { $ref: "#/components/responses/BadRequest" },
        401: { $ref: "#/components/responses/Unauthorized" },
        403: { $ref: "#/components/responses/Forbidden" },
        404: { $ref: "#/components/responses/NotFound" },
        500: { $ref: "#/components/responses/InternalServerError" }
      },
      security: [{ BearerAuth: [] }]
    }
  },
  "/chat/conversations/{id}/participants/{userId}": {
    delete: {
      tags: ["Chat"],
      summary: "Remove user from conversation",
      description: "Remove a user from a specific conversation",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          description: "Conversation ID",
          schema: { type: "integer", minimum: 1 }
        },
        {
          name: "userId",
          in: "path",
          required: true,
          description: "User ID to remove",
          schema: { type: "integer", minimum: 1 }
        }
      ],
      responses: {
        200: {
          description: "User removed from conversation successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "User removed from conversation successfully" },
                  data: { type: "null" }
                }
              }
            }
          }
        },
        400: { $ref: "#/components/responses/BadRequest" },
        401: { $ref: "#/components/responses/Unauthorized" },
        403: { $ref: "#/components/responses/Forbidden" },
        404: { $ref: "#/components/responses/NotFound" },
        500: { $ref: "#/components/responses/InternalServerError" }
      },
      security: [{ BearerAuth: [] }]
    }
  }
};

export const chatComponents = {
  schemas: {
    AIModel: {
      type: "object",
      properties: {
        id: { type: "string", example: "gpt-4" },
        name: { type: "string", example: "GPT-4" },
        provider: { type: "string", example: "openai" },
        description: { type: "string", example: "Most capable GPT-4 model, great for complex tasks" },
        maxTokens: { type: "integer", example: 8192 },
        supportsStreaming: { type: "boolean", example: true },
        isDefault: { type: "boolean", example: true },
        available: { type: "boolean", example: true }
      }
    },
    SendMessageRequest: {
      type: "object",
      required: ["conversationId", "content"],
      properties: {
        conversationId: { type: "integer", minimum: 1, example: 1 },
        content: { type: "string", minLength: 1, maxLength: 10000, example: "Hello, how can you help me today?" },
        messageType: { type: "string", enum: ["TEXT", "IMAGE", "FILE", "SYSTEM", "ERROR"], default: "TEXT" },
        model: { type: "string", maxLength: 100, example: "gpt-4" },
        metadata: { type: "object", additionalProperties: true },
        parentId: { type: "integer", minimum: 1, example: 5 }
      }
    },
    SendMessageResponse: {
      type: "object",
      properties: {
        userMessage: { $ref: "#/components/schemas/Message" },
        aiMessage: { $ref: "#/components/schemas/Message" },
        conversation: { $ref: "#/components/schemas/Conversation" }
      }
    },
    AISDKRequest: {
      type: "object",
      required: ["messages"],
      properties: {
        messages: {
          type: "array",
          minItems: 1,
          maxItems: 100,
          items: { $ref: "#/components/schemas/AISDKMessage" }
        },
        model: { type: "string", maxLength: 100, example: "gpt-4" },
        conversationId: { type: "integer", minimum: 1, example: 1 },
        temperature: { type: "number", minimum: 0, maximum: 2, example: 0.7 },
        maxTokens: { type: "integer", minimum: 1, maximum: 32000, example: 4000 },
        stream: { type: "boolean", example: true }
      }
    },
    AISDKMessage: {
      type: "object",
      required: ["role", "content"],
      properties: {
        role: { type: "string", enum: ["user", "assistant", "system"] },
        content: { type: "string", minLength: 1, example: "Hello, how can you help me?" },
        id: { type: "string", example: "msg_123" },
        createdAt: { type: "string", format: "date-time" }
      }
    },
    Message: {
      type: "object",
      properties: {
        id: { type: "integer", example: 1 },
        conversationId: { type: "integer", example: 1 },
        userId: { type: "integer", example: 1, nullable: true },
        content: { type: "string", example: "Hello, how can you help me?" },
        messageType: { type: "string", enum: ["TEXT", "IMAGE", "FILE", "SYSTEM", "ERROR"] },
        role: { type: "string", enum: ["USER", "ASSISTANT", "SYSTEM"] },
        model: { type: "string", example: "gpt-4", nullable: true },
        reasoning: { type: "object", additionalProperties: true, nullable: true },
        metadata: { type: "object", additionalProperties: true, nullable: true },
        parentId: { type: "integer", example: 5, nullable: true },
        isEdited: { type: "boolean", example: false },
        isDeleted: { type: "boolean", example: false },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" }
      }
    },
    UpdateMessageRequest: {
      type: "object",
      properties: {
        content: { type: "string", minLength: 1, maxLength: 10000, example: "Updated message content" },
        isEdited: { type: "boolean", example: true },
        isDeleted: { type: "boolean", example: false }
      }
    },
    CreateConversationRequest: {
      type: "object",
      properties: {
        title: { type: "string", minLength: 1, maxLength: 200, example: "My AI Chat" },
        description: { type: "string", maxLength: 1000, example: "A conversation about AI topics" },
        settings: { type: "object", additionalProperties: true }
      }
    },
    UpdateConversationRequest: {
      type: "object",
      properties: {
        title: { type: "string", minLength: 1, maxLength: 200, example: "Updated conversation title" },
        description: { type: "string", maxLength: 1000, example: "Updated conversation description" },
        settings: { type: "object", additionalProperties: true }
      }
    },
    Conversation: {
      type: "object",
      properties: {
        id: { type: "integer", example: 1 },
        title: { type: "string", example: "My AI Chat" },
        description: { type: "string", example: "A conversation about AI topics" },
        userId: { type: "integer", example: 1 },
        settings: { type: "object", additionalProperties: true },
        isArchived: { type: "boolean", example: false },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" }
      }
    },
    AddUserToConversationRequest: {
      type: "object",
      required: ["targetUserId"],
      properties: {
        targetUserId: { type: "integer", minimum: 1, example: 2 },
        role: { type: "string", minLength: 1, maxLength: 50, example: "member", default: "member" }
      }
    }
  }
};

export const chatResponseComponents = {
  BadRequest: {
    description: "Bad request",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Validation error" },
            errors: { type: "array", items: { type: "string" } }
          }
        }
      }
    }
  },
  Unauthorized: {
    description: "Unauthorized",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Authentication required" }
          }
        }
      }
    }
  },
  Forbidden: {
    description: "Forbidden",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "You don't have permission to access this resource" }
          }
        }
      }
    }
  },
  NotFound: {
    description: "Not found",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Resource not found" }
          }
        }
      }
    }
  },
  InternalServerError: {
    description: "Internal server error",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Internal server error" }
          }
        }
      }
    }
  }
}; 