export const userPaths = {
  "/users/register": {
    post: {
      tags: ["Users"],
      summary: "Register a new user",
      description: "Create a new user account with email and password",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/RegisterUserRequest"
            }
          }
        }
      },
      responses: {
        200: {
          description: "User registered successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UserResponse"
              }
            }
          }
        },
        400: {
          description: "Invalid input data",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        },
        409: {
          description: "User already exists",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        }
      }
    }
  },
  "/users/login": {
    post: {
      tags: ["Users"],
      summary: "User login",
      description: "Authenticate user with email and password",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/LoginUserRequest"
            }
          }
        }
      },
      responses: {
        200: {
          description: "User logged in successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/LoginResponse"
              }
            }
          }
        },
        400: {
          description: "Invalid credentials",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        },
        401: {
          description: "Unauthorized",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        }
      }
    }
  },
  "/users": {
    get: {
      tags: ["Users"],
      summary: "Get all users",
      description: "Retrieve all users with optional filtering and search",
      parameters: [
        {
          name: "name",
          in: "query",
          description: "Filter by user name",
          required: false,
          schema: {
            type: "string"
          }
        },
        {
          name: "email",
          in: "query",
          description: "Filter by user email",
          required: false,
          schema: {
            type: "string"
          }
        },
        {
          name: "search",
          in: "query",
          description: "Search term for users",
          required: false,
          schema: {
            type: "string"
          }
        }
      ],
      responses: {
        200: {
          description: "Users retrieved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UsersListResponse"
              }
            }
          }
        },
        400: {
          description: "Invalid query parameters",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        }
      }
    },
    post: {
      tags: ["Users"],
      summary: "Create a new user (Admin)",
      description: "Create a new user account (admin endpoint)",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/CreateUserRequest"
            }
          }
        }
      },
      responses: {
        200: {
          description: "User created successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UserResponse"
              }
            }
          }
        },
        400: {
          description: "Invalid input data",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        },
        409: {
          description: "User already exists",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        }
      }
    }
  },
  "/users/count": {
    get: {
      tags: ["Users"],
      summary: "Get users count",
      description: "Get total count of users with optional filtering",
      parameters: [
        {
          name: "name",
          in: "query",
          description: "Filter by user name",
          required: false,
          schema: {
            type: "string"
          }
        },
        {
          name: "email",
          in: "query",
          description: "Filter by user email",
          required: false,
          schema: {
            type: "string"
          }
        }
      ],
      responses: {
        200: {
          description: "Users count retrieved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CountResponse"
              }
            }
          }
        },
        400: {
          description: "Invalid query parameters",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        }
      }
    }
  },
  "/users/search/{searchTerm}": {
    get: {
      tags: ["Users"],
      summary: "Search users",
      description: "Search users by term",
      parameters: [
        {
          name: "searchTerm",
          in: "path",
          description: "Search term to find users",
          required: true,
          schema: {
            type: "string",
            minLength: 1
          }
        }
      ],
      responses: {
        200: {
          description: "Users search completed successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/SearchUsersResponse"
              }
            }
          }
        },
        400: {
          description: "Invalid search term",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        }
      }
    }
  },
  "/users/email/{email}": {
    get: {
      tags: ["Users"],
      summary: "Get user by email",
      description: "Retrieve a specific user by their email address",
      parameters: [
        {
          name: "email",
          in: "path",
          description: "Email address of the user",
          required: true,
          schema: {
            type: "string",
            format: "email"
          }
        }
      ],
      responses: {
        200: {
          description: "User retrieved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UserResponse"
              }
            }
          }
        },
        400: {
          description: "Invalid email format",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        },
        404: {
          description: "User not found",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        }
      }
    }
  },
  "/users/{id}": {
    get: {
      tags: ["Users"],
      summary: "Get user by ID",
      description: "Retrieve a specific user by their ID",
      parameters: [
        {
          name: "id",
          in: "path",
          description: "User ID",
          required: true,
          schema: {
            type: "integer",
            format: "int64"
          }
        }
      ],
      responses: {
        200: {
          description: "User retrieved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UserResponse"
              }
            }
          }
        },
        400: {
          description: "Invalid user ID",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        },
        404: {
          description: "User not found",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        }
      }
    },
    put: {
      tags: ["Users"],
      summary: "Update user",
      description: "Update user information",
      parameters: [
        {
          name: "id",
          in: "path",
          description: "User ID",
          required: true,
          schema: {
            type: "integer",
            format: "int64"
          }
        }
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/UpdateUserRequest"
            }
          }
        }
      },
      responses: {
        200: {
          description: "User updated successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UserResponse"
              }
            }
          }
        },
        400: {
          description: "Invalid input data or user ID",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        },
        404: {
          description: "User not found",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        }
      }
    },
    delete: {
      tags: ["Users"],
      summary: "Delete user",
      description: "Delete a user by ID",
      parameters: [
        {
          name: "id",
          in: "path",
          description: "User ID",
          required: true,
          schema: {
            type: "integer",
            format: "int64"
          }
        }
      ],
      responses: {
        200: {
          description: "User deleted successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UserResponse"
              }
            }
          }
        },
        400: {
          description: "Invalid user ID",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        },
        404: {
          description: "User not found",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        }
      }
    }
  }
};

export const userComponents = {
  schemas: {
    User: {
      type: "object",
      properties: {
        id: {
          type: "integer",
          format: "int64",
          description: "User ID"
        },
        name: {
          type: "string",
          minLength: 2,
          maxLength: 100,
          description: "User's full name"
        },
        email: {
          type: "string",
          format: "email",
          description: "User's email address"
        },
        createdAt: {
          type: "string",
          format: "date-time",
          description: "User creation timestamp"
        },
        updatedAt: {
          type: "string",
          format: "date-time",
          description: "User last update timestamp"
        }
      },
      required: ["id", "name", "email"]
    },
    RegisterUserRequest: {
      type: "object",
      properties: {
        name: {
          type: "string",
          minLength: 2,
          maxLength: 100,
          description: "User's full name"
        },
        email: {
          type: "string",
          format: "email",
          description: "User's email address"
        },
        password: {
          type: "string",
          minLength: 6,
          maxLength: 50,
          pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)",
          description: "Password (must contain at least one lowercase letter, one uppercase letter, and one number)"
        }
      },
      required: ["name", "email", "password"]
    },
    LoginUserRequest: {
      type: "object",
      properties: {
        email: {
          type: "string",
          format: "email",
          description: "User's email address"
        },
        password: {
          type: "string",
          minLength: 1,
          description: "User's password"
        }
      },
      required: ["email", "password"]
    },
    CreateUserRequest: {
      type: "object",
      properties: {
        name: {
          type: "string",
          minLength: 2,
          maxLength: 100,
          description: "User's full name"
        },
        email: {
          type: "string",
          format: "email",
          description: "User's email address"
        },
        password: {
          type: "string",
          minLength: 6,
          maxLength: 50,
          pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)",
          description: "Password (must contain at least one lowercase letter, one uppercase letter, and one number)"
        }
      },
      required: ["name", "email", "password"]
    },
    UpdateUserRequest: {
      type: "object",
      properties: {
        name: {
          type: "string",
          minLength: 2,
          maxLength: 100,
          description: "User's full name"
        },
        email: {
          type: "string",
          format: "email",
          description: "User's email address"
        },
        password: {
          type: "string",
          minLength: 6,
          maxLength: 50,
          pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)",
          description: "Password (must contain at least one lowercase letter, one uppercase letter, and one number)"
        }
      },
      description: "At least one field must be provided for update"
    },
    UserResponse: {
      type: "object",
      properties: {
        result: {
          $ref: "#/components/schemas/User"
        },
        status: {
          type: "string",
          example: "OK"
        },
        statusCode: {
          type: "integer",
          example: 200
        },
        msg: {
          type: "string",
          example: "User retrieved successfully"
        }
      },
      required: ["result", "status", "statusCode", "msg"]
    },
    LoginResponse: {
      type: "object",
      properties: {
        result: {
          type: "object",
          properties: {
            user: {
              $ref: "#/components/schemas/User"
            },
            token: {
              type: "string",
              description: "JWT authentication token"
            }
          },
          required: ["user", "token"]
        },
        status: {
          type: "string",
          example: "OK"
        },
        statusCode: {
          type: "integer",
          example: 200
        },
        msg: {
          type: "string",
          example: "User logged in successfully"
        }
      },
      required: ["result", "status", "statusCode", "msg"]
    },
    UsersListResponse: {
      type: "object",
      properties: {
        result: {
          type: "object",
          properties: {
            rows: {
              type: "array",
              items: {
                $ref: "#/components/schemas/User"
              }
            },
            count: {
              type: "integer",
              description: "Total number of users"
            }
          },
          required: ["rows", "count"]
        },
        status: {
          type: "string",
          example: "OK"
        },
        statusCode: {
          type: "integer",
          example: 200
        },
        msg: {
          type: "string",
          example: "Users retrieved successfully"
        }
      },
      required: ["result", "status", "statusCode", "msg"]
    },
    SearchUsersResponse: {
      type: "object",
      properties: {
        result: {
          type: "object",
          properties: {
            users: {
              type: "array",
              items: {
                $ref: "#/components/schemas/User"
              }
            },
            count: {
              type: "integer",
              description: "Number of users found"
            }
          },
          required: ["users", "count"]
        },
        status: {
          type: "string",
          example: "OK"
        },
        statusCode: {
          type: "integer",
          example: 200
        },
        msg: {
          type: "string",
          example: "Users search completed successfully"
        }
      },
      required: ["result", "status", "statusCode", "msg"]
    },
    CountResponse: {
      type: "object",
      properties: {
        result: {
          type: "object",
          properties: {
            count: {
              type: "integer",
              description: "Total count"
            }
          },
          required: ["count"]
        },
        status: {
          type: "string",
          example: "OK"
        },
        statusCode: {
          type: "integer",
          example: 200
        },
        msg: {
          type: "string",
          example: "Users count retrieved successfully"
        }
      },
      required: ["result", "status", "statusCode", "msg"]
    },
    ErrorResponse: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Error status"
        },
        statusCode: {
          type: "integer",
          description: "HTTP status code"
        },
        msg: {
          type: "string",
          description: "Error message"
        },
        stack: {
          type: "string",
          description: "Error stack trace (development only)"
        }
      },
      required: ["status", "statusCode", "msg"]
    }
  }
};
