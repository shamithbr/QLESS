import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

import { initDatabase } from './src/server/db/store.ts';
import authRoutes from './src/server/routes/auth.ts';
import restaurantRoutes from './src/server/routes/restaurants.ts';
import foodRoutes from './src/server/routes/food.ts';
import orderRoutes from './src/server/routes/orders.ts';
import paymentRoutes from './src/server/routes/payments.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'QLESS College Canteen API',
    tagline: 'Skip the queue. Enjoy your break.',
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  try {
    // 1. Initialize Database (Atlas or Embedded Persistent Store)
    await initDatabase();

    // 2. Vite integration in Development vs Static Serving in Production
    if (process.env.NODE_ENV === 'production') {
      const distPath = path.resolve(__dirname, 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n======================================================`);
      console.log(`🚀 QLESS Full-Stack Server running at http://localhost:${PORT}`);
      console.log(`Tagline: "Skip the queue. Enjoy your break."`);
      console.log(`======================================================\n`);
    });
  } catch (error) {
    console.error('Fatal error starting QLESS server:', error);
    process.exit(1);
  }
}

startServer();
