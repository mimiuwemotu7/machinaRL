// 3D Viewer AI Server
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { DualAIEngine } from './services/dualAIEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://3d-viewer-production.up.railway.app', 'https://*.railway.app'] 
    : true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from React build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
}

// Initialize Dual AI Engine with error handling
let dualAIEngine = null;

// Initialize AI Engine asynchronously
(async () => {
  try {
    const { DualAIEngine } = await import('./services/dualAIEngine.js');
    dualAIEngine = new DualAIEngine();
    console.log('✅ DualAIEngine initialized successfully');
  } catch (error) {
    console.warn('⚠️ DualAIEngine not available, using simplified mode:', error.message);
    dualAIEngine = {
      getStatus: () => ({ 
        running: false, 
        message: 'AI Engine in simplified mode',
        timestamp: Date.now()
      }),
      stop: () => console.log('AI Engine stopped')
    };
  }
})();

// Routes
app.get('/', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    // Serve React app in production
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  } else {
    res.json({
      message: '3D Viewer AI Server is running!',
      status: 'active',
      timestamp: new Date().toISOString()
    });
  }
});

// Get AI engine status
app.get('/api/ai/status', (req, res) => {
  const status = dualAIEngine.getStatus();
  res.json({
    success: true,
    data: status,
    timestamp: Date.now()
  });
});

// Start AI engine
app.post('/api/ai/start', (req, res) => {
  try {
    dualAIEngine.start();
    const status = dualAIEngine.getStatus();
    
    res.json({
      success: true,
      message: 'AI engine started successfully',
      data: status,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// Stop AI engine
app.post('/api/ai/stop', (req, res) => {
  try {
    dualAIEngine.stop();
    const status = dualAIEngine.getStatus();
    
    res.json({
      success: true,
      message: 'AI engine stopped successfully',
      data: status,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// Update AI configuration
app.put('/api/ai/config', (req, res) => {
  try {
    const { intervalMs, maxMessages } = req.body;
    
    dualAIEngine.updateConfig({
      intervalMs,
      maxMessages
    });
    
    const status = dualAIEngine.getStatus();
    
    res.json({
      success: true,
      message: 'AI configuration updated',
      data: status,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: Date.now(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: Date.now()
  });
});

// Catch all handler for React Router (must be after API routes)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
} else {
  // 404 handler for development
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
      timestamp: Date.now()
    });
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 3D Viewer AI Server running on port ${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🤖 AI status: http://localhost:${PORT}/api/ai/status`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down AI server...');
  dualAIEngine.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down AI server...');
  dualAIEngine.stop();
  process.exit(0);
});
