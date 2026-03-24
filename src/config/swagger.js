const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Blog API',
      version: '1.0.0',
      description: 'API for admin blog with reactions',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object', nullable: true, description: 'Optional payload' },
          },
          required: ['success', 'message'],
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Access token required' },
            error: { type: 'string', nullable: true },
          },
          required: ['success', 'message'],
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Unauthorized (401) - missing/invalid/expired token',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              examples: {
                missingToken: {
                  value: { success: false, message: 'Access token required' },
                },
                invalidToken: {
                  value: { success: false, message: 'Invalid or expired token' },
                },
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Forbidden (403) - valid token but not permitted',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              examples: {
                forbidden: {
                  value: { success: false, message: 'Forbidden' },
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js'], // paths to files containing OpenAPI definitions
};

const specs = swaggerJSDoc(options);

module.exports = { swaggerUi, specs };