import swaggerJsdoc from "swagger-jsdoc";
// IMPORT OTHER DOCS
import { userPaths, userComponents } from "../routes/v1/user/user.doc";
import { countryPaths, countryComponents } from "../routes/v1/country/country.doc";
import { chatPaths, chatComponents } from "../routes/v1/chat/chat.doc";

const openapi = {
  openapi: "3.0.0",
  info: {
    title: "API Documentation",
    version: "1.0.0",
    description: "API documentation for the Express application",
  },
  servers: [
    {
      url: "http://localhost:3001/api/v1",
      description: "Development server",
    },
  ],
  paths: {
    ...userPaths,
    ...countryPaths,
    ...chatPaths,
    // ADD OTHER PATHS
  },
  components: {
    schemas: {
      ...userComponents.schemas,
      ...countryComponents.schemas,
      ...chatComponents.schemas,
      // ADD OTHER COMPONENTS
    },
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
};

const options: swaggerJsdoc.Options = {
  definition: openapi,
  apis: [], // We don't need to scan for JSDoc comments anymore
};

export const swaggerSpec = swaggerJsdoc(options);
