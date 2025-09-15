// Tag Evader AI Agent - Specialized for evading behavior

import { BaseAIAgent } from './AIAgent';
import { 
  AIDecision, 
  Vector3, 
  AIPersonality, 
  TagGameConfig,
  GameState,
  StrategyRecord
} from './types';

export class TagEvader extends BaseAIAgent {
  private evadeStrategy: string = 'flee';
  private lastChaserPosition: Vector3 | null = null;
  private escapeRoutes: Vector3[] = [];
  private survivalTime: number = 0;

  constructor(
    id: 'p1' | 'p2',
    initialPosition: Vector3,
    personality: AIPersonality,
    config: TagGameConfig
  ) {
    super(id, initialPosition, personality, config);
    this.role = 'evader';
  }

  makeDecision(gameState: GameState): AIDecision {
    const chaserPos = this.getOpponentPosition(gameState);
    const distanceToChaser = this.calculateDistanceToPosition(chaserPos);
    const isInDanger = distanceToChaser < this.config.tagDistance * 1.5;
    
    let decision: AIDecision;
    
    // Choose strategy based on personality and danger level
    if (isInDanger) {
      decision = this.makeEscapeDecision(chaserPos, distanceToChaser);
    } else if (this.personality.type === 'strategic') {
      decision = this.makeStrategicDecision(chaserPos, distanceToChaser, gameState);
    } else if (this.personality.type === 'defensive') {
      decision = this.makeDefensiveDecision(chaserPos, distanceToChaser);
    } else if (this.personality.type === 'aggressive') {
      decision = this.makeAggressiveDecision(chaserPos, distanceToChaser);
    } else {
      decision = this.makeRandomDecision(chaserPos, distanceToChaser);
    }

    // Add decision to memory
    this.addToMemory('decision', decision);
    
    // Update last chaser position
    this.lastChaserPosition = chaserPos;
    
    return decision;
  }

  private makeEscapeDecision(chaserPos: Vector3, distance: number): AIDecision {
    // Immediate escape when in danger
    const escapeDirection = this.calculateEscapeDirection(chaserPos);
    const speed = this.calculateMovementSpeed('evade');
    
    const target: Vector3 = {
      x: this.position.x + escapeDirection.x * speed * 2,
      y: this.position.y,
      z: this.position.z + escapeDirection.z * speed * 2
    };

    return {
      agentId: this.id,
      action: 'evade',
      target,
      timestamp: Date.now(),
      confidence: this.calculateConfidence('escape', true),
      reasoning: `Emergency escape - distance to chaser: ${distance.toFixed(2)}`
    };
  }

  private makeStrategicDecision(chaserPos: Vector3, distance: number, gameState: GameState): AIDecision {
    // Strategic positioning to maintain distance
    const optimalDistance = this.config.tagDistance * 2;
    const currentDistance = distance;
    
    let target: Vector3;
    
    if (currentDistance < optimalDistance) {
      // Too close, move away
      const escapeDirection = this.calculateEscapeDirection(chaserPos);
      target = {
        x: this.position.x + escapeDirection.x * 1.5,
        y: this.position.y,
        z: this.position.z + escapeDirection.z * 1.5
      };
    } else {
      // Good distance, patrol or maintain position
      target = this.calculateOptimalPosition(chaserPos, optimalDistance);
    }

    return {
      agentId: this.id,
      action: 'evade',
      target,
      timestamp: Date.now(),
      confidence: this.calculateConfidence('strategic_evade', true),
      reasoning: `Strategic positioning - maintaining distance: ${currentDistance.toFixed(2)}`
    };
  }

  private makeDefensiveDecision(chaserPos: Vector3, distance: number): AIDecision {
    // Cautious, always maintain maximum distance
    const maxDistance = this.config.tagDistance * 3;
    const escapeDirection = this.calculateEscapeDirection(chaserPos);
    const speed = this.calculateMovementSpeed('evade') * 0.9; // Slower, more cautious
    
    const target: Vector3 = {
      x: this.position.x + escapeDirection.x * speed,
      y: this.position.y,
      z: this.position.z + escapeDirection.z * speed
    };

    return {
      agentId: this.id,
      action: 'evade',
      target,
      timestamp: Date.now(),
      confidence: this.calculateConfidence('defensive_evade', true),
      reasoning: `Defensive evasion - maintaining maximum distance`
    };
  }

  private makeAggressiveDecision(chaserPos: Vector3, distance: number): AIDecision {
    // Aggressive evader - sometimes moves closer to taunt, then escapes
    const randomFactor = Math.random();
    
    let target: Vector3;
    
    if (randomFactor < 0.3 && distance > this.config.tagDistance * 2) {
      // 30% chance to move closer (taunt)
      const direction = this.calculateDirectionToTarget(chaserPos);
      target = {
        x: this.position.x + direction.x * 0.3,
        y: this.position.y,
        z: this.position.z + direction.z * 0.3
      };
    } else {
      // 70% chance to escape
      const escapeDirection = this.calculateEscapeDirection(chaserPos);
      target = {
        x: this.position.x + escapeDirection.x * 1.2,
        y: this.position.y,
        z: this.position.z + escapeDirection.z * 1.2
      };
    }

    return {
      agentId: this.id,
      action: 'evade',
      target,
      timestamp: Date.now(),
      confidence: this.calculateConfidence('aggressive_evade', true),
      reasoning: `Aggressive evasion - taunt factor: ${randomFactor.toFixed(2)}`
    };
  }

  private makeRandomDecision(chaserPos: Vector3, distance: number): AIDecision {
    // Random movement with bias away from chaser
    const randomFactor = Math.random();
    let target: Vector3;

    if (randomFactor < 0.6) {
      // 60% chance to move away from chaser
      const escapeDirection = this.calculateEscapeDirection(chaserPos);
      target = {
        x: this.position.x + escapeDirection.x * 0.8,
        y: this.position.y,
        z: this.position.z + escapeDirection.z * 0.8
      };
    } else {
      // 40% chance for random movement
      target = this.getRandomPositionInRange(this.position, 3);
    }

    return {
      agentId: this.id,
      action: 'evade',
      target,
      timestamp: Date.now(),
      confidence: this.calculateConfidence('random_evade', false),
      reasoning: `Random evasion - factor: ${randomFactor.toFixed(2)}`
    };
  }

  private calculateEscapeDirection(chaserPos: Vector3): Vector3 {
    // Calculate direction away from chaser
    const dx = this.position.x - chaserPos.x;
    const dz = this.position.z - chaserPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance === 0) {
      // If at same position, choose random direction
      const angle = Math.random() * Math.PI * 2;
      return {
        x: Math.cos(angle),
        y: 0,
        z: Math.sin(angle)
      };
    }
    
    return {
      x: dx / distance,
      y: 0,
      z: dz / distance
    };
  }

  private calculateDirectionToTarget(target: Vector3): Vector3 {
    const dx = target.x - this.position.x;
    const dz = target.z - this.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance === 0) return { x: 0, y: 0, z: 0 };
    
    return {
      x: dx / distance,
      y: 0,
      z: dz / distance
    };
  }

  private calculateOptimalPosition(chaserPos: Vector3, optimalDistance: number): Vector3 {
    // Calculate position that maintains optimal distance
    const currentDistance = this.calculateDistanceToPosition(chaserPos);
    
    if (currentDistance > optimalDistance) {
      // Too far, move closer
      const direction = this.calculateDirectionToTarget(chaserPos);
      const moveDistance = (currentDistance - optimalDistance) * 0.5;
      
      return {
        x: this.position.x - direction.x * moveDistance,
        y: this.position.y,
        z: this.position.z - direction.z * moveDistance
      };
    } else {
      // Good distance, patrol around
      return this.getRandomPositionInRange(this.position, 1);
    }
  }

  updateLearning(gameState: GameState, decision: AIDecision, outcome: 'success' | 'failure'): void {
    const strategy = this.getStrategy();
    
    if (outcome === 'success') {
      this.learningData.winsAsEvader++;
      this.survivalTime += 1; // Increment survival time
      this.updateSuccessfulStrategy(strategy, decision);
    } else {
      this.survivalTime = 0; // Reset survival time
      this.updateFailedStrategy(strategy, decision);
    }

    // Update escape routes based on success
    if (outcome === 'success' && decision.action === 'evade') {
      this.escapeRoutes.push(decision.target);
      if (this.escapeRoutes.length > 10) {
        this.escapeRoutes.shift(); // Keep only recent escape routes
      }
    }
  }

  private updateSuccessfulStrategy(strategy: string, decision: AIDecision): void {
    const existingStrategy = this.memory.successfulStrategies.find(s => s.strategy === strategy);
    
    if (existingStrategy) {
      existingStrategy.timesUsed++;
      existingStrategy.successRate = (existingStrategy.successRate + 1) / 2;
      existingStrategy.lastUsed = Date.now();
    } else {
      this.memory.successfulStrategies.push({
        strategy,
        successRate: 1.0,
        timesUsed: 1,
        lastUsed: Date.now(),
        context: decision.reasoning || 'successful evasion'
      });
    }
  }

  private updateFailedStrategy(strategy: string, decision: AIDecision): void {
    const existingStrategy = this.memory.failedStrategies.find(s => s.strategy === strategy);
    
    if (existingStrategy) {
      existingStrategy.timesUsed++;
      existingStrategy.successRate = (existingStrategy.successRate + 0) / 2;
      existingStrategy.lastUsed = Date.now();
    } else {
      this.memory.failedStrategies.push({
        strategy,
        successRate: 0.0,
        timesUsed: 1,
        lastUsed: Date.now(),
        context: decision.reasoning || 'failed evasion'
      });
    }
  }

  getStrategy(): string {
    return this.evadeStrategy;
  }

  getSurvivalTime(): number {
    return this.survivalTime;
  }

  getEscapeRoutes(): Vector3[] {
    return this.escapeRoutes;
  }
}
