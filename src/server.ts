import app from './app';
import { connectDB } from './config/db';
import { ENV } from './config/env';
import { seedDatabase } from './utils/seeder';

const startServer = async () => {
  try {
    await connectDB();
    await seedDatabase();

    const server = app.listen(ENV.PORT, () => {
      console.log(`===============================================`);
      console.log(`🚀 MentorLagbe Server running on port ${ENV.PORT}`);
      console.log(`📡 Environment: ${ENV.NODE_ENV}`);
      console.log(`🌐 Base URL: http://localhost:${ENV.PORT}`);
      console.log(`===============================================`);
    });

    const shutdown = async () => {
      console.log('\nShutting down gracefully...');
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Fatal error during server startup:', error);
    process.exit(1);
  }
};

startServer();
