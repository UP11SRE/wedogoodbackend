import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import connectDB from './config/db.js';
import routes from './routes.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { logger } from './utils/helpers.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Connect to MongoDB
await connectDB();

// Middleware
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',')
  : ['http://localhost:5173', 'http://localhost:5174'];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'success', message: 'Server is running', timestamp: new Date().toISOString() });
});

// All routes
app.use('/', routes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`, { env: process.env.NODE_ENV, port: PORT });
});

// Handle errors
process.on('unhandledRejection', (err, _promise) => {
  logger.error('Unhandled Promise Rejection', { error: err.message });
});

process.on('uncaughtException', err => {
  logger.error('Uncaught Exception', { error: err.message });
  process.exit(1);
});

export default app;
