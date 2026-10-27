import app from './app.js';
import env from './config/env.js';
import { connectDB } from './config/db.js';
import { seedAdmin } from './utils/seedAdmin.js';
import { startExpirationJob } from './jobs/expireBookings.js';
import Student from './models/Student.js';
import Room from './models/Room.js';
import Booking from './models/Booking.js';
import logger from './utils/logger.js';

const start = async () => {
  await connectDB();
  // Make sure unique indexes (matric, email, room number, one active booking per student) exist
  await Promise.all([Student.init(), Room.init(), Booking.init()]);
  await seedAdmin();
  if (env.enableJobs) startExpirationJob();

  app.listen(env.port, () => {
    logger.info(`Server running on http://localhost:${env.port}`);
    logger.info(`Swagger UI: http://localhost:${env.port}/api-docs`);
  });
};

start().catch((err) => {
  logger.error(err);
  process.exit(1);
});
