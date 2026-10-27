import dayjs from 'dayjs';
import env from '../config/env.js';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';

const overdueCutoff = () => dayjs().subtract(env.bookingExpiryDays, 'day').toDate();

// Frees one space in a room (never goes below zero).
export const releaseRoomSpace = (roomId) =>
  Room.updateOne({ _id: roomId, occupiedCount: { $gt: 0 } }, { $inc: { occupiedCount: -1 } });


export const expireBookingById = async (bookingId) => {
  const expired = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      isActive: true,
      isPaid: false,
      status: 'pending',
      bookingDate: { $lte: overdueCutoff() },
    },
    { $set: { status: 'expired', isActive: false, expiredAt: new Date() } },
    { new: true }
  );
  if (expired) await releaseRoomSpace(expired.roomId);
  return expired;
};

export const expireOverdueBookings = async (extraFilter = {}) => {
  const overdue = await Booking.find({
    isActive: true,
    isPaid: false,
    status: 'pending',
    bookingDate: { $lte: overdueCutoff() },
    ...extraFilter,
  }).select('_id');

  let count = 0;
  for (const b of overdue) {
    if (await expireBookingById(b._id)) count += 1;
  }
  return count;
};

export const formatBooking = (booking) => {
  const o = booking.toJSON();
  if (o.roomId && typeof o.roomId === 'object' && o.roomId.roomNumber) {
    o.room = o.roomId;
    o.roomId = o.room.roomId;
  }
  if (o.studentId && typeof o.studentId === 'object' && o.studentId.matricNumber) {
    o.student = o.studentId;
    o.studentId = o.student.studentId;
  }
  return o;
};
