import mongoose from 'mongoose';
import dayjs from 'dayjs';
import env from '../config/env.js';

export const BOOKING_STATUSES = ['pending', 'confirmed', 'checked_in', 'cancelled', 'expired'];

const bookingSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    bookingDate: { type: Date, default: Date.now },
    status: { type: String, enum: BOOKING_STATUSES, default: 'pending' },
    isPaid: { type: Boolean, default: false },
    paymentDate: { type: Date, default: null },
    checkInAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null },
    // Internal flag: true while pending/confirmed/checked_in. Powers the unique index below.
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.bookingId = ret._id;
        // Only unpaid pending bookings have an expiry deadline
        ret.expiresAt =
          ret.status === 'pending' && !ret.isPaid
            ? dayjs(ret.bookingDate).add(env.bookingExpiryDays, 'day').toISOString()
            : null;
        delete ret._id;
        delete ret.__v;
        delete ret.isActive;
        return ret;
      },
    },
  }
);

// A student can only have ONE active booking (enforced by the database)
bookingSchema.index({ studentId: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
bookingSchema.index({ roomId: 1, isActive: 1 });
bookingSchema.index({ status: 1, isPaid: 1, bookingDate: 1 });

export default mongoose.model('Booking', bookingSchema);
