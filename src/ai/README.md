# AI System Documentation

A comprehensive AI system for 3D viewer applications with support for Natural Language Processing, Computer Vision, 3D Scene Analysis, and more.

## 🏗️ Architecture

```
src/ai/
├── core/           # Core AI engine and orchestration
├── services/       # AI service implementations
├── hooks/          # React hooks for AI integration
├── utils/          # Utility functions and helpers
├── examples/       # Usage examples and demos
├── types.ts        # TypeScript type definitions
├── index.ts        # Main export file
└── README.md       # This documentation
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { useAI, createAIRequest } from './ai';

function MyComponent() {
  const { engine, isReady, executeRequest } = useAI();
  
  const handleAIRequest = async () => {
    if (isReady) {
      const request = createAIRequest('Hello, AI!');
      const response = await executeRequest('text-assistant', request);
      console.log(response);
    }
  };

  return (
    <button onClick={handleAIRequest}>
      Send AI Request
    </button>
  );
}
```

### Advanced Usage

```typescript
import { 
  useAIRequest, 
  useAIEvents, 
  getNLPService, 
  getVisionService 
} from './ai';

function AdvancedComponent() {
  const { response, execute } = useAIRequest('text-assistant');
  const { events } = useAIEvents(['request-completed']);
  
  const analyzeText = async () => {
    const nlpService = getNLPService();
    const result = await nlpService.analyzeText('Sample text');
    console.log(result);
  };

  return (
    <div>
      <button onClick={() => execute(createAIRequest('Analyze this'))}>
        Analyze
      </button>
      <div>Events: {events.length}</div>
    </div>
  );
}
```

## 🧠 Core Components

### AIEngine

The central hub for all AI operations.

```typescript
import { AIEngine, initializeAI } from './ai';

const engine = await initializeAI({
  debug: true,
  timeout: 30000
});

// Execute requests
const response = await engine.executeRequest('agent-id', {
  prompt: 'Your request here',
  context: { additional: 'data' }
});
```

### AI Agents

Pre-configured AI agents for different tasks:

- **text-assistant**: General text generation and conversation
- **scene-analyzer**: 3D scene analysis and optimization
- **content-generator**: Creative content generation

## 🔧 Services

### NLP Service

Natural Language Processing capabilities:

```typescript
import { getNLPService } from './ai';

const nlpService = getNLPService();

// Analyze text
const analysis = await nlpService.analyzeText('Hello world!', {
  extractEntities: true,
  analyzeSentiment: true,
  detectIntent: true
});

// Generate responses
const response = await nlpService.generateResponse('How are you?');

// Translate text
const translation = await nlpService.translateText('Hello', 'es');
```

### Vision Service

Computer Vision capabilities:

```typescript
import { getVisionService } from './ai';

const visionService = getVisionService();

// Analyze images
const analysis = await visionService.analyzeImage(imageData, {
  detectObjects: true,
  detectFaces: true,
  extractText: true
});

// Generate descriptions
const description = await visionService.generateImageDescription(imageData);

// Compare images
const comparison = await visionService.compareImages(image1, image2);
```

### 3D Scene Service

3D scene analysis and optimization:

```typescript
import { getScene3DService } from './ai';

const scene3DService = getScene3DService();

// Analyze 3D scenes
const analysis = await scene3DService.analyzeScene(sceneData, {
  analyzeObjects: true,
  analyzeLighting: true,
  analyzeMaterials: true
});

// Optimize scenes
const optimization = await scene3DService.optimizeScene(sceneData, {
  reducePolygons: true,
  optimizeTextures: true
});

// Get suggestions
const suggestions = await scene3DService.suggestImprovements(sceneData);
```

## 🎣 React Hooks

### useAI

Main hook for AI system access:

```typescript
const { 
  engine, 
  isLoading, 
  error, 
  isReady, 
  executeRequest, 
  getAgent, 
  getAllAgents 
} = useAI(config);
```

### useAIRequest

Hook for executing AI requests:

```typescript
const { 
  response, 
  isLoading, 
  error, 
  execute, 
  reset 
} = useAIRequest('agent-id');
```

### useAIEvents

Hook for monitoring AI events:

```typescript
const { 
  events, 
  latestEvent, 
  clearEvents 
} = useAIEvents(['request-started', 'request-completed']);
```

### useAIAgentStatus

Hook for monitoring agent status:

```typescript
const { 
  status, 
  agent, 
  isIdle, 
  isBusy, 
  hasError 
} = useAIAgentStatus('agent-id');
```

## 🛠️ Utilities

### Response Helpers

```typescript
import { 
  createSuccessResponse, 
  createErrorResponse, 
  isValidAIResponse 
} from './ai';

// Create responses
const success = createSuccessResponse(data, 'model-name', 0.95);
const error = createErrorResponse('Something went wrong');

// Validate responses
if (isValidAIResponse(response)) {
  console.log('Valid AI response');
}
```

### Text Processing

```typescript
import { 
  sanitizeText, 
  truncateText, 
  extractKeywords 
} from './ai';

const clean = sanitizeText('  Hello, world!  ');
const short = truncateText('Long text...', 50);
const keywords = extractKeywords('This is a sample text');
```

### Vector Math

```typescript
import { 
  vector3Distance, 
  vector3Add, 
  vector3Normalize 
} from './ai';

const distance = vector3Distance({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 });
const sum = vector3Add({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 });
const normalized = vector3Normalize({ x: 3, y: 4, z: 5 });
```

### Performance Monitoring

```typescript
import { performanceMonitor } from './ai';

const stopTimer = performanceMonitor.start('my-operation');
// ... do work ...
stopTimer();

const stats = performanceMonitor.getStats('my-operation');
console.log(`Average time: ${stats.avg}ms`);
```

## 📊 Event System

The AI system emits events for monitoring and debugging:

```typescript
import { useAIEvents } from './ai';

function EventMonitor() {
  const { events } = useAIEvents();
  
  return (
    <div>
      {events.map(event => (
        <div key={event.timestamp}>
          {event.type}: {JSON.stringify(event.data)}
        </div>
      ))}
    </div>
  );
}
```

Available events:
- `initialized`: AI system initialized
- `agent-registered`: New agent registered
- `agent-status-changed`: Agent status updated
- `request-started`: Request processing started
- `request-completed`: Request completed successfully
- `request-failed`: Request failed
- `config-updated`: Configuration updated
- `shutdown`: AI system shutdown

## 🔧 Configuration

Configure the AI system:

```typescript
import { initializeAI } from './ai';

const engine = await initializeAI({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.example.com',
  defaultModel: 'gpt-4',
  timeout: 30000,
  retries: 3,
  cache: true,
  debug: true
});
```

## 🧪 Testing

Run the example components to test the AI system:

```typescript
import { AIExamples } from './ai/examples/ExampleUsage';

function App() {
  return <AIExamples />;
}
```

## 📝 Type Definitions

All types are exported from the main index:

```typescript
import type { 
  AIResponse, 
  AIRequest, 
  NLPResponse, 
  VisionResponse, 
  Scene3DResponse 
} from './ai';
```

## 🤝 Contributing

1. Add new services in `src/ai/services/`
2. Create corresponding hooks in `src/ai/hooks/`
3. Update types in `src/ai/types.ts`
4. Add examples in `src/ai/examples/`
5. Update this documentation

## 📄 License

This AI system is part of the 3D Viewer project and follows the same license terms.
