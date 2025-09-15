// React Hooks for AI Integration

import { useState, useEffect, useCallback, useRef } from 'react';
import { AIEngine, getAIEngine, initializeAI } from '../core/AIEngine';
import { 
  AIResponse, 
  AIRequest, 
  AIEvent, 
  AIEventListener,
  AIConfig,
  ChatContext,
  ChatResponse
} from '../types';

// Main AI Hook
export const useAI = (config?: AIConfig) => {
  const [engine, setEngine] = useState<AIEngine | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initAI = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const aiEngine = await initializeAI(config);
        setEngine(aiEngine);
        setIsReady(true);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        setIsReady(false);
      } finally {
        setIsLoading(false);
      }
    };

    initAI();
  }, [config]);

  const executeRequest = useCallback(async <T = any>(
    agentId: string, 
    request: AIRequest
  ): Promise<AIResponse<T>> => {
    if (!engine) {
      return {
        success: false,
        error: 'AI Engine not initialized',
        timestamp: Date.now()
      };
    }

    return await engine.executeRequest<T>(agentId, request);
  }, [engine]);

  const sendChatMessage = useCallback(async (
    message: string,
    conversationId: string = 'default',
    context?: ChatContext
  ): Promise<AIResponse<ChatResponse>> => {
    if (!engine) {
      return {
        success: false,
        error: 'AI Engine not initialized',
        timestamp: Date.now()
      };
    }

    return await engine.processChatMessage(message, conversationId, context);
  }, [engine]);

  const getAgent = useCallback((agentId: string) => {
    return engine?.getAgent(agentId);
  }, [engine]);

  const getAllAgents = useCallback(() => {
    return engine?.getAllAgents() || [];
  }, [engine]);

  return {
    engine,
    isLoading,
    error,
    isReady,
    executeRequest,
    sendChatMessage,
    getAgent,
    getAllAgents
  };
};

// AI Request Hook
export const useAIRequest = <T = any>(agentId: string) => {
  const [response, setResponse] = useState<AIResponse<T> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (request: AIRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      setResponse(null);

      const engine = getAIEngine();
      const result = await engine.executeRequest<T>(agentId, request);
      
      setResponse(result);
      
      if (!result.success) {
        setError(result.error || 'Unknown error');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setResponse({
        success: false,
        error: errorMessage,
        timestamp: Date.now()
      });
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  const reset = useCallback(() => {
    setResponse(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    response,
    isLoading,
    error,
    execute,
    reset
  };
};

// AI Event Hook
export const useAIEvents = (eventTypes?: string[]) => {
  const [events, setEvents] = useState<AIEvent[]>([]);
  const [latestEvent, setLatestEvent] = useState<AIEvent | null>(null);
  const eventListenerRef = useRef<AIEventListener | null>(null);

  useEffect(() => {
    const engine = getAIEngine();
    
    const handleEvent: AIEventListener = (event: AIEvent) => {
      if (!eventTypes || eventTypes.includes(event.type)) {
        setEvents(prev => [...prev.slice(-99), event]); // Keep last 100 events
        setLatestEvent(event);
      }
    };

    eventListenerRef.current = handleEvent;
    engine.on('*', handleEvent);

    return () => {
      if (eventListenerRef.current) {
        engine.off('*', eventListenerRef.current);
      }
    };
  }, [eventTypes]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLatestEvent(null);
  }, []);

  return {
    events,
    latestEvent,
    clearEvents
  };
};

// AI Agent Status Hook
export const useAIAgentStatus = (agentId: string) => {
  const [status, setStatus] = useState<string>('unknown');
  const [agent, setAgent] = useState<any>(null);

  useEffect(() => {
    const engine = getAIEngine();
    
    const updateStatus = () => {
      const agentData = engine.getAgent(agentId);
      if (agentData) {
        setAgent(agentData);
        setStatus(agentData.status);
      }
    };

    // Initial status
    updateStatus();

    // Listen for status changes
    const handleStatusChange: AIEventListener = (event: AIEvent) => {
      if (event.type === 'agent-status-changed' && event.data.agentId === agentId) {
        setStatus(event.data.status);
      }
    };

    engine.on('agent-status-changed', handleStatusChange);

    return () => {
      engine.off('agent-status-changed', handleStatusChange);
    };
  }, [agentId]);

  return {
    status,
    agent,
    isIdle: status === 'idle',
    isActive: status === 'active',
    isBusy: status === 'busy',
    hasError: status === 'error',
    isOffline: status === 'offline'
  };
};

// AI Configuration Hook
export const useAIConfig = () => {
  const [config, setConfig] = useState<AIConfig>({});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const engine = getAIEngine();
    setConfig(engine.getConfig());
  }, []);

  const updateConfig = useCallback(async (newConfig: Partial<AIConfig>) => {
    try {
      setIsUpdating(true);
      const engine = getAIEngine();
      engine.updateConfig(newConfig);
      setConfig(engine.getConfig());
    } catch (error) {
      console.error('Failed to update AI config:', error);
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return {
    config,
    updateConfig,
    isUpdating
  };
};

// AI Memory Hook
export const useAIMemory = () => {
  const [memories, setMemories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addMemory = useCallback(async (content: any, type: string = 'conversation') => {
    try {
      setIsLoading(true);
      
      // In a real implementation, this would save to AI memory system
      const memory = {
        id: Date.now().toString(),
        type,
        content,
        timestamp: Date.now(),
        importance: 0.5,
        tags: []
      };

      setMemories(prev => [...prev, memory]);
    } catch (error) {
      console.error('Failed to add memory:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getMemories = useCallback((type?: string, limit?: number) => {
    let filtered = memories;
    
    if (type) {
      filtered = filtered.filter(m => m.type === type);
    }
    
    if (limit) {
      filtered = filtered.slice(-limit);
    }
    
    return filtered;
  }, [memories]);

  const clearMemories = useCallback(() => {
    setMemories([]);
  }, []);

  return {
    memories,
    addMemory,
    getMemories,
    clearMemories,
    isLoading
  };
};

// AI Streaming Hook
export const useAIStream = (agentId: string) => {
  const [stream, setStream] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startStream = useCallback(async (request: AIRequest) => {
    try {
      setIsStreaming(true);
      setError(null);
      setStream('');

      const engine = getAIEngine();
      
      // Mock streaming - in real implementation, this would handle actual streaming
      const chunks = [
        'Hello',
        ' there!',
        ' How',
        ' can',
        ' I',
        ' help',
        ' you',
        ' today?'
      ];

      for (const chunk of chunks) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setStream(prev => prev + chunk);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setIsStreaming(false);
    }
  }, [agentId]);

  const stopStream = useCallback(() => {
    setIsStreaming(false);
  }, []);

  const clearStream = useCallback(() => {
    setStream('');
    setError(null);
  }, []);

  return {
    stream,
    isStreaming,
    error,
    startStream,
    stopStream,
    clearStream
  };
};
