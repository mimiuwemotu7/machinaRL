// Simulation Integration Service - Main interface for the simulation system

import { getSimulationExecutionEngine, SimulationExecutionResult, SimulationEvent } from './SimulationExecutionEngine';
import { getSimulationStateManager, SimulationState } from './SimulationStateManager';
import { getGoalEvaluationService, GoalCompletionStatus } from './GoalEvaluationService';
import { getAIAgentCoordinator } from './AIAgentCoordinator';

export interface SimulationIntegrationConfig {
  autoStart: boolean;
  enableProgressTracking: boolean;
  enableRealTimeUpdates: boolean;
  updateInterval: number;
  maxSimulationTime: number;
}

export interface SimulationProgress {
  isRunning: boolean;
  isPaused: boolean;
  progress: number;
  currentPhase: string;
  timeElapsed: number;
  timeRemaining: number;
  objectivesCompleted: number;
  totalObjectives: number;
  agentStatuses: {
    p1: AgentProgress;
    p2: AgentProgress;
  };
  goalStatuses: GoalCompletionStatus[];
  errors: string[];
  metrics: {
    efficiency: number;
    collaborationScore: number;
    errorRate: number;
  };
}

export interface AgentProgress {
  name: string;
  status: 'active' | 'idle' | 'stuck' | 'completed' | 'error';
  position: { x: number; y: number; z: number };
  progress: number;
  currentObjective: string;
  lastAction: string;
}

export interface SimulationControls {
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
}

export class SimulationIntegrationService {
  private executionEngine: any;
  private stateManager: any;
  private goalEvaluator: any;
  private coordinator: any;
  
  private config: SimulationIntegrationConfig;
  private progressListeners: Map<string, (progress: SimulationProgress) => void> = new Map();
  private eventListeners: Map<string, (event: SimulationEvent) => void> = new Map();
  private updateInterval?: NodeJS.Timeout;

  constructor(config?: Partial<SimulationIntegrationConfig>) {
    this.executionEngine = getSimulationExecutionEngine();
    this.stateManager = getSimulationStateManager();
    this.goalEvaluator = getGoalEvaluationService();
    this.coordinator = getAIAgentCoordinator();

    this.config = {
      autoStart: true,
      enableProgressTracking: true,
      enableRealTimeUpdates: true,
      updateInterval: 1000, // 1 second
      maxSimulationTime: 300, // 5 minutes
      ...config
    };

    // Subscribe to execution engine events
    this.executionEngine.subscribe('integration-service', (event: SimulationEvent) => {
      this.handleSimulationEvent(event);
    });

    // Subscribe to state changes
    this.stateManager.subscribe('integration-service', (state: SimulationState) => {
      this.handleStateChange(state);
    });
  }

  /**
   * Start a new simulation
   */
  async startSimulation(
    simulationName: string,
    description: string,
    sceneContext?: {
      sceneId: string;
      availableMeshes: string[];
      sceneType: string;
    }
  ): Promise<SimulationExecutionResult> {
    console.log('🚀 [SimulationIntegrationService] Starting simulation...');
    console.log('📝 Name:', simulationName);
    console.log('📝 Description:', description);

    try {
      // Configure execution engine
      this.executionEngine.updateConfig({
        maxDuration: this.config.maxSimulationTime,
        autoStart: this.config.autoStart
      });

      // Start the simulation
      const result = await this.executionEngine.executeSimulation(
        simulationName,
        description,
        sceneContext
      );

      // Start progress tracking if enabled
      if (this.config.enableProgressTracking) {
        this.startProgressTracking();
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ [SimulationIntegrationService] Failed to start simulation:', errorMessage);
      throw error;
    }
  }

  /**
   * Get simulation controls
   */
  getControls(): SimulationControls {
    return {
      start: async () => {
        await this.executionEngine.startExecution();
      },
      pause: () => {
        this.executionEngine.pauseExecution();
      },
      resume: () => {
        this.executionEngine.resumeExecution();
      },
      stop: () => {
        this.executionEngine.stopExecution('user_stop');
      },
      reset: () => {
        this.executionEngine.stopExecution('user_stop');
        // Reset state would go here
      }
    };
  }

  /**
   * Get current simulation progress
   */
  getProgress(): SimulationProgress {
    const state = this.stateManager.getState();
    const executionStatus = this.executionEngine.getStatus();

    // Evaluate goals
    const goalStatuses = this.goalEvaluator.evaluateGoals(state.goals, {
      simulationState: state,
      timeElapsed: (Date.now() - state.startTime) / 1000,
      timeRemaining: state.environmentState.timeRemaining
    });

    return {
      isRunning: executionStatus.isRunning,
      isPaused: executionStatus.isPaused,
      progress: state.progress,
      currentPhase: state.goals[0]?.name || 'Unknown',
      timeElapsed: (Date.now() - state.startTime) / 1000,
      timeRemaining: state.environmentState.timeRemaining,
      objectivesCompleted: state.metrics.objectivesCompleted,
      totalObjectives: state.metrics.totalObjectives,
      agentStatuses: {
        p1: this.createAgentProgress(state.agentStates.p1),
        p2: this.createAgentProgress(state.agentStates.p2)
      },
      goalStatuses,
      errors: state.errors.map((error: any) => error.message),
      metrics: {
        efficiency: state.metrics.efficiency,
        collaborationScore: state.metrics.collaborationScore,
        errorRate: state.metrics.errorRate
      }
    };
  }

  /**
   * Subscribe to progress updates
   */
  subscribeToProgress(listenerId: string, callback: (progress: SimulationProgress) => void): void {
    this.progressListeners.set(listenerId, callback);
  }

  /**
   * Unsubscribe from progress updates
   */
  unsubscribeFromProgress(listenerId: string): void {
    this.progressListeners.delete(listenerId);
  }

  /**
   * Subscribe to simulation events
   */
  subscribeToEvents(listenerId: string, callback: (event: SimulationEvent) => void): void {
    this.eventListeners.set(listenerId, callback);
  }

  /**
   * Unsubscribe from simulation events
   */
  unsubscribeFromEvents(listenerId: string): void {
    this.eventListeners.delete(listenerId);
  }

  /**
   * Get simulation statistics
   */
  getStats(): {
    executionTime: number;
    stepsExecuted: number;
    errors: number;
    coordinationStats: any;
    goalProgress: GoalCompletionStatus[];
  } {
    const executionStats = this.executionEngine.getStats();
    const state = this.stateManager.getState();
    const goalProgress = this.goalEvaluator.evaluateGoals(state.goals, {
      simulationState: state,
      timeElapsed: executionStats.executionTime,
      timeRemaining: state.environmentState.timeRemaining
    });

    return {
      ...executionStats,
      goalProgress
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SimulationIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ [SimulationIntegrationService] Configuration updated:', newConfig);
  }

  /**
   * Start progress tracking
   */
  private startProgressTracking(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      if (this.config.enableRealTimeUpdates) {
        this.notifyProgressListeners();
      }
    }, this.config.updateInterval);
  }

  /**
   * Stop progress tracking
   */
  private stopProgressTracking(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
  }

  /**
   * Handle simulation events
   */
  private handleSimulationEvent(event: SimulationEvent): void {
    console.log('📡 [SimulationIntegrationService] Simulation event:', event.type, event.message);

    // Notify event listeners
    this.eventListeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('❌ [SimulationIntegrationService] Event listener error:', error);
      }
    });

    // Handle specific events
    switch (event.type) {
      case 'started':
        if (this.config.enableProgressTracking) {
          this.startProgressTracking();
        }
        break;
      case 'stopped':
      case 'error':
        this.stopProgressTracking();
        break;
    }
  }

  /**
   * Handle state changes
   */
  private handleStateChange(state: SimulationState): void {
    // Notify progress listeners
    this.notifyProgressListeners();
  }

  /**
   * Notify all progress listeners
   */
  private notifyProgressListeners(): void {
    const progress = this.getProgress();
    
    this.progressListeners.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('❌ [SimulationIntegrationService] Progress listener error:', error);
      }
    });
  }

  /**
   * Create agent progress object
   */
  private createAgentProgress(agentState: any): AgentProgress {
    return {
      name: agentState.name,
      status: agentState.status,
      position: agentState.position,
      progress: agentState.progress,
      currentObjective: agentState.currentObjective,
      lastAction: agentState.lastAction
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopProgressTracking();
    this.progressListeners.clear();
    this.eventListeners.clear();
    this.executionEngine.unsubscribe('integration-service');
    this.stateManager.unsubscribe('integration-service');
  }
}

// Singleton instance
let simulationIntegrationServiceInstance: SimulationIntegrationService | null = null;

export const getSimulationIntegrationService = (): SimulationIntegrationService => {
  if (!simulationIntegrationServiceInstance) {
    simulationIntegrationServiceInstance = new SimulationIntegrationService();
  }
  return simulationIntegrationServiceInstance;
};
