import { z } from 'zod';

export const matricNumber = z
  .string()
  .trim()
  .min(3)
  .max(30)
  .regex(/^[A-Za-z0-9/_-]+$/, 'Matric number may only contain letters, numbers, / _ -');

export const registerSchema = z
  .object({
    matricNumber,
    firstName: z.string().trim().min(1).max(50),
    lastName: z.string().trim().min(1).max(50),
    email: z.string().trim().email(),
    password: z.string().min(8).max(100),
  })
  .strict();

export const loginSchema = z.object({ matricNumber, password: z.string().min(1) }).strict();

export const matricParam = z.object({ matricNumber });
