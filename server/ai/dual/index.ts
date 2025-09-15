// Dual AI System Exports

export * from './types';
export * from './AIAgent';
export * from './TagChaser';
export * from './TagEvader';
export * from './DualAIEngine';

// Default configurations
export const DEFAULT_TAG_GAME_CONFIG = {
  tagDistance: 2.0,
  gameDuration: 30, // seconds
  maxRounds: 10,
  learningEnabled: true,
  aiUpdateRate: 10, // updates per second
  memorySize: 50,
  adaptationRate: 0.1,
  debug: false
};

export const DEFAULT_PERSONALITIES = {
  strategic: {
    type: 'strategic' as const,
    speed: 0.8,
    aggression: 0.6,
    caution: 0.4,
    adaptability: 0.7,
    memoryRetention: 0.8
  },
  aggressive: {
    type: 'aggressive' as const,
    speed: 0.9,
    aggression: 0.8,
    caution: 0.2,
    adaptability: 0.6,
    memoryRetention: 0.7
  },
  defensive: {
    type: 'defensive' as const,
    speed: 0.7,
    aggression: 0.3,
    caution: 0.8,
    adaptability: 0.5,
    memoryRetention: 0.9
  },
  random: {
    type: 'random' as const,
    speed: 0.6,
    aggression: 0.5,
    caution: 0.5,
    adaptability: 0.3,
    memoryRetention: 0.4
  }
};
