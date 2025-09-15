// Simulation Goal Service - Parses user descriptions into structured simulation objectives

import { AIResponse } from '../types';
import { getAPIConfig, getAPIStatus } from '../config/apiConfig';

export interface SimulationGoal {
  id: string;
  name: string;
  description: string;
  objectives: SimulationObjective[];
  constraints: SimulationConstraint[];
  successCriteria: SuccessCriteria[];
  estimatedDuration?: number;
  complexity: 'simple' | 'medium' | 'complex';
  createdAt: number;
}

export interface SimulationObjective {
  id: string;
  type: 'movement' | 'interaction' | 'cooperation' | 'competition' | 'exploration' | 'collection' | 'custom';
  description: string;
  target: 'p1' | 'p2' | 'both' | 'environment';
  parameters: Record<string, any>;
  priority: number; // 1-10, higher = more important
  dependencies?: string[]; // IDs of other objectives that must be completed first
}

export interface SimulationConstraint {
  type: 'time' | 'movement' | 'interaction' | 'environment' | 'safety';
  description: string;
  parameters: Record<string, any>;
  strict: boolean; // true = must be followed, false = preference
}

export interface SuccessCriteria {
  id: string;
  type: 'position' | 'interaction' | 'completion' | 'score' | 'custom';
  description: string;
  condition: string; // JavaScript expression to evaluate
  weight: number; // 0-1, how much this contributes to overall success
}

export interface ParsedSimulation {
  goals: SimulationGoal[];
  agentRoles: {
    p1: AgentRole;
    p2: AgentRole;
  };
  environment: EnvironmentContext;
  timeline: SimulationTimeline;
}

export interface AgentRole {
  name: string;
  personality: string;
  primaryObjectives: string[];
  capabilities: string[];
  constraints: string[];
}

export interface EnvironmentContext {
  scene: string;
  availableObjects: string[];
  physicsEnabled: boolean;
  interactions: string[];
}

export interface SimulationTimeline {
  phases: SimulationPhase[];
  estimatedTotalDuration: number;
}

export interface SimulationPhase {
  id: string;
  name: string;
  duration: number;
  objectives: string[];
  description: string;
}

export class SimulationGoalService {
  private apiConfig: any;

  constructor() {
    this.apiConfig = getAPIConfig();
  }

  /**
   * Parse user's natural language description into structured simulation goals
   */
  async parseSimulationDescription(
    simulationName: string,
    description: string,
    sceneContext?: {
      sceneId: string;
      availableMeshes: string[];
      sceneType: string;
    }
  ): Promise<AIResponse<ParsedSimulation>> {
    try {

      // Check if we can use AI API for parsing
      const apiStatus = getAPIStatus(this.apiConfig);
      
      if (apiStatus.hasValidKey && apiStatus.provider === 'openai') {
        return await this.parseWithAI(simulationName, description, sceneContext);
      } else {
        return await this.parseLocally(simulationName, description, sceneContext);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        success: false,
        error: errorMessage,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Use AI API to parse simulation description
   */
  private async parseWithAI(
    simulationName: string,
    description: string,
    sceneContext?: any
  ): Promise<AIResponse<ParsedSimulation>> {
    try {
      const prompt = this.buildParsingPrompt(simulationName, description, sceneContext);
      
      const response = await this.callOpenAI(prompt);
      
      if (!response.content) {
        throw new Error('No response received from AI service');
      }

      // Parse the AI response into structured data
      const parsedData = this.parseAIResponse(response.content);
      
      return {
        success: true,
        data: parsedData,
        timestamp: Date.now(),
        model: 'openai',
        confidence: response.confidence
      };

    } catch (error) {
      // Fallback to local parsing
      return await this.parseLocally(simulationName, description, sceneContext);
    }
  }

  /**
   * Local parsing fallback when AI is not available
   */
  private async parseLocally(
    simulationName: string,
    description: string,
    sceneContext?: any
  ): Promise<AIResponse<ParsedSimulation>> {
    try {

      // Basic keyword-based parsing
      const objectives = this.extractObjectivesFromDescription(description);
      const constraints = this.extractConstraintsFromDescription(description);
      const successCriteria = this.extractSuccessCriteriaFromDescription(description);

      const goal: SimulationGoal = {
        id: `goal_${Date.now()}`,
        name: simulationName,
        description: description,
        objectives: objectives,
        constraints: constraints,
        successCriteria: successCriteria,
        complexity: this.assessComplexity(objectives, constraints),
        createdAt: Date.now()
      };

      const parsedSimulation: ParsedSimulation = {
        goals: [goal],
        agentRoles: this.generateDefaultAgentRoles(description),
        environment: this.generateEnvironmentContext(sceneContext),
        timeline: this.generateDefaultTimeline(objectives)
      };

      return {
        success: true,
        data: parsedSimulation,
        timestamp: Date.now(),
        model: 'local-parser',
        confidence: 0.6
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Build prompt for AI parsing
   */
  private buildParsingPrompt(
    simulationName: string,
    description: string,
    sceneContext?: any
  ): string {
    return `You are an expert simulation designer. Parse the following user description into a structured simulation plan.

SIMULATION DETAILS:
- Name: ${simulationName}
- Description: ${description}
- Scene Context: ${sceneContext ? JSON.stringify(sceneContext) : 'Not specified'}

REQUIRED OUTPUT FORMAT (JSON):
{
  "goals": [
    {
      "id": "unique_id",
      "name": "Goal name",
      "description": "Detailed description",
      "objectives": [
        {
          "id": "obj_id",
          "type": "movement|interaction|cooperation|competition|exploration|collection|custom",
          "description": "What needs to be done",
          "target": "p1|p2|both|environment",
          "parameters": {},
          "priority": 1-10,
          "dependencies": []
        }
      ],
      "constraints": [
        {
          "type": "time|movement|interaction|environment|safety",
          "description": "Constraint description",
          "parameters": {},
          "strict": true/false
        }
      ],
      "successCriteria": [
        {
          "id": "criteria_id",
          "type": "position|interaction|completion|score|custom",
          "description": "Success condition",
          "condition": "JavaScript expression to evaluate",
          "weight": 0.0-1.0
        }
      ],
      "complexity": "simple|medium|complex"
    }
  ],
  "agentRoles": {
    "p1": {
      "name": "Grok",
      "personality": "AI personality description",
      "primaryObjectives": ["objective_ids"],
      "capabilities": ["movement", "interaction", "analysis"],
      "constraints": ["constraint_descriptions"]
    },
    "p2": {
      "name": "ChatGPT", 
      "personality": "AI personality description",
      "primaryObjectives": ["objective_ids"],
      "capabilities": ["movement", "interaction", "analysis"],
      "constraints": ["constraint_descriptions"]
    }
  },
  "environment": {
    "scene": "scene_id",
    "availableObjects": ["object_names"],
    "physicsEnabled": true,
    "interactions": ["interaction_types"]
  },
  "timeline": {
    "phases": [
      {
        "id": "phase_id",
        "name": "Phase name",
        "duration": 30,
        "objectives": ["objective_ids"],
        "description": "Phase description"
      }
    ],
    "estimatedTotalDuration": 120
  }
}

IMPORTANT:
- Focus on actionable, measurable objectives
- Consider the 3D environment and physics constraints
- Make success criteria specific and evaluable
- Assign appropriate roles to P1 (Grok) and P2 (ChatGPT)
- Break complex goals into phases
- Return ONLY valid JSON, no additional text`;
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<{ content: string; confidence: number }> {
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
            content: 'You are an expert simulation designer. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      confidence: 0.9
    };
  }

  /**
   * Parse AI response into structured data
   */
  private parseAIResponse(content: string): ParsedSimulation {
    try {
      // Clean the response (remove any markdown formatting)
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleanContent);
    } catch (error) {
      throw new Error('Invalid JSON response from AI service');
    }
  }

  /**
   * Extract objectives from description using keyword analysis
   */
  private extractObjectivesFromDescription(description: string): SimulationObjective[] {
    const objectives: SimulationObjective[] = [];
    const lowerDesc = description.toLowerCase();

    // Movement objectives
    if (lowerDesc.includes('move') || lowerDesc.includes('go to') || lowerDesc.includes('reach')) {
      objectives.push({
        id: 'movement_1',
        type: 'movement',
        description: 'Navigate to target location',
        target: 'both',
        parameters: { direction: 'forward', speed: 1 },
        priority: 8
      });
    }

    // Interaction objectives
    if (lowerDesc.includes('interact') || lowerDesc.includes('touch') || lowerDesc.includes('collect')) {
      objectives.push({
        id: 'interaction_1',
        type: 'interaction',
        description: 'Interact with objects in scene',
        target: 'both',
        parameters: { interactionType: 'touch' },
        priority: 7
      });
    }

    // Cooperation objectives
    if (lowerDesc.includes('work together') || lowerDesc.includes('cooperate') || lowerDesc.includes('help')) {
      objectives.push({
        id: 'cooperation_1',
        type: 'cooperation',
        description: 'Work together to achieve goal',
        target: 'both',
        parameters: { cooperationType: 'collaborative' },
        priority: 9
      });
    }

    // Competition objectives
    if (lowerDesc.includes('compete') || lowerDesc.includes('race') || lowerDesc.includes('win')) {
      objectives.push({
        id: 'competition_1',
        type: 'competition',
        description: 'Compete to achieve goal first',
        target: 'both',
        parameters: { competitionType: 'race' },
        priority: 8
      });
    }

    return objectives;
  }

  /**
   * Extract constraints from description
   */
  private extractConstraintsFromDescription(description: string): SimulationConstraint[] {
    const constraints: SimulationConstraint[] = [];
    const lowerDesc = description.toLowerCase();

    // Time constraints - removed automatic time limits
    // Simulations now run until goals are achieved without time constraints

    // Safety constraints
    if (lowerDesc.includes('safe') || lowerDesc.includes('careful') || lowerDesc.includes('avoid')) {
      constraints.push({
        type: 'safety',
        description: 'Maintain safety during execution',
        parameters: { safetyLevel: 'high' },
        strict: true
      });
    }

    return constraints;
  }

  /**
   * Extract success criteria from description
   */
  private extractSuccessCriteriaFromDescription(description: string): SuccessCriteria[] {
    const criteria: SuccessCriteria[] = [];
    const lowerDesc = description.toLowerCase();

    // Position-based success
    if (lowerDesc.includes('reach') || lowerDesc.includes('arrive') || lowerDesc.includes('get to')) {
      criteria.push({
        id: 'position_1',
        type: 'position',
        description: 'Reach target position',
        condition: 'distanceToTarget < 2',
        weight: 0.8
      });
    }

    // Completion-based success
    criteria.push({
      id: 'completion_1',
      type: 'completion',
      description: 'Complete all objectives',
      condition: 'completedObjectives.length === totalObjectives.length',
      weight: 1.0
    });

    return criteria;
  }

  /**
   * Assess complexity of simulation
   */
  private assessComplexity(objectives: SimulationObjective[], constraints: SimulationConstraint[]): 'simple' | 'medium' | 'complex' {
    const totalElements = objectives.length + constraints.length;
    
    if (totalElements <= 3) return 'simple';
    if (totalElements <= 6) return 'medium';
    return 'complex';
  }

  /**
   * Generate default agent roles
   */
  private generateDefaultAgentRoles(description: string): { p1: AgentRole; p2: AgentRole } {
    const lowerDesc = description.toLowerCase();
    
    return {
      p1: {
        name: 'Grok',
        personality: lowerDesc.includes('aggressive') ? 'Aggressive and competitive' : 'Analytical and strategic',
        primaryObjectives: ['movement_1'],
        capabilities: ['movement', 'analysis', 'decision-making'],
        constraints: ['physics-limits', 'scene-bounds']
      },
      p2: {
        name: 'ChatGPT',
        personality: lowerDesc.includes('cooperative') ? 'Collaborative and helpful' : 'Methodical and precise',
        primaryObjectives: ['movement_1'],
        capabilities: ['movement', 'interaction', 'planning'],
        constraints: ['physics-limits', 'scene-bounds']
      }
    };
  }

  /**
   * Generate environment context
   */
  private generateEnvironmentContext(sceneContext?: any): EnvironmentContext {
    return {
      scene: sceneContext?.sceneId || 'unknown',
      availableObjects: sceneContext?.availableMeshes || [],
      physicsEnabled: true,
      interactions: ['movement', 'collision', 'physics']
    };
  }

  /**
   * Generate default timeline
   */
  private generateDefaultTimeline(objectives: SimulationObjective[]): SimulationTimeline {
    return {
      phases: [
        {
          id: 'phase_1',
          name: 'Initialization',
          duration: 10,
          objectives: objectives.map(obj => obj.id),
          description: 'Setup and initial positioning'
        }
      ],
      estimatedTotalDuration: 60
    };
  }
}

// Singleton instance
let simulationGoalServiceInstance: SimulationGoalService | null = null;

export const getSimulationGoalService = (): SimulationGoalService => {
  if (!simulationGoalServiceInstance) {
    simulationGoalServiceInstance = new SimulationGoalService();
  }
  return simulationGoalServiceInstance;
};
