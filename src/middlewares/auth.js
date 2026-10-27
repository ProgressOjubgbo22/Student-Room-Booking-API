import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';

export const authenticate = (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(StatusCodes.UNAUTHORIZED, 'Authentication required');
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    throw new AppError(StatusCodes.UNAUTHORIZED, 'Invalid or expired token');
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    throw new AppError(StatusCodes.FORBIDDEN, 'You do not have permission to perform this action');
  }
  next();
};
