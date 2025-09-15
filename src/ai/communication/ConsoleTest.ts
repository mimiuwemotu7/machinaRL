import { AICommunicationSystem, CommunicationHelper, CommunicationType, MessagePriority } from './index';
import { Vector3 } from '../dual/types';

/**
 * Console test function for immediate AI communication testing
 * Run this in the browser console to test the communication system
 */
export function runConsoleCommunicationTest() {
  console.log('🚀 Starting AI Communication Console Test...');
  
  // Create communication system
  const communicationSystem = new AICommunicationSystem({
    maxMessageHistory: 20,
    messageExpirationTime: 10000,
    enableLearning: true,
    enableEmotionalModeling: true,
    enableStrategySharing: true,
    debugMode: true
  });

  // Create communication helpers
  const p1Helper = new CommunicationHelper('p1', communicationSystem);
  const p2Helper = new CommunicationHelper('p2', communicationSystem);

  // Mock game state
  const gameState = {
    p1Position: { x: -4, y: 0, z: 2 },
    p2Position: { x: 4, y: 0, z: -2 },
    p1Velocity: { x: 1, y: 0, z: 0 },
    p2Velocity: { x: -1, y: 0, z: 0 },
    currentChaser: 'p1' as const,
    gamePhase: 'playing' as any,
    roundNumber: 1,
    tagDistance: 2,
    lastTagTime: 0,
    gameStartTime: Date.now()
  };

  // Mock AI agents
  const p1Agent = {
    id: 'p1' as const,
    position: { x: -4, y: 0, z: 2 },
    velocity: { x: 1, y: 0, z: 0 },
    target: { x: 4, y: 0, z: -2 },
    role: 'chaser' as const,
    personality: {
      type: 'aggressive' as const,
      speed: 0.8,
      aggression: 0.8,
      caution: 0.3,
      adaptability: 0.6,
      memoryRetention: 0.7,
      confidence: 0.7
    },
    status: 'active' as any,
    memory: { 
      recentPositions: [],
      recentDecisions: [],
      opponentPatterns: [],
      successfulStrategies: [],
      failedStrategies: [],
      lastUpdateTime: Date.now()
    },
    learningData: { 
      totalRounds: 0,
      winsAsChaser: 0,
      winsAsEvader: 0,
      averageGameDuration: 0,
      learningRate: 0.1,
      adaptationSpeed: 0.5,
      strategyEvolution: []
    }
  };

  const p2Agent = {
    id: 'p2' as const,
    position: { x: 4, y: 0, z: -2 },
    velocity: { x: -1, y: 0, z: 0 },
    target: { x: -4, y: 0, z: 2 },
    role: 'evader' as const,
    personality: {
      type: 'defensive' as const,
      speed: 0.6,
      aggression: 0.4,
      caution: 0.8,
      adaptability: 0.9,
      memoryRetention: 0.8,
      confidence: 0.8
    },
    status: 'active' as any,
    memory: { 
      recentPositions: [],
      recentDecisions: [],
      opponentPatterns: [],
      successfulStrategies: [],
      failedStrategies: [],
      lastUpdateTime: Date.now()
    },
    learningData: { 
      totalRounds: 0,
      winsAsChaser: 0,
      winsAsEvader: 0,
      averageGameDuration: 0,
      learningRate: 0.1,
      adaptationSpeed: 0.5,
      strategyEvolution: []
    }
  };

  // Test scenarios
  const testScenarios = {
    // Basic communication
    basic: () => {
      console.log('📡 Testing basic communication...');
      p1Helper.sendPositionUpdate(gameState.p1Position, gameState.p1Velocity, 'chasing');
      p2Helper.sendPositionUpdate(gameState.p2Position, gameState.p2Velocity, 'evading');
    },

    // Aggressive challenge
    aggressive: () => {
      console.log('⚔️ Testing aggressive challenge...');
      p1Helper.sendChallenge('aggression_challenge', 0.9, 'Time to show you who\'s boss!');
      p2Helper.sendChallenge('evasion_challenge', 0.8, 'You\'ll never catch me!');
    },

    // Strategy coordination
    strategy: () => {
      console.log('🤝 Testing strategy coordination...');
      p1Helper.coordinateStrategy('flanking_attack', 'coordination', { 
        target: 'p2_position', 
        approach: 'from_side' 
      });
      p2Helper.coordinateStrategy('defensive_circle', 'coordination', { 
        radius: 3, 
        center: 'current_position' 
      });
    },

    // Emotional sharing
    emotional: () => {
      console.log('😊 Testing emotional sharing...');
      p1Helper.shareEmotionalState({ 
        confidence: 0.9, 
        excitement: 0.8, 
        stress: 0.3,
        timestamp: Date.now()
      });
      p2Helper.shareEmotionalState({ 
        confidence: 0.7, 
        excitement: 0.6, 
        stress: 0.5,
        timestamp: Date.now()
      });
    },

    // Learning exchange
    learning: () => {
      console.log('🧠 Testing learning exchange...');
      p1Helper.shareLearning('success', { 
        action: 'successful_tag', 
        distance: 1.5,
        strategy: 'close_range_attack'
      }, ['Close range attacks work well', 'Speed is key']);
      
      p2Helper.shareLearning('failure', { 
        action: 'failed_evasion', 
        distance: 0.8,
        strategy: 'straight_line_escape'
      }, ['Need better escape routes', 'Should use obstacles']);
    },

    // Threat assessment
    threat: () => {
      console.log('⚠️ Testing threat assessment...');
      p1Helper.shareThreatAssessment(0.9, gameState.p2Position, 'evasive_maneuver');
      p2Helper.shareThreatAssessment(0.7, gameState.p1Position, 'defensive_positioning');
    },

    // Full contextual communication
    contextual: () => {
      console.log('🎯 Testing full contextual communication...');
      p1Helper.generateContextualCommunication({
        gameState,
        myAgent: p1Agent,
        opponentAgent: p2Agent
      });
      p2Helper.generateContextualCommunication({
        gameState,
        myAgent: p2Agent,
        opponentAgent: p1Agent
      });
    }
  };

  // Run all tests
  console.log('🧪 Running all communication tests...');
  Object.entries(testScenarios).forEach(([name, test]) => {
    console.log(`\n--- ${name.toUpperCase()} TEST ---`);
    test();
    
    // Show messages after each test
    setTimeout(() => {
      const p1Messages = communicationSystem.getMessagesForAgent('p1');
      const p2Messages = communicationSystem.getMessagesForAgent('p2');
      console.log(`📨 P1 Messages: ${p1Messages.length}`);
      console.log(`📨 P2 Messages: ${p2Messages.length}`);
      
      // Show recent messages
      const recentMessages = [...p1Messages, ...p2Messages]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 3);
      
      recentMessages.forEach(msg => {
        console.log(`  ${msg.senderId} → ${msg.receiverId}: ${msg.messageType}`, msg.content);
      });
    }, 100);
  });

  // Show final stats
  setTimeout(() => {
    console.log('\n📊 FINAL COMMUNICATION STATS:');
    const stats = communicationSystem.getCommunicationStats();
    console.log('Total Messages:', stats.totalMessages);
    console.log('Messages by Type:', stats.messagesByType);
    console.log('Messages by Priority:', stats.messagesByPriority);
    console.log('Channel Stats:', stats.channelStats);
  }, 1000);

  // Return the communication system for further testing
  return {
    communicationSystem,
    p1Helper,
    p2Helper,
    gameState,
    p1Agent,
    p2Agent,
    testScenarios
  };
}

// Make it available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testAICommunication = runConsoleCommunicationTest;
}
