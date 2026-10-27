import cron from 'node-cron';
import env from '../config/env.js';
import { expireOverdueBookings } from '../utils/booking.js';
import logger from '../utils/logger.js';

// Safe to run any number of times: each booking is expired by one atomic update,
// and paid bookings are never matched.
export const runExpirationJob = async () => {
  try {
    const count = await expireOverdueBookings();
    if (count > 0) logger.info(`Expiration job: expired ${count} unpaid booking(s)`);
    return count;
  } catch (err) {
    logger.error(`Expiration job failed: ${err.message}`);
    return 0;
  }
};

export const startExpirationJob = () => {
  const task = cron.schedule(env.expiryCron, runExpirationJob);
  logger.info(`Expiration job scheduled (${env.expiryCron})`);
  return task;
};
