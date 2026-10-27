import { z } from 'zod';
import { pageLimit } from './common.validator.js';

export const createRoomSchema = z
  .object({
    roomNumber: z.string().trim().min(1).max(20),
    building: z.string().trim().min(1).max(100),
    capacity: z.number().int().min(1).max(4).default(4),
  })
  .strict();

export const updateRoomSchema = z
  .object({
    roomNumber: z.string().trim().min(1).max(20),
    building: z.string().trim().min(1).max(100),
    capacity: z.number().int().min(1).max(4),
  })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

export const listRoomsQuery = z.object({
  ...pageLimit,
  building: z.string().trim().min(1).optional(),
});
