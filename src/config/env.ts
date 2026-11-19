import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || '',
  DB_NAME: process.env.DB_NAME || 'mentorlagbe',
  JWT_SECRET: process.env.JWT_SECRET || 'mentorlagbe_super_secret_jwt_key_2026',
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || '',
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'http://localhost:5000',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  PRO_TUTOR_PRICE: Number(process.env.PRO_TUTOR_PRICE) || 15,
  PRO_STUDENT_PRICE: Number(process.env.PRO_STUDENT_PRICE) || 10,
  IMGBB_API_KEY: process.env.IMGBB_API_KEY || ''
};
