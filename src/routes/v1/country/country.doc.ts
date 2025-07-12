export const countryPaths = {
  "/countries": {
    get: {
      tags: ["Countries"],
      summary: "Get all countries",
      description: "Retrieve all countries with optional filtering and search",
      parameters: [
        {
          name: "name",
          in: "query",
          description: "Filter by country name",
          required: false,
          schema: {
            type: "string"
          }
        },
        {
          name: "code",
          in: "query",
          description: "Filter by country code",
          required: false,
          schema: {
            type: "string"
          }
        },
        {
          name: "search",
          in: "query",
          description: "Search term for countries",
          required: false,
          schema: {
            type: "string"
          }
        }
      ],
      responses: {
        200: {
          description: "Countries retrieved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CountriesListResponse"
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
      tags: ["Countries"],
      summary: "Create a new country",
      description: "Create a new country with name and code",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/CreateCountryRequest"
            }
          }
        }
      },
      responses: {
        200: {
          description: "Country created successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CountryResponse"
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
          description: "Country already exists",
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
  "/countries/count": {
    get: {
      tags: ["Countries"],
      summary: "Get countries count",
      description: "Get the total count of countries with optional filtering",
      parameters: [
        {
          name: "name",
          in: "query",
          description: "Filter by country name",
          required: false,
          schema: {
            type: "string"
          }
        },
        {
          name: "code",
          in: "query",
          description: "Filter by country code",
          required: false,
          schema: {
            type: "string"
          }
        }
      ],
      responses: {
        200: {
          description: "Countries count retrieved successfully",
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
  "/countries/search/{searchTerm}": {
    get: {
      tags: ["Countries"],
      summary: "Search countries",
      description: "Search countries by term",
      parameters: [
        {
          name: "searchTerm",
          in: "path",
          description: "Search term to find countries",
          required: true,
          schema: {
            type: "string",
            minLength: 1
          }
        }
      ],
      responses: {
        200: {
          description: "Countries search completed successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/SearchCountriesResponse"
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
  "/countries/code/{code}": {
    get: {
      tags: ["Countries"],
      summary: "Get country by code",
      description: "Retrieve a specific country by its code",
      parameters: [
        {
          name: "code",
          in: "path",
          description: "Country code (2-3 letters)",
          required: true,
          schema: {
            type: "string",
            minLength: 2,
            maxLength: 3,
            pattern: "^[A-Za-z]+$"
          }
        }
      ],
      responses: {
        200: {
          description: "Country retrieved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CountryResponse"
              }
            }
          }
        },
        400: {
          description: "Invalid country code",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        },
        404: {
          description: "Country not found",
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
  "/countries/{id}": {
    get: {
      tags: ["Countries"],
      summary: "Get country by ID",
      description: "Retrieve a specific country by its ID",
      parameters: [
        {
          name: "id",
          in: "path",
          description: "Country ID",
          required: true,
          schema: {
            type: "integer",
            format: "int64"
          }
        }
      ],
      responses: {
        200: {
          description: "Country retrieved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CountryResponse"
              }
            }
          }
        },
        400: {
          description: "Invalid country ID",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        },
        404: {
          description: "Country not found",
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
      tags: ["Countries"],
      summary: "Update country",
      description: "Update country information",
      parameters: [
        {
          name: "id",
          in: "path",
          description: "Country ID",
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
              $ref: "#/components/schemas/UpdateCountryRequest"
            }
          }
        }
      },
      responses: {
        200: {
          description: "Country updated successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CountryResponse"
              }
            }
          }
        },
        400: {
          description: "Invalid input data or country ID",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        },
        404: {
          description: "Country not found",
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
      tags: ["Countries"],
      summary: "Delete country",
      description: "Delete a country by ID",
      parameters: [
        {
          name: "id",
          in: "path",
          description: "Country ID",
          required: true,
          schema: {
            type: "integer",
            format: "int64"
          }
        }
      ],
      responses: {
        200: {
          description: "Country deleted successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CountryResponse"
              }
            }
          }
        },
        400: {
          description: "Invalid country ID",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        },
        404: {
          description: "Country not found",
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

export const countryComponents = {
  schemas: {
    Country: {
      type: "object",
      properties: {
        id: {
          type: "integer",
          format: "int64",
          description: "Country ID"
        },
        name: {
          type: "string",
          minLength: 2,
          maxLength: 100,
          description: "Country name"
        },
        code: {
          type: "string",
          minLength: 2,
          maxLength: 3,
          pattern: "^[A-Z]+$",
          description: "Country code (uppercase letters)"
        },
        createdAt: {
          type: "string",
          format: "date-time",
          description: "Country creation timestamp"
        },
        updatedAt: {
          type: "string",
          format: "date-time",
          description: "Country last update timestamp"
        }
      },
      required: ["id", "name", "code"]
    },
    CreateCountryRequest: {
      type: "object",
      properties: {
        name: {
          type: "string",
          minLength: 2,
          maxLength: 100,
          description: "Country name"
        },
        code: {
          type: "string",
          minLength: 2,
          maxLength: 3,
          pattern: "^[A-Za-z]+$",
          description: "Country code (will be converted to uppercase)"
        }
      },
      required: ["name", "code"]
    },
    UpdateCountryRequest: {
      type: "object",
      properties: {
        name: {
          type: "string",
          minLength: 2,
          maxLength: 100,
          description: "Country name"
        },
        code: {
          type: "string",
          minLength: 2,
          maxLength: 3,
          pattern: "^[A-Za-z]+$",
          description: "Country code (will be converted to uppercase)"
        }
      },
      description: "At least one field must be provided for update"
    },
    CountryResponse: {
      type: "object",
      properties: {
        result: {
          $ref: "#/components/schemas/Country"
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
          example: "Country retrieved successfully"
        }
      },
      required: ["result", "status", "statusCode", "msg"]
    },
    CountriesListResponse: {
      type: "object",
      properties: {
        result: {
          type: "object",
          properties: {
            rows: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Country"
              }
            },
            count: {
              type: "integer",
              description: "Number of countries returned"
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
          example: "Countries retrieved successfully"
        }
      },
      required: ["result", "status", "statusCode", "msg"]
    },
    SearchCountriesResponse: {
      type: "object",
      properties: {
        result: {
          type: "object",
          properties: {
            countries: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Country"
              }
            },
            count: {
              type: "integer",
              description: "Number of countries found"
            }
          },
          required: ["countries", "count"]
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
          example: "Countries search completed successfully"
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
              description: "Total count of countries"
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
          example: "Countries count retrieved successfully"
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
