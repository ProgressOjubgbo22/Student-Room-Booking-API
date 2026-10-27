import { Router } from 'express';
import {
  createBooking, listBookings, getBooking, checkIn, payBooking, cancelBooking,
} from '../controllers/bookingController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParam } from '../validators/common.validator.js';
import { createBookingSchema, listBookingsQuery, paymentSchema } from '../validators/booking.validator.js';

const router = Router();
router.use(authenticate);

router.post('/', authorize('student'), validate(createBookingSchema), createBooking);
router.get('/', validate(listBookingsQuery, 'query'), listBookings);
router.get('/:id', validate(idParam, 'params'), getBooking);
router.patch('/:id/check-in', validate(idParam, 'params'), checkIn);
router.patch('/:id/payment', validate(idParam, 'params'), validate(paymentSchema), payBooking);
router.delete('/:id', validate(idParam, 'params'), cancelBooking);
export default router;
