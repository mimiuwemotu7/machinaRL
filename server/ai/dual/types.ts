// Dual AI System Types and Interfaces

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// Helper function to create Vector3 objects
export function createVector3(x: number, y: number, z: number): Vector3 {
  return { x, y, z };
}

export interface AIDecision {
  agentId: 'p1' | 'p2';
  action: 'move' | 'chase' | 'evade' | 'idle' | 'patrol' | 'accelerate_towards' | 'predict_movement' | 'evasive_maneuver' | 'defensive_positioning' | 'flanking_maneuver' | 'increase_speed';
  target: Vector3;
  timestamp: number;
  confidence: number;
  reasoning?: string;
}

export interface GameState {
  p1Position: Vector3;
  p2Position: Vector3;
  p1Velocity: Vector3;
  p2Velocity: Vector3;
  currentChaser: 'p1' | 'p2';
  gamePhase: GamePhase;
  roundNumber: number;
  tagDistance: number;
  lastTagTime: number;
  gameStartTime: number;
}

export interface AIAgent {
  id: 'p1' | 'p2';
  position: Vector3;
  velocity: Vector3;
  target: Vector3;
  role: 'chaser' | 'evader';
  personality: AIPersonality;
  status: AgentStatus;
  memory: AgentMemory;
  learningData: LearningData;
}

export interface AIPersonality {
  type: 'aggressive' | 'defensive' | 'strategic' | 'random';
  speed: number; // 0.1 - 1.0
  aggression: number; // 0.0 - 1.0
  caution: number; // 0.0 - 1.0
  adaptability: number; // 0.0 - 1.0
  memoryRetention: number; // 0.0 - 1.0
  confidence: number; // 0.0 - 1.0
}

export interface AgentMemory {
  recentPositions: Vector3[];
  recentDecisions: AIDecision[];
  opponentPatterns: OpponentPattern[];
  successfulStrategies: StrategyRecord[];
  failedStrategies: StrategyRecord[];
  lastUpdateTime: number;
}

export interface OpponentPattern {
  situation: string;
  opponentAction: string;
  frequency: number;
  lastSeen: number;
}

export interface StrategyRecord {
  strategy: string;
  successRate: number;
  timesUsed: number;
  lastUsed: number;
  context: string;
}

export interface LearningData {
  totalRounds: number;
  winsAsChaser: number;
  winsAsEvader: number;
  averageGameDuration: number;
  learningRate: number;
  adaptationSpeed: number;
  strategyEvolution: StrategyEvolution[];
}

export interface StrategyEvolution {
  timestamp: number;
  strategy: string;
  successRate: number;
  confidence: number;
}

export interface TagGameConfig {
  tagDistance: number;
  gameDuration: number;
  maxRounds: number;
  learningEnabled: boolean;
  aiUpdateRate: number; // updates per second
  memorySize: number;
  adaptationRate: number;
  debug?: boolean;
}

export interface AICommunication {
  senderId: 'p1' | 'p2';
  receiverId: 'p1' | 'p2';
  messageType: 'threat' | 'opportunity' | 'strategy' | 'coordination';
  data: any;
  timestamp: number;
  confidence: number;
}

export interface SceneAwareness {
  obstacles: Obstacle[];
  boundaries: Boundary[];
  safeZones: Vector3[];
  dangerZones: Vector3[];
  lastUpdateTime: number;
}

export interface Obstacle {
  id: string;
  position: Vector3;
  size: Vector3;
  type: 'wall' | 'platform' | 'barrier' | 'object';
}

export interface Boundary {
  min: Vector3;
  max: Vector3;
  type: 'playArea' | 'safeZone' | 'dangerZone';
}

export enum AgentStatus {
  IDLE = 'idle',
  ACTIVE = 'active',
  LEARNING = 'learning',
  ADAPTING = 'adapting',
  ERROR = 'error'
}

export enum GamePhase {
  WAITING = 'waiting',
  PLAYING = 'playing',
  PAUSED = 'paused',
  ROUND_COMPLETE = 'roundComplete',
  GAME_OVER = 'gameOver'
}

export enum AIPersonalityType {
  AGGRESSIVE = 'aggressive',
  DEFENSIVE = 'defensive',
  STRATEGIC = 'strategic',
  RANDOM = 'random'
}
