// Example Usage of AI System Components

import React, { useState, useEffect } from 'react';
import {
  useAI,
  useAIRequest,
  useAIEvents,
  useAIAgentStatus,
  getNLPService,
  getVisionService,
  getScene3DService,
  createAIRequest,
  formatAIResponse
} from '../index';

// Example 1: Basic AI Hook Usage
export const BasicAIExample: React.FC = () => {
  const { engine, isLoading, error, isReady, executeRequest } = useAI({
    debug: true
  });

  const [response, setResponse] = useState<any>(null);

  const handleRequest = async () => {
    const request = createAIRequest('Hello, how are you?');
    const result = await executeRequest('text-assistant', request);
    setResponse(result);
  };

  if (isLoading) return <div>Loading AI system...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!isReady) return <div>AI system not ready</div>;

  return (
    <div>
      <h3>Basic AI Example</h3>
      <button onClick={handleRequest}>Send Request</button>
      {response && (
        <pre>{formatAIResponse(response)}</pre>
      )}
    </div>
  );
};

// Example 2: AI Request Hook
export const AIRequestExample: React.FC = () => {
  const { response, isLoading, error, execute, reset } = useAIRequest('text-assistant');
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      execute(createAIRequest(prompt));
    }
  };

  return (
    <div>
      <h3>AI Request Example</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt..."
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Processing...' : 'Send'}
        </button>
        <button type="button" onClick={reset}>Reset</button>
      </form>
      
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      {response && (
        <div>
          <h4>Response:</h4>
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

// Example 3: AI Events Monitoring
export const AIEventsExample: React.FC = () => {
  const { events, latestEvent, clearEvents } = useAIEvents(['request-started', 'request-completed']);

  return (
    <div>
      <h3>AI Events Monitor</h3>
      <button onClick={clearEvents}>Clear Events</button>
      
      {latestEvent && (
        <div>
          <h4>Latest Event:</h4>
          <pre>{JSON.stringify(latestEvent, null, 2)}</pre>
        </div>
      )}
      
      <h4>Recent Events ({events.length}):</h4>
      <div style={{ maxHeight: '200px', overflow: 'auto' }}>
        {events.map((event, index) => (
          <div key={index} style={{ fontSize: '12px', marginBottom: '5px' }}>
            <strong>{event.type}</strong> - {new Date(event.timestamp).toLocaleTimeString()}
          </div>
        ))}
      </div>
    </div>
  );
};

// Example 4: Agent Status Monitoring
export const AgentStatusExample: React.FC = () => {
  const { status, agent, isIdle, isBusy, hasError } = useAIAgentStatus('text-assistant');

  return (
    <div>
      <h3>Agent Status Monitor</h3>
      <div>
        <strong>Status:</strong> {status}
      </div>
      <div>
        <strong>Is Idle:</strong> {isIdle ? 'Yes' : 'No'}
      </div>
      <div>
        <strong>Is Busy:</strong> {isBusy ? 'Yes' : 'No'}
      </div>
      <div>
        <strong>Has Error:</strong> {hasError ? 'Yes' : 'No'}
      </div>
      {agent && (
        <div>
          <h4>Agent Details:</h4>
          <pre>{JSON.stringify(agent, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

// Example 5: NLP Service Usage
export const NLPExample: React.FC = () => {
  const [text, setText] = useState('Hello, I love this amazing product!');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const analyzeText = async () => {
    setLoading(true);
    try {
      const nlpService = getNLPService();
      const response = await nlpService.analyzeText(text, {
        extractEntities: true,
        analyzeSentiment: true,
        detectIntent: true,
        detectLanguage: true
      });
      setResult(response);
    } catch (error) {
      console.error('NLP analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>NLP Service Example</h3>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        cols={50}
      />
      <br />
      <button onClick={analyzeText} disabled={loading}>
        {loading ? 'Analyzing...' : 'Analyze Text'}
      </button>
      
      {result && (
        <div>
          <h4>Analysis Result:</h4>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

// Example 6: Vision Service Usage
export const VisionExample: React.FC = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const analyzeImage = async () => {
    if (!imageUrl) return;
    
    setLoading(true);
    try {
      const visionService = getVisionService();
      const response = await visionService.analyzeImage(imageUrl, {
        detectObjects: true,
        detectFaces: true,
        extractText: true,
        analyzeScene: true
      });
      setResult(response);
    } catch (error) {
      console.error('Vision analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>Vision Service Example</h3>
      <input
        type="url"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="Enter image URL..."
        style={{ width: '300px' }}
      />
      <br />
      <button onClick={analyzeImage} disabled={loading || !imageUrl}>
        {loading ? 'Analyzing...' : 'Analyze Image'}
      </button>
      
      {result && (
        <div>
          <h4>Analysis Result:</h4>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

// Example 7: 3D Scene Service Usage
export const Scene3DExample: React.FC = () => {
  const [sceneData, setSceneData] = useState<any>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const analyzeScene = async () => {
    setLoading(true);
    try {
      const scene3DService = getScene3DService();
      const response = await scene3DService.analyzeScene(sceneData, {
        analyzeObjects: true,
        analyzeLighting: true,
        analyzeMaterials: true,
        analyzeCamera: true,
        extractMetadata: true
      });
      setResult(response);
    } catch (error) {
      console.error('3D scene analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>3D Scene Service Example</h3>
      <button onClick={analyzeScene} disabled={loading}>
        {loading ? 'Analyzing...' : 'Analyze 3D Scene'}
      </button>
      
      {result && (
        <div>
          <h4>Analysis Result:</h4>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

// Main Example Component
export const AIExamples: React.FC = () => {
  const [activeExample, setActiveExample] = useState<string>('basic');

  const examples = {
    basic: BasicAIExample,
    request: AIRequestExample,
    events: AIEventsExample,
    status: AgentStatusExample,
    nlp: NLPExample,
    vision: VisionExample,
    scene3d: Scene3DExample
  };

  const ActiveComponent = examples[activeExample as keyof typeof examples];

  return (
    <div style={{ padding: '20px' }}>
      <h2>AI System Examples</h2>
      
      <div style={{ marginBottom: '20px' }}>
        {Object.keys(examples).map(key => (
          <button
            key={key}
            onClick={() => setActiveExample(key)}
            style={{
              margin: '5px',
              padding: '10px',
              backgroundColor: activeExample === key ? '#007bff' : '#f8f9fa',
              color: activeExample === key ? 'white' : 'black',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)} Example
          </button>
        ))}
      </div>

      <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
        <ActiveComponent />
      </div>
    </div>
  );
};

export default AIExamples;
