import bcrypt from 'bcrypt';
import env from '../config/env.js';
import Student from '../models/Student.js';
import logger from './logger.js';

// Creates the default admin account if there is no admin yet.
export const seedAdmin = async () => {
  if (await Student.exists({ role: 'admin' })) return;
  await Student.create({
    matricNumber: env.adminMatric,
    firstName: 'System',
    lastName: 'Admin',
    email: env.adminEmail,
    password: await bcrypt.hash(env.adminPassword, env.bcryptRounds),
    role: 'admin',
  });
  logger.info(`Admin account created (${env.adminMatric})`);
};
