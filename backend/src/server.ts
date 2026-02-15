import express, { Request, Response } from 'express';
import cors from 'cors';
import routes from './routes.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json());

// Basic request timing (helps diagnose Render cold starts vs. slow DB queries)
app.use((req, res, next) => {
  const startNs = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startNs) / 1e6;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms`);
  });

  next();
});

// Health check (also serves as keep-alive ping target)
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', ts: Date.now() });
});

// Alias for health at /api/health for consistency  
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', ts: Date.now() });
});

// API routes
app.use('/api', routes);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  const localHost = `http://localhost:${PORT}`;
  const networkHost = `http://<your-ip>:${PORT}`;
  console.log(`Server running on port ${PORT}`);
  console.log(`   Local: ${localHost}`);
  console.log(`   Network: ${networkHost}`);
  console.log(`   To use on other devices, replace <your-ip> with your machine's IP address`);
});
