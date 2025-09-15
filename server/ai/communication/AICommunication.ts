import { Vector3 } from '../dual/types';
import { AIAgent, GameState, AIDecision } from '../dual/types';

// Helper function to calculate distance between two Vector3 points
function calculateDistance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export interface CommunicationMessage {
  id: string;
  senderId: 'p1' | 'p2';
  receiverId: 'p1' | 'p2' | 'broadcast';
  messageType: CommunicationType;
  content: any;
  timestamp: number;
  priority: MessagePriority;
  expiresAt?: number;
}

export enum CommunicationType {
  // Game State Communication
  POSITION_UPDATE = 'position_update',
  INTENTION_ANNOUNCEMENT = 'intention_announcement',
  STRATEGY_COORDINATION = 'strategy_coordination',
  
  // Behavioral Communication
  THREAT_ASSESSMENT = 'threat_assessment',
  CONFIDENCE_LEVEL = 'confidence_level',
  EMOTIONAL_STATE = 'emotional_state',
  
  // Learning Communication
  SUCCESS_SHARING = 'success_sharing',
  FAILURE_ANALYSIS = 'failure_analysis',
  PATTERN_RECOGNITION = 'pattern_recognition',
  
  // Social Communication
  CHALLENGE = 'challenge',
  COOPERATION_REQUEST = 'cooperation_request',
  DOMINANCE_DISPLAY = 'dominance_display',
  
  // Meta Communication
  STATUS_CHECK = 'status_check',
  ERROR_REPORT = 'error_report'
}

export enum MessagePriority {
  CRITICAL = 0,    // Immediate attention required
  HIGH = 1,        // Important but not urgent
  NORMAL = 2,      // Standard communication
  LOW = 3,         // Background information
  DEBUG = 4        // Development/debugging only
}

export interface CommunicationChannel {
  id: string;
  name: string;
  participants: ('p1' | 'p2')[];
  messageHistory: CommunicationMessage[];
  isActive: boolean;
  bandwidth: number; // Messages per second
}

export interface AICommunicationConfig {
  maxMessageHistory: number;
  messageExpirationTime: number;
  enableLearning: boolean;
  enableEmotionalModeling: boolean;
  enableStrategySharing: boolean;
  debugMode: boolean;
}

export class AICommunicationSystem {
  private channels: Map<string, CommunicationChannel> = new Map();
  private messageQueue: CommunicationMessage[] = [];
  private config: AICommunicationConfig;

  constructor(config: Partial<AICommunicationConfig> = {}) {
    this.config = {
      maxMessageHistory: 100,
      messageExpirationTime: 5000, // 5 seconds
      enableLearning: true,
      enableEmotionalModeling: true,
      enableStrategySharing: true,
      debugMode: false,
      ...config
    };

    this.initializeChannels();
  }

  /**
   * Initialize communication channels
   */
  private initializeChannels(): void {
    // Direct P1-P2 communication channel
    this.createChannel('p1-p2-direct', 'Direct P1-P2 Communication', ['p1', 'p2'], 10);
    
    // Broadcast channel for announcements
    this.createChannel('broadcast', 'Broadcast Channel', ['p1', 'p2'], 5);
    
    // Learning channel for sharing insights
    this.createChannel('learning', 'Learning & Adaptation', ['p1', 'p2'], 2);
    
    // Debug channel for development
    this.createChannel('debug', 'Debug Information', ['p1', 'p2'], 1);
  }

  /**
   * Create a new communication channel
   */
  createChannel(id: string, name: string, participants: ('p1' | 'p2')[], bandwidth: number): void {
    const channel: CommunicationChannel = {
      id,
      name,
      participants,
      messageHistory: [],
      isActive: true,
      bandwidth
    };
    
    this.channels.set(id, channel);
  }

  /**
   * Send a message between AI agents
   */
  sendMessage(
    senderId: 'p1' | 'p2',
    receiverId: 'p1' | 'p2' | 'broadcast',
    messageType: CommunicationType,
    content: any,
    priority: MessagePriority = MessagePriority.NORMAL,
    channelId: string = 'p1-p2-direct'
  ): CommunicationMessage | null {
    const channel = this.channels.get(channelId);
    if (!channel || !channel.isActive) {
      return null;
    }

    // Check if sender is authorized for this channel
    if (!channel.participants.includes(senderId)) {
      return null;
    }

    const message: CommunicationMessage = {
      id: this.generateMessageId(),
      senderId,
      receiverId,
      messageType,
      content,
      timestamp: Date.now(),
      priority,
      expiresAt: Date.now() + this.config.messageExpirationTime
    };

    // Add to channel history
    channel.messageHistory.push(message);
    
    // Trim history if too long
    if (channel.messageHistory.length > this.config.maxMessageHistory) {
      channel.messageHistory = channel.messageHistory.slice(-this.config.maxMessageHistory);
    }

    // Add to message queue for processing
    this.messageQueue.push(message);

    if (this.config.debugMode) {
      console.log(`📤 ${senderId} → ${receiverId}: ${messageType}`, content);
    }

    return message;
  }

  /**
   * Get messages for a specific agent
   */
  getMessagesForAgent(agentId: 'p1' | 'p2', channelId?: string): CommunicationMessage[] {
    const messages: CommunicationMessage[] = [];
    const now = Date.now();

    const channelsToCheck = channelId ? [this.channels.get(channelId)] : Array.from(this.channels.values());
    
    for (const channel of channelsToCheck) {
      if (!channel || !channel.isActive) continue;

      for (const message of channel.messageHistory) {
        // Check if message is for this agent
        if (message.receiverId === agentId || message.receiverId === 'broadcast') {
          // Check if message hasn't expired
          if (!message.expiresAt || message.expiresAt > now) {
            messages.push(message);
          }
        }
      }
    }

    // Sort by priority and timestamp
    const sortedMessages = messages.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return b.timestamp - a.timestamp;
    });
    
    return sortedMessages;
  }

  /**
   * Process communication for AI decision making
   */
  processCommunicationForAgent(agentId: 'p1' | 'p2', gameState: GameState): AIDecision[] {
    const messages = this.getMessagesForAgent(agentId);
    const decisions: AIDecision[] = [];

    for (const message of messages) {
      const decision = this.processMessage(agentId, message, gameState);
      if (decision) {
        decisions.push(decision);
      }
    }

    return decisions;
  }

  /**
   * Process individual message and generate AI decision
   */
  private processMessage(
    agentId: 'p1' | 'p2',
    message: CommunicationMessage,
    gameState: GameState
  ): AIDecision | null {
    switch (message.messageType) {
      case CommunicationType.POSITION_UPDATE:
        return this.processPositionUpdate(agentId, message, gameState);
      
      case CommunicationType.INTENTION_ANNOUNCEMENT:
        return this.processIntentionAnnouncement(agentId, message, gameState);
      
      case CommunicationType.THREAT_ASSESSMENT:
        return this.processThreatAssessment(agentId, message, gameState);
      
      case CommunicationType.STRATEGY_COORDINATION:
        return this.processStrategyCoordination(agentId, message, gameState);
      
      case CommunicationType.CHALLENGE:
        return this.processChallenge(agentId, message, gameState);
      
      default:
        return null;
    }
  }

  /**
   * Process position update message
   */
  private processPositionUpdate(
    agentId: 'p1' | 'p2',
    message: CommunicationMessage,
    gameState: GameState
  ): AIDecision | null {
    const { position, velocity, intention } = message.content;
    
    // Calculate distance to opponent
    const myPosition = agentId === 'p1' ? gameState.p1Position : gameState.p2Position;
    const distance = calculateDistance(myPosition, position);
    
    // Generate response based on role and distance
    if (gameState.currentChaser === agentId) {
      // I'm the chaser - adjust strategy based on opponent position
      if (distance < 3) {
        return {
          agentId,
          action: 'accelerate_towards',
          target: position,
          timestamp: Date.now(),
          confidence: 0.9,
          reasoning: `Opponent is close (${distance.toFixed(1)}m), accelerating pursuit`
        };
      } else if (distance > 8) {
        return {
          agentId,
          action: 'predict_movement',
          target: position,
          timestamp: Date.now(),
          confidence: 0.7,
          reasoning: `Opponent is far (${distance.toFixed(1)}m), predicting movement pattern`
        };
      }
    } else {
      // I'm the evader - adjust escape strategy
      if (distance < 4) {
        return {
          agentId,
          action: 'evasive_maneuver',
          target: position,
          timestamp: Date.now(),
          confidence: 0.8,
          reasoning: `Chaser is close (${distance.toFixed(1)}m), executing evasive maneuver`
        };
      }
    }
    
    return null;
  }

  /**
   * Process intention announcement message
   */
  private processIntentionAnnouncement(
    agentId: 'p1' | 'p2',
    message: CommunicationMessage,
    gameState: GameState
  ): AIDecision | null {
    const { intention, confidence, strategy } = message.content;
    
    // React to opponent's stated intention
    if (intention === 'aggressive_pursuit' && gameState.currentChaser !== agentId) {
      return {
        agentId,
        action: 'defensive_positioning',
        target: { x: 0, y: 0, z: 0 },
        timestamp: Date.now(),
        confidence: 0.8,
        reasoning: `Opponent announced aggressive pursuit, taking defensive position`
      };
    }
    
    if (intention === 'defensive_evasion' && gameState.currentChaser === agentId) {
      return {
        agentId,
        action: 'flanking_maneuver',
        target: { x: 0, y: 0, z: 0 },
        timestamp: Date.now(),
        confidence: 0.7,
        reasoning: `Opponent is defensive, attempting flanking maneuver`
      };
    }
    
    return null;
  }

  /**
   * Process threat assessment message
   */
  private processThreatAssessment(
    agentId: 'p1' | 'p2',
    message: CommunicationMessage,
    gameState: GameState
  ): AIDecision | null {
    const { threatLevel, threatSource, recommendedAction } = message.content;
    
    if (threatLevel > 0.7) {
      return {
        agentId,
        action: recommendedAction || 'evasive_maneuver',
        target: { x: 0, y: 0, z: 0 },
        timestamp: Date.now(),
        confidence: 0.9,
        reasoning: `High threat level (${threatLevel}) detected, taking evasive action`
      };
    }
    
    return null;
  }

  /**
   * Process strategy coordination message
   */
  private processStrategyCoordination(
    agentId: 'p1' | 'p2',
    message: CommunicationMessage,
    gameState: GameState
  ): AIDecision | null {
    const { proposedStrategy, coordinationType } = message.content;
    
    // For now, acknowledge the strategy (in a real implementation, this would be more complex)
    if (this.config.debugMode) {
      console.log(`🤝 ${agentId} acknowledging strategy: ${proposedStrategy}`);
    }
    
    return null;
  }

  /**
   * Process challenge message
   */
  private processChallenge(
    agentId: 'p1' | 'p2',
    message: CommunicationMessage,
    gameState: GameState
  ): AIDecision | null {
    const { challengeType, intensity } = message.content;
    
    // Respond to challenge based on personality and current state
    if (challengeType === 'speed_challenge') {
      return {
        agentId,
        action: 'increase_speed',
        target: { x: 0, y: 0, z: 0 },
        timestamp: Date.now(),
        confidence: 0.8,
        reasoning: `Responding to speed challenge with intensity ${intensity}`
      };
    }
    
    return null;
  }


  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get communication statistics
   */
  getCommunicationStats(): any {
    const stats = {
      totalMessages: 0,
      messagesByType: {} as Record<string, number>,
      messagesByPriority: {} as Record<string, number>,
      channelStats: {} as Record<string, any>
    };

    for (const [channelId, channel] of Array.from(this.channels.entries())) {
      stats.totalMessages += channel.messageHistory.length;
      stats.channelStats[channelId] = {
        messageCount: channel.messageHistory.length,
        isActive: channel.isActive,
        bandwidth: channel.bandwidth
      };

      for (const message of channel.messageHistory) {
        stats.messagesByType[message.messageType] = (stats.messagesByType[message.messageType] || 0) + 1;
        stats.messagesByPriority[message.priority] = (stats.messagesByPriority[message.priority] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Clean up expired messages
   */
  cleanupExpiredMessages(): void {
    const now = Date.now();
    
    for (const channel of Array.from(this.channels.values())) {
      channel.messageHistory = channel.messageHistory.filter(
        (message: CommunicationMessage) => !message.expiresAt || message.expiresAt > now
      );
    }
    
    this.messageQueue = this.messageQueue.filter(
      message => !message.expiresAt || message.expiresAt > now
    );
  }

  /**
   * Dispose of the communication system
   */
  dispose(): void {
    this.channels.clear();
    this.messageQueue = [];
  }
}
