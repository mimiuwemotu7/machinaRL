// Core AI Engine - Central hub for all AI operations

import { 
  AIResponse, 
  AIRequest, 
  AIOptions, 
  AIConfig, 
  AIEvent, 
  AIEventListener,
  AIAgent,
  AgentStatus,
  ChatContext
} from '../types';
import { getChatService } from '../services/ChatService';

export class AIEngine {
  private config: AIConfig;
  private agents: Map<string, AIAgent> = new Map();
  private eventListeners: Map<string, AIEventListener[]> = new Map();
  private isInitialized = false;
  private chatService = getChatService();

  constructor(config: AIConfig = {}) {
    this.config = {
      timeout: 30000,
      retries: 3,
      cache: true,
      debug: false,
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize AI services
      await this.initializeServices();
      
      // Register default agents
      await this.registerDefaultAgents();
      
      this.isInitialized = true;
      this.emit('initialized', { timestamp: Date.now() });
      
      if (this.config.debug) {
        console.log('🤖 AI Engine initialized successfully');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('error', { error: errorMessage, timestamp: Date.now() });
      throw error;
    }
  }

  private async initializeServices(): Promise<void> {
    // Initialize various AI services
    // This would typically connect to AI APIs, load models, etc.
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate initialization
  }

  private async registerDefaultAgents(): Promise<void> {
    const defaultAgents: AIAgent[] = [
      {
        id: 'text-assistant',
        name: 'Text Assistant',
        type: 'assistant',
        capabilities: ['text-generation', 'conversation', 'summarization'],
        status: 'idle',
        config: {
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 1000
        }
      },
      {
        id: 'scene-analyzer',
        name: '3D Scene Analyzer',
        type: 'analyzer',
        capabilities: ['scene-analysis', 'object-detection', 'lighting-analysis'],
        status: 'idle',
        config: {
          model: 'custom-3d-model',
          temperature: 0.1
        }
      },
      {
        id: 'content-generator',
        name: 'Content Generator',
        type: 'generator',
        capabilities: ['text-generation', 'code-generation', 'creative-writing'],
        status: 'idle',
        config: {
          model: 'gpt-4',
          temperature: 0.8,
          maxTokens: 2000
        }
      }
    ];

    for (const agent of defaultAgents) {
      this.registerAgent(agent);
    }
  }

  registerAgent(agent: AIAgent): void {
    this.agents.set(agent.id, agent);
    this.emit('agent-registered', { agent, timestamp: Date.now() });
    
    if (this.config.debug) {
      console.log(`🤖 Registered agent: ${agent.name} (${agent.id})`);
    }
  }

  getAgent(id: string): AIAgent | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): AIAgent[] {
    return Array.from(this.agents.values());
  }

  async executeRequest<T = any>(
    agentId: string, 
    request: AIRequest
  ): Promise<AIResponse<T>> {
    const agent = this.getAgent(agentId);
    if (!agent) {
      return {
        success: false,
        error: `Agent ${agentId} not found`,
        timestamp: Date.now()
      };
    }

    if (agent.status === 'busy') {
      return {
        success: false,
        error: `Agent ${agentId} is busy`,
        timestamp: Date.now()
      };
    }

    try {
      this.updateAgentStatus(agentId, 'busy');
      this.emit('request-started', { agentId, request, timestamp: Date.now() });

      const response = await this.processRequest<T>(agent, request);
      
      this.updateAgentStatus(agentId, 'idle');
      this.emit('request-completed', { agentId, response, timestamp: Date.now() });
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateAgentStatus(agentId, 'error');
      this.emit('request-failed', { agentId, error: errorMessage, timestamp: Date.now() });
      
      return {
        success: false,
        error: errorMessage,
        timestamp: Date.now()
      };
    }
  }

  async processChatMessage(
    message: string, 
    conversationId: string = 'default',
    context?: ChatContext
  ): Promise<AIResponse> {
    try {
      this.emit('chat-started', { 
        message, 
        conversationId, 
        context, 
        timestamp: Date.now() 
      });

      const response = await this.chatService.processChatMessage(
        message, 
        conversationId, 
        context
      );

      if (response.success) {
        this.emit('chat-completed', { 
          response: response.data, 
          conversationId, 
          timestamp: Date.now() 
        });
      } else {
        this.emit('chat-failed', { 
          error: response.error, 
          conversationId, 
          timestamp: Date.now() 
        });
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('chat-failed', { 
        error: errorMessage, 
        conversationId, 
        timestamp: Date.now() 
      });
      
      return {
        success: false,
        error: errorMessage,
        timestamp: Date.now()
      };
    }
  }

  private async processRequest<T>(agent: AIAgent, request: AIRequest): Promise<AIResponse<T>> {
    // This would typically route to different AI services based on agent type
    // For now, we'll simulate the processing
    
    const startTime = Date.now();
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 500));
    
    const processingTime = Date.now() - startTime;
    
    // Mock response based on agent type
    let data: any;
    switch (agent.type) {
      case 'assistant':
        data = this.generateAssistantResponse(request);
        break;
      case 'analyzer':
        data = this.generateAnalysisResponse(request);
        break;
      case 'generator':
        data = this.generateContentResponse(request);
        break;
      default:
        data = { message: 'Request processed', input: request.prompt };
    }

    return {
      success: true,
      data,
      timestamp: Date.now(),
      model: agent.config.model,
      confidence: 0.85 + Math.random() * 0.1
    };
  }

  private generateAssistantResponse(request: AIRequest): any {
    return {
      response: `I understand you're asking about: "${request.prompt}". Here's my response...`,
      suggestions: ['Tell me more', 'Can you explain?', 'What else?'],
      context: request.context
    };
  }

  private generateAnalysisResponse(request: AIRequest): any {
    return {
      analysis: `Analysis of: "${request.prompt}"`,
      findings: ['Object detected', 'Lighting analyzed', 'Scene understood'],
      recommendations: ['Adjust lighting', 'Add more objects', 'Change camera angle']
    };
  }

  private generateContentResponse(request: AIRequest): any {
    return {
      content: `Generated content based on: "${request.prompt}"`,
      variations: [
        'Alternative version 1',
        'Alternative version 2',
        'Alternative version 3'
      ],
      metadata: {
        wordCount: request.prompt.length,
        complexity: 'medium'
      }
    };
  }

  private updateAgentStatus(agentId: string, status: AgentStatus): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      this.emit('agent-status-changed', { agentId, status, timestamp: Date.now() });
    }
  }

  // Event System
  on(event: string, listener: AIEventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  off(event: string, listener: AIEventListener): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const aiEvent: AIEvent = {
        type: event,
        data,
        timestamp: Date.now(),
        source: 'AIEngine'
      };
      
      listeners.forEach(listener => {
        try {
          listener(aiEvent);
        } catch (error) {
          console.error('Error in AI event listener:', error);
        }
      });
    }
  }

  // Utility Methods
  getConfig(): AIConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<AIConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config-updated', { config: this.config, timestamp: Date.now() });
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  async shutdown(): Promise<void> {
    this.agents.clear();
    this.eventListeners.clear();
    this.isInitialized = false;
    this.emit('shutdown', { timestamp: Date.now() });
  }
}

// Singleton instance
let aiEngineInstance: AIEngine | null = null;

export const getAIEngine = (config?: AIConfig): AIEngine => {
  if (!aiEngineInstance) {
    aiEngineInstance = new AIEngine(config);
  }
  return aiEngineInstance;
};

export const initializeAI = async (config?: AIConfig): Promise<AIEngine> => {
  const engine = getAIEngine(config);
  await engine.initialize();
  return engine;
};
