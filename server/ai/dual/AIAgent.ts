// Base AI Agent Class for Dual AI System

import { 
  AIAgent, 
  AIDecision, 
  Vector3, 
  AIPersonality, 
  AgentMemory, 
  LearningData,
  AgentStatus,
  GameState,
  TagGameConfig
} from './types';

export abstract class BaseAIAgent {
  public id: 'p1' | 'p2';
  public position: Vector3;
  public velocity: Vector3;
  public target: Vector3;
  public role: 'chaser' | 'evader';
  public personality: AIPersonality;
  public status: AgentStatus;
  public memory: AgentMemory;
  public learningData: LearningData;
  protected config: TagGameConfig;

  constructor(
    id: 'p1' | 'p2',
    initialPosition: Vector3,
    personality: AIPersonality,
    config: TagGameConfig
  ) {
    this.id = id;
    this.position = initialPosition;
    this.velocity = { x: 0, y: 0, z: 0 };
    this.target = initialPosition;
    this.role = 'evader'; // Will be set by game logic
    this.personality = personality;
    this.status = AgentStatus.IDLE;
    this.config = config;
    
    this.memory = {
      recentPositions: [],
      recentDecisions: [],
      opponentPatterns: [],
      successfulStrategies: [],
      failedStrategies: [],
      lastUpdateTime: Date.now()
    };

    this.learningData = {
      totalRounds: 0,
      winsAsChaser: 0,
      winsAsEvader: 0,
      averageGameDuration: 0,
      learningRate: 0.1,
      adaptationSpeed: 0.05,
      strategyEvolution: []
    };
  }

  // Abstract methods to be implemented by specific AI types
  abstract makeDecision(gameState: GameState): AIDecision;
  abstract updateLearning(gameState: GameState, decision: AIDecision, outcome: 'success' | 'failure'): void;
  abstract getStrategy(): string;

  // Common methods for all AI agents
  updatePosition(newPosition: Vector3): void {
    this.position = newPosition;
    this.addToMemory('position', newPosition);
  }

  setRole(newRole: 'chaser' | 'evader'): void {
    this.role = newRole;
    this.learningData.totalRounds++;
  }

  setTarget(newTarget: Vector3): void {
    this.target = newTarget;
  }

  calculateDistanceToTarget(): number {
    const dx = this.target.x - this.position.x;
    const dy = this.target.y - this.position.y;
    const dz = this.target.z - this.position.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  calculateDistanceToPosition(pos: Vector3): number {
    const dx = pos.x - this.position.x;
    const dy = pos.y - this.position.y;
    const dz = pos.z - this.position.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  getRandomPositionInRange(center: Vector3, range: number): Vector3 {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * range;
    
    return {
      x: center.x + Math.cos(angle) * distance,
      y: center.y,
      z: center.z + Math.sin(angle) * distance
    };
  }

  addToMemory(type: 'position' | 'decision', data: any): void {
    const now = Date.now();
    
    if (type === 'position') {
      this.memory.recentPositions.push(data as Vector3);
      if (this.memory.recentPositions.length > this.config.memorySize) {
        this.memory.recentPositions.shift();
      }
    } else if (type === 'decision') {
      this.memory.recentDecisions.push(data as AIDecision);
      if (this.memory.recentDecisions.length > this.config.memorySize) {
        this.memory.recentDecisions.shift();
      }
    }
    
    this.memory.lastUpdateTime = now;
  }

  getOpponentPosition(gameState: GameState): Vector3 {
    return this.id === 'p1' ? gameState.p2Position : gameState.p1Position;
  }

  isOpponentInRange(gameState: GameState, range: number = this.config.tagDistance): boolean {
    const opponentPos = this.getOpponentPosition(gameState);
    return this.calculateDistanceToPosition(opponentPos) <= range;
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  setStatus(status: AgentStatus): void {
    this.status = status;
  }

  getPersonality(): AIPersonality {
    return this.personality;
  }

  getLearningData(): LearningData {
    return this.learningData;
  }

  getMemory(): AgentMemory {
    return this.memory;
  }

  // Utility method to get a random number influenced by personality
  getPersonalityInfluencedRandom(baseValue: number, variance: number = 0.2): number {
    const randomFactor = (Math.random() - 0.5) * variance;
    const personalityFactor = this.personality.adaptability * 0.1;
    return baseValue + randomFactor + personalityFactor;
  }

  // Method to calculate movement speed based on personality and situation
  calculateMovementSpeed(situation: 'chase' | 'evade' | 'patrol'): number {
    let baseSpeed = this.personality.speed;
    
    switch (situation) {
      case 'chase':
        baseSpeed *= (1 + this.personality.aggression * 0.5);
        break;
      case 'evade':
        baseSpeed *= (1 + this.personality.caution * 0.3);
        break;
      case 'patrol':
        baseSpeed *= 0.7; // Slower when patrolling
        break;
    }
    
    return Math.max(0.1, Math.min(1.0, baseSpeed));
  }

  // Method to determine confidence based on situation and memory
  calculateConfidence(situation: string, hasMemory: boolean): number {
    let confidence = 0.5; // Base confidence
    
    if (hasMemory) {
      confidence += 0.2;
    }
    
    if (this.personality.type === 'strategic') {
      confidence += 0.1;
    }
    
    // Reduce confidence for random personality
    if (this.personality.type === 'random') {
      confidence -= 0.2;
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }
}
