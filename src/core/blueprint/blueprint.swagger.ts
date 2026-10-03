import { Blueprint } from './blueprint.factory';

// Types for OpenAPI 3.0 specification
export interface OpenApiParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  schema: Record<string, unknown>;
}

export interface OpenApiRequestBody {
  description?: string;
  required?: boolean;
  content: {
    'application/json': {
      schema: Record<string, unknown>;
    };
  };
}

export interface OpenApiResponse {
  description: string;
  content?: {
    'application/json': {
      schema: Record<string, unknown>;
    };
  };
}

export interface OpenApiOperation {
  tags: string[];
  summary: string;
  description?: string;
  operationId?: string;
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses: Record<string, OpenApiResponse>;
}

export interface BlueprintSwaggerOutput {
  tags: Array<{ name: string; description: string }>;
  paths: Record<string, Record<string, OpenApiOperation>>;
  components: {
    schemas: Record<string, Record<string, unknown>>;
  };
}

/**
 * Converts a Zod schema into an OpenAPI 3.0 compatible JSON Schema object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function zodToOpenApiSchema(schema: any): Record<string, unknown> {
  if (!schema || !schema._def) {
    return { type: 'object', additionalProperties: true };
  }

  const def = schema._def;
  const typeName = def.typeName;

  switch (typeName) {
    case 'ZodString': {
      const result: Record<string, unknown> = { type: 'string' };
      for (const check of def.checks || []) {
        if (check.kind === 'min') result.minLength = check.value;
        if (check.kind === 'max') result.maxLength = check.value;
        if (check.kind === 'email') result.format = 'email';
        if (check.kind === 'url') result.format = 'uri';
        if (check.kind === 'uuid') result.format = 'uuid';
        if (check.kind === 'regex') result.pattern = check.regex.source;
      }
      return result;
    }
    case 'ZodNumber': {
      const result: Record<string, unknown> = { type: 'number' };
      for (const check of def.checks || []) {
        if (check.kind === 'int') result.type = 'integer';
        if (check.kind === 'min') result.minimum = check.value;
        if (check.kind === 'max') result.maximum = check.value;
      }
      return result;
    }
    case 'ZodBoolean':
      return { type: 'boolean' };
    case 'ZodDate':
      return { type: 'string', format: 'date-time' };
    case 'ZodEnum':
      return { type: 'string', enum: def.values };
    case 'ZodArray':
      return { type: 'array', items: zodToOpenApiSchema(def.type) };
    case 'ZodObject': {
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      const shape = typeof def.shape === 'function' ? def.shape() : def.shape;

      for (const [key, fieldSchema] of Object.entries(shape)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const field: any = fieldSchema;
        const isOptional =
          field._def.typeName === 'ZodOptional' || field._def.typeName === 'ZodDefault';
        if (!isOptional) {
          required.push(key);
        }
        properties[key] = zodToOpenApiSchema(field);
      }

      const obj: Record<string, unknown> = { type: 'object', properties };
      if (required.length > 0) {
        obj.required = required;
      }
      return obj;
    }
    case 'ZodOptional':
    case 'ZodNullable':
      return zodToOpenApiSchema(def.innerType);
    case 'ZodDefault': {
      const inner = zodToOpenApiSchema(def.innerType);
      try {
        const defaultVal = def.defaultValue();
        if (defaultVal !== undefined) {
          inner.default = defaultVal;
        }
      } catch {
        // Ignore evaluation errors
      }
      return inner;
    }
    case 'ZodEffects':
      return zodToOpenApiSchema(def.schema);
    case 'ZodRecord':
      return { type: 'object', additionalProperties: true };
    case 'ZodUnion':
    case 'ZodDiscriminatedUnion':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { anyOf: def.options.map((opt: any) => zodToOpenApiSchema(opt)) };
    case 'ZodIntersection':
      return {
        allOf: [zodToOpenApiSchema(def.left), zodToOpenApiSchema(def.right)],
      };
    default:
      return { type: 'string' };
  }
}

/**
 * Extracts the body schema from a Zod schema if nested inside { body: ... }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractBodySchema(schema: any): any {
  if (!schema) return null;
  let current = schema;
  while (current._def && current._def.schema) {
    current = current._def.schema;
  }
  if (current.shape && current.shape.body) {
    let body = current.shape.body;
    while (body._def && body._def.schema) {
      body = body._def.schema;
    }
    return body;
  }
  return current;
}

/**
 * Helper to capitalize a string (e.g. 'user' -> 'User')
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Automatically generates OpenAPI 3.0 documentation for an array of blueprints
 */
export function generateBlueprintSwagger(modules: Blueprint[]): BlueprintSwaggerOutput {
  const tags: Array<{ name: string; description: string }> = [];
  const paths: Record<string, Record<string, OpenApiOperation>> = {};
  const schemas: Record<string, Record<string, unknown>> = {
    ApiResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Operation completed successfully' },
        data: { type: 'object' },
      },
    },
    ApiError: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Error occurred' },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string', example: 'email' },
              message: { type: 'string', example: 'Invalid email address' },
            },
          },
        },
      },
    },
    PaginationMeta: {
      type: 'object',
      properties: {
        total: { type: 'integer', example: 45 },
        page: { type: 'integer', example: 1 },
        limit: { type: 'integer', example: 10 },
        totalPages: { type: 'integer', example: 5 },
        from: { type: 'integer', example: 1 },
        to: { type: 'integer', example: 10 },
        hasNextPage: { type: 'boolean', example: true },
        hasPrevPage: { type: 'boolean', example: false },
        nextPageUrl: {
          type: 'string',
          nullable: true,
          example: 'http://localhost:5000/api/v1/users?page=2&limit=10',
        },
        prevPageUrl: {
          type: 'string',
          nullable: true,
          example: null,
        },
      },
    },
  };

  for (const mod of modules) {
    const modelName = mod.model;
    const modelCapitalized = capitalize(modelName);
    const tagName = capitalize(mod.path);
    const basePath = `/api/v1/${mod.path}`;

    tags.push({
      name: tagName,
      description: `Endpoints for managing ${tagName}`,
    });

    // 1. Build Schemas
    const createBodySchema = extractBodySchema(mod.config.validation?.create);
    const updateBodySchema = extractBodySchema(mod.config.validation?.update);

    const createSchemaName = `Create${modelCapitalized}Input`;
    const updateSchemaName = `Update${modelCapitalized}Input`;
    const modelSchemaName = modelCapitalized;

    const createOpenApi = createBodySchema
      ? zodToOpenApiSchema(createBodySchema)
      : { type: 'object', additionalProperties: true };

    const updateOpenApi = updateBodySchema
      ? zodToOpenApiSchema(updateBodySchema)
      : { type: 'object', additionalProperties: true };

    schemas[createSchemaName] = createOpenApi;
    schemas[updateSchemaName] = updateOpenApi;

    // Construct representative model response schema
    const modelProperties: Record<string, unknown> = {
      id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
      ...((createOpenApi.properties as Record<string, unknown>) || {}),
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    };
    // Strip sensitive fields like password from response representation
    delete modelProperties.password;

    schemas[modelSchemaName] = {
      type: 'object',
      properties: modelProperties,
    };

    // 2. Build Query Parameters for List
    const listParameters: OpenApiParameter[] = [
      {
        name: 'page',
        in: 'query',
        description: 'Page number for pagination',
        required: false,
        schema: { type: 'integer', default: 1, minimum: 1 },
      },
      {
        name: 'limit',
        in: 'query',
        description: 'Number of records per page (max 100)',
        required: false,
        schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 },
      },
      {
        name: 'sortBy',
        in: 'query',
        description: `Field to sort by (default: ${mod.config.defaultSort?.field || 'createdAt'})`,
        required: false,
        schema: {
          type: 'string',
          default: mod.config.defaultSort?.field || 'createdAt',
        },
      },
      {
        name: 'sortOrder',
        in: 'query',
        description: `Sort order (default: ${mod.config.defaultSort?.order || 'desc'})`,
        required: false,
        schema: {
          type: 'string',
          enum: ['asc', 'desc'],
          default: mod.config.defaultSort?.order || 'desc',
        },
      },
    ];

    if (mod.config.searchableFields && mod.config.searchableFields.length > 0) {
      listParameters.push({
        name: 'searchTerm',
        in: 'query',
        description: `Search keyword across: ${mod.config.searchableFields.join(', ')}`,
        required: false,
        schema: { type: 'string' },
      });
    }

    if (mod.config.filterFields) {
      for (const field of mod.config.filterFields) {
        listParameters.push({
          name: field,
          in: 'query',
          description: `Filter records by exact ${field}`,
          required: false,
          schema: { type: 'string' },
        });
      }
    }

    // 3. Define Endpoints
    // GET /api/v1/{path}
    // POST /api/v1/{path}
    paths[basePath] = {
      get: {
        tags: [tagName],
        summary: `List all ${tagName}`,
        description: `Retrieve a paginated list of ${tagName} with support for search, filtering, and sorting.`,
        operationId: `list${tagName}`,
        parameters: listParameters,
        responses: {
          '200': {
            description: `${tagName} retrieved successfully`,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: {
                      type: 'string',
                      example: 'Records retrieved successfully',
                    },
                    data: {
                      type: 'array',
                      items: { $ref: `#/components/schemas/${modelSchemaName}` },
                    },
                    pagination: { $ref: '#/components/schemas/PaginationMeta' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: [tagName],
        summary: `Create a new ${modelCapitalized}`,
        description: `Create a new ${modelName} record with validated payload.`,
        operationId: `create${modelCapitalized}`,
        requestBody: {
          description: `Payload for creating ${modelName}`,
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${createSchemaName}` },
            },
          },
        },
        responses: {
          '201': {
            description: `${modelCapitalized} created successfully`,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: {
                      type: 'string',
                      example: 'Record created successfully',
                    },
                    data: { $ref: `#/components/schemas/${modelSchemaName}` },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
    };

    // GET /api/v1/{path}/{id}
    // PUT /api/v1/{path}/{id}
    // PATCH /api/v1/{path}/{id}
    // DELETE /api/v1/{path}/{id}
    const itemPath = `${basePath}/{id}`;
    paths[itemPath] = {
      get: {
        tags: [tagName],
        summary: `Get ${modelCapitalized} by ID`,
        description: `Retrieve details of a single ${modelName} by ID.`,
        operationId: `get${modelCapitalized}ById`,
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: `Unique identifier of the ${modelName}`,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: `${modelCapitalized} retrieved successfully`,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: {
                      type: 'string',
                      example: 'Record retrieved successfully',
                    },
                    data: { $ref: `#/components/schemas/${modelSchemaName}` },
                  },
                },
              },
            },
          },
          '404': {
            description: `${modelCapitalized} not found`,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
      put: {
        tags: [tagName],
        summary: `Replace or update ${modelCapitalized} by ID`,
        description: `Update an existing ${modelName} record by ID.`,
        operationId: `replace${modelCapitalized}ById`,
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: `Unique identifier of the ${modelName}`,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          description: `Fields to update on ${modelName}`,
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${updateSchemaName}` },
            },
          },
        },
        responses: {
          '200': {
            description: `${modelCapitalized} updated successfully`,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: {
                      type: 'string',
                      example: 'Record updated successfully',
                    },
                    data: { $ref: `#/components/schemas/${modelSchemaName}` },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
          '404': {
            description: `${modelCapitalized} not found`,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
      patch: {
        tags: [tagName],
        summary: `Update ${modelCapitalized} by ID`,
        description: `Partially update an existing ${modelName} record by ID.`,
        operationId: `update${modelCapitalized}ById`,
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: `Unique identifier of the ${modelName}`,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          description: `Fields to update on ${modelName}`,
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${updateSchemaName}` },
            },
          },
        },
        responses: {
          '200': {
            description: `${modelCapitalized} updated successfully`,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: {
                      type: 'string',
                      example: 'Record updated successfully',
                    },
                    data: { $ref: `#/components/schemas/${modelSchemaName}` },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
          '404': {
            description: `${modelCapitalized} not found`,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
      delete: {
        tags: [tagName],
        summary: `Delete ${modelCapitalized} by ID`,
        description: `Permanently delete a ${modelName} record by ID.`,
        operationId: `delete${modelCapitalized}ById`,
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: `Unique identifier of the ${modelName}`,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: `${modelCapitalized} deleted successfully`,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: {
                      type: 'string',
                      example: 'Record deleted successfully',
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: `${modelCapitalized} not found`,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
    };
  }

  return {
    tags,
    paths,
    components: {
      schemas,
    },
  };
}
