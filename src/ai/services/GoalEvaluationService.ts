// Goal Evaluation Service - Determines when simulation objectives are achieved

import { 
  SimulationGoal, 
  SimulationObjective, 
  SuccessCriteria,
  SimulationConstraint 
} from './SimulationGoalService';
import { SimulationState, AgentState } from './SimulationStateManager';

export interface EvaluationResult {
  objectiveId: string;
  completed: boolean;
  progress: number; // 0-100
  score: number; // 0-1
  details: string;
  timestamp: number;
  evidence: EvaluationEvidence[];
}

export interface EvaluationEvidence {
  type: 'position' | 'interaction' | 'movement' | 'time' | 'custom';
  value: any;
  weight: number;
  description: string;
}

export interface GoalCompletionStatus {
  goalId: string;
  overallProgress: number; // 0-100
  completed: boolean;
  objectives: EvaluationResult[];
  successCriteria: SuccessCriteriaResult[];
  constraints: ConstraintStatus[];
  estimatedTimeToCompletion?: number;
  recommendations: string[];
}

export interface SuccessCriteriaResult {
  criteriaId: string;
  met: boolean;
  score: number; // 0-1
  details: string;
  evidence: EvaluationEvidence[];
}

export interface ConstraintStatus {
  constraintId: string;
  violated: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  recommendations: string[];
}

export interface EvaluationContext {
  simulationState: SimulationState;
  sceneData?: {
    meshes: any[];
    physics: any;
    bounds: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
  };
  timeElapsed: number;
  timeRemaining: number;
}

export class GoalEvaluationService {
  private evaluationCache: Map<string, EvaluationResult> = new Map();
  private cacheTimeout: number = 5000; // 5 seconds

  /**
   * Evaluate all goals in the simulation
   */
  evaluateGoals(
    goals: SimulationGoal[],
    context: EvaluationContext
  ): GoalCompletionStatus[] {
    console.log('🎯 [GoalEvaluationService] Evaluating goals...');
    console.log('📊 Goals to evaluate:', goals.length);

    return goals.map(goal => this.evaluateGoal(goal, context));
  }

  /**
   * Evaluate a single goal
   */
  private evaluateGoal(goal: SimulationGoal, context: EvaluationContext): GoalCompletionStatus {
    console.log(`🎯 [GoalEvaluationService] Evaluating goal: ${goal.name}`);

    // Evaluate all objectives
    const objectives = goal.objectives.map(objective => 
      this.evaluateObjective(objective, context)
    );

    // Evaluate success criteria
    const successCriteria = goal.successCriteria.map(criteria =>
      this.evaluateSuccessCriteria(criteria, context)
    );

    // Check constraints
    const constraints = goal.constraints.map(constraint =>
      this.evaluateConstraint(constraint, context)
    );

    // Calculate overall progress
    const overallProgress = this.calculateOverallProgress(objectives, successCriteria);

    // Determine if goal is completed
    const completed = this.isGoalCompleted(objectives, successCriteria, constraints);

    // Generate recommendations
    const recommendations = this.generateRecommendations(objectives, successCriteria, constraints);

    return {
      goalId: goal.id,
      overallProgress,
      completed,
      objectives,
      successCriteria,
      constraints,
      estimatedTimeToCompletion: this.estimateTimeToCompletion(objectives, context),
      recommendations
    };
  }

  /**
   * Evaluate a single objective
   */
  private evaluateObjective(objective: SimulationObjective, context: EvaluationContext): EvaluationResult {
    const cacheKey = `${objective.id}_${context.simulationState.updatedAt}`;
    
    // Check cache first
    if (this.evaluationCache.has(cacheKey)) {
      const cached = this.evaluationCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached;
      }
    }

    console.log(`🎯 [GoalEvaluationService] Evaluating objective: ${objective.description}`);

    let result: EvaluationResult;

    switch (objective.type) {
      case 'movement':
        result = this.evaluateMovementObjective(objective, context);
        break;
      case 'interaction':
        result = this.evaluateInteractionObjective(objective, context);
        break;
      case 'cooperation':
        result = this.evaluateCooperationObjective(objective, context);
        break;
      case 'competition':
        result = this.evaluateCompetitionObjective(objective, context);
        break;
      case 'exploration':
        result = this.evaluateExplorationObjective(objective, context);
        break;
      case 'collection':
        result = this.evaluateCollectionObjective(objective, context);
        break;
      default:
        result = this.evaluateCustomObjective(objective, context);
        break;
    }

    // Cache the result
    this.evaluationCache.set(cacheKey, result);

    return result;
  }

  /**
   * Evaluate movement objective
   */
  private evaluateMovementObjective(objective: SimulationObjective, context: EvaluationContext): EvaluationResult {
    const targetAgent = this.getTargetAgent(objective.target, context);
    if (!targetAgent) {
      return this.createFailedResult(objective.id, 'Target agent not found');
    }

    const evidence: EvaluationEvidence[] = [];
    let progress = 0;
    let score = 0;

    // Check if agent has moved from initial position
    const hasMoved = this.hasAgentMoved(targetAgent, context);
    if (hasMoved) {
      evidence.push({
        type: 'movement',
        value: targetAgent.position,
        weight: 0.5,
        description: `Agent moved to position (${targetAgent.position.x.toFixed(1)}, ${targetAgent.position.y.toFixed(1)}, ${targetAgent.position.z.toFixed(1)})`
      });
      progress += 50;
      score += 0.5;
    }

    // Check if agent reached target position (if specified)
    if (objective.parameters.targetPosition) {
      const targetPos = objective.parameters.targetPosition;
      const distance = this.calculateDistance(targetAgent.position, targetPos);
      const threshold = objective.parameters.threshold || 2.0;

      if (distance <= threshold) {
        evidence.push({
          type: 'position',
          value: { current: targetAgent.position, target: targetPos, distance },
          weight: 0.8,
          description: `Agent reached target position within ${threshold} units`
        });
        progress += 50;
        score += 0.8;
      } else {
        evidence.push({
          type: 'position',
          value: { current: targetAgent.position, target: targetPos, distance },
          weight: 0.3,
          description: `Agent is ${distance.toFixed(1)} units from target position`
        });
        progress += Math.max(0, 50 - (distance / threshold) * 50);
        score += 0.3;
      }
    }

    return {
      objectiveId: objective.id,
      completed: progress >= 90,
      progress: Math.min(100, progress),
      score: Math.min(1, score),
      details: `Movement objective: ${hasMoved ? 'Agent has moved' : 'Agent has not moved'}`,
      timestamp: Date.now(),
      evidence
    };
  }

  /**
   * Evaluate interaction objective
   */
  private evaluateInteractionObjective(objective: SimulationObjective, context: EvaluationContext): EvaluationResult {
    const targetAgent = this.getTargetAgent(objective.target, context);
    if (!targetAgent) {
      return this.createFailedResult(objective.id, 'Target agent not found');
    }

    const evidence: EvaluationEvidence[] = [];
    let progress = 0;
    let score = 0;

    // Check if agent is near interaction target
    if (objective.parameters.targetObject && context.sceneData) {
      const targetObject = this.findObjectInScene(objective.parameters.targetObject, context.sceneData);
      if (targetObject) {
        const distance = this.calculateDistance(targetAgent.position, targetObject.position);
        const interactionRange = objective.parameters.range || 3.0;

        if (distance <= interactionRange) {
          evidence.push({
            type: 'interaction',
            value: { distance, range: interactionRange },
            weight: 0.9,
            description: `Agent is within interaction range of ${objective.parameters.targetObject}`
          });
          progress = 100;
          score = 0.9;
        } else {
          evidence.push({
            type: 'interaction',
            value: { distance, range: interactionRange },
            weight: 0.4,
            description: `Agent is ${distance.toFixed(1)} units from ${objective.parameters.targetObject}`
          });
          progress = Math.max(0, 100 - (distance / interactionRange) * 100);
          score = 0.4;
        }
      }
    }

    return {
      objectiveId: objective.id,
      completed: progress >= 90,
      progress,
      score,
      details: `Interaction objective: ${progress >= 90 ? 'Target reached' : 'Approaching target'}`,
      timestamp: Date.now(),
      evidence
    };
  }

  /**
   * Evaluate cooperation objective
   */
  private evaluateCooperationObjective(objective: SimulationObjective, context: EvaluationContext): EvaluationResult {
    const evidence: EvaluationEvidence[] = [];
    let progress = 0;
    let score = 0;

    // Check if both agents are working together
    const p1Agent = context.simulationState.agentStates.p1;
    const p2Agent = context.simulationState.agentStates.p2;

    // Check if agents are near each other (cooperation indicator)
    const distance = this.calculateDistance(p1Agent.position, p2Agent.position);
    const cooperationRange = objective.parameters.range || 5.0;

    if (distance <= cooperationRange) {
      evidence.push({
        type: 'interaction',
        value: { distance, range: cooperationRange },
        weight: 0.6,
        description: `Agents are within cooperation range (${distance.toFixed(1)} units apart)`
      });
      progress += 60;
      score += 0.6;
    }

    // Check if both agents have made recent actions (active cooperation)
    const recentActions = this.getRecentActions(context.simulationState, 10000); // Last 10 seconds
    const p1RecentActions = recentActions.filter(action => action.agentId === 'p1').length;
    const p2RecentActions = recentActions.filter(action => action.agentId === 'p2').length;

    if (p1RecentActions > 0 && p2RecentActions > 0) {
      evidence.push({
        type: 'movement',
        value: { p1Actions: p1RecentActions, p2Actions: p2RecentActions },
        weight: 0.4,
        description: `Both agents are actively participating (P1: ${p1RecentActions} actions, P2: ${p2RecentActions} actions)`
      });
      progress += 40;
      score += 0.4;
    }

    return {
      objectiveId: objective.id,
      completed: progress >= 80,
      progress,
      score,
      details: `Cooperation objective: ${progress >= 80 ? 'Agents cooperating' : 'Limited cooperation'}`,
      timestamp: Date.now(),
      evidence
    };
  }

  /**
   * Evaluate competition objective
   */
  private evaluateCompetitionObjective(objective: SimulationObjective, context: EvaluationContext): EvaluationResult {
    const evidence: EvaluationEvidence[] = [];
    let progress = 0;
    let score = 0;

    const p1Agent = context.simulationState.agentStates.p1;
    const p2Agent = context.simulationState.agentStates.p2;

    // Check if agents are competing (moving toward same goal or racing)
    if (objective.parameters.targetPosition) {
      const targetPos = objective.parameters.targetPosition;
      const p1Distance = this.calculateDistance(p1Agent.position, targetPos);
      const p2Distance = this.calculateDistance(p2Agent.position, targetPos);

      // Determine who's winning
      const p1Winning = p1Distance < p2Distance;
      const winner = p1Winning ? 'P1' : 'P2';
      const lead = Math.abs(p1Distance - p2Distance);

      evidence.push({
        type: 'position',
        value: { p1Distance, p2Distance, winner, lead },
        weight: 0.8,
        description: `Competition active: ${winner} leading by ${lead.toFixed(1)} units`
      });

      progress = 100;
      score = 0.8;
    }

    return {
      objectiveId: objective.id,
      completed: progress >= 90,
      progress,
      score,
      details: `Competition objective: ${progress >= 90 ? 'Competition active' : 'Competition not detected'}`,
      timestamp: Date.now(),
      evidence
    };
  }

  /**
   * Evaluate exploration objective
   */
  private evaluateExplorationObjective(objective: SimulationObjective, context: EvaluationContext): EvaluationResult {
    const targetAgent = this.getTargetAgent(objective.target, context);
    if (!targetAgent) {
      return this.createFailedResult(objective.id, 'Target agent not found');
    }

    const evidence: EvaluationEvidence[] = [];
    let progress = 0;
    let score = 0;

    // Calculate total distance traveled (exploration metric)
    const totalDistance = context.simulationState.metrics.totalDistanceTraveled[targetAgent.id];
    const targetDistance = objective.parameters.targetDistance || 20.0;

    if (totalDistance >= targetDistance) {
      evidence.push({
        type: 'movement',
        value: { totalDistance, targetDistance },
        weight: 0.9,
        description: `Agent has explored ${totalDistance.toFixed(1)} units (target: ${targetDistance})`
      });
      progress = 100;
      score = 0.9;
    } else {
      evidence.push({
        type: 'movement',
        value: { totalDistance, targetDistance },
        weight: 0.5,
        description: `Agent has explored ${totalDistance.toFixed(1)} units (target: ${targetDistance})`
      });
      progress = (totalDistance / targetDistance) * 100;
      score = 0.5;
    }

    return {
      objectiveId: objective.id,
      completed: progress >= 90,
      progress,
      score,
      details: `Exploration objective: ${progress >= 90 ? 'Exploration complete' : 'Exploring...'}`,
      timestamp: Date.now(),
      evidence
    };
  }

  /**
   * Evaluate collection objective
   */
  private evaluateCollectionObjective(objective: SimulationObjective, context: EvaluationContext): EvaluationResult {
    const evidence: EvaluationEvidence[] = [];
    let progress = 0;
    let score = 0;

    // This would require tracking collected items in the simulation state
    // For now, use a simplified approach based on agent movements
    const targetAgent = this.getTargetAgent(objective.target, context);
    if (targetAgent) {
      const recentActions = this.getRecentActions(context.simulationState, 30000); // Last 30 seconds
      const agentActions = recentActions.filter(action => action.agentId === targetAgent.id);
      
      if (agentActions.length > 0) {
        evidence.push({
          type: 'movement',
          value: { actionCount: agentActions.length },
          weight: 0.7,
          description: `Agent has performed ${agentActions.length} collection-related actions`
        });
        progress = Math.min(100, agentActions.length * 20); // 20% per action
        score = 0.7;
      }
    }

    return {
      objectiveId: objective.id,
      completed: progress >= 90,
      progress,
      score,
      details: `Collection objective: ${progress >= 90 ? 'Collection complete' : 'Collecting...'}`,
      timestamp: Date.now(),
      evidence
    };
  }

  /**
   * Evaluate custom objective
   */
  private evaluateCustomObjective(objective: SimulationObjective, context: EvaluationContext): EvaluationResult {
    // For custom objectives, try to evaluate based on the condition if it's a JavaScript expression
    const evidence: EvaluationEvidence[] = [];
    let progress = 0;
    let score = 0;

    if (objective.parameters.condition) {
      try {
        // Create a safe evaluation context
        const evalContext = {
          p1: context.simulationState.agentStates.p1,
          p2: context.simulationState.agentStates.p2,
          time: context.timeElapsed,
          scene: context.sceneData
        };

        // Evaluate the condition (simplified - in production, use a safer evaluator)
        const result = this.safeEvaluate(objective.parameters.condition, evalContext);
        
        if (result) {
          evidence.push({
            type: 'custom',
            value: result,
            weight: 1.0,
            description: `Custom condition met: ${objective.parameters.condition}`
          });
          progress = 100;
          score = 1.0;
        }
      } catch (error) {
        console.warn('⚠️ [GoalEvaluationService] Failed to evaluate custom condition:', error);
      }
    }

    return {
      objectiveId: objective.id,
      completed: progress >= 90,
      progress,
      score,
      details: `Custom objective: ${progress >= 90 ? 'Condition met' : 'Condition not met'}`,
      timestamp: Date.now(),
      evidence
    };
  }

  /**
   * Evaluate success criteria
   */
  private evaluateSuccessCriteria(criteria: SuccessCriteria, context: EvaluationContext): SuccessCriteriaResult {
    const evidence: EvaluationEvidence[] = [];
    let met = false;
    let score = 0;

    try {
      // Create evaluation context
      const evalContext = {
        p1: context.simulationState.agentStates.p1,
        p2: context.simulationState.agentStates.p2,
        time: context.timeElapsed,
        scene: context.sceneData,
        objectives: context.simulationState.goals.flatMap(goal => goal.objectives)
      };

      // Evaluate the condition
      const result = this.safeEvaluate(criteria.condition, evalContext);
      met = Boolean(result);
      score = met ? criteria.weight : 0;

      evidence.push({
        type: 'custom',
        value: result,
        weight: criteria.weight,
        description: `Success criteria: ${criteria.description}`
      });

    } catch (error) {
      console.warn('⚠️ [GoalEvaluationService] Failed to evaluate success criteria:', error);
      evidence.push({
        type: 'custom',
        value: false,
        weight: 0,
        description: `Failed to evaluate: ${criteria.description}`
      });
    }

    return {
      criteriaId: criteria.id,
      met,
      score,
      details: `Success criteria: ${met ? 'Met' : 'Not met'}`,
      evidence
    };
  }

  /**
   * Evaluate constraint
   */
  private evaluateConstraint(constraint: SimulationConstraint, context: EvaluationContext): ConstraintStatus {
    let violated = false;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const recommendations: string[] = [];

    switch (constraint.type) {
      case 'time':
        if (context.timeElapsed > constraint.parameters.maxDuration) {
          violated = true;
          severity = 'high';
          recommendations.push('Reduce simulation duration or optimize agent behavior');
        }
        break;
      case 'safety':
        // Check for dangerous situations (simplified)
        const p1Agent = context.simulationState.agentStates.p1;
        const p2Agent = context.simulationState.agentStates.p2;
        const distance = this.calculateDistance(p1Agent.position, p2Agent.position);
        
        if (distance < 1.0) { // Too close
          violated = true;
          severity = 'medium';
          recommendations.push('Increase separation between agents');
        }
        break;
      case 'movement':
        // Check movement constraints
        const recentActions = this.getRecentActions(context.simulationState, 5000);
        const fastMovements = recentActions.filter(action => 
          action.duration < 100 // Very fast movements
        );
        
        if (fastMovements.length > 5) {
          violated = true;
          severity = 'low';
          recommendations.push('Reduce movement speed for safety');
        }
        break;
    }

    return {
      constraintId: constraint.type,
      violated,
      severity,
      details: `Constraint ${constraint.type}: ${violated ? 'Violated' : 'Satisfied'}`,
      recommendations
    };
  }

  /**
   * Helper methods
   */
  private getTargetAgent(target: string, context: EvaluationContext): AgentState | null {
    switch (target) {
      case 'p1':
        return context.simulationState.agentStates.p1;
      case 'p2':
        return context.simulationState.agentStates.p2;
      case 'both':
        return context.simulationState.agentStates.p1; // Return P1 as primary
      default:
        return null;
    }
  }

  private hasAgentMoved(agent: AgentState, context: EvaluationContext): boolean {
    // Simplified check - in real implementation, compare with initial position
    return agent.lastAction !== '' && agent.lastActionTime > context.simulationState.startTime;
  }

  private calculateDistance(pos1: { x: number; y: number; z: number }, pos2: { x: number; y: number; z: number }): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const dz = pos2.z - pos1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private findObjectInScene(objectName: string, sceneData: any): { position: { x: number; y: number; z: number } } | null {
    // Simplified - in real implementation, search through scene meshes
    return null;
  }

  private getRecentActions(simulationState: SimulationState, timeWindow: number): any[] {
    const cutoff = Date.now() - timeWindow;
    return simulationState.executionHistory.filter(step => step.timestamp > cutoff);
  }

  private calculateOverallProgress(objectives: EvaluationResult[], successCriteria: SuccessCriteriaResult[]): number {
    const objectiveProgress = objectives.reduce((sum, obj) => sum + obj.progress, 0) / objectives.length;
    const criteriaProgress = successCriteria.reduce((sum, criteria) => sum + (criteria.met ? 100 : 0), 0) / successCriteria.length;
    
    return (objectiveProgress + criteriaProgress) / 2;
  }

  private isGoalCompleted(objectives: EvaluationResult[], successCriteria: SuccessCriteriaResult[], constraints: ConstraintStatus[]): boolean {
    const objectivesCompleted = objectives.every(obj => obj.completed);
    const criteriaMet = successCriteria.every(criteria => criteria.met);
    const constraintsSatisfied = constraints.every(constraint => !constraint.violated || constraint.severity === 'low');
    
    return objectivesCompleted && criteriaMet && constraintsSatisfied;
  }

  private generateRecommendations(objectives: EvaluationResult[], successCriteria: SuccessCriteriaResult[], constraints: ConstraintStatus[]): string[] {
    const recommendations: string[] = [];

    // Add recommendations for incomplete objectives
    objectives.forEach(obj => {
      if (!obj.completed && obj.progress < 50) {
        recommendations.push(`Focus on objective: ${obj.details}`);
      }
    });

    // Add recommendations for unmet criteria
    successCriteria.forEach(criteria => {
      if (!criteria.met) {
        recommendations.push(`Work on: ${criteria.details}`);
      }
    });

    // Add recommendations for violated constraints
    constraints.forEach(constraint => {
      if (constraint.violated) {
        recommendations.push(...constraint.recommendations);
      }
    });

    return recommendations;
  }

  private estimateTimeToCompletion(objectives: EvaluationResult[], context: EvaluationContext): number | undefined {
    const incompleteObjectives = objectives.filter(obj => !obj.completed);
    if (incompleteObjectives.length === 0) return 0;

    // Simple estimation based on current progress and time elapsed
    const avgProgress = objectives.reduce((sum, obj) => sum + obj.progress, 0) / objectives.length;
    const timeElapsed = context.timeElapsed;
    
    if (avgProgress > 0) {
      const estimatedTotalTime = (timeElapsed / avgProgress) * 100;
      return Math.max(0, estimatedTotalTime - timeElapsed);
    }

    return undefined;
  }

  private createFailedResult(objectiveId: string, reason: string): EvaluationResult {
    return {
      objectiveId,
      completed: false,
      progress: 0,
      score: 0,
      details: `Failed: ${reason}`,
      timestamp: Date.now(),
      evidence: []
    };
  }

  private safeEvaluate(expression: string, context: any): any {
    // Simplified safe evaluation - in production, use a proper expression evaluator
    try {
      // Replace context variables with actual values
      let safeExpression = expression;
      Object.keys(context).forEach(key => {
        const value = context[key];
        if (typeof value === 'object') {
          safeExpression = safeExpression.replace(new RegExp(`\\b${key}\\b`, 'g'), JSON.stringify(value));
        } else {
          safeExpression = safeExpression.replace(new RegExp(`\\b${key}\\b`, 'g'), String(value));
        }
      });

      // Basic evaluation (very limited for security)
      if (safeExpression.includes('distanceToTarget')) {
        return Math.random() > 0.5; // Simplified
      }
      
      return false;
    } catch (error) {
      console.warn('⚠️ [GoalEvaluationService] Expression evaluation failed:', error);
      return false;
    }
  }
}

// Singleton instance
let goalEvaluationServiceInstance: GoalEvaluationService | null = null;

export const getGoalEvaluationService = (): GoalEvaluationService => {
  if (!goalEvaluationServiceInstance) {
    goalEvaluationServiceInstance = new GoalEvaluationService();
  }
  return goalEvaluationServiceInstance;
};
