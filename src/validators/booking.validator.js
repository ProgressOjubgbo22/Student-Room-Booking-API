import { z } from 'zod';
import { objectId, pageLimit } from './common.validator.js';
import { BOOKING_STATUSES } from '../models/Booking.js';

export const createBookingSchema = z.object({ roomId: objectId }).strict();

export const listBookingsQuery = z.object({
  ...pageLimit,
  status: z.enum(BOOKING_STATUSES).optional(),
  roomId: objectId.optional(),
  studentId: objectId.optional(),
  isPaid: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
});

export const paymentSchema = z
  .object({ paymentIntentId: z.string().trim().min(1).optional() })
  .strict();
