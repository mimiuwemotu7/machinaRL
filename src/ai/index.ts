// AI System Main Export File

// Import console test for immediate testing
import './communication/ConsoleTest';

// Import for internal use
import { initializeAI, getAIEngine } from './core/AIEngine';

// Core
export { AIEngine, getAIEngine, initializeAI } from './core/AIEngine';

// Services
export { NLPService, getNLPService } from './services/NLPService';
export { VisionService, getVisionService } from './services/VisionService';
export { Scene3DService, getScene3DService } from './services/Scene3DService';
export { ChatService, getChatService } from './services/ChatService';
export { MovementCodeService, getMovementCodeService } from './services/MovementCodeService';
export { CodeExecutionService, getCodeExecutionService } from './services/CodeExecutionService';

// Hooks
export {
  useAI,
  useAIRequest,
  useAIEvents,
  useAIAgentStatus,
  useAIConfig,
  useAIMemory,
  useAIStream
} from './hooks/useAI';

// Methods
export { SceneAnalyzer } from './methods/SceneAnalyzer';
export type { SceneMeshData, SceneAnalysis } from './methods/SceneAnalyzer';

// Communication
export { AICommunicationSystem, CommunicationHelper } from './communication';
export type { 
  CommunicationMessage, 
  CommunicationChannel, 
  AICommunicationConfig
} from './communication';
export type { CommunicationContext } from './communication/CommunicationHelper';
export { CommunicationType, MessagePriority } from './communication';

// Utilities
export {
  isValidAIResponse,
  createErrorResponse,
  createSuccessResponse,
  createAIRequest,
  sanitizeText,
  truncateText,
  extractKeywords,
  calculateConfidence,
  vector3Distance,
  vector3Add,
  vector3Subtract,
  vector3Scale,
  vector3Normalize,
  boundingBoxIntersects,
  boundingBoxArea,
  boundingBoxCenter,
  formatAIResponse,
  aggregateResponses,
  AICache,
  withRetry,
  debounce,
  throttle,
  PerformanceMonitor,
  aiCache,
  performanceMonitor
} from './utils/aiHelpers';

// Types
export type {
  AIResponse,
  AIRequest,
  AIOptions,
  AIConfig,
  AIEvent,
  AIEventListener,
  NLPResponse,
  Entity,
  Sentiment,
  Intent,
  VisionResponse,
  DetectedObject,
  DetectedFace,
  BoundingBox,
  Point,
  Emotion,
  Scene3DResponse,
  Scene3DObject,
  Vector3,
  LightingInfo,
  MaterialInfo,
  CameraInfo,
  AIAgent,
  AgentType,
  AgentStatus,
  AgentConfig,
  AIMemory,
  MemoryType,
  LearningData,
  ModelMetrics,
  MovementCommand,
  GeneratedMovementCode,
  CodeExecutionResult,
  ExecutionContext
} from './types';

// Auto-initialize AI system when imported
let aiSystemReady = false;

export const ensureAISystemReady = async () => {
  if (!aiSystemReady) {
    try {
      await initializeAI({
        debug: process.env.NODE_ENV === 'development'
      });
      aiSystemReady = true;
      console.log('🤖 AI System ready');
    } catch (error) {
      console.error('❌ Failed to initialize AI System:', error);
      throw error;
    }
  }
  return aiSystemReady;
};

// Convenience function to get ready AI system
export const getReadyAI = async () => {
  await ensureAISystemReady();
  return getAIEngine();
};
