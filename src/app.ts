import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ENV } from './config/env';
import authRoutes from './routes/authRoutes';
import tuitionRoutes from './routes/tuitionRoutes';
import applicationRoutes from './routes/applicationRoutes';
import paymentRoutes from './routes/paymentRoutes';
import userRoutes from './routes/userRoutes';
import uploadRoutes from './routes/uploadRoutes';
import { handleWebhook } from './controllers/paymentController';
import { seedDatabase } from './utils/seeder';

const app: Application = express();

// Stripe Webhook needs raw body before express.json() is applied
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  handleWebhook
);

// Standard Middlewares
app.use(
  cors({
    origin: [ENV.CLIENT_URL, 'http://localhost:3000', 'https://mentorlagbe.vercel.app'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'online',
    project: 'MentorLagbe API',
    message: 'Welcome to MentorLagbe Backend Services',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Seed endpoint (Protected or manual trigger)
app.post('/api/seed', async (_req: Request, res: Response) => {
  try {
    await seedDatabase();
    res.status(200).json({ success: true, message: 'Database seeded successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tuitions', tuitionRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'API Route Not Found'
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Global Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

export default app;
