# 3D Viewer AI Server

This server runs the dual AI system (P1 and P2) and writes AI responses to Firebase Realtime Database for the frontend to consume.

## Features

- **Dual AI Engine**: Manages P1 and P2 AI agents
- **Firebase Integration**: Writes AI responses to Firebase Realtime Database
- **REST API**: Control the AI system via HTTP endpoints
- **Real-time Processing**: Generates AI responses at configurable intervals
- **Mock AI Responses**: Currently uses mock responses (ready for real AI integration)

## Quick Start

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   # or
   node index.js
   ```

3. **Server will be available at:**
   - Main server: http://localhost:3001
   - API endpoints: http://localhost:3001/api

## API Endpoints

### AI Control
- `GET /api/ai/status` - Get AI engine status
- `POST /api/ai/start` - Start the AI engine
- `POST /api/ai/stop` - Stop the AI engine
- `PUT /api/ai/config` - Update AI configuration

### System
- `GET /api/health` - Health check
- `GET /` - Server status

## Configuration

The server can be configured via environment variables or API calls:

- `PORT` - Server port (default: 3001)
- `AI_INTERVAL_MS` - Time between AI messages (default: 5000ms)
- `AI_MAX_MESSAGES` - Maximum messages per session (default: 100)

## Firebase Integration

The server writes AI responses to Firebase Realtime Database under the `aiResponses` path. Each response includes:

- AI message content
- Agent ID (p1/p2)
- Timestamp
- Processing status
- Conversation metadata

## Development

- **Watch mode**: `npm run dev` (auto-restart on changes)
- **Logs**: All AI activity is logged to console
- **Error handling**: Graceful error handling and recovery

## Integration with Frontend

The frontend listens to Firebase for new AI responses and processes them using the existing mesh control logic. No changes needed to the frontend processing code - just the data source changes from direct AI calls to Firebase.

## Next Steps

1. Replace mock AI responses with real AI system integration
2. Add more sophisticated AI conversation logic
3. Implement AI response validation
4. Add metrics and monitoring
