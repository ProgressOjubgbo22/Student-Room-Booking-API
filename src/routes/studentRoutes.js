import { Router } from 'express';
import { getStudentBooking } from '../controllers/bookingController.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { matricParam } from '../validators/auth.validator.js';

const router = Router();
router.get('/:matricNumber/booking', authenticate, validate(matricParam, 'params'), getStudentBooking);
export default router;
