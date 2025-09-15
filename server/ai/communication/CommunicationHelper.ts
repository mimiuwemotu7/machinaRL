import { Vector3 } from '../dual/types';
import { AICommunicationSystem, CommunicationType, MessagePriority } from './AICommunication';
import { AIAgent, GameState, AIDecision } from '../dual/types';

// Helper function to calculate distance between two Vector3 points
function calculateDistance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export interface CommunicationContext {
  gameState: GameState;
  myAgent: AIAgent;
  opponentAgent: AIAgent;
  sceneAnalysis?: any;
}

export class CommunicationHelper {
  private communicationSystem: AICommunicationSystem;
  private agentId: 'p1' | 'p2';

  constructor(agentId: 'p1' | 'p2', communicationSystem: AICommunicationSystem) {
    this.agentId = agentId;
    this.communicationSystem = communicationSystem;
  }

  /**
   * Send position update to opponent
   */
  sendPositionUpdate(position: Vector3, velocity: Vector3, intention: string): void {
    this.communicationSystem.sendMessage(
      this.agentId,
      this.agentId === 'p1' ? 'p2' : 'p1',
      CommunicationType.POSITION_UPDATE,
      {
        position: { x: position.x, y: position.y, z: position.z },
        velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
        intention,
        timestamp: Date.now()
      },
      MessagePriority.NORMAL
    );
  }

  /**
   * Announce current intention/strategy
   */
  announceIntention(intention: string, confidence: number, strategy: string, channelId: string = 'broadcast'): void {
    this.communicationSystem.sendMessage(
      this.agentId,
      'broadcast',
      CommunicationType.INTENTION_ANNOUNCEMENT,
      {
        intention,
        confidence,
        strategy,
        timestamp: Date.now()
      },
      MessagePriority.HIGH,
      channelId
    );
  }

  /**
   * Share threat assessment
   */
  shareThreatAssessment(threatLevel: number, threatSource: Vector3, recommendedAction: string): void {
    this.communicationSystem.sendMessage(
      this.agentId,
      this.agentId === 'p1' ? 'p2' : 'p1',
      CommunicationType.THREAT_ASSESSMENT,
      {
        threatLevel,
        threatSource: { x: threatSource.x, y: threatSource.y, z: threatSource.z },
        recommendedAction,
        timestamp: Date.now()
      },
      MessagePriority.HIGH
    );
  }

  /**
   * Coordinate strategy with opponent
   */
  coordinateStrategy(proposedStrategy: string, coordinationType: string, details: any): void {
    this.communicationSystem.sendMessage(
      this.agentId,
      this.agentId === 'p1' ? 'p2' : 'p1',
      CommunicationType.STRATEGY_COORDINATION,
      {
        proposedStrategy,
        coordinationType,
        details,
        timestamp: Date.now()
      },
      MessagePriority.NORMAL
    );
  }

  /**
   * Send challenge to opponent
   */
  sendChallenge(challengeType: string, intensity: number, message?: string): void {
    this.communicationSystem.sendMessage(
      this.agentId,
      this.agentId === 'p1' ? 'p2' : 'p1',
      CommunicationType.CHALLENGE,
      {
        challengeType,
        intensity,
        message: message || `Challenge: ${challengeType}`,
        timestamp: Date.now()
      },
      MessagePriority.NORMAL
    );
  }

  /**
   * Share success/failure analysis
   */
  shareLearning(successType: 'success' | 'failure', analysis: any, insights: string[]): void {
    const messageType = successType === 'success' 
      ? CommunicationType.SUCCESS_SHARING 
      : CommunicationType.FAILURE_ANALYSIS;

    this.communicationSystem.sendMessage(
      this.agentId,
      'broadcast',
      messageType,
      {
        type: successType,
        analysis,
        insights,
        timestamp: Date.now()
      },
      MessagePriority.LOW
    );
  }

  /**
   * Get communication-based decisions
   */
  getCommunicationDecisions(context: CommunicationContext): AIDecision[] {
    return this.communicationSystem.processCommunicationForAgent(this.agentId, context.gameState);
  }

  /**
   * Generate contextual communication based on game state
   */
  generateContextualCommunication(context: CommunicationContext): void {
    const { gameState, myAgent, opponentAgent } = context;
    
    // Calculate distance to opponent
    const myPosition = this.agentId === 'p1' ? gameState.p1Position : gameState.p2Position;
    const opponentPosition = this.agentId === 'p1' ? gameState.p2Position : gameState.p1Position;
    const distance = calculateDistance(myPosition, opponentPosition);
    
    // Send position update
    this.sendPositionUpdate(
      myPosition,
      this.agentId === 'p1' ? gameState.p1Velocity : gameState.p2Velocity,
      this.getCurrentIntention(context)
    );
    
    // Generate contextual messages based on game state
    if (gameState.currentChaser === this.agentId) {
      // I'm the chaser
      if (distance < 3) {
        this.announceIntention('aggressive_pursuit', 0.9, 'close_range_attack');
        this.sendChallenge('speed_challenge', 0.8, 'Catch me if you can!');
      } else if (distance > 8) {
        this.announceIntention('strategic_pursuit', 0.7, 'long_range_prediction');
      }
    } else {
      // I'm the evader
      if (distance < 4) {
        this.announceIntention('defensive_evasion', 0.8, 'close_range_escape');
        this.shareThreatAssessment(0.9, opponentPosition, 'evasive_maneuver');
      } else if (distance > 10) {
        this.announceIntention('relaxed_evasion', 0.6, 'maintain_distance');
      }
    }
    
    // Share emotional state based on recent performance
    this.shareEmotionalState(this.calculateEmotionalState(context));
  }

  /**
   * Get current intention based on context
   */
  private getCurrentIntention(context: CommunicationContext): string {
    const { gameState, myAgent } = context;
    
    if (gameState.currentChaser === this.agentId) {
      return myAgent.personality.aggression > 0.7 ? 'aggressive_pursuit' : 'strategic_pursuit';
    } else {
      return myAgent.personality.aggression > 0.7 ? 'aggressive_evasion' : 'defensive_evasion';
    }
  }

  /**
   * Calculate emotional state based on context
   */
  private calculateEmotionalState(context: CommunicationContext): any {
    const { gameState, myAgent } = context;
    
    // Simple emotional model based on game state and personality
    const distance = calculateDistance(
      this.agentId === 'p1' ? gameState.p1Position : gameState.p2Position,
      this.agentId === 'p1' ? gameState.p2Position : gameState.p1Position
    );
    
    let confidence = 0.5;
    let excitement = 0.5;
    let stress = 0.5;
    
    if (gameState.currentChaser === this.agentId) {
      // Chaser emotions
      confidence = distance < 5 ? 0.8 : 0.6;
      excitement = distance < 3 ? 0.9 : 0.7;
      stress = distance > 10 ? 0.3 : 0.5;
    } else {
      // Evader emotions
      confidence = distance > 5 ? 0.7 : 0.4;
      excitement = distance < 3 ? 0.8 : 0.6;
      stress = distance < 3 ? 0.8 : 0.4;
    }
    
    // Adjust based on personality
    confidence *= myAgent.personality.confidence;
    excitement *= myAgent.personality.aggression;
    stress *= (1 - myAgent.personality.confidence);
    
    return {
      confidence: Math.max(0, Math.min(1, confidence)),
      excitement: Math.max(0, Math.min(1, excitement)),
      stress: Math.max(0, Math.min(1, stress)),
      timestamp: Date.now()
    };
  }

  /**
   * Share emotional state
   */
  public shareEmotionalState(emotionalState: any): void {
    this.communicationSystem.sendMessage(
      this.agentId,
      'broadcast',
      CommunicationType.EMOTIONAL_STATE,
      emotionalState,
      MessagePriority.LOW
    );
  }

  /**
   * Get communication statistics for this agent
   */
  getAgentCommunicationStats(): any {
    const stats = this.communicationSystem.getCommunicationStats();
    const myMessages = this.communicationSystem.getMessagesForAgent(this.agentId);
    
    return {
      ...stats,
      myMessageCount: myMessages.length,
      recentMessages: myMessages.slice(-5)
    };
  }
}
