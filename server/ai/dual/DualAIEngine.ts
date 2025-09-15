// Dual AI Engine - Manages two AI instances for tag game

import { TagChaser } from './TagChaser';
import { TagEvader } from './TagEvader';
import { 
  GameState, 
  AIDecision, 
  Vector3, 
  AIPersonality, 
  TagGameConfig,
  AIAgent,
  GamePhase
} from './types';

export class DualAIEngine {
  private p1Agent!: TagChaser | TagEvader;
  private p2Agent!: TagChaser | TagEvader;
  private gameState: GameState;
  private config: TagGameConfig;
  private isRunning: boolean = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private roundStartTime: number = 0;
  private gameStartTime: number = 0;
  private currentRound: number = 0;
  private maxRounds: number = 0;

  constructor(config: TagGameConfig) {
    this.config = config;
    this.maxRounds = config.maxRounds;
    
    // Initialize game state
    this.gameState = {
      p1Position: { x: -5, y: 0, z: 0 },
      p2Position: { x: 5, y: 0, z: 0 },
      p1Velocity: { x: 0, y: 0, z: 0 },
      p2Velocity: { x: 0, y: 0, z: 0 },
      currentChaser: 'p1',
      gamePhase: GamePhase.WAITING,
      roundNumber: 0,
      tagDistance: config.tagDistance,
      lastTagTime: 0,
      gameStartTime: 0
    };

    // Create AI agents with default personalities
    const p1Personality: AIPersonality = {
      type: 'strategic',
      speed: 0.8,
      aggression: 0.6,
      caution: 0.4,
      adaptability: 0.7,
      memoryRetention: 0.8,
      confidence: 0.8
    };

    const p2Personality: AIPersonality = {
      type: 'aggressive',
      speed: 0.9,
      aggression: 0.8,
      caution: 0.2,
      adaptability: 0.6,
      memoryRetention: 0.7,
      confidence: 0.7
    };

    this.initializeAgents(p1Personality, p2Personality);
  }

  private initializeAgents(p1Personality: AIPersonality, p2Personality: AIPersonality): void {
    // Create agents based on current roles
    if (this.gameState.currentChaser === 'p1') {
      this.p1Agent = new TagChaser('p1', this.gameState.p1Position, p1Personality, this.config);
      this.p2Agent = new TagEvader('p2', this.gameState.p2Position, p2Personality, this.config);
    } else {
      this.p1Agent = new TagEvader('p1', this.gameState.p1Position, p1Personality, this.config);
      this.p2Agent = new TagChaser('p2', this.gameState.p2Position, p2Personality, this.config);
    }
  }

  startGame(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.gameStartTime = Date.now();
    this.gameState.gameStartTime = this.gameStartTime;
    this.gameState.gamePhase = GamePhase.PLAYING;
    this.currentRound = 1;
    this.gameState.roundNumber = this.currentRound;
    this.roundStartTime = Date.now();

    console.log(`🎮 Starting dual AI tag game - Round ${this.currentRound}`);
    console.log(`🏃 P1: ${this.p1Agent.constructor.name} (${this.gameState.currentChaser === 'p1' ? 'Chaser' : 'Evader'})`);
    console.log(`🏃 P2: ${this.p2Agent.constructor.name} (${this.gameState.currentChaser === 'p2' ? 'Chaser' : 'Evader'})`);

    // Start the AI update loop
    this.startUpdateLoop();
  }

  stopGame(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.gameState.gamePhase = GamePhase.PAUSED;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    console.log('🛑 Dual AI game stopped');
  }

  pauseGame(): void {
    if (!this.isRunning) return;

    this.gameState.gamePhase = GamePhase.PAUSED;
    console.log('⏸️ Dual AI game paused');
  }

  resumeGame(): void {
    if (!this.isRunning) return;

    this.gameState.gamePhase = GamePhase.PLAYING;
    console.log('▶️ Dual AI game resumed');
  }

  private startUpdateLoop(): void {
    const updateRate = 1000 / this.config.aiUpdateRate; // Convert to milliseconds
    
    this.updateInterval = setInterval(() => {
      if (this.gameState.gamePhase === GamePhase.PLAYING) {
        this.updateGame();
      }
    }, updateRate);
  }

  private updateGame(): void {
    // Check if round should end
    if (this.shouldEndRound()) {
      this.endRound();
      return;
    }

    // Get decisions from both AI agents
    const p1Decision = this.p1Agent.makeDecision(this.gameState);
    const p2Decision = this.p2Agent.makeDecision(this.gameState);

    // Execute decisions
    this.executeDecision(p1Decision);
    this.executeDecision(p2Decision);

    // Check for tag
    if (this.checkForTag()) {
      this.handleTag();
    }

    // Update game state
    this.updateGameState();

    // Log decisions for debugging
    if (this.config.debug) {
      console.log(`P1 Decision: ${p1Decision.action} -> (${p1Decision.target.x.toFixed(2)}, ${p1Decision.target.z.toFixed(2)}) - Confidence: ${p1Decision.confidence.toFixed(2)}`);
      console.log(`P2 Decision: ${p2Decision.action} -> (${p2Decision.target.x.toFixed(2)}, ${p2Decision.target.z.toFixed(2)}) - Confidence: ${p2Decision.confidence.toFixed(2)}`);
    }
  }

  private executeDecision(decision: AIDecision): void {
    // Update agent position based on decision
    const agent = decision.agentId === 'p1' ? this.p1Agent : this.p2Agent;
    agent.updatePosition(decision.target);

    // Update game state positions
    if (decision.agentId === 'p1') {
      this.gameState.p1Position = decision.target;
    } else {
      this.gameState.p2Position = decision.target;
    }
  }

  private checkForTag(): boolean {
    const distance = this.calculateDistance(
      this.gameState.p1Position,
      this.gameState.p2Position
    );
    
    return distance <= this.config.tagDistance;
  }

  private handleTag(): void {
    const taggedTime = Date.now();
    this.gameState.lastTagTime = taggedTime;
    
    console.log(`🏷️ Tag! ${this.gameState.currentChaser} tagged ${this.gameState.currentChaser === 'p1' ? 'P2' : 'P1'} at distance ${this.calculateDistance(this.gameState.p1Position, this.gameState.p2Position).toFixed(2)}`);
    
    // End current round
    this.endRound();
  }

  private shouldEndRound(): boolean {
    const roundDuration = Date.now() - this.roundStartTime;
    const maxRoundDuration = this.config.gameDuration * 1000; // Convert to milliseconds
    
    return roundDuration >= maxRoundDuration;
  }

  private endRound(): void {
    const roundDuration = Date.now() - this.roundStartTime;
    console.log(`🏁 Round ${this.currentRound} ended after ${(roundDuration / 1000).toFixed(2)} seconds`);
    
    // Update learning for both agents
    this.updateAgentLearning(roundDuration);
    
    // Check if game should continue
    if (this.currentRound >= this.maxRounds) {
      this.endGame();
      return;
    }
    
    // Start next round with roles swapped
    this.startNextRound();
  }

  private startNextRound(): void {
    this.currentRound++;
    this.gameState.roundNumber = this.currentRound;
    this.roundStartTime = Date.now();
    
    // Swap roles
    this.gameState.currentChaser = this.gameState.currentChaser === 'p1' ? 'p2' : 'p1';
    
    // Recreate agents with swapped roles
    const p1Personality = this.p1Agent.getPersonality();
    const p2Personality = this.p2Agent.getPersonality();
    this.initializeAgents(p1Personality, p2Personality);
    
    // Reset positions
    this.gameState.p1Position = { x: -5, y: 0, z: 0 };
    this.gameState.p2Position = { x: 5, y: 0, z: 0 };
    
    console.log(`🎮 Starting Round ${this.currentRound} - ${this.gameState.currentChaser} is now the chaser`);
  }

  private endGame(): void {
    this.isRunning = false;
    this.gameState.gamePhase = GamePhase.GAME_OVER;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    const totalGameTime = Date.now() - this.gameStartTime;
    console.log(`🏆 Game completed after ${this.currentRound} rounds in ${(totalGameTime / 1000).toFixed(2)} seconds`);
    
    // Log final statistics
    this.logGameStatistics();
  }

  private updateAgentLearning(roundDuration: number): void {
    // Determine outcome for each agent
    const p1Outcome = this.gameState.currentChaser === 'p1' ? 'success' : 'failure';
    const p2Outcome = this.gameState.currentChaser === 'p2' ? 'success' : 'failure';
    
    // Update learning for both agents
    this.p1Agent.updateLearning(this.gameState, { agentId: 'p1', action: 'idle', target: this.gameState.p1Position, timestamp: Date.now(), confidence: 1.0 }, p1Outcome);
    this.p2Agent.updateLearning(this.gameState, { agentId: 'p2', action: 'idle', target: this.gameState.p2Position, timestamp: Date.now(), confidence: 1.0 }, p2Outcome);
  }

  private calculateDistance(pos1: Vector3, pos2: Vector3): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  protected updateGameState(): void {
    // Update velocities (simplified)
    this.gameState.p1Velocity = { x: 0, y: 0, z: 0 };
    this.gameState.p2Velocity = { x: 0, y: 0, z: 0 };
  }

  private logGameStatistics(): void {
    console.log('\n📊 Game Statistics:');
    console.log(`Total Rounds: ${this.currentRound}`);
    console.log(`P1 Learning Data:`, this.p1Agent.getLearningData());
    console.log(`P2 Learning Data:`, this.p2Agent.getLearningData());
  }

  // Public getters
  getGameState(): GameState {
    return { ...this.gameState };
  }

  getP1Agent(): AIAgent {
    return this.p1Agent as unknown as AIAgent;
  }

  getP2Agent(): AIAgent {
    return this.p2Agent as unknown as AIAgent;
  }

  isGameRunning(): boolean {
    return this.isRunning;
  }

  getCurrentRound(): number {
    return this.currentRound;
  }

  getMaxRounds(): number {
    return this.maxRounds;
  }

  // Configuration methods
  updateConfig(newConfig: Partial<TagGameConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  setAIPersonalities(p1Personality: AIPersonality, p2Personality: AIPersonality): void {
    this.initializeAgents(p1Personality, p2Personality);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopGame();
    // Clean up any additional resources if needed
  }
}
