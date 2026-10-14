import swaggerJsdoc, { Options } from 'swagger-jsdoc';

const options: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Product API',
      version: '1.0.0',
      description: 'A RESTful API for managing products and product details with real-time updates via WebSocket',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: '/',
        description: 'Current API host',
      },
    ],
    components: {
      schemas: {
        Product: {
          type: 'object',
          required: ['name', 'description', 'price'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Product ID',
            },
            name: {
              type: 'string',
              description: 'Product name',
            },
            description: {
              type: 'string',
              description: 'Product description',
            },
            price: {
              type: 'number',
              format: 'float',
              description: 'Product price',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        ProductDetail: {
          type: 'object',
          required: ['productId', 'sku', 'quantity'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Product detail ID',
            },
            productId: {
              type: 'string',
              format: 'uuid',
              description: 'Associated product ID',
            },
            sku: {
              type: 'string',
              description: 'Stock keeping unit',
            },
            quantity: {
              type: 'integer',
              description: 'Available quantity',
            },
            warehouseLocation: {
              type: 'string',
              description: 'Warehouse location',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                },
                status: {
                  type: 'integer',
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                },
              },
            },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy'],
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            uptime: {
              type: 'number',
              description: 'Server uptime in seconds',
            },
          },
        },
      },
      responses: {
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        BadRequest: {
          description: 'Bad request',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        InternalError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Products',
        description: 'Product management endpoints',
      },
      {
        name: 'Product Details',
        description: 'Product details management endpoints',
      },
      {
        name: 'Health',
        description: 'System health check',
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
