import 'dotenv/config';

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/student-room-booking',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 10,
  bookingExpiryDays: Number(process.env.BOOKING_EXPIRY_DAYS) || 7,
  expiryCron: process.env.EXPIRY_CRON || '0 * * * *',
  enableJobs: process.env.ENABLE_JOBS !== 'false',
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 200,
  adminMatric: process.env.ADMIN_MATRIC || 'ADMIN001',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@school.edu',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin12345',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
};

export default env;
