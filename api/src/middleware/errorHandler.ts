import { Request, Response, NextFunction } from 'express';
import { log } from '../telemetry/logger';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  log.error('Request error', {
    method: req.method,
    path: req.path,
    status: err.status || 500,
    message: err.message,
  });

  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    error: {
      message,
      status,
      timestamp: new Date().toISOString(),
    },
  });
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
