import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import env from '../config/env.js';
import Student from '../models/Student.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const register = asyncHandler(async (req, res) => {
  const { password, ...rest } = req.valid.body;
  const exists = await Student.findOne({
    $or: [{ matricNumber: rest.matricNumber.toUpperCase() }, { email: rest.email.toLowerCase() }],
  });
  if (exists) throw new AppError(StatusCodes.CONFLICT, 'Matric number or email already registered');

  const student = await Student.create({
    ...rest,
    password: await bcrypt.hash(password, env.bcryptRounds),
  });
  res.status(StatusCodes.CREATED).json({ success: true, message: 'Registration successful', data: student });
});

export const login = asyncHandler(async (req, res) => {
  const { matricNumber, password } = req.valid.body;
  const user = await Student.findOne({ matricNumber: matricNumber.toUpperCase() }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError(StatusCodes.UNAUTHORIZED, 'Invalid matric number or password');
  }
  const token = jwt.sign({ role: user.role }, env.jwtSecret, {
    subject: user.id,
    expiresIn: env.jwtExpiresIn,
  });
  res.status(StatusCodes.OK).json({
    success: true,
    data: { accessToken: token, tokenType: 'Bearer', expiresIn: env.jwtExpiresIn, user: user.toJSON() },
  });
});
