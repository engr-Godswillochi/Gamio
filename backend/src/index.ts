import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db.js';
import { gameRouter } from './routes/gameRoutes.js';
import { socialRouter } from './routes/socialRoutes.js';
import { remixRouter } from './routes/remixRoutes.js';
import { profileRouter } from './routes/profileRoutes.js';
import { aiRouter } from './routes/aiRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check Endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Gamio API (Node.js/TypeScript)', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/games', gameRouter);
app.use('/api/feed', gameRouter);
app.use('/api/remix', remixRouter);
app.use('/api/u', profileRouter);
app.use('/api/ai', aiRouter);
app.use('/api', socialRouter);

async function startServer() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`🎮 Gamio Backend Server running at http://localhost:${PORT}`);
  });
}

startServer();
