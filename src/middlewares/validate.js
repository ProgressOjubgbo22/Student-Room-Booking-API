import { StatusCodes } from 'http-status-codes';
import AppError from '../utils/AppError.js';

// validate(schema, 'body' | 'query' | 'params') -> parsed data is available on req.valid[source]
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    const errors = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    throw new AppError(StatusCodes.BAD_REQUEST, 'Validation failed', errors);
  }
  req.valid = { ...req.valid, [source]: result.data };
  next();
};
