const express = require('express');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint for Railway
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    message: '3D Viewer Express Server is running!',
    timestamp: new Date().toISOString()
  });
});

// AI API endpoints - proxy to the backend server
app.use('/api/ai', (req, res) => {
  // Forward AI requests to the backend server
  const http = require('http');
  const options = {
    hostname: 'localhost',
    port: 8080,
    path: req.path,
    method: req.method,
    headers: req.headers
  };
  
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (err) => {
    console.error('Backend proxy error:', err);
    res.status(503).json({ error: 'Backend service unavailable' });
  });
  
  if (req.method !== 'GET') {
    proxyReq.write(JSON.stringify(req.body));
  }
  proxyReq.end();
});

// Backend server status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    message: "3D Viewer AI Server is running!",
    status: "active",
    timestamp: new Date().toISOString(),
    services: {
      frontend: 'running',
      backend: 'running'
    }
  });
});

// Serve static files from the React app build
app.use(express.static(path.join(__dirname, 'build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the backend server
const startBackend = () => {
  console.log('Starting AI backend server...');
  const backend = spawn('node', ['--experimental-modules', 'server/index.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, PORT: 8080, NODE_ENV: 'production' }
  });
  
  backend.on('error', (err) => {
    console.error('Backend server error:', err);
  });
  
  backend.on('exit', (code) => {
    console.log(`Backend server exited with code ${code}`);
  });
  
  return backend;
};

// Start the Express server first
let backendProcess;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Frontend server running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  
  // Start backend after frontend is ready
  backendProcess = startBackend();
});

server.on('error', (err) => {
  console.error('❌ Express server error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down servers...');
  if (backendProcess) backendProcess.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down servers...');
  if (backendProcess) backendProcess.kill();
  process.exit(0);
});
