// Core AI Types and Interfaces

export interface AIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
  model?: string;
  confidence?: number;
}

export interface AIRequest {
  prompt: string;
  context?: Record<string, any>;
  options?: AIOptions;
  conversationId?: string;
  userId?: string;
}

export interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  stream?: boolean;
  timeout?: number;
}

// Natural Language Processing
export interface NLPResponse {
  text: string;
  entities?: Entity[];
  sentiment?: Sentiment;
  intent?: Intent;
  language?: string;
  confidence?: number;
}

export interface Entity {
  text: string;
  type: string;
  start: number;
  end: number;
  confidence: number;
}

export interface Sentiment {
  label: 'positive' | 'negative' | 'neutral';
  score: number;
}

export interface Intent {
  name: string;
  confidence: number;
  parameters?: Record<string, any>;
}

// Computer Vision
export interface VisionResponse {
  objects?: DetectedObject[];
  text?: string;
  faces?: DetectedFace[];
  scene?: string;
  confidence?: number;
}

export interface DetectedObject {
  label: string;
  confidence: number;
  bbox: BoundingBox;
  category?: string;
}

export interface DetectedFace {
  confidence: number;
  bbox: BoundingBox;
  landmarks?: Point[];
  emotions?: Emotion[];
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Emotion {
  name: string;
  confidence: number;
}

// 3D Scene Analysis
export interface Scene3DResponse {
  objects?: Scene3DObject[];
  lighting?: LightingInfo;
  materials?: MaterialInfo[];
  camera?: CameraInfo;
  metadata?: Record<string, any>;
}

export interface Scene3DObject {
  id: string;
  type: string;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  material?: string;
  mesh?: string;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface LightingInfo {
  type: 'directional' | 'point' | 'spot' | 'ambient';
  intensity: number;
  color: string;
  position?: Vector3;
  direction?: Vector3;
}

export interface MaterialInfo {
  name: string;
  type: string;
  properties: Record<string, any>;
}

export interface CameraInfo {
  position: Vector3;
  target: Vector3;
  fov: number;
  type: string;
}

// AI Agent System
export interface AIAgent {
  id: string;
  name: string;
  type: AgentType;
  capabilities: string[];
  status: AgentStatus;
  config: AgentConfig;
}

export type AgentType = 'assistant' | 'analyzer' | 'generator' | 'classifier' | 'custom';
export type AgentStatus = 'idle' | 'active' | 'busy' | 'error' | 'offline';

export interface AgentConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: string[];
}

// AI Memory System
export interface AIMemory {
  id: string;
  type: MemoryType;
  content: any;
  timestamp: number;
  importance: number;
  tags: string[];
}

export type MemoryType = 'conversation' | 'observation' | 'action' | 'fact' | 'preference';

// AI Learning System
export interface LearningData {
  input: any;
  output: any;
  feedback?: number;
  timestamp: number;
  context?: Record<string, any>;
}

export interface ModelMetrics {
  accuracy?: number;
  loss?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  timestamp: number;
}

// AI Configuration
export interface AIConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  debug?: boolean;
}

// AI Events
export interface AIEvent {
  type: string;
  data: any;
  timestamp: number;
  source: string;
}

export type AIEventListener = (event: AIEvent) => void;

// Chat Service Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  conversationId: string;
  metadata?: Record<string, any>;
}

export interface ChatConversation {
  id: string;
  userId?: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  context?: Record<string, any>;
}

export interface ChatResponse {
  message: ChatMessage;
  conversation: ChatConversation;
  suggestions?: string[];
  confidence: number;
}

export interface ChatContext {
  systemLog?: boolean;
  timestamp?: string;
  sceneInfo?: {
    currentScene?: string;
    cameraMode?: string;
    selectedCube?: string;
  };
  userPreferences?: Record<string, any>;
  sceneData?: {
    meshes: any;
    scene: any;
    timestamp: number;
  } | null;
  messageNumber?: number;
  role?: string;
}

// Movement Code Generation Types
export interface MovementCommand {
  action: string;
  target: 'p1' | 'p2' | 'both';
  parameters?: {
    direction?: 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down';
    speed?: number;
    duration?: number;
    distance?: number;
    position?: { x: number; y: number; z: number };
  };
}

export interface GeneratedMovementCode {
  code: string;
  description: string;
  safetyChecks: string[];
  estimatedDuration: number;
}

export interface CodeExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  executionTime: number;
  warnings: string[];
}

export interface ExecutionContext {
  scene?: any;
  cubePhysics?: any;
  p2CubePhysics?: any;
  originalPositions?: {
    p1?: any;
    p2?: any;
  };
  sceneBounds?: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
}