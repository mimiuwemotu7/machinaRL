// Tag Chaser AI Agent - Specialized for chasing behavior

import { BaseAIAgent } from './AIAgent';
import { 
  AIDecision, 
  Vector3, 
  AIPersonality, 
  TagGameConfig,
  GameState,
  StrategyRecord
} from './types';

export class TagChaser extends BaseAIAgent {
  private chaseStrategy: string = 'direct';
  private lastOpponentPosition: Vector3 | null = null;
  private predictionAccuracy: number = 0.5;

  constructor(
    id: 'p1' | 'p2',
    initialPosition: Vector3,
    personality: AIPersonality,
    config: TagGameConfig
  ) {
    super(id, initialPosition, personality, config);
    this.role = 'chaser';
  }

  makeDecision(gameState: GameState): AIDecision {
    const opponentPos = this.getOpponentPosition(gameState);
    const distanceToOpponent = this.calculateDistanceToPosition(opponentPos);
    
    let decision: AIDecision;
    
    // Choose strategy based on personality and situation
    if (this.personality.type === 'aggressive') {
      decision = this.makeAggressiveDecision(opponentPos, distanceToOpponent);
    } else if (this.personality.type === 'strategic') {
      decision = this.makeStrategicDecision(opponentPos, distanceToOpponent, gameState);
    } else if (this.personality.type === 'defensive') {
      decision = this.makeDefensiveDecision(opponentPos, distanceToOpponent);
    } else {
      decision = this.makeRandomDecision(opponentPos, distanceToOpponent);
    }

    // Add decision to memory
    this.addToMemory('decision', decision);
    
    // Update last opponent position for prediction
    this.lastOpponentPosition = opponentPos;
    
    return decision;
  }

  private makeAggressiveDecision(opponentPos: Vector3, distance: number): AIDecision {
    // Direct chase with high speed
    const speed = this.calculateMovementSpeed('chase');
    const direction = this.calculateDirectionToTarget(opponentPos);
    
    const target: Vector3 = {
      x: opponentPos.x + direction.x * speed * 2,
      y: opponentPos.y,
      z: opponentPos.z + direction.z * speed * 2
    };

    return {
      agentId: this.id,
      action: 'chase',
      target,
      timestamp: Date.now(),
      confidence: this.calculateConfidence('aggressive_chase', true),
      reasoning: `Aggressive direct chase - distance: ${distance.toFixed(2)}`
    };
  }

  private makeStrategicDecision(opponentPos: Vector3, distance: number, gameState: GameState): AIDecision {
    // Predict opponent movement and intercept
    const predictedPosition = this.predictOpponentPosition(opponentPos, gameState);
    const interceptPoint = this.calculateInterceptPoint(predictedPosition);
    
    return {
      agentId: this.id,
      action: 'chase',
      target: interceptPoint,
      timestamp: Date.now(),
      confidence: this.calculateConfidence('strategic_chase', true),
      reasoning: `Strategic intercept - predicted position: (${predictedPosition.x.toFixed(2)}, ${predictedPosition.z.toFixed(2)})`
    };
  }

  private makeDefensiveDecision(opponentPos: Vector3, distance: number): AIDecision {
    // Cautious approach, try to cut off escape routes
    const speed = this.calculateMovementSpeed('chase') * 0.8; // Slower, more cautious
    const direction = this.calculateDirectionToTarget(opponentPos);
    
    // Move closer but not too aggressively
    const target: Vector3 = {
      x: this.position.x + direction.x * speed,
      y: this.position.y,
      z: this.position.z + direction.z * speed
    };

    return {
      agentId: this.id,
      action: 'chase',
      target,
      timestamp: Date.now(),
      confidence: this.calculateConfidence('defensive_chase', true),
      reasoning: `Defensive approach - maintaining distance: ${distance.toFixed(2)}`
    };
  }

  private makeRandomDecision(opponentPos: Vector3, distance: number): AIDecision {
    // Random movement with some bias toward opponent
    const randomFactor = Math.random();
    let target: Vector3;

    if (randomFactor < 0.7) {
      // 70% chance to move toward opponent
      const direction = this.calculateDirectionToTarget(opponentPos);
      target = {
        x: this.position.x + direction.x * 0.5,
        y: this.position.y,
        z: this.position.z + direction.z * 0.5
      };
    } else {
      // 30% chance for random movement
      target = this.getRandomPositionInRange(this.position, 2);
    }

    return {
      agentId: this.id,
      action: 'chase',
      target,
      timestamp: Date.now(),
      confidence: this.calculateConfidence('random_chase', false),
      reasoning: `Random chase decision - factor: ${randomFactor.toFixed(2)}`
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

  private predictOpponentPosition(currentPos: Vector3, gameState: GameState): Vector3 {
    if (!this.lastOpponentPosition) {
      return currentPos;
    }

    // Calculate opponent velocity
    const velocity = {
      x: currentPos.x - this.lastOpponentPosition.x,
      y: currentPos.y - this.lastOpponentPosition.y,
      z: currentPos.z - this.lastOpponentPosition.z
    };

    // Predict future position based on velocity
    const predictionTime = 0.5; // Predict 0.5 seconds ahead
    const predictedPos: Vector3 = {
      x: currentPos.x + velocity.x * predictionTime,
      y: currentPos.y + velocity.y * predictionTime,
      z: currentPos.z + velocity.z * predictionTime
    };

    return predictedPos;
  }

  private calculateInterceptPoint(predictedPos: Vector3): Vector3 {
    // Calculate point to intercept predicted position
    const direction = this.calculateDirectionToTarget(predictedPos);
    const speed = this.calculateMovementSpeed('chase');
    
    return {
      x: this.position.x + direction.x * speed * 1.5,
      y: this.position.y,
      z: this.position.z + direction.z * speed * 1.5
    };
  }

  updateLearning(gameState: GameState, decision: AIDecision, outcome: 'success' | 'failure'): void {
    const strategy = this.getStrategy();
    
    if (outcome === 'success') {
      this.learningData.winsAsChaser++;
      this.updateSuccessfulStrategy(strategy, decision);
    } else {
      this.updateFailedStrategy(strategy, decision);
    }

    // Update prediction accuracy
    if (this.lastOpponentPosition) {
      const actualDistance = this.calculateDistanceToPosition(gameState.p2Position);
      const predictedDistance = this.calculateDistanceToPosition(decision.target);
      const accuracy = 1 - Math.abs(actualDistance - predictedDistance) / actualDistance;
      this.predictionAccuracy = (this.predictionAccuracy + accuracy) / 2;
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
        context: decision.reasoning || 'successful chase'
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
        context: decision.reasoning || 'failed chase'
      });
    }
  }

  getStrategy(): string {
    return this.chaseStrategy;
  }

  getPredictionAccuracy(): number {
    return this.predictionAccuracy;
  }
}
