import type { Context, Next } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

// Simple interfaces without complex status code types
export interface ApiResponseData<T> {
  readonly success: boolean;
  readonly statusCode: number;
  readonly message: string;
  readonly data?: T;
  readonly timestamp: string;
}

export interface ApiErrorData {
  readonly success: false;
  readonly statusCode: number;
  readonly message: string;
  readonly errors: readonly string[];
  readonly timestamp: string;
  readonly stack?: string;
}

export class ApiResponse<T> implements ApiResponseData<T> {
  readonly success: boolean;
  readonly statusCode: number;
  readonly message: string;
  readonly data?: T;
  readonly timestamp: string;

  constructor(statusCode: number, data?: T, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
    this.timestamp = new Date().toISOString();
  }
}

export class ApiError extends Error implements ApiErrorData {
  readonly success = false as const;
  readonly statusCode: number;
  readonly errors: readonly string[];
  readonly timestamp: string;

  constructor(
    statusCode: number,
    message = 'Something went wrong',
    errors: readonly string[] = []
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errors = errors;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace?.(this, this.constructor);
  }
}

type AsyncRouteHandler = (c: Context, next?: Next) => Promise<Response | void>;

export const asyncHandler = (handler: AsyncRouteHandler) => {
  return async (c: Context, next?: Next): Promise<Response> => {
    try {
      const result = await handler(c, next);
      return result ?? c.json({ error: 'No response returned' }, 500);
    } catch (error) {
      return handleError(c, error);
    }
  };
};

const handleError = (c: Context, error: unknown): Response => {
  console.error('API Error:', {
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    url: c.req.url,
    method: c.req.method,
  });

  if (error instanceof ApiError) {
    return c.json({
      success: error.success,
      statusCode: error.statusCode,
      message: error.message,
      errors: error.errors,
      timestamp: error.timestamp,
      stack: error.stack,
    }, error.statusCode as ContentfulStatusCode);
  }

  if (error instanceof Error) {
    return c.json({
      success: false,
      statusCode: 500,
      message: error.message,
      errors: [],
      timestamp: new Date().toISOString(),
      stack: error.stack,
    }, 500);
  }

  return c.json({
    success: false,
    statusCode: 500,
    message: 'An unexpected error occurred',
    errors: [],
    timestamp: new Date().toISOString(),
  }, 500);
};

export const sendResponse = <T>(
  c: Context, 
  statusCode: number, 
  data?: T, 
  message = 'Success'
): Response => {
  const response = new ApiResponse(statusCode, data, message);
  return c.json(response, statusCode as ContentfulStatusCode);
};

export const validateRequest = <T>(
  data: unknown,
  validator: (data: unknown) => data is T
): T => {
  if (!validator(data)) {
    throw new ApiError(400, 'Invalid request data', ['Request validation failed']);
  }
  return data;
};