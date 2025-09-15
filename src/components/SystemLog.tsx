import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAIEvents, useAI } from '../ai';
import type { AIEvent, AIResponse } from '../ai';
import AIConfigPanel from './AIConfigPanel';
import { Bot, Clock, Send } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'system' | 'ai' | 'error' | 'warning' | 'info';
  message: string;
  data?: any;
  source?: string;
}

interface SystemLogProps {
  maxEntries?: number;
  showTimestamps?: boolean;
  autoScroll?: boolean;
  enableChat?: boolean;
  showChatInput?: boolean;
}

const SystemLog: React.FC<SystemLogProps> = ({
  maxEntries = 100,
  showTimestamps = true,
  autoScroll = true,
  enableChat = true,
  showChatInput = true
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const { events } = useAIEvents();
  const { isReady: aiReady, sendChatMessage } = useAI();

  // Function to add external messages
  const addExternalMessage = useCallback((message: string, type: LogEntry['type'] = 'info', source: string = 'External') => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type,
      message,
      source
    };
    
    setLogs(prevLogs => {
      const updatedLogs = [...prevLogs, newLog];
      return updatedLogs.slice(-maxEntries); // Keep only the last maxEntries
    });
  }, [maxEntries]);

  // Expose addExternalMessage globally
  useEffect(() => {
    (window as any).addSystemLogMessage = addExternalMessage;
    
    return () => {
      delete (window as any).addSystemLogMessage;
    };
  }, [addExternalMessage]);

  // Add initial system logs
  useEffect(() => {
    const initialLogs: LogEntry[] = [
      {
        id: '1',
        timestamp: new Date(),
        type: 'system',
        message: 'System initialized',
        source: 'System'
      },
      {
        id: '2',
        timestamp: new Date(),
        type: 'system',
        message: '3D viewer ready',
        source: 'Viewer'
      }
    ];

    if (aiReady) {
      initialLogs.push({
        id: '3',
        timestamp: new Date(),
        type: 'ai',
        message: 'AI system ready',
        source: 'AI Engine'
      });
    }

    setLogs(initialLogs);
  }, [aiReady]);

  // Process AI events and add to logs
  useEffect(() => {
    if (events.length === 0) return;

    const latestEvent = events[events.length - 1];
    const logEntry = createLogFromAIEvent(latestEvent);
    
    setLogs(prev => {
      const newLogs = [...prev, logEntry];
      return newLogs.slice(-maxEntries);
    });
  }, [events, maxEntries]);

  const createLogFromAIEvent = (event: AIEvent): LogEntry => {
    let type: LogEntry['type'] = 'info';
    let message = '';
    let source = 'AI System';

    switch (event.type) {
      case 'initialized':
        type = 'system';
        message = 'AI system initialized successfully';
        break;
      case 'agent-registered':
        type = 'info';
        message = `Agent registered: ${event.data.agent.name}`;
        source = 'AI Engine';
        break;
      case 'agent-status-changed':
        type = 'info';
        message = `Agent ${event.data.agentId} status: ${event.data.status}`;
        source = 'AI Engine';
        break;
      case 'request-started':
        type = 'info';
        message = `AI request started: ${event.data.request.prompt.substring(0, 50)}...`;
        source = `Agent ${event.data.agentId}`;
        break;
      case 'request-completed':
        type = 'ai';
        message = `AI response received: ${JSON.stringify(event.data.response.data).substring(0, 100)}...`;
        source = `Agent ${event.data.agentId}`;
        break;
      case 'request-failed':
        type = 'error';
        message = `AI request failed: ${event.data.error}`;
        source = `Agent ${event.data.agentId}`;
        break;
      case 'config-updated':
        type = 'info';
        message = 'AI configuration updated';
        source = 'AI Engine';
        break;
      case 'shutdown':
        type = 'warning';
        message = 'AI system shutdown';
        source = 'AI Engine';
        break;
      default:
        type = 'info';
        message = `AI event: ${event.type}`;
    }

    return {
      id: `ai-${event.timestamp}`,
      timestamp: new Date(event.timestamp),
      type,
      message,
      data: event.data,
      source
    };
  };

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getLogTypeClass = (type: LogEntry['type']): string => {
    switch (type) {
      case 'ai': return 'log-ai';
      case 'error': return 'log-error';
      case 'warning': return 'log-warning';
      case 'info': return 'log-info';
      case 'system': return 'log-system';
      default: return 'log-default';
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSending || !aiReady) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setIsSending(true);

    // Add user message to logs
    const userLogEntry: LogEntry = {
      id: `user-${Date.now()}`,
      timestamp: new Date(),
      type: 'info',
      message: userMessage,
      source: 'User'
    };

    setLogs(prev => {
      const newLogs = [...prev, userLogEntry];
      return newLogs.slice(-maxEntries);
    });

    try {
      // Send chat message to AI with scene context
      const response = await sendChatMessage(userMessage, 'system-log', {
        systemLog: true,
        timestamp: new Date().toISOString(),
        sceneInfo: {
          currentScene: (window as any).currentScene?.metadata?.name || 'Unknown',
          cameraMode: 'glb', // Default mode
          selectedCube: 'p1' // Default selection
        }
      });

      if (response.success && response.data) {
        // Add AI response to logs
        const aiLogEntry: LogEntry = {
          id: `ai-${Date.now()}`,
          timestamp: new Date(),
          type: 'ai',
          message: response.data.message.content,
          source: 'AI Assistant',
          data: response.data
        };

        setLogs(prev => {
          const newLogs = [...prev, aiLogEntry];
          return newLogs.slice(-maxEntries);
        });
      } else {
        // Add error to logs
        const errorLogEntry: LogEntry = {
          id: `error-${Date.now()}`,
          timestamp: new Date(),
          type: 'error',
          message: `AI request failed: ${response.error}`,
          source: 'AI System'
        };

        setLogs(prev => {
          const newLogs = [...prev, errorLogEntry];
          return newLogs.slice(-maxEntries);
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorLogEntry: LogEntry = {
        id: `error-${Date.now()}`,
        timestamp: new Date(),
        type: 'error',
        message: `Chat error: ${errorMessage}`,
        source: 'System'
      };

      setLogs(prev => {
        const newLogs = [...prev, errorLogEntry];
        return newLogs.slice(-maxEntries);
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit(e);
    }
  };

  return (
    <div className="system-log">
      <div className="log-header">
        <h2>System Log</h2>
      </div>
      
      <div className="log-container" ref={logContainerRef}>
        {logs.map((log) => (
          <div key={log.id} className={`log-entry ${getLogTypeClass(log.type)}`}>
            <div className="log-header-info">
              {showTimestamps && (
                <span className="log-time">{formatTime(log.timestamp)}</span>
              )}
              <span className="log-source">[{log.source}]</span>
            </div>
            <div className="log-content">
              <div className="log-message">{log.message}</div>
              {log.data && (
                <details className="log-details">
                  <summary>Details</summary>
                  <pre className="log-data">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        ))}
        
        {logs.length === 0 && (
          <div className="log-empty">
            <span>No log entries</span>
          </div>
        )}
      </div>

      {enableChat && showChatInput && (
        <div className="chat-input">
          <form onSubmit={handleChatSubmit}>
            <input
              ref={chatInputRef}
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={aiReady ? "Type a message to chat with AI..." : "AI system not ready"}
              disabled={!aiReady || isSending}
              className="chat-input-field"
            />
            <button
              type="submit"
              disabled={!aiReady || isSending || !chatInput.trim()}
              className="chat-send-btn"
            >
              {isSending ? <Clock size={16} /> : <Send size={16} />}
            </button>
          </form>
        </div>
      )}
      
      <div className="log-footer">
        <span className="log-count">{logs.length} entries</span>
        {aiReady && (
          <span className="ai-status"><Bot size={16} /> AI Ready</span>
        )}
      </div>

      <AIConfigPanel
        isOpen={showConfig}
        onClose={() => setShowConfig(false)}
        onConfigChange={() => {
          // Refresh AI system when config changes
          window.location.reload();
        }}
      />
    </div>
  );
};

export default SystemLog;
