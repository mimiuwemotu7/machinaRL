// Simulation Execution Engine - Main orchestrator for the entire simulation process

import { getSimulationGoalService, ParsedSimulation } from './SimulationGoalService';
import { getSystemPromptGenerator } from './SystemPromptGenerator';
import { getSimulationStateManager, SimulationState, SimulationStatus } from './SimulationStateManager';
import { getAIAgentCoordinator } from './AIAgentCoordinator';
import { getAPIConfig, getAPIStatus } from '../config/apiConfig';

export interface SimulationExecutionConfig {
  maxDuration: number; // seconds
  maxSteps: number;
  decisionInterval: number; // milliseconds
  updateInterval: number; // milliseconds
  enableLogging: boolean;
  enableMetrics: boolean;
  autoStart: boolean;
  pauseOnError: boolean;
  retryOnFailure: boolean;
  maxRetries: number;
}

export interface SimulationExecutionResult {
  success: boolean;
  status: SimulationStatus;
  duration: number;
  stepsExecuted: number;
  objectivesCompleted: number;
  totalObjectives: number;
  finalProgress: number;
  errors: string[];
  metrics: {
    efficiency: number;
    collaborationScore: number;
    errorRate: number;
  };
  completionReason: string;
}

export interface SimulationEvent {
  type: 'started' | 'paused' | 'resumed' | 'stopped' | 'error' | 'progress' | 'objective_completed' | 'phase_changed';
  timestamp: number;
  data: any;
  message: string;
}

export class SimulationExecutionEngine {
  private goalService: any;
  private promptGenerator: any;
  private stateManager: any;
  private coordinator: any;
  private apiConfig: any;

  private config: SimulationExecutionConfig;
  private executionInterval?: NodeJS.Timeout;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private eventListeners: Map<string, (event: SimulationEvent) => void> = new Map();
  private retryCount: number = 0;

  constructor(config?: Partial<SimulationExecutionConfig>) {
    this.goalService = getSimulationGoalService();
    this.promptGenerator = getSystemPromptGenerator();
    this.stateManager = getSimulationStateManager();
    this.coordinator = getAIAgentCoordinator();
    this.apiConfig = getAPIConfig();

    this.config = {
      maxDuration: 0, // No timeout - let simulation run until goals are achieved
      maxSteps: 0, // No step limit
      decisionInterval: 3000, // 3 seconds
      updateInterval: 1000, // 1 second
      enableLogging: true,
      enableMetrics: true,
      autoStart: false,
      pauseOnError: true,
      retryOnFailure: true,
      maxRetries: 3,
      ...config
    };

    // Subscribe to state changes
    this.stateManager.subscribe('execution-engine', (state: SimulationState) => {
      this.handleStateChange(state);
    });
  }

  /**
   * Execute a simulation from user description
   */
  async executeSimulation(
    simulationName: string,
    description: string,
    sceneContext?: {
      sceneId: string;
      availableMeshes: string[];
      sceneType: string;
    }
  ): Promise<SimulationExecutionResult> {
    console.log('🚀 [SimulationExecutionEngine] Starting simulation execution...');
    console.log('📝 Name:', simulationName);
    console.log('📝 Description:', description);

    try {
      // Step 1: Parse simulation goals
      this.emitEvent('started', { simulationName, description }, 'Simulation started');
      
      const parseResult = await this.goalService.parseSimulationDescription(
        simulationName,
        description,
        sceneContext
      );

      if (!parseResult.success || !parseResult.data) {
        throw new Error(`Failed to parse simulation: ${parseResult.error}`);
      }

      const parsedSimulation = parseResult.data;
      console.log('✅ [SimulationExecutionEngine] Goals parsed successfully');

      // Step 2: Initialize simulation state
      const initialPositions = this.getInitialPositions(sceneContext);
      this.stateManager.initializeSimulation(simulationName, parsedSimulation, initialPositions);

      // Step 3: Initialize coordination
      await this.coordinator.initializeCoordination(parsedSimulation, initialPositions);

      // Step 4: Start execution
      if (this.config.autoStart) {
        await this.startExecution();
      }

      // Step 5: Wait for completion
      const result = await this.waitForCompletion();

      console.log('🏁 [SimulationExecutionEngine] Simulation completed:', result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ [SimulationExecutionEngine] Simulation failed:', errorMessage);
      
      this.emitEvent('error', { error: errorMessage }, `Simulation failed: ${errorMessage}`);
      
      return {
        success: false,
        status: 'failed',
        duration: 0,
        stepsExecuted: 0,
        objectivesCompleted: 0,
        totalObjectives: 0,
        finalProgress: 0,
        errors: [errorMessage],
        metrics: {
          efficiency: 0,
          collaborationScore: 0,
          errorRate: 1.0
        },
        completionReason: `Error: ${errorMessage}`
      };
    }
  }

  /**
   * Start simulation execution
   */
  async startExecution(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ [SimulationExecutionEngine] Simulation already running');
      return;
    }

    console.log('▶️ [SimulationExecutionEngine] Starting execution...');
    
    this.isRunning = true;
    this.isPaused = false;
    this.retryCount = 0;

    // Start state manager
    this.stateManager.startSimulation();

    // Start execution loop
    this.executionInterval = setInterval(async () => {
      await this.executionStep();
    }, this.config.decisionInterval);

    this.emitEvent('started', {}, 'Execution started');
  }

  /**
   * Pause simulation execution
   */
  pauseExecution(): void {
    if (!this.isRunning || this.isPaused) {
      return;
    }

    console.log('⏸️ [SimulationExecutionEngine] Pausing execution...');
    
    this.isPaused = true;
    this.stateManager.pauseSimulation();

    if (this.executionInterval) {
      clearInterval(this.executionInterval);
      this.executionInterval = undefined;
    }

    this.emitEvent('paused', {}, 'Execution paused');
  }

  /**
   * Resume simulation execution
   */
  resumeExecution(): void {
    if (!this.isRunning || !this.isPaused) {
      return;
    }

    console.log('▶️ [SimulationExecutionEngine] Resuming execution...');
    
    this.isPaused = false;
    this.stateManager.resumeSimulation();

    // Restart execution loop
    this.executionInterval = setInterval(async () => {
      await this.executionStep();
    }, this.config.decisionInterval);

    this.emitEvent('resumed', {}, 'Execution resumed');
  }

  /**
   * Stop simulation execution
   */
  stopExecution(reason: 'completed' | 'failed' | 'user_stop' = 'user_stop'): void {
    if (!this.isRunning) {
      return;
    }

    console.log('⏹️ [SimulationExecutionEngine] Stopping execution...', reason);
    
    this.isRunning = false;
    this.isPaused = false;

    if (this.executionInterval) {
      clearInterval(this.executionInterval);
      this.executionInterval = undefined;
    }

    this.stateManager.stopSimulation(reason);
    this.emitEvent('stopped', { reason }, `Execution stopped: ${reason}`);
  }

  /**
   * Single execution step
   */
  private async executionStep(): Promise<void> {
    try {
      // Check if simulation should continue
      if (!this.stateManager.shouldContinue()) {
        this.stopExecution('completed');
        return;
      }

      // Process agent decisions
      await this.coordinator.processAgentDecisions();

      // Check for errors and handle them
      await this.handleErrors();

      // Update progress
      this.updateProgress();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ [SimulationExecutionEngine] Execution step failed:', errorMessage);
      
      this.stateManager.recordError('system', `Execution step failed: ${errorMessage}`, 'high');
      
      if (this.config.pauseOnError) {
        this.pauseExecution();
      }
    }
  }

  /**
   * Handle errors during execution
   */
  private async handleErrors(): Promise<void> {
    const state = this.stateManager.getState();
    const recentErrors = state.errors.filter((error: any) => 
      Date.now() - error.timestamp < 10000 // Last 10 seconds
    );

    if (recentErrors.length > 0) {
      console.log(`⚠️ [SimulationExecutionEngine] Handling ${recentErrors.length} recent errors`);

      for (const error of recentErrors) {
        if (error.severity === 'critical' && !error.resolved) {
          console.error('🚨 [SimulationExecutionEngine] Critical error detected:', error.message);
          
          if (this.config.retryOnFailure && this.retryCount < this.config.maxRetries) {
            await this.retryExecution();
          } else {
            this.stopExecution('failed');
            return;
          }
        }
      }
    }
  }

  /**
   * Retry execution after error
   */
  private async retryExecution(): Promise<void> {
    this.retryCount++;
    console.log(`🔄 [SimulationExecutionEngine] Retrying execution (attempt ${this.retryCount}/${this.config.maxRetries})`);

    // Pause briefly before retry
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Resume execution
    this.resumeExecution();
  }

  /**
   * Update progress and emit events
   */
  private updateProgress(): void {
    const state = this.stateManager.getState();
    
    // Emit progress event
    this.emitEvent('progress', {
      progress: state.progress,
      currentPhase: state.currentPhase,
      timeRemaining: state.environmentState.timeRemaining
    }, `Progress: ${state.progress.toFixed(1)}%`);

    // Check for completed objectives
    const completedObjectives = Object.values(state.agentStates).reduce(
      (sum: number, agent: any) => sum + agent.completedObjectives.length, 0
    );

    if (completedObjectives > 0) {
      this.emitEvent('objective_completed', {
        completedObjectives,
        totalObjectives: state.metrics.totalObjectives
      }, `${completedObjectives} objectives completed`);
    }

    // Check for phase changes
    if (state.currentPhase > 0) {
      this.emitEvent('phase_changed', {
        currentPhase: state.currentPhase,
        totalPhases: state.totalPhases
      }, `Phase ${state.currentPhase} of ${state.totalPhases}`);
    }
  }

  /**
   * Wait for simulation completion
   */
  private async waitForCompletion(): Promise<SimulationExecutionResult> {
    return new Promise((resolve) => {
      const checkCompletion = () => {
        const state = this.stateManager.getState();
        
        if (state.status === 'completed' || state.status === 'failed') {
          const result = this.createExecutionResult(state);
          resolve(result);
        } else if (this.isRunning && !this.isPaused) {
          setTimeout(checkCompletion, 1000); // Check every second
        } else {
          // Simulation is paused or stopped
          const result = this.createExecutionResult(state);
          resolve(result);
        }
      };

      checkCompletion();
    });
  }

  /**
   * Create execution result from current state
   */
  private createExecutionResult(state: SimulationState): SimulationExecutionResult {
    const duration = state.endTime ? (state.endTime - state.startTime) / 1000 : (Date.now() - state.startTime) / 1000;
    const objectivesCompleted = Object.values(state.agentStates).reduce(
      (sum, agent) => sum + agent.completedObjectives.length, 0
    );
    const totalObjectives = state.goals.reduce((sum, goal) => sum + goal.objectives.length, 0);

    return {
      success: state.status === 'completed',
      status: state.status,
      duration: duration,
      stepsExecuted: state.metrics.totalSteps,
      objectivesCompleted: objectivesCompleted,
      totalObjectives: totalObjectives,
      finalProgress: state.progress,
      errors: state.errors.map(error => error.message),
      metrics: {
        efficiency: state.metrics.efficiency,
        collaborationScore: state.metrics.collaborationScore,
        errorRate: state.metrics.errorRate
      },
      completionReason: this.getCompletionReason(state)
    };
  }

  /**
   * Get completion reason
   */
  private getCompletionReason(state: SimulationState): string {
    if (state.status === 'completed') {
      return 'All objectives completed successfully';
    } else if (state.status === 'failed') {
      const criticalErrors = state.errors.filter(error => error.severity === 'critical');
      if (criticalErrors.length > 0) {
        return `Failed due to critical error: ${criticalErrors[0].message}`;
      } else {
        return 'Failed due to multiple errors or time limit';
      }
    } else if (state.status === 'paused') {
      return 'Simulation paused by user';
    } else {
      return 'Simulation stopped';
    }
  }

  /**
   * Get initial positions for agents
   */
  private getInitialPositions(sceneContext?: any): { p1: { x: number; y: number; z: number }; p2: { x: number; y: number; z: number } } {
    // Default positions - can be customized based on scene
    return {
      p1: { x: -2, y: 0, z: 0 }, // Red cube (Grok)
      p2: { x: 2, y: 0, z: 0 }   // Blue cube (ChatGPT)
    };
  }

  /**
   * Handle state changes
   */
  private handleStateChange(state: SimulationState): void {
    // Log state changes if enabled
    if (this.config.enableLogging) {
      console.log('📊 [SimulationExecutionEngine] State update:', {
        status: state.status,
        progress: state.progress,
        steps: state.metrics.totalSteps,
        errors: state.errors.length
      });
    }
  }

  /**
   * Emit simulation event
   */
  private emitEvent(type: SimulationEvent['type'], data: any, message: string): void {
    const event: SimulationEvent = {
      type,
      timestamp: Date.now(),
      data,
      message
    };

    this.eventListeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('❌ [SimulationExecutionEngine] Event listener error:', error);
      }
    });
  }

  /**
   * Subscribe to simulation events
   */
  subscribe(listenerId: string, callback: (event: SimulationEvent) => void): void {
    this.eventListeners.set(listenerId, callback);
  }

  /**
   * Unsubscribe from simulation events
   */
  unsubscribe(listenerId: string): void {
    this.eventListeners.delete(listenerId);
  }

  /**
   * Get current execution status
   */
  getStatus(): {
    isRunning: boolean;
    isPaused: boolean;
    state: SimulationState;
    config: SimulationExecutionConfig;
  } {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      state: this.stateManager.getState(),
      config: this.config
    };
  }

  /**
   * Update execution configuration
   */
  updateConfig(newConfig: Partial<SimulationExecutionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ [SimulationExecutionEngine] Configuration updated:', newConfig);
  }

  /**
   * Get execution statistics
   */
  getStats(): {
    executionTime: number;
    stepsExecuted: number;
    errors: number;
    retryCount: number;
    coordinationStats: any;
  } {
    const state = this.stateManager.getState();
    const executionTime = this.isRunning ? (Date.now() - state.startTime) / 1000 : 0;

    return {
      executionTime,
      stepsExecuted: state.metrics.totalSteps,
      errors: state.errors.length,
      retryCount: this.retryCount,
      coordinationStats: this.coordinator.getCoordinationStats()
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopExecution('user_stop');
    this.eventListeners.clear();
    this.stateManager.unsubscribe('execution-engine');
    this.coordinator.destroy();
  }
}

// Singleton instance
let simulationExecutionEngineInstance: SimulationExecutionEngine | null = null;

export const getSimulationExecutionEngine = (): SimulationExecutionEngine => {
  if (!simulationExecutionEngineInstance) {
    simulationExecutionEngineInstance = new SimulationExecutionEngine();
  }
  return simulationExecutionEngineInstance;
};
