import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Database } from './db/schema';
import { LLMService } from './services/llm';
import { ChatService } from './services/chat';
import { createChatRouter } from './routes/chat';

dotenv.config();

const PORT = process.env.PORT || 3001;
const DATABASE_URL = process.env.DATABASE_URL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY environment variable is required');
  process.exit(1);
}

if (!DATABASE_URL && !process.env.DB_HOST) {
  console.error('ERROR: DATABASE_URL or DB_HOST environment variable is required');
  console.error('Please set DATABASE_URL (or DB_HOST, DB_NAME, DB_USER, DB_PASSWORD) in your .env file');
  process.exit(1);
}

async function startServer() {
  // Initialize database
  const db = new Database(DATABASE_URL);
  await db.initialize();

  // Initialize services
  const llm = new LLMService(GEMINI_API_KEY);
  const chatService = new ChatService(db, llm);

  // Create Express app
  const app = express();

  // Middleware
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/chat', createChatRouter(chatService));
  // Also support /chat for local development with vite proxy
  if (process.env.NODE_ENV === 'development') {
    app.use('/chat', createChatRouter(chatService));
  }

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    });
  });

  // Start server
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Database: PostgreSQL ${DATABASE_URL ? '(using DATABASE_URL)' : '(using connection params)'}`);
    console.log(`🤖 LLM: Gemini 2.5 Flash`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing database...');
    await db.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, closing database...');
    await db.close();
    process.exit(0);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});


