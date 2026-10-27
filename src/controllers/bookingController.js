import { StatusCodes } from 'http-status-codes';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import Student from '../models/Student.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getStripe } from '../config/stripe.js';
import { expireBookingById, expireOverdueBookings, formatBooking, releaseRoomSpace } from '../utils/booking.js';
import { buildPagination } from '../utils/pagination.js';

const populated = (query, withStudent = true) => {
  query.populate('roomId');
  return withStudent ? query.populate('studentId') : query;
};

const respond = async (res, status, bookingId, message) => {
  const booking = await populated(Booking.findById(bookingId));
  res.status(status).json({ success: true, ...(message && { message }), data: formatBooking(booking) });
};

const loadBooking = async (req) => {
  const { id } = req.valid.params;
  let booking = await Booking.findById(id);
  if (!booking) throw new AppError(StatusCodes.NOT_FOUND, 'Booking not found');

  if (req.user.role === 'student' && booking.studentId.toString() !== req.user.id) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Booking not found');
  }
  if (await expireBookingById(id)) booking = await Booking.findById(id);
  return booking;
};

export const createBooking = asyncHandler(async (req, res) => {
  const { roomId } = req.valid.body;
  const studentId = req.user.id;

  const room = await Room.findById(roomId);
  if (!room) throw new AppError(StatusCodes.NOT_FOUND, 'Room not found');

  await expireOverdueBookings({ $or: [{ studentId }, { roomId }] });

  if (await Booking.exists({ studentId, isActive: true })) {
    throw new AppError(StatusCodes.CONFLICT, 'Student already has an active booking');
  }

  const reserved = await Room.findOneAndUpdate(
    { _id: roomId, $expr: { $lt: ['$occupiedCount', '$capacity'] } },
    { $inc: { occupiedCount: 1 } },
    { new: true }
  );
  if (!reserved) throw new AppError(StatusCodes.CONFLICT, 'Room is full');

  let booking;
  try {
    booking = await Booking.create({ studentId, roomId });
  } catch (err) {
    await releaseRoomSpace(roomId); 
    if (err.code === 11000) {
      throw new AppError(StatusCodes.CONFLICT, 'Student already has an active booking');
    }
    throw err;
  }
  await respond(res, StatusCodes.CREATED, booking.id, 'Booking created');
});

export const listBookings = asyncHandler(async (req, res) => {
  const { page, limit, status, roomId, studentId, isPaid } = req.valid.query;
  const isAdmin = req.user.role === 'admin';

  const filter = {};
  if (status) filter.status = status;
  if (roomId) filter.roomId = roomId;
  if (isPaid !== undefined) filter.isPaid = isPaid;
  if (isAdmin) {
    if (studentId) filter.studentId = studentId;
  } else {
    filter.studentId = req.user.id; 
  }

  await expireOverdueBookings(isAdmin ? {} : { studentId: req.user.id });

  const [bookings, total] = await Promise.all([
    populated(Booking.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), isAdmin),
    Booking.countDocuments(filter),
  ]);
  res.status(StatusCodes.OK).json({
    success: true,
    data: bookings.map(formatBooking),
    pagination: buildPagination(page, limit, total),
  });
});

export const getBooking = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req);
  await respond(res, StatusCodes.OK, booking.id);
});

export const getStudentBooking = asyncHandler(async (req, res) => {
  const matricNumber = req.valid.params.matricNumber.toUpperCase();
  const student = await Student.findOne({ matricNumber });
  if (!student) throw new AppError(StatusCodes.NOT_FOUND, 'Student not found');

  if (req.user.role === 'student' && student.id !== req.user.id) {
    throw new AppError(StatusCodes.FORBIDDEN, 'You can only view your own booking');
  }

  await expireOverdueBookings({ studentId: student.id });
  const booking = await Booking.findOne({ studentId: student.id, isActive: true });
  if (!booking) throw new AppError(StatusCodes.NOT_FOUND, 'Student has no active booking');
  await respond(res, StatusCodes.OK, booking.id);
});

export const checkIn = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req);

  if (booking.status === 'expired') throw new AppError(StatusCodes.CONFLICT, 'Booking has expired');
  if (booking.status === 'cancelled') throw new AppError(StatusCodes.CONFLICT, 'Booking was cancelled');
  if (booking.status === 'checked_in') throw new AppError(StatusCodes.CONFLICT, 'Student is already checked in');
  if (!booking.isPaid) throw new AppError(StatusCodes.CONFLICT, 'Payment is outstanding; pay before checking in');

  // Atomic transition: only one concurrent request can succeed
  const updated = await Booking.findOneAndUpdate(
    { _id: booking.id, status: 'confirmed', isPaid: true, isActive: true },
    { $set: { status: 'checked_in', checkInAt: new Date() } },
    { new: true }
  );
  if (!updated) throw new AppError(StatusCodes.CONFLICT, 'Booking is not eligible for check-in');
  await respond(res, StatusCodes.OK, updated.id, 'Check-in successful');
});

export const payBooking = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req);
  const { paymentIntentId } = req.valid.body;

  if (booking.status === 'expired') throw new AppError(StatusCodes.CONFLICT, 'Booking has expired');
  if (booking.status === 'cancelled') throw new AppError(StatusCodes.CONFLICT, 'Booking was cancelled');
  if (booking.isPaid) return respond(res, StatusCodes.OK, booking.id, 'Booking is already paid');

  if (req.user.role !== 'admin') {
    if (!paymentIntentId) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'paymentIntentId is required to verify payment');
    }
    const stripe = getStripe();
    if (!stripe) throw new AppError(StatusCodes.SERVICE_UNAVAILABLE, 'Payment provider is not configured');

    let intent;
    try {
      intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Payment could not be found with the payment provider');
    }
    if (intent.status !== 'succeeded') {
      throw new AppError(StatusCodes.CONFLICT, `Payment has not succeeded (status: ${intent.status})`);
    }
    if (intent.metadata?.bookingId !== booking.id) {
      throw new AppError(StatusCodes.CONFLICT, 'Payment does not belong to this booking');
    }
  }

  // Atomic transition: a duplicate/concurrent request simply finds nothing to update
  const updated = await Booking.findOneAndUpdate(
    { _id: booking.id, isPaid: false, status: 'pending', isActive: true },
    { $set: { isPaid: true, paymentDate: new Date(), status: 'confirmed' } },
    { new: true }
  );
  if (!updated) {
    const current = await Booking.findById(booking.id);
    if (current.isPaid) return respond(res, StatusCodes.OK, current.id, 'Booking is already paid');
    throw new AppError(StatusCodes.CONFLICT, `Booking can no longer be paid (status: ${current.status})`);
  }
  await respond(res, StatusCodes.OK, updated.id, 'Payment recorded');
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req);

  if (booking.status === 'cancelled') throw new AppError(StatusCodes.CONFLICT, 'Booking is already cancelled');
  if (booking.status === 'expired') throw new AppError(StatusCodes.CONFLICT, 'Booking has already expired');
  if (booking.status === 'checked_in') {
    throw new AppError(StatusCodes.CONFLICT, 'A checked-in booking cannot be cancelled');
  }

  // Atomic transition, then release the room space exactly once
  const cancelled = await Booking.findOneAndUpdate(
    { _id: booking.id, isActive: true, status: { $in: ['pending', 'confirmed'] } },
    { $set: { status: 'cancelled', isActive: false, cancelledAt: new Date() } },
    { new: true }
  );
  if (!cancelled) throw new AppError(StatusCodes.CONFLICT, 'Booking can no longer be cancelled');
  await releaseRoomSpace(cancelled.roomId);
  await respond(res, StatusCodes.OK, cancelled.id, 'Booking cancelled and room space released');
});
