import { Vector3 } from '@babylonjs/core';
import { AICommunicationSystem, CommunicationHelper, CommunicationType, MessagePriority } from './index';
import { DualAIEngine, GameState } from '../dual';

/**
 * Example integration of AI Communication System with Dual AI Engine
 */
export class CommunicativeDualAIEngine extends DualAIEngine {
  private communicationSystem: AICommunicationSystem;
  private p1CommunicationHelper: CommunicationHelper;
  private p2CommunicationHelper: CommunicationHelper;

  constructor(config: any) {
    super(config);
    
    // Initialize communication system
    this.communicationSystem = new AICommunicationSystem({
      maxMessageHistory: 50,
      messageExpirationTime: 3000,
      enableLearning: true,
      enableEmotionalModeling: true,
      enableStrategySharing: true,
      debugMode: true
    });

    // Create communication helpers for each agent
    this.p1CommunicationHelper = new CommunicationHelper('p1', this.communicationSystem);
    this.p2CommunicationHelper = new CommunicationHelper('p2', this.communicationSystem);
  }

  /**
   * Override the update method to include communication
   */
  protected override updateGameState(): void {
    // Call parent update
    super.updateGameState();

    // Get current game state
    const gameState = this.getGameState();
    const p1Agent = this.getP1Agent();
    const p2Agent = this.getP2Agent();

    // Generate contextual communication
    this.generateContextualCommunication(gameState, p1Agent, p2Agent);

    // Process communication for decision making
    this.processCommunicationDecisions(gameState, p1Agent, p2Agent);
  }

  /**
   * Generate contextual communication based on game state
   */
  private generateContextualCommunication(gameState: GameState, p1Agent: any, p2Agent: any): void {
    // P1 generates communication
    this.p1CommunicationHelper.generateContextualCommunication({
      gameState,
      myAgent: p1Agent,
      opponentAgent: p2Agent
    });

    // P2 generates communication
    this.p2CommunicationHelper.generateContextualCommunication({
      gameState,
      myAgent: p2Agent,
      opponentAgent: p1Agent
    });
  }

  /**
   * Process communication decisions
   */
  private processCommunicationDecisions(gameState: GameState, p1Agent: any, p2Agent: any): void {
    // Get communication-based decisions for P1
    const p1CommunicationDecisions = this.p1CommunicationHelper.getCommunicationDecisions({
      gameState,
      myAgent: p1Agent,
      opponentAgent: p2Agent
    });

    // Get communication-based decisions for P2
    const p2CommunicationDecisions = this.p2CommunicationHelper.getCommunicationDecisions({
      gameState,
      myAgent: p2Agent,
      opponentAgent: p1Agent
    });

    // Apply communication decisions (this would integrate with the existing decision system)
    this.applyCommunicationDecisions('p1', p1CommunicationDecisions);
    this.applyCommunicationDecisions('p2', p2CommunicationDecisions);
  }

  /**
   * Apply communication-based decisions
   */
  private applyCommunicationDecisions(agentId: 'p1' | 'p2', decisions: any[]): void {
    for (const decision of decisions) {
      if (decision && decision.action) {
        console.log(`🤖 ${agentId} communication decision: ${decision.action} - ${decision.reasoning}`);
        
        // Here you would integrate with the existing AI decision system
        // For example, modify the agent's target or behavior based on communication
        this.applyDecisionToAgent(agentId, decision);
      }
    }
  }

  /**
   * Apply a decision to an agent
   */
  private applyDecisionToAgent(agentId: 'p1' | 'p2', decision: any): void {
    const agent = agentId === 'p1' ? this.getP1Agent() : this.getP2Agent();
    
    switch (decision.action) {
      case 'accelerate_towards':
        if (decision.target) {
          agent.target = decision.target;
          // Increase speed/aggression
          agent.personality.aggression = Math.min(1, agent.personality.aggression + 0.1);
        }
        break;
        
      case 'evasive_maneuver':
        // Implement evasive behavior
        agent.personality.aggression = Math.max(0, agent.personality.aggression - 0.1);
        break;
        
      case 'defensive_positioning':
        // Take defensive position
        agent.personality.confidence = Math.max(0, agent.personality.confidence - 0.05);
        break;
        
      case 'flanking_maneuver':
        // Implement flanking behavior
        agent.personality.aggression = Math.min(1, agent.personality.aggression + 0.05);
        break;
    }
  }

  /**
   * Get communication statistics
   */
  getCommunicationStats(): any {
    return {
      system: this.communicationSystem.getCommunicationStats(),
      p1: this.p1CommunicationHelper.getAgentCommunicationStats(),
      p2: this.p2CommunicationHelper.getAgentCommunicationStats()
    };
  }

  /**
   * Send custom message between agents
   */
  sendCustomMessage(senderId: 'p1' | 'p2', message: string, priority: MessagePriority = MessagePriority.NORMAL): void {
    const helper = senderId === 'p1' ? this.p1CommunicationHelper : this.p2CommunicationHelper;
    
    // Send as intention announcement
    helper.announceIntention('custom_message', 0.8, message);
  }

  /**
   * Challenge between agents
   */
  sendChallenge(challengerId: 'p1' | 'p2', challengeType: string, intensity: number): void {
    const helper = challengerId === 'p1' ? this.p1CommunicationHelper : this.p2CommunicationHelper;
    helper.sendChallenge(challengeType, intensity);
  }

  /**
   * Clean up communication system
   */
  override dispose(): void {
    super.dispose();
    this.communicationSystem.dispose();
  }
}

/**
 * Example usage and testing
 */
export function createCommunicativeAIExample(): CommunicativeDualAIEngine {
  const config = {
    tagDistance: 2.0,
    gameDuration: 60000,
    maxRounds: 10,
    learningEnabled: true,
    aiUpdateRate: 10,
    memorySize: 50,
    adaptationRate: 0.1,
    debug: true
  };

  const engine = new CommunicativeDualAIEngine(config);
  
  // Example: Send a challenge
  setTimeout(() => {
    engine.sendChallenge('p1', 'speed_challenge', 0.8);
  }, 2000);

  // Example: Send custom message
  setTimeout(() => {
    engine.sendCustomMessage('p2', 'I see your challenge and raise you!', MessagePriority.HIGH);
  }, 4000);

  return engine;
}

/**
 * Example communication scenarios
 */
export const CommunicationScenarios = {
  /**
   * Aggressive chase scenario
   */
  aggressiveChase: (engine: CommunicativeDualAIEngine) => {
    engine.sendCustomMessage('p1', 'Time to show you who\'s boss!', MessagePriority.HIGH);
    engine.sendChallenge('p1', 'aggression_challenge', 0.9);
  },

  /**
   * Defensive evasion scenario
   */
  defensiveEvasion: (engine: CommunicativeDualAIEngine) => {
    engine.sendCustomMessage('p2', 'You\'ll never catch me!', MessagePriority.NORMAL);
    engine.sendChallenge('p2', 'evasion_challenge', 0.7);
  },

  /**
   * Strategic coordination scenario
   */
  strategicCoordination: (engine: CommunicativeDualAIEngine) => {
    engine.sendCustomMessage('p1', 'Let\'s make this interesting...', MessagePriority.NORMAL);
    engine.sendCustomMessage('p2', 'I\'m ready for anything!', MessagePriority.NORMAL);
  }
};
