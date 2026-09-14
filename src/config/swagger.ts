import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';
import { modules } from '../modules';
import { generateBlueprintSwagger } from '../core/blueprint';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Node.js Express Prisma API',
      version: '1.0.0',
      description:
        'Production-grade RESTful API boilerplate with Express, TypeScript, PostgreSQL, and Prisma ORM',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://${env.HOST}:${env.PORT}`,
        description: `${env.NODE_ENV} server`,
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
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

// Generate base documentation from JSDoc annotations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const baseSpec = swaggerJsdoc(options) as Record<string, any>;

// Automatically generate OpenAPI docs for all registered blueprints
const blueprintDocs = generateBlueprintSwagger(modules);

// Merge generated blueprint paths
baseSpec.paths = {
  ...(baseSpec.paths || {}),
  ...blueprintDocs.paths,
};

// Merge generated blueprint schemas
baseSpec.components = {
  ...(baseSpec.components || {}),
  schemas: {
    ...((baseSpec.components && baseSpec.components.schemas) || {}),
    ...blueprintDocs.components.schemas,
  },
};

// Merge generated blueprint tags
baseSpec.tags = [
  ...((baseSpec.tags as Array<{ name: string; description: string }>) || []),
  ...blueprintDocs.tags,
];

export const swaggerSpec = baseSpec;
