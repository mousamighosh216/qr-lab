// src/api/middleware/errorHandler.ts
// Central error handler. Registered last in Express middleware chain.
// Converts ApiError and unexpected errors into consistent JSON responses.

import { Request, Response, NextFunction } from "express";
import { ApiError } from "./validate";
import { log } from "../../utils/logger";

interface ErrorResponse {
  error: string;
  code: number;
  field?: string;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ApiError) {
    const body: ErrorResponse = { error: err.message, code: err.statusCode };
    if (err.field) body.field = err.field;
    res.status(err.statusCode).json(body);
    return;
  }

  // Unexpected error — log the full stack, return a generic 500
  log("error", "Unhandled error", err);
  res.status(500).json({ error: "Internal server error", code: 500 });
}