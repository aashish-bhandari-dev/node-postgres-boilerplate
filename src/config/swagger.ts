import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

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

export const swaggerSpec = swaggerJsdoc(options);
