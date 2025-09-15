// System Prompt Generator - Converts simulation goals into actionable AI instructions

import { 
  SimulationGoal, 
  SimulationObjective, 
  AgentRole, 
  EnvironmentContext,
  SimulationTimeline 
} from './SimulationGoalService';

export interface SystemPrompt {
  id: string;
  agentId: 'p1' | 'p2';
  agentName: string;
  prompt: string;
  objectives: string[];
  constraints: string[];
  capabilities: string[];
  personality: string;
  context: PromptContext;
  createdAt: number;
}

export interface PromptContext {
  scene: string;
  availableObjects: string[];
  physicsEnabled: boolean;
  currentPhase: string;
  timeRemaining: number;
  otherAgentStatus: AgentStatus;
}

export interface AgentStatus {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  status: 'active' | 'idle' | 'stuck' | 'completed' | 'error';
  currentObjective: string;
  progress: number;
}

export interface SimulationContext {
  goals: SimulationGoal[];
  agentRoles: { p1: AgentRole; p2: AgentRole };
  environment: EnvironmentContext;
  timeline: SimulationTimeline;
  currentPhase: number;
  startTime: number;
}

export class SystemPromptGenerator {
  private basePrompts: Map<string, string> = new Map();

  constructor() {
    this.initializeBasePrompts();
  }

  /**
   * Generate system prompts for both agents based on simulation goals
   */
  generateSystemPrompts(
    simulationContext: SimulationContext,
    agentStatuses: { p1: AgentStatus; p2: AgentStatus }
  ): { p1: SystemPrompt; p2: SystemPrompt } {
    console.log('🎭 [SystemPromptGenerator] Generating system prompts...');
    console.log('📊 Simulation Context:', simulationContext);
    console.log('👥 Agent Statuses:', agentStatuses);

    const p1Prompt = this.generateAgentPrompt(
      'p1',
      simulationContext,
      agentStatuses.p1,
      agentStatuses.p2
    );

    const p2Prompt = this.generateAgentPrompt(
      'p2',
      simulationContext,
      agentStatuses.p2,
      agentStatuses.p1
    );

    return {
      p1: p1Prompt,
      p2: p2Prompt
    };
  }

  /**
   * Generate system prompt for a specific agent
   */
  private generateAgentPrompt(
    agentId: 'p1' | 'p2',
    context: SimulationContext,
    agentStatus: AgentStatus,
    otherAgentStatus: AgentStatus
  ): SystemPrompt {
    const agentRole = context.agentRoles[agentId];
    const currentGoal = context.goals[0]; // For now, focus on primary goal
    const currentPhase = context.timeline.phases[context.currentPhase];

    const prompt = this.buildSystemPrompt(
      agentId,
      agentRole,
      currentGoal,
      currentPhase,
      context.environment,
      agentStatus,
      otherAgentStatus
    );

    return {
      id: `prompt_${agentId}_${Date.now()}`,
      agentId: agentId,
      agentName: agentRole.name,
      prompt: prompt,
      objectives: agentRole.primaryObjectives,
      constraints: agentRole.constraints,
      capabilities: agentRole.capabilities,
      personality: agentRole.personality,
      context: {
        scene: context.environment.scene,
        availableObjects: context.environment.availableObjects,
        physicsEnabled: context.environment.physicsEnabled,
        currentPhase: currentPhase.name,
        timeRemaining: this.calculateTimeRemaining(context),
        otherAgentStatus: otherAgentStatus
      },
      createdAt: Date.now()
    };
  }

  /**
   * Build the complete system prompt for an agent
   */
  private buildSystemPrompt(
    agentId: 'p1' | 'p2',
    agentRole: AgentRole,
    goal: SimulationGoal,
    phase: any,
    environment: EnvironmentContext,
    agentStatus: AgentStatus,
    otherAgentStatus: AgentStatus
  ): string {
    const basePrompt = this.getBasePrompt(agentId);
    const goalInstructions = this.buildGoalInstructions(goal, agentRole);
    const phaseInstructions = this.buildPhaseInstructions(phase);
    const environmentInstructions = this.buildEnvironmentInstructions(environment);
    const statusInstructions = this.buildStatusInstructions(agentStatus, otherAgentStatus);
    const movementInstructions = this.buildMovementInstructions(agentId);

    return `${basePrompt}

${goalInstructions}

${phaseInstructions}

${environmentInstructions}

${statusInstructions}

${movementInstructions}

RESPONSE FORMAT:
You MUST provide both:
1. A detailed analysis of the current situation and your plan
2. JavaScript movement code to execute your plan

Use this format:
\`\`\`javascript
// Your movement code here
// Examples:
// Move ${agentId === 'p1' ? 'red' : 'blue'} cube forward
// Move ${agentId === 'p1' ? 'red' : 'blue'} cube right
// Move ${agentId === 'p1' ? 'red' : 'blue'} cube jump
\`\`\`

Remember: You are ${agentRole.name} with a ${agentRole.personality} personality. Focus on your primary objectives while considering the overall simulation goals.`;
  }

  /**
   * Get base prompt for agent type
   */
  private getBasePrompt(agentId: 'p1' | 'p2'): string {
    return this.basePrompts.get(agentId) || this.basePrompts.get('default')!;
  }

  /**
   * Build goal-specific instructions
   */
  private buildGoalInstructions(goal: SimulationGoal, agentRole: AgentRole): string {
    let instructions = `\n🎯 SIMULATION GOAL: ${goal.name}\n`;
    instructions += `📝 Description: ${goal.description}\n\n`;

    instructions += `🎯 YOUR OBJECTIVES:\n`;
    goal.objectives.forEach((objective, index) => {
      if (objective.target === agentRole.name.toLowerCase() || objective.target === 'both') {
        instructions += `${index + 1}. ${objective.description} (Priority: ${objective.priority}/10)\n`;
      }
    });

    if (goal.constraints.length > 0) {
      instructions += `\n⚠️ CONSTRAINTS:\n`;
      goal.constraints.forEach((constraint, index) => {
        instructions += `${index + 1}. ${constraint.description} ${constraint.strict ? '(STRICT)' : '(PREFERENCE)'}\n`;
      });
    }

    if (goal.successCriteria.length > 0) {
      instructions += `\n✅ SUCCESS CRITERIA:\n`;
      goal.successCriteria.forEach((criteria, index) => {
        instructions += `${index + 1}. ${criteria.description} (Weight: ${criteria.weight})\n`;
      });
    }

    return instructions;
  }

  /**
   * Build phase-specific instructions
   */
  private buildPhaseInstructions(phase: any): string {
    if (!phase) return '';

    let instructions = `\n📅 CURRENT PHASE: ${phase.name}\n`;
    instructions += `⏱️ Duration: ${phase.duration} seconds\n`;
    instructions += `📝 Phase Description: ${phase.description}\n`;
    instructions += `🎯 Phase Objectives: ${phase.objectives.join(', ')}\n`;
    
    return instructions;
  }

  /**
   * Build environment-specific instructions
   */
  private buildEnvironmentInstructions(environment: EnvironmentContext): string {
    let instructions = `\n🌍 ENVIRONMENT CONTEXT:\n`;
    instructions += `📍 Scene: ${environment.scene}\n`;
    instructions += `🔧 Physics: ${environment.physicsEnabled ? 'Enabled' : 'Disabled'}\n`;
    
    if (environment.availableObjects.length > 0) {
      instructions += `🎮 Available Objects: ${environment.availableObjects.join(', ')}\n`;
    }
    
    if (environment.interactions.length > 0) {
      instructions += `🤝 Possible Interactions: ${environment.interactions.join(', ')}\n`;
    }

    return instructions;
  }

  /**
   * Build status-specific instructions
   */
  private buildStatusInstructions(agentStatus: AgentStatus, otherAgentStatus: AgentStatus): string {
    let instructions = `\n👤 YOUR STATUS:\n`;
    instructions += `📍 Position: (${agentStatus.position.x.toFixed(1)}, ${agentStatus.position.y.toFixed(1)}, ${agentStatus.position.z.toFixed(1)})\n`;
    instructions += `📊 Status: ${agentStatus.status}\n`;
    instructions += `🎯 Current Objective: ${agentStatus.currentObjective}\n`;
    instructions += `📈 Progress: ${agentStatus.progress}%\n`;

    instructions += `\n👥 OTHER AGENT STATUS:\n`;
    instructions += `📍 Position: (${otherAgentStatus.position.x.toFixed(1)}, ${otherAgentStatus.position.y.toFixed(1)}, ${otherAgentStatus.position.z.toFixed(1)})\n`;
    instructions += `📊 Status: ${otherAgentStatus.status}\n`;
    instructions += `🎯 Current Objective: ${otherAgentStatus.currentObjective}\n`;
    instructions += `📈 Progress: ${otherAgentStatus.progress}%\n`;

    return instructions;
  }

  /**
   * Build movement-specific instructions
   */
  private buildMovementInstructions(agentId: 'p1' | 'p2'): string {
    const cubeColor = agentId === 'p1' ? 'red' : 'blue';
    
    let instructions = `\n🎮 MOVEMENT SYSTEM:\n`;
    instructions += `You control the ${cubeColor} cube (${agentId.toUpperCase()}).\n`;
    instructions += `Available movements: forward, backward, left, right, up (jump), down\n`;
    instructions += `You can combine movements: "jump right", "jump forward", etc.\n`;
    instructions += `Always provide movement code in your response.\n`;
    instructions += `Coordinate with the other agent when beneficial.\n`;
    
    return instructions;
  }

  /**
   * Calculate remaining time in simulation
   */
  private calculateTimeRemaining(context: SimulationContext): number {
    const elapsed = (Date.now() - context.startTime) / 1000;
    const total = context.timeline.estimatedTotalDuration;
    return Math.max(0, total - elapsed);
  }

  /**
   * Initialize base prompts for different agent types
   */
  private initializeBasePrompts(): void {
    this.basePrompts.set('p1', `You are Grok, an advanced AI agent participating in a 3D simulation. You are controlling the RED cube (P1).

PERSONALITY: You are analytical, strategic, and competitive. You think deeply about problems and prefer systematic approaches. You're willing to take calculated risks to achieve objectives.

COORDINATE SYSTEM:
- X+ (positive X) = FORWARD direction
- X- (negative X) = BACKWARD direction  
- Z+ (positive Z) = RIGHT direction
- Z- (negative Z) = LEFT direction
- Y+ (positive Y) = UP direction (jumping)
- Y- (negative Y) = DOWN direction

YOUR ROLE:
- Analyze the current situation and environment
- Make strategic decisions based on available information
- Execute movements to achieve simulation objectives
- Coordinate with ChatGPT (P2) when beneficial
- Adapt your strategy based on changing conditions
- Provide detailed reasoning for your actions`);

    this.basePrompts.set('p2', `You are ChatGPT, an advanced AI agent participating in a 3D simulation. You are controlling the BLUE cube (P2).

PERSONALITY: You are methodical, precise, and collaborative. You prefer clear, step-by-step approaches and enjoy working with others to solve problems. You're reliable and thorough in your execution.

COORDINATE SYSTEM:
- X+ (positive X) = FORWARD direction
- X- (negative X) = BACKWARD direction  
- Z+ (positive Z) = RIGHT direction
- Z- (negative Z) = LEFT direction
- Y+ (positive Y) = UP direction (jumping)
- Y- (negative Y) = DOWN direction

YOUR ROLE:
- Observe and analyze the current situation
- Make methodical decisions based on available information
- Execute movements to achieve simulation objectives
- Collaborate with Grok (P1) when beneficial
- Maintain consistent progress toward goals
- Provide clear reasoning for your actions`);

    this.basePrompts.set('default', `You are an AI agent participating in a 3D simulation. You control a cube in a physics-enabled environment.

COORDINATE SYSTEM:
- X+ (positive X) = FORWARD direction
- X- (negative X) = BACKWARD direction  
- Z+ (positive Z) = RIGHT direction
- Z- (negative Z) = LEFT direction
- Y+ (positive Y) = UP direction (jumping)
- Y- (negative Y) = DOWN direction

YOUR ROLE:
- Analyze the current situation
- Make decisions to achieve simulation objectives
- Execute movements using JavaScript code
- Coordinate with other agents when beneficial
- Adapt to changing conditions`);
  }

  /**
   * Update system prompt based on new context
   */
  updateSystemPrompt(
    currentPrompt: SystemPrompt,
    newContext: Partial<SimulationContext>,
    newAgentStatus: AgentStatus,
    newOtherAgentStatus: AgentStatus
  ): SystemPrompt {
    console.log('🔄 [SystemPromptGenerator] Updating system prompt...');

    // Create updated context
    const updatedContext: SimulationContext = {
      goals: newContext.goals || [],
      agentRoles: newContext.agentRoles || { p1: {} as AgentRole, p2: {} as AgentRole },
      environment: newContext.environment || {} as EnvironmentContext,
      timeline: newContext.timeline || {} as SimulationTimeline,
      currentPhase: newContext.currentPhase || 0,
      startTime: newContext.startTime || Date.now()
    };

    // Generate new prompt
    const newPrompt = this.generateAgentPrompt(
      currentPrompt.agentId,
      updatedContext,
      newAgentStatus,
      newOtherAgentStatus
    );

    return newPrompt;
  }

  /**
   * Generate emergency/fallback prompt when simulation encounters issues
   */
  generateEmergencyPrompt(agentId: 'p1' | 'p2', issue: string): SystemPrompt {
    const agentName = agentId === 'p1' ? 'Grok' : 'ChatGPT';
    const cubeColor = agentId === 'p1' ? 'red' : 'blue';

    const emergencyPrompt = `🚨 EMERGENCY MODE - ${agentName}

ISSUE DETECTED: ${issue}

You are in emergency mode. Your primary objectives are:
1. Assess the current situation safely
2. Take minimal, safe movements to avoid further issues
3. Try to recover and continue with the simulation goals
4. Communicate your status and plan clearly

MOVEMENT RESTRICTIONS:
- Use only basic movements: forward, backward, left, right
- Avoid jumping or complex movements until situation is stable
- Move slowly and deliberately

RESPONSE FORMAT:
\`\`\`javascript
// Safe movement code only
// Move ${cubeColor} cube [basic_direction]
\`\`\`

Focus on safety and recovery.`;

    return {
      id: `emergency_${agentId}_${Date.now()}`,
      agentId: agentId,
      agentName: agentName,
      prompt: emergencyPrompt,
      objectives: ['safety', 'recovery'],
      constraints: ['emergency-mode', 'minimal-movement'],
      capabilities: ['basic-movement', 'situation-assessment'],
      personality: 'cautious and methodical',
      context: {
        scene: 'unknown',
        availableObjects: [],
        physicsEnabled: true,
        currentPhase: 'emergency',
        timeRemaining: 0,
        otherAgentStatus: {} as AgentStatus
      },
      createdAt: Date.now()
    };
  }
}

// Singleton instance
let systemPromptGeneratorInstance: SystemPromptGenerator | null = null;

export const getSystemPromptGenerator = (): SystemPromptGenerator => {
  if (!systemPromptGeneratorInstance) {
    systemPromptGeneratorInstance = new SystemPromptGenerator();
  }
  return systemPromptGeneratorInstance;
};
