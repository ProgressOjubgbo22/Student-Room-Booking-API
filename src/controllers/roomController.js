import { StatusCodes } from 'http-status-codes';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { expireOverdueBookings } from '../utils/booking.js';
import { buildPagination } from '../utils/pagination.js';

export const createRoom = asyncHandler(async (req, res) => {
  const { roomNumber, building, capacity } = req.valid.body;
  if (await Room.exists({ roomNumber })) {
    throw new AppError(StatusCodes.CONFLICT, `Room ${roomNumber} already exists`);
  }

  const room = await Room.create({ roomNumber, building, capacity });
  res.status(StatusCodes.CREATED).json({ success: true, message: 'Room created', data: room });
});

export const listRooms = asyncHandler(async (req, res) => {
  const { page, limit, building } = req.valid.query;
  const filter = building ? { building } : {};

  await expireOverdueBookings(); 
  const [rooms, total] = await Promise.all([
    Room.find(filter).sort({ building: 1, roomNumber: 1 }).skip((page - 1) * limit).limit(limit),
    Room.countDocuments(filter),
  ]);
  res.status(StatusCodes.OK).json({
    success: true,
    data: rooms,
    pagination: buildPagination(page, limit, total),
  });
});

export const getRoom = asyncHandler(async (req, res) => {
  const { id } = req.valid.params;
  await expireOverdueBookings({ roomId: id });

  const room = await Room.findById(id);
  if (!room) throw new AppError(StatusCodes.NOT_FOUND, 'Room not found');

  const bookings = await Booking.find({ roomId: id, isActive: true }).populate('studentId');
  const assignedStudents = bookings.map((b) => ({
    bookingId: b.id,
    status: b.status,
    isPaid: b.isPaid,
    student: b.studentId.toJSON(),
  }));

  res.status(StatusCodes.OK).json({ success: true, data: { ...room.toJSON(), assignedStudents } });
});

export const updateRoom = asyncHandler(async (req, res) => {
  const { id } = req.valid.params;
  const updates = req.valid.body;

  await expireOverdueBookings({ roomId: id });
  const room = await Room.findById(id);
  if (!room) throw new AppError(StatusCodes.NOT_FOUND, 'Room not found');

  if (updates.roomNumber && (await Room.exists({ roomNumber: updates.roomNumber, _id: { $ne: id } }))) {
    throw new AppError(StatusCodes.CONFLICT, `Room ${updates.roomNumber} already exists`);
  }

  const filter = { _id: id };
  if (updates.capacity !== undefined) filter.occupiedCount = { $lte: updates.capacity };

  const updated = await Room.findOneAndUpdate(filter, { $set: updates }, { new: true, runValidators: true });
  if (!updated) {
    throw new AppError(
      StatusCodes.CONFLICT,
      `Capacity cannot be lower than the room's current active bookings (${room.occupiedCount})`
    );
  }
  res.status(StatusCodes.OK).json({ success: true, message: 'Room updated', data: updated });
});
