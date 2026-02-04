import express from 'express';
import cors from 'cors';
import routes from './routes.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
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
