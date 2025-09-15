// AI Agent Coordinator - Manages Grok and ChatGPT interactions and decision-making

import { getChatService } from './ChatService';
import { getCodeExecutionService } from './CodeExecutionService';
import { getSystemPromptGenerator, SystemPrompt, AgentStatus } from './SystemPromptGenerator';
import { getSimulationStateManager, SimulationState, AgentState } from './SimulationStateManager';
import { ParsedSimulation } from './SimulationGoalService';
import { getAPIConfig, getAPIStatus } from '../config/apiConfig';

export interface AgentDecision {
  agentId: 'p1' | 'p2';
  action: string;
  reasoning: string;
  confidence: number;
  movementCode?: string;
  timestamp: number;
}

export interface CoordinationStrategy {
  type: 'competitive' | 'collaborative' | 'independent' | 'adaptive';
  parameters: Record<string, any>;
  description: string;
}

export interface AgentInteraction {
  id: string;
  timestamp: number;
  initiator: 'p1' | 'p2';
  type: 'coordination' | 'competition' | 'assistance' | 'conflict';
  message: string;
  response?: string;
  outcome: 'success' | 'failure' | 'partial';
}

export interface CoordinationContext {
  simulationState: SimulationState;
  currentPhase: string;
  timeRemaining: number;
  objectives: string[];
  constraints: string[];
  environment: {
    scene: string;
    availableObjects: string[];
    physicsEnabled: boolean;
  };
}

export class AIAgentCoordinator {
  private chatService: any;
  private codeExecutionService: any;
  private systemPromptGenerator: any;
  private stateManager: any;
  private apiConfig: any;
  
  private coordinationStrategy: CoordinationStrategy;
  private interactionHistory: AgentInteraction[] = [];
  private decisionQueue: AgentDecision[] = [];
  private isProcessing: boolean = false;
  private lastDecisionTime: { p1: number; p2: number } = { p1: 0, p2: 0 };
  private decisionInterval: number = 2000; // 2 seconds between decisions

  constructor() {
    this.chatService = getChatService();
    this.codeExecutionService = getCodeExecutionService();
    this.systemPromptGenerator = getSystemPromptGenerator();
    this.stateManager = getSimulationStateManager();
    this.apiConfig = getAPIConfig();

    // Default coordination strategy
    this.coordinationStrategy = {
      type: 'adaptive',
      parameters: {
        collaborationThreshold: 0.7,
        competitionThreshold: 0.3,
        assistanceThreshold: 0.5
      },
      description: 'Adaptive coordination based on simulation context'
    };
  }

  /**
   * Initialize coordination for a simulation
   */
  async initializeCoordination(
    parsedSimulation: ParsedSimulation,
    initialPositions?: { p1: { x: number; y: number; z: number }; p2: { x: number; y: number; z: number } }
  ): Promise<void> {
    console.log('🤝 [AIAgentCoordinator] Initializing coordination...');

    // Determine coordination strategy based on simulation goals
    this.coordinationStrategy = this.determineCoordinationStrategy(parsedSimulation);

    // Generate initial system prompts for both agents
    const simulationState = this.stateManager.getState();
    const agentStatuses = {
      p1: this.stateManager.getAgentStatus('p1'),
      p2: this.stateManager.getAgentStatus('p2')
    };

    const systemPrompts = this.systemPromptGenerator.generateSystemPrompts(
      {
        goals: parsedSimulation.goals,
        agentRoles: parsedSimulation.agentRoles,
        environment: parsedSimulation.environment,
        timeline: parsedSimulation.timeline,
        currentPhase: 0,
        startTime: Date.now()
      },
      agentStatuses
    );

    // Update agent system prompts
    this.stateManager.updateAgentSystemPrompt('p1', systemPrompts.p1);
    this.stateManager.updateAgentSystemPrompt('p2', systemPrompts.p2);

    console.log('✅ [AIAgentCoordinator] Coordination initialized with strategy:', this.coordinationStrategy.type);
  }

  /**
   * Process decisions for both agents
   */
  async processAgentDecisions(): Promise<void> {
    if (this.isProcessing) {
      console.log('⏳ [AIAgentCoordinator] Already processing decisions, skipping...');
      return;
    }

    this.isProcessing = true;
    console.log('🧠 [AIAgentCoordinator] Processing agent decisions...');

    try {
      const currentTime = Date.now();
      const simulationState = this.stateManager.getState();

      // Check if simulation should continue
      if (!this.stateManager.shouldContinue()) {
        console.log('⏹️ [AIAgentCoordinator] Simulation should not continue, stopping...');
        this.isProcessing = false;
        return;
      }

      // Process decisions for both agents
      const decisions = await Promise.all([
        this.processAgentDecision('p1', currentTime),
        this.processAgentDecision('p2', currentTime)
      ]);

      // Filter out null decisions
      const validDecisions = decisions.filter(decision => decision !== null) as AgentDecision[];

      // Execute decisions
      for (const decision of validDecisions) {
        await this.executeDecision(decision);
      }

      // Update coordination based on decisions
      await this.updateCoordination(validDecisions);

    } catch (error) {
      console.error('❌ [AIAgentCoordinator] Error processing decisions:', error);
      this.stateManager.recordError('ai', `Decision processing failed: ${error}`, 'high');
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process decision for a specific agent
   */
  private async processAgentDecision(agentId: 'p1' | 'p2', currentTime: number): Promise<AgentDecision | null> {
    // Check if enough time has passed since last decision
    if (currentTime - this.lastDecisionTime[agentId] < this.decisionInterval) {
      return null;
    }

    console.log(`🤖 [AIAgentCoordinator] Processing decision for ${agentId}...`);

    try {
      const agentState = this.stateManager.getState().agentStates[agentId];
      const systemPrompt = agentState.systemPrompt;

      if (!systemPrompt) {
        console.warn(`⚠️ [AIAgentCoordinator] No system prompt for ${agentId}`);
        return null;
      }

      // Build context for the agent
      const context = this.buildAgentContext(agentId);

      // Get AI response
      const response = await this.getAIResponse(agentId, systemPrompt.prompt, context);

      if (!response) {
        console.warn(`⚠️ [AIAgentCoordinator] No response from ${agentId}`);
        return null;
      }

      // Parse the response
      const decision = this.parseAgentResponse(agentId, response, context);

      if (decision) {
        this.lastDecisionTime[agentId] = currentTime;
        this.decisionQueue.push(decision);
      }

      return decision;

    } catch (error) {
      console.error(`❌ [AIAgentCoordinator] Error processing decision for ${agentId}:`, error);
      this.stateManager.recordError('ai', `Decision processing failed for ${agentId}: ${error}`, 'medium', agentId);
      return null;
    }
  }

  /**
   * Get AI response for an agent
   */
  private async getAIResponse(agentId: 'p1' | 'p2', prompt: string, context: any): Promise<string | null> {
    try {
      const apiStatus = getAPIStatus(this.apiConfig);

      if (apiStatus.hasValidKey && apiStatus.provider === 'openai') {
        // Use OpenAI API
        console.log(`🤖 [AIAgentCoordinator] Using OpenAI for ${agentId}...`);
        return await this.callOpenAI(prompt, agentId);
      } else {
        // Use local chat service
        console.log(`🔧 [AIAgentCoordinator] Using local service for ${agentId}...`);
        const response = await this.chatService.sendMessage(prompt, {
          systemLog: true,
          timestamp: new Date().toISOString(),
          sceneInfo: {
            currentScene: context.environment.scene,
            selectedCube: agentId === 'p1' ? 'red' : 'blue'
          },
          role: agentId
        });

        return response.message.content;
      }

    } catch (error) {
      console.error(`❌ [AIAgentCoordinator] Error getting AI response for ${agentId}:`, error);
      return null;
    }
  }

  /**
   * Call OpenAI API directly
   */
  private async callOpenAI(prompt: string, agentId: 'p1' | 'p2'): Promise<string | null> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiConfig.config.openai.apiKey}`
        },
        body: JSON.stringify({
          model: this.apiConfig.config.openai.model || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are ${agentId === 'p1' ? 'Grok' : 'ChatGPT'}, an AI agent in a 3D simulation. Always provide both analysis and movement code.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;

    } catch (error) {
      console.error(`❌ [AIAgentCoordinator] OpenAI API call failed for ${agentId}:`, error);
      return null;
    }
  }

  /**
   * Parse agent response into a decision
   */
  private parseAgentResponse(agentId: 'p1' | 'p2', response: string, context: any): AgentDecision | null {
    try {
      // Extract movement code from response
      const codeMatch = response.match(/```javascript\n([\s\S]*?)\n```/);
      const movementCode = codeMatch ? codeMatch[1].trim() : '';

      // Extract reasoning (everything before the code block)
      const reasoning = response.replace(/```javascript[\s\S]*?```/g, '').trim();

      // Determine action from movement code
      const action = this.extractActionFromCode(movementCode);

      // Calculate confidence based on response quality
      const confidence = this.calculateConfidence(response, movementCode);

      return {
        agentId: agentId,
        action: action,
        reasoning: reasoning,
        confidence: confidence,
        movementCode: movementCode,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error(`❌ [AIAgentCoordinator] Error parsing response for ${agentId}:`, error);
      return null;
    }
  }

  /**
   * Execute a decision
   */
  private async executeDecision(decision: AgentDecision): Promise<void> {
    console.log(`⚡ [AIAgentCoordinator] Executing decision for ${decision.agentId}: ${decision.action}`);

    try {
      if (!decision.movementCode) {
        console.warn(`⚠️ [AIAgentCoordinator] No movement code for ${decision.agentId}`);
        return;
      }

      // Get current agent state
      const agentState = this.stateManager.getState().agentStates[decision.agentId];
      const previousPosition = { ...agentState.position };

      // Execute the movement code
      const executionResult = await this.codeExecutionService.executeCode(
        decision.movementCode,
        {
          scene: (window as any).scene,
          cubePhysics: decision.agentId === 'p1' ? (window as any).cubePhysics : (window as any).p2CubePhysics,
          p2CubePhysics: (window as any).p2CubePhysics,
          originalPositions: {
            p1: previousPosition,
            p2: this.stateManager.getState().agentStates.p2.position
          }
        }
      );

      // Get new position (simplified - in real implementation, get from physics)
      const newPosition = this.estimateNewPosition(previousPosition, decision.action);

      // Determine result
      let result: 'success' | 'failure' | 'partial' = 'success';
      if (executionResult.success === false) {
        result = 'failure';
      } else if (executionResult.warnings && executionResult.warnings.length > 0) {
        result = 'partial';
      }

      // Update agent state
      this.stateManager.updateAgentState(
        decision.agentId,
        decision.action,
        result,
        newPosition,
        { x: 0, y: 0, z: 0 }, // Simplified velocity
        decision.agentId === 'p1' ? 'P1 Objective' : 'P2 Objective'
      );

      console.log(`✅ [AIAgentCoordinator] Decision executed for ${decision.agentId}: ${result}`);

    } catch (error) {
      console.error(`❌ [AIAgentCoordinator] Error executing decision for ${decision.agentId}:`, error);
      this.stateManager.recordError('movement', `Failed to execute decision: ${error}`, 'medium', decision.agentId);
    }
  }

  /**
   * Update coordination based on recent decisions
   */
  private async updateCoordination(decisions: AgentDecision[]): Promise<void> {
    if (decisions.length === 0) return;

    console.log('🤝 [AIAgentCoordinator] Updating coordination...');

    // Analyze decisions for coordination opportunities
    const coordinationOpportunities = this.analyzeCoordinationOpportunities(decisions);

    // Record interactions
    for (const opportunity of coordinationOpportunities) {
      this.recordInteraction(opportunity);
    }

    // Update coordination strategy if needed
    this.adaptCoordinationStrategy(decisions);
  }

  /**
   * Build context for an agent
   */
  private buildAgentContext(agentId: 'p1' | 'p2'): CoordinationContext {
    const simulationState = this.stateManager.getState();
    const otherAgentId = agentId === 'p1' ? 'p2' : 'p1';

    return {
      simulationState: simulationState,
      currentPhase: simulationState.goals[0]?.name || 'Unknown',
      timeRemaining: simulationState.environmentState.timeRemaining,
      objectives: simulationState.goals.flatMap((goal: any) => goal.objectives.map((obj: any) => obj.description)),
      constraints: simulationState.goals.flatMap((goal: any) => goal.constraints.map((constraint: any) => constraint.description)),
      environment: {
        scene: simulationState.environmentState.sceneId,
        availableObjects: simulationState.environmentState.availableObjects,
        physicsEnabled: simulationState.environmentState.physicsEnabled
      }
    };
  }

  /**
   * Determine coordination strategy based on simulation goals
   */
  private determineCoordinationStrategy(parsedSimulation: ParsedSimulation): CoordinationStrategy {
    const goals = parsedSimulation.goals;
    const hasCompetition = goals.some(goal => 
      goal.objectives.some(obj => obj.type === 'competition')
    );
    const hasCooperation = goals.some(goal => 
      goal.objectives.some(obj => obj.type === 'cooperation')
    );

    if (hasCompetition && !hasCooperation) {
      return {
        type: 'competitive',
        parameters: { competitionLevel: 0.8 },
        description: 'Competitive coordination for racing/competition scenarios'
      };
    } else if (hasCooperation && !hasCompetition) {
      return {
        type: 'collaborative',
        parameters: { collaborationLevel: 0.8 },
        description: 'Collaborative coordination for teamwork scenarios'
      };
    } else if (hasCompetition && hasCooperation) {
      return {
        type: 'adaptive',
        parameters: { 
          competitionThreshold: 0.5,
          collaborationThreshold: 0.5
        },
        description: 'Adaptive coordination for mixed scenarios'
      };
    } else {
      return {
        type: 'independent',
        parameters: { independenceLevel: 0.9 },
        description: 'Independent coordination for parallel objectives'
      };
    }
  }

  /**
   * Extract action from movement code
   */
  private extractActionFromCode(code: string): string {
    if (!code) return 'no-action';

    const lowerCode = code.toLowerCase();
    
    if (lowerCode.includes('forward')) return 'move-forward';
    if (lowerCode.includes('backward')) return 'move-backward';
    if (lowerCode.includes('left')) return 'move-left';
    if (lowerCode.includes('right')) return 'move-right';
    if (lowerCode.includes('up') || lowerCode.includes('jump')) return 'jump';
    if (lowerCode.includes('down')) return 'move-down';
    
    return 'complex-movement';
  }

  /**
   * Calculate confidence in the decision
   */
  private calculateConfidence(response: string, movementCode: string): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence if response is detailed
    if (response.length > 100) confidence += 0.1;
    if (response.length > 200) confidence += 0.1;

    // Increase confidence if movement code is present
    if (movementCode) confidence += 0.2;

    // Increase confidence if movement code is valid
    if (movementCode && movementCode.includes('Move')) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  /**
   * Estimate new position based on action
   */
  private estimateNewPosition(currentPosition: { x: number; y: number; z: number }, action: string): { x: number; y: number; z: number } {
    const stepSize = 1.0; // Simplified step size
    const newPosition = { ...currentPosition };

    switch (action) {
      case 'move-forward':
        newPosition.x += stepSize;
        break;
      case 'move-backward':
        newPosition.x -= stepSize;
        break;
      case 'move-left':
        newPosition.z -= stepSize;
        break;
      case 'move-right':
        newPosition.z += stepSize;
        break;
      case 'jump':
        newPosition.y += stepSize;
        break;
      case 'move-down':
        newPosition.y -= stepSize;
        break;
      default:
        // No position change for unknown actions
        break;
    }

    return newPosition;
  }

  /**
   * Analyze coordination opportunities
   */
  private analyzeCoordinationOpportunities(decisions: AgentDecision[]): AgentInteraction[] {
    const interactions: AgentInteraction[] = [];

    if (decisions.length >= 2) {
      const p1Decision = decisions.find(d => d.agentId === 'p1');
      const p2Decision = decisions.find(d => d.agentId === 'p2');

      if (p1Decision && p2Decision) {
        // Check for coordination opportunities
        if (this.coordinationStrategy.type === 'collaborative') {
          interactions.push({
            id: `interaction_${Date.now()}`,
            timestamp: Date.now(),
            initiator: 'p1',
            type: 'coordination',
            message: 'Coordinating with P2 for collaborative goal',
            outcome: 'success'
          });
        } else if (this.coordinationStrategy.type === 'competitive') {
          interactions.push({
            id: `interaction_${Date.now()}`,
            timestamp: Date.now(),
            initiator: 'p1',
            type: 'competition',
            message: 'Competing with P2 for goal achievement',
            outcome: 'success'
          });
        }
      }
    }

    return interactions;
  }

  /**
   * Record an interaction
   */
  private recordInteraction(interaction: AgentInteraction): void {
    this.interactionHistory.push(interaction);
    
    // Keep only recent interactions (last 100)
    if (this.interactionHistory.length > 100) {
      this.interactionHistory = this.interactionHistory.slice(-100);
    }
  }

  /**
   * Adapt coordination strategy based on decisions
   */
  private adaptCoordinationStrategy(decisions: AgentDecision[]): void {
    // Simple adaptation logic - can be expanded
    const avgConfidence = decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length;
    
    if (avgConfidence < 0.5) {
      // If confidence is low, try more collaborative approach
      if (this.coordinationStrategy.type !== 'collaborative') {
        console.log('🔄 [AIAgentCoordinator] Adapting to collaborative strategy due to low confidence');
        this.coordinationStrategy = {
          type: 'collaborative',
          parameters: { collaborationLevel: 0.8 },
          description: 'Adapted to collaborative strategy'
        };
      }
    }
  }

  /**
   * Get coordination statistics
   */
  getCoordinationStats(): {
    strategy: CoordinationStrategy;
    totalInteractions: number;
    recentInteractions: AgentInteraction[];
    decisionQueue: number;
  } {
    return {
      strategy: this.coordinationStrategy,
      totalInteractions: this.interactionHistory.length,
      recentInteractions: this.interactionHistory.slice(-10),
      decisionQueue: this.decisionQueue.length
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.interactionHistory = [];
    this.decisionQueue = [];
    this.isProcessing = false;
  }
}

// Singleton instance
let aiAgentCoordinatorInstance: AIAgentCoordinator | null = null;

export const getAIAgentCoordinator = (): AIAgentCoordinator => {
  if (!aiAgentCoordinatorInstance) {
    aiAgentCoordinatorInstance = new AIAgentCoordinator();
  }
  return aiAgentCoordinatorInstance;
};
