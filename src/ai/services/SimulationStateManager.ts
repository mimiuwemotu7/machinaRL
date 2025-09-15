// Simulation State Manager - Tracks progress and manages simulation lifecycle

import { 
  SimulationGoal, 
  SimulationObjective, 
  SimulationConstraint,
  SuccessCriteria,
  ParsedSimulation 
} from './SimulationGoalService';
import { SystemPrompt, AgentStatus } from './SystemPromptGenerator';

export type SimulationStatus = 'idle' | 'initializing' | 'running' | 'paused' | 'completed' | 'failed' | 'error';

export interface SimulationState {
  id: string;
  name: string;
  status: SimulationStatus;
  startTime: number;
  endTime?: number;
  currentPhase: number;
  totalPhases: number;
  progress: number; // 0-100
  goals: SimulationGoal[];
  agentStates: {
    p1: AgentState;
    p2: AgentState;
  };
  environmentState: EnvironmentState;
  executionHistory: SimulationStep[];
  errors: SimulationError[];
  metrics: SimulationMetrics;
  createdAt: number;
  updatedAt: number;
}

export interface AgentState {
  id: 'p1' | 'p2';
  name: string;
  status: 'active' | 'idle' | 'stuck' | 'completed' | 'error';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  currentObjective: string;
  completedObjectives: string[];
  progress: number; // 0-100
  lastAction: string;
  lastActionTime: number;
  stuckCount: number;
  errorCount: number;
  systemPrompt?: SystemPrompt;
}

export interface EnvironmentState {
  sceneId: string;
  availableObjects: string[];
  physicsEnabled: boolean;
  timeElapsed: number;
  timeRemaining: number;
  phaseProgress: number;
}

export interface SimulationStep {
  id: string;
  timestamp: number;
  agentId: 'p1' | 'p2';
  action: string;
  result: 'success' | 'failure' | 'partial';
  details: string;
  position: { x: number; y: number; z: number };
  objective?: string;
  duration: number;
}

export interface SimulationError {
  id: string;
  timestamp: number;
  type: 'movement' | 'physics' | 'ai' | 'system' | 'timeout';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  agentId?: 'p1' | 'p2';
  recoverable: boolean;
  resolved: boolean;
  resolution?: string;
}

export interface SimulationMetrics {
  totalSteps: number;
  successfulSteps: number;
  failedSteps: number;
  averageStepDuration: number;
  totalDistanceTraveled: { p1: number; p2: number };
  objectivesCompleted: number;
  totalObjectives: number;
  efficiency: number; // 0-1
  collaborationScore: number; // 0-1
  errorRate: number; // 0-1
}

export interface SimulationConfig {
  maxDuration: number; // seconds
  maxSteps: number;
  timeoutThreshold: number; // seconds
  stuckThreshold: number; // consecutive failed moves
  errorThreshold: number; // max errors before failure
  updateInterval: number; // milliseconds
  enableLogging: boolean;
  enableMetrics: boolean;
}

export class SimulationStateManager {
  private state: SimulationState;
  private config: SimulationConfig;
  private updateInterval?: NodeJS.Timeout;
  private listeners: Map<string, (state: SimulationState) => void> = new Map();

  constructor(config?: Partial<SimulationConfig>) {
    this.config = {
      maxDuration: 0, // No timeout - let simulation run until goals are achieved
      maxSteps: 0, // No step limit
      timeoutThreshold: 30,
      stuckThreshold: 5,
      errorThreshold: 10,
      updateInterval: 1000, // 1 second
      enableLogging: true,
      enableMetrics: true,
      ...config
    };

    this.state = this.createInitialState();
  }

  /**
   * Initialize simulation with parsed goals
   */
  initializeSimulation(
    simulationName: string,
    parsedSimulation: ParsedSimulation,
    initialPositions?: { p1: { x: number; y: number; z: number }; p2: { x: number; y: number; z: number } }
  ): SimulationState {
    console.log('🚀 [SimulationStateManager] Initializing simulation...');
    console.log('📝 Name:', simulationName);
    console.log('🎯 Goals:', parsedSimulation.goals.length);

    this.state = {
      id: `sim_${Date.now()}`,
      name: simulationName,
      status: 'initializing',
      startTime: Date.now(),
      currentPhase: 0,
      totalPhases: parsedSimulation.timeline.phases.length,
      progress: 0,
      goals: parsedSimulation.goals,
      agentStates: {
        p1: this.createInitialAgentState('p1', parsedSimulation.agentRoles.p1, initialPositions?.p1),
        p2: this.createInitialAgentState('p2', parsedSimulation.agentRoles.p2, initialPositions?.p2)
      },
      environmentState: {
        sceneId: parsedSimulation.environment.scene,
        availableObjects: parsedSimulation.environment.availableObjects,
        physicsEnabled: parsedSimulation.environment.physicsEnabled,
        timeElapsed: 0,
        timeRemaining: parsedSimulation.timeline.estimatedTotalDuration,
        phaseProgress: 0
      },
      executionHistory: [],
      errors: [],
      metrics: this.createInitialMetrics(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.notifyListeners();
    return this.state;
  }

  /**
   * Start the simulation
   */
  startSimulation(): void {
    console.log('▶️ [SimulationStateManager] Starting simulation...');
    
    this.state.status = 'running';
    this.state.startTime = Date.now();
    this.state.updatedAt = Date.now();

    // Start update interval
    this.updateInterval = setInterval(() => {
      this.updateSimulationState();
    }, this.config.updateInterval);

    this.notifyListeners();
  }

  /**
   * Pause the simulation
   */
  pauseSimulation(): void {
    console.log('⏸️ [SimulationStateManager] Pausing simulation...');
    
    this.state.status = 'paused';
    this.state.updatedAt = Date.now();

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }

    this.notifyListeners();
  }

  /**
   * Resume the simulation
   */
  resumeSimulation(): void {
    console.log('▶️ [SimulationStateManager] Resuming simulation...');
    
    this.state.status = 'running';
    this.state.updatedAt = Date.now();

    // Restart update interval
    this.updateInterval = setInterval(() => {
      this.updateSimulationState();
    }, this.config.updateInterval);

    this.notifyListeners();
  }

  /**
   * Stop the simulation
   */
  stopSimulation(reason: 'completed' | 'failed' | 'user_stop' = 'user_stop'): void {
    console.log('⏹️ [SimulationStateManager] Stopping simulation...', reason);
    
    this.state.status = reason === 'completed' ? 'completed' : 'failed';
    this.state.endTime = Date.now();
    this.state.updatedAt = Date.now();

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }

    // Calculate final metrics
    this.calculateFinalMetrics();

    this.notifyListeners();
  }

  /**
   * Update agent state after an action
   */
  updateAgentState(
    agentId: 'p1' | 'p2',
    action: string,
    result: 'success' | 'failure' | 'partial',
    newPosition: { x: number; y: number; z: number },
    newVelocity: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    objective?: string
  ): void {
    const agentState = this.state.agentStates[agentId];
    const previousPosition = { ...agentState.position };

    // Update agent state
    agentState.lastAction = action;
    agentState.lastActionTime = Date.now();
    agentState.position = newPosition;
    agentState.velocity = newVelocity;

    if (objective) {
      agentState.currentObjective = objective;
    }

    // Handle result
    if (result === 'success') {
      agentState.stuckCount = 0;
      if (objective && !agentState.completedObjectives.includes(objective)) {
        agentState.completedObjectives.push(objective);
      }
    } else if (result === 'failure') {
      agentState.stuckCount++;
      agentState.errorCount++;
    }

    // Update agent status
    if (agentState.stuckCount >= this.config.stuckThreshold) {
      agentState.status = 'stuck';
    } else if (agentState.errorCount >= this.config.errorThreshold) {
      agentState.status = 'error';
    } else {
      agentState.status = 'active';
    }

    // Record step
    const step: SimulationStep = {
      id: `step_${Date.now()}_${agentId}`,
      timestamp: Date.now(),
      agentId: agentId,
      action: action,
      result: result,
      details: `${action} - ${result}`,
      position: newPosition,
      objective: objective,
      duration: Date.now() - agentState.lastActionTime
    };

    this.state.executionHistory.push(step);

    // Calculate distance traveled
    const distance = this.calculateDistance(previousPosition, newPosition);
    this.state.metrics.totalDistanceTraveled[agentId] += distance;

    this.state.updatedAt = Date.now();
    this.notifyListeners();
  }

  /**
   * Record an error
   */
  recordError(
    type: SimulationError['type'],
    message: string,
    severity: SimulationError['severity'] = 'medium',
    agentId?: 'p1' | 'p2',
    recoverable: boolean = true
  ): void {
    const error: SimulationError = {
      id: `error_${Date.now()}`,
      timestamp: Date.now(),
      type: type,
      severity: severity,
      message: message,
      agentId: agentId,
      recoverable: recoverable,
      resolved: false
    };

    this.state.errors.push(error);

    // Update agent error count if applicable
    if (agentId) {
      this.state.agentStates[agentId].errorCount++;
    }

    console.error(`❌ [SimulationStateManager] Error recorded:`, error);
    this.state.updatedAt = Date.now();
    this.notifyListeners();
  }

  /**
   * Update system prompt for an agent
   */
  updateAgentSystemPrompt(agentId: 'p1' | 'p2', systemPrompt: SystemPrompt): void {
    this.state.agentStates[agentId].systemPrompt = systemPrompt;
    this.state.updatedAt = Date.now();
    this.notifyListeners();
  }

  /**
   * Get current simulation state
   */
  getState(): SimulationState {
    return { ...this.state };
  }

  /**
   * Get agent status for external use
   */
  getAgentStatus(agentId: 'p1' | 'p2'): AgentStatus {
    const agentState = this.state.agentStates[agentId];
    return {
      id: agentId,
      name: agentState.name,
      position: agentState.position,
      status: agentState.status,
      currentObjective: agentState.currentObjective,
      progress: agentState.progress
    };
  }

  /**
   * Check if simulation should continue
   */
  shouldContinue(): boolean {
    // Check if simulation is still running
    if (this.state.status !== 'running') {
      return false;
    }

    // Check if all agents are stuck or in error
    const agentsStuck = Object.values(this.state.agentStates).every(
      agent => agent.status === 'stuck' || agent.status === 'error'
    );

    if (agentsStuck) {
      this.recordError('system', 'All agents are stuck or in error state', 'critical');
      this.stopSimulation('failed');
      return false;
    }

    return true;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listenerId: string, callback: (state: SimulationState) => void): void {
    this.listeners.set(listenerId, callback);
  }

  /**
   * Unsubscribe from state changes
   */
  unsubscribe(listenerId: string): void {
    this.listeners.delete(listenerId);
  }

  /**
   * Update simulation state (called by interval)
   */
  private updateSimulationState(): void {
    if (this.state.status !== 'running') {
      return;
    }

    // Update time
    const elapsed = (Date.now() - this.state.startTime) / 1000;
    this.state.environmentState.timeElapsed = elapsed;
    this.state.environmentState.timeRemaining = 0; // No time limit

    // Update progress
    this.calculateProgress();

    // Update metrics
    this.updateMetrics();

    this.state.updatedAt = Date.now();
    this.notifyListeners();

    // Check if simulation should continue
    if (!this.shouldContinue()) {
      return;
    }
  }

  /**
   * Calculate overall simulation progress
   */
  private calculateProgress(): void {
    const totalObjectives = this.state.goals.reduce((sum, goal) => sum + goal.objectives.length, 0);
    const completedObjectives = Object.values(this.state.agentStates).reduce(
      (sum, agent) => sum + agent.completedObjectives.length, 0
    );

    this.state.progress = totalObjectives > 0 ? (completedObjectives / totalObjectives) * 100 : 0;

    // Update individual agent progress
    Object.values(this.state.agentStates).forEach(agent => {
      const agentObjectives = this.state.goals.reduce((sum, goal) => {
        return sum + goal.objectives.filter(obj => 
          obj.target === agent.id || obj.target === 'both'
        ).length;
      }, 0);

      agent.progress = agentObjectives > 0 ? (agent.completedObjectives.length / agentObjectives) * 100 : 0;
    });
  }

  /**
   * Update simulation metrics
   */
  private updateMetrics(): void {
    const metrics = this.state.metrics;
    const history = this.state.executionHistory;

    metrics.totalSteps = history.length;
    metrics.successfulSteps = history.filter(step => step.result === 'success').length;
    metrics.failedSteps = history.filter(step => step.result === 'failure').length;
    metrics.averageStepDuration = history.length > 0 
      ? history.reduce((sum, step) => sum + step.duration, 0) / history.length 
      : 0;

    metrics.objectivesCompleted = Object.values(this.state.agentStates).reduce(
      (sum, agent) => sum + agent.completedObjectives.length, 0
    );
    metrics.totalObjectives = this.state.goals.reduce((sum, goal) => sum + goal.objectives.length, 0);

    metrics.efficiency = metrics.totalSteps > 0 ? metrics.successfulSteps / metrics.totalSteps : 0;
    metrics.errorRate = metrics.totalSteps > 0 ? metrics.failedSteps / metrics.totalSteps : 0;

    // Calculate collaboration score (simplified)
    const p1Actions = history.filter(step => step.agentId === 'p1').length;
    const p2Actions = history.filter(step => step.agentId === 'p2').length;
    const totalActions = p1Actions + p2Actions;
    
    if (totalActions > 0) {
      const balance = 1 - Math.abs(p1Actions - p2Actions) / totalActions;
      metrics.collaborationScore = balance;
    }
  }

  /**
   * Calculate final metrics when simulation ends
   */
  private calculateFinalMetrics(): void {
    this.updateMetrics();
    
    // Add final calculations
    const duration = this.state.endTime ? (this.state.endTime - this.state.startTime) / 1000 : 0;
    this.state.metrics.averageStepDuration = duration / Math.max(1, this.state.metrics.totalSteps);
  }

  /**
   * Create initial state
   */
  private createInitialState(): SimulationState {
    return {
      id: '',
      name: '',
      status: 'idle',
      startTime: 0,
      currentPhase: 0,
      totalPhases: 0,
      progress: 0,
      goals: [],
      agentStates: {
        p1: this.createInitialAgentState('p1', { name: 'Grok', personality: '', primaryObjectives: [], capabilities: [], constraints: [] }),
        p2: this.createInitialAgentState('p2', { name: 'ChatGPT', personality: '', primaryObjectives: [], capabilities: [], constraints: [] })
      },
      environmentState: {
        sceneId: '',
        availableObjects: [],
        physicsEnabled: true,
        timeElapsed: 0,
        timeRemaining: 0,
        phaseProgress: 0
      },
      executionHistory: [],
      errors: [],
      metrics: this.createInitialMetrics(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  /**
   * Create initial agent state
   */
  private createInitialAgentState(agentId: 'p1' | 'p2', role: any, position?: { x: number; y: number; z: number }): AgentState {
    return {
      id: agentId,
      name: role.name || (agentId === 'p1' ? 'Grok' : 'ChatGPT'),
      status: 'idle',
      position: position || { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      currentObjective: '',
      completedObjectives: [],
      progress: 0,
      lastAction: '',
      lastActionTime: Date.now(),
      stuckCount: 0,
      errorCount: 0
    };
  }

  /**
   * Create initial metrics
   */
  private createInitialMetrics(): SimulationMetrics {
    return {
      totalSteps: 0,
      successfulSteps: 0,
      failedSteps: 0,
      averageStepDuration: 0,
      totalDistanceTraveled: { p1: 0, p2: 0 },
      objectivesCompleted: 0,
      totalObjectives: 0,
      efficiency: 0,
      collaborationScore: 0,
      errorRate: 0
    };
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(pos1: { x: number; y: number; z: number }, pos2: { x: number; y: number; z: number }): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const dz = pos2.z - pos1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.state);
      } catch (error) {
        console.error('❌ [SimulationStateManager] Listener error:', error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
    this.listeners.clear();
  }
}

// Singleton instance
let simulationStateManagerInstance: SimulationStateManager | null = null;

export const getSimulationStateManager = (): SimulationStateManager => {
  if (!simulationStateManagerInstance) {
    simulationStateManagerInstance = new SimulationStateManager();
  }
  return simulationStateManagerInstance;
};
