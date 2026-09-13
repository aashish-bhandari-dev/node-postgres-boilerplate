import { Response } from 'express';
import { HttpStatusCode, HttpStatus } from '../constants/httpStatus';

export interface ApiResponseData<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;
  timestamp: string;
}

export class ApiResponse {
  static send<T>(
    res: Response,
    statusCode: HttpStatusCode,
    message: string,
    data?: T,
    meta?: Record<string, unknown>,
  ): Response {
    const payload: ApiResponseData<T> = {
      success: statusCode >= 200 && statusCode < 300,
      message,
      ...(data !== undefined && { data }),
      ...(meta && { meta }),
      timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(payload);
  }

  static success<T>(
    res: Response,
    message = 'Success',
    data?: T,
    meta?: Record<string, unknown>,
  ): Response {
    return ApiResponse.send(res, HttpStatus.OK, message, data, meta);
  }

  static created<T>(
    res: Response,
    message = 'Resource created successfully',
    data?: T,
  ): Response {
    return ApiResponse.send(res, HttpStatus.CREATED, message, data);
  }

  static noContent(res: Response): Response {
    return res.status(HttpStatus.NO_CONTENT).send();
  }
}
