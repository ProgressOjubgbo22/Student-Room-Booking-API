import { StatusCodes } from 'http-status-codes';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

export const notFound = (req, res, next) => {
  next(new AppError(StatusCodes.NOT_FOUND, `Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  let message = err.message;

  if (err.type === 'entity.parse.failed') {
    status = StatusCodes.BAD_REQUEST;
    message = 'Invalid JSON in request body';
  } else if (err.code === 11000) {
    status = StatusCodes.CONFLICT;
    message = 'Duplicate value: resource already exists';
  }

  if (status >= 500) {
    logger.error(err);
    message = 'Internal server error';
  }

  res.status(status).json({ success: false, message, ...(err.errors && { errors: err.errors }) });
};
