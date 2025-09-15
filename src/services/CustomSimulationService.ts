import { ChatService } from '../ai/services/ChatService';
import { getAPIConfig } from '../ai/config/apiConfig';
import { getSimulationGoalService, SimulationGoal, ParsedSimulation } from '../ai/services/SimulationGoalService';
import { getSystemPromptGenerator, SystemPrompt } from '../ai/services/SystemPromptGenerator';

interface SimulationContext {
  sceneId: string;
  availableMeshes: string[];
  sceneType: string;
}

interface SimulationResult {
  success: boolean;
  progress: number;
  completionReason: string;
  finalState?: any;
}

class CustomSimulationService {
  private p1ChatService: ChatService;
  private p2ChatService: ChatService;
  private goalService: any;
  private promptGenerator: any;
  private isRunning: boolean = false;
  private intervalRef: NodeJS.Timeout | null = null;
  private currentSimulation: ParsedSimulation | null = null;
  private currentSystemPrompt: SystemPrompt | null = null;
  private simulationState: any = null;
  private currentSender: 'p1' | 'p2' = 'p1';
  private movementCount: number = 0;

  constructor() {
    this.p1ChatService = new ChatService();
    this.p2ChatService = new ChatService();
    this.goalService = getSimulationGoalService();
    this.promptGenerator = getSystemPromptGenerator();
  }

  async startSimulation(
    simulationName: string,
    simulationGoal: string,
    sceneContext: SimulationContext,
    onAIMessage: (message: string, agentId: 'p1' | 'p2' | 'system') => void,
    onMovementCommand: (command: string, agentId: 'p1' | 'p2') => void,
    onSimulationComplete: (result: SimulationResult) => void
  ): Promise<void> {
    if (this.isRunning) {
      this.stopSimulation();
    }

    this.isRunning = true;

    try {
      // Parse the simulation goal
      const simulationResponse = await this.goalService.parseSimulationDescription(simulationName, simulationGoal);
      this.currentSimulation = simulationResponse.data;

      // Generate system prompt - Direct approach
      
      this.currentSystemPrompt = {
        id: 'custom-simulation-prompt',
        agentId: 'p1',
        agentName: 'Custom Agent',
        prompt: `You are an AI agent in a 3D simulation environment. Your goal is: "${simulationGoal}"

MOVEMENT STRATEGY:
- First, explore the environment by moving around (forward, left, right, backward)
- Look for obstacles, walls, or barriers in your path
- If you encounter obstacles, try to maneuver around them (moveLeft, moveRight, moveBackward)
- Only use jump() when you need to get over obstacles or barriers
- Use rotateTo() to change direction when needed
- Move strategically toward your goal, not randomly

MOVEMENT COMMANDS:
- moveForward() - Move forward in current direction
- moveBackward() - Move backward from current direction  
- moveLeft() - Move left from current direction
- moveRight() - Move right from current direction
- jump() - Jump up in the air (use only when encountering obstacles)
- moveTo(x, y, z) - Move to a specific position
- rotateTo(x, y, z) - Rotate to face a specific direction

NAVIGATION RULES:
1. Start by exploring the area with basic movement (forward, left, right)
2. If you see obstacles, try to go around them first
3. Only jump if you need to get over something
4. Change direction with rotateTo() when you need to face a new direction
5. Move purposefully toward your goal, not just randomly

Analyze the current scene, identify obstacles, and provide your next strategic action.`,
        objectives: ['Complete the simulation goal'],
        constraints: ['physics-limits', 'scene-bounds'],
        capabilities: ['movement', 'interaction', 'planning'],
        personality: 'Strategic and observant',
        context: {
          scene: sceneContext.sceneId,
          availableObjects: sceneContext.availableMeshes,
          physicsEnabled: true,
          currentPhase: 'planning',
          timeRemaining: 60,
          otherAgentStatus: {
            id: 'p2',
            name: 'Environment',
            status: 'idle',
            position: { x: 0, y: 0, z: 0 },
            currentObjective: 'Monitor environment',
            progress: 0
          }
        },
        createdAt: Date.now()
      };

      // Initialize simulation state
      this.simulationState = {
        phase: 'planning',
        progress: 0,
        currentObjective: this.currentSimulation?.goals?.[0]?.objectives?.[0]?.description || 'Complete the simulation',
        status: 'active'
      };

      // Start the simulation loop
      this.startSimulationLoop(onAIMessage, onMovementCommand, onSimulationComplete);

    } catch (error) {
      this.isRunning = false;
      throw error;
    }
  }

  private startSimulationLoop(
    onAIMessage: (message: string, agentId: 'p1' | 'p2' | 'system') => void,
    onMovementCommand: (command: string, agentId: 'p1' | 'p2') => void,
    onSimulationComplete: (result: SimulationResult) => void
  ) {
    this.intervalRef = setInterval(async () => {
      if (!this.isRunning || !this.currentSystemPrompt || !this.currentSimulation) {
        return;
      }

      try {
        // Get current scene data
        const sceneData = this.getCurrentSceneData();
        
        // Generate AI prompt
        const prompt = this.buildAIPrompt(sceneData);
        
        // Get AI response from current sender (alternating between P1 and P2)
        const currentAgent = this.currentSender;
        const chatService = currentAgent === 'p1' ? this.p1ChatService : this.p2ChatService;
        
        const response = await chatService.processChatMessage(prompt, `${currentAgent}-custom-simulation`);
        
        if (response && response.success && response.data && response.data.message) {
          const messageContent = response.data.message.content;
          onAIMessage(messageContent, currentAgent);
          
          // Parse movement commands
          const movementCommands = this.parseMovementCommands(messageContent);
          movementCommands.forEach(command => {
            onMovementCommand(command, currentAgent);
          });
          
          // Switch to the other agent for next cycle
          this.currentSender = currentAgent === 'p1' ? 'p2' : 'p1';
          
          // Update simulation progress
          this.updateSimulationProgress();
        }
      } catch (error) {
        this.stopSimulation();
        onSimulationComplete({
          success: false,
          progress: this.simulationState?.progress || 0,
          completionReason: `Error: ${error}`,
          finalState: this.simulationState
        });
      }
    }, 2000); // Run every 2 seconds
  }

  private getCurrentSceneData(): any {
    try {
      const scene = (window as any).currentScene;
      if (scene && scene.meshes) {
        const meshes = scene.meshes.map((mesh: any) => {
          // Try to get absolute position if available, fallback to local position (like live mode)
          let position = null;
          if (mesh.getAbsolutePosition && typeof mesh.getAbsolutePosition === 'function') {
            try {
              const absPos = mesh.getAbsolutePosition();
              position = { x: absPos.x, y: absPos.y, z: absPos.z };
            } catch (error) {
              if (mesh.position) {
                position = { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z };
              }
            }
          } else if (mesh.position) {
            position = { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z };
          }
          
          return {
            name: mesh.name,
            position: position,
            rotation: mesh.rotation
          };
        }).filter((mesh: any) => mesh.name && mesh.name !== 'hdrSkyBox');
        
        return {
          meshes: meshes,
          cameras: scene.cameras ? scene.cameras.map((camera: any) => ({
            name: camera.name,
            position: camera.position ? { x: camera.position.x, y: camera.position.y, z: camera.position.z } : null
          })) : []
        };
      }
    } catch (error) {
      // Error getting scene data
    }
    return { meshes: [], cameras: [] };
  }

  private buildAIPrompt(sceneData: any): string {
    if (!this.currentSystemPrompt) return '';
    
    const currentAgent = this.currentSender;
    const agentRole = currentAgent === 'p1' ? 'GROK (Red Cube)' : 'ChatGPT (Blue Cube)';
    const opponentRole = currentAgent === 'p1' ? 'ChatGPT (Blue Cube)' : 'GROK (Red Cube)';
    
    // Find the agent's cube and opponent's cube
    const agentCube = sceneData.meshes.find((mesh: any) => 
      mesh.name && (
        mesh.name.toLowerCase().includes(currentAgent === 'p1' ? 'p1' : 'p2') ||
        mesh.name.toLowerCase().includes(currentAgent === 'p1' ? 'red' : 'blue') ||
        mesh.name.toLowerCase().includes(currentAgent === 'p1' ? 'red cube' : 'blue cube')
      )
    );
    
    const opponentCube = sceneData.meshes.find((mesh: any) => 
      mesh.name && (
        mesh.name.toLowerCase().includes(currentAgent === 'p1' ? 'p2' : 'p1') ||
        mesh.name.toLowerCase().includes(currentAgent === 'p1' ? 'blue' : 'red') ||
        mesh.name.toLowerCase().includes(currentAgent === 'p1' ? 'blue cube' : 'red cube')
      )
    );
    
    const agentPosition = agentCube?.position || { x: 0, y: 0, z: 0 };
    const opponentPosition = opponentCube?.position || { x: 0, y: 0, z: 0 };
    
    // Calculate distance between agents
    const distance = Math.sqrt(
      Math.pow(agentPosition.x - opponentPosition.x, 2) + 
      Math.pow(agentPosition.y - opponentPosition.y, 2) + 
      Math.pow(agentPosition.z - opponentPosition.z, 2)
    );
    
    // Find obstacles (meshes that aren't the agent cubes)
    const obstacles = sceneData.meshes.filter((mesh: any) => 
      mesh.name && 
      !mesh.name.toLowerCase().includes('p1') && 
      !mesh.name.toLowerCase().includes('p2') && 
      !mesh.name.toLowerCase().includes('red') && 
      !mesh.name.toLowerCase().includes('blue') &&
      mesh.name !== 'ground' &&
      mesh.name !== 'floor' &&
      mesh.name !== 'hdrSkyBox'
    );
    
    // Find nearby obstacles
    const nearbyObstacles = obstacles.filter((obstacle: any) => {
      if (!obstacle.position) return false;
      const obstacleDistance = Math.sqrt(
        Math.pow(agentPosition.x - obstacle.position.x, 2) +
        Math.pow(agentPosition.y - obstacle.position.y, 2) +
        Math.pow(agentPosition.z - obstacle.position.z, 2)
      );
      return obstacleDistance < 3.0; // Within 3 units
    });
    
    // Increment movement count and check if we should encourage jumping
    this.movementCount++;
    const shouldJump = this.movementCount % 4 === 0;
    
    return `You are ${agentRole} in a 3D simulation environment. Your opponent is ${opponentRole}.

YOUR GOAL: ${this.currentSimulation?.goals?.[0]?.objectives?.[0]?.description || 'Complete the simulation'}

CURRENT POSITIONS:
- YOUR POSITION: (X: ${agentPosition.x.toFixed(1)}, Y: ${agentPosition.y.toFixed(1)}, Z: ${agentPosition.z.toFixed(1)})
- OPPONENT POSITION: (X: ${opponentPosition.x.toFixed(1)}, Y: ${opponentPosition.y.toFixed(1)}, Z: ${opponentPosition.z.toFixed(1)})
- DISTANCE TO OPPONENT: ${distance.toFixed(2)} units

SCENE ANALYSIS:
- Total meshes: ${sceneData.meshes.length} objects
- Obstacles detected: ${obstacles.length}
- Nearby obstacles: ${nearbyObstacles.length} (within 3 units)
- Nearby obstacle details: ${nearbyObstacles.map((o: any) => `${o.name} (${Math.sqrt(Math.pow(agentPosition.x - o.position.x, 2) + Math.pow(agentPosition.y - o.position.y, 2) + Math.pow(agentPosition.z - o.position.z, 2)).toFixed(1)} units)`).join(', ') || 'None'}

MOVEMENT STRATEGY:
${shouldJump ? '🚀 JUMP TIME! This is your 4th movement - TIME TO JUMP! Use jump() command!' : '1. First explore the area with basic movement (moveForward, moveLeft, moveRight)'}
2. Look for obstacles in your path - if you see them, try to go around them
3. ${shouldJump ? 'JUMP NOW! Use jump() command as this is your 4th movement!' : 'Only use jump() when you encounter obstacles you need to get over'}
4. Use rotateTo() to change direction when needed
5. Move purposefully toward your goal

${this.currentSystemPrompt.prompt}

You are controlling the ${currentAgent === 'p1' ? 'red' : 'blue'} cube. Analyze the current scene, identify any obstacles, and provide your next strategic action.`;
  }

  private parseMovementCommands(response: string): string[] {
    const commands: string[] = [];
    
    // Parse all movement command types
    const moveToRegex = /moveTo\([^)]+\)/g;
    const rotateToRegex = /rotateTo\([^)]+\)/g;
    const moveForwardRegex = /moveForward\(\)/g;
    const moveBackwardRegex = /moveBackward\(\)/g;
    const moveLeftRegex = /moveLeft\(\)/g;
    const moveRightRegex = /moveRight\(\)/g;
    const jumpRegex = /jump\(\)/g;
    
    // Extract all command types
    const moveToMatches = response.match(moveToRegex);
    const rotateToMatches = response.match(rotateToRegex);
    const moveForwardMatches = response.match(moveForwardRegex);
    const moveBackwardMatches = response.match(moveBackwardRegex);
    const moveLeftMatches = response.match(moveLeftRegex);
    const moveRightMatches = response.match(moveRightRegex);
    const jumpMatches = response.match(jumpRegex);
    
    // Add all found commands
    if (moveToMatches) commands.push(...moveToMatches);
    if (rotateToMatches) commands.push(...rotateToMatches);
    if (moveForwardMatches) commands.push(...moveForwardMatches);
    if (moveBackwardMatches) commands.push(...moveBackwardMatches);
    if (moveLeftMatches) commands.push(...moveLeftMatches);
    if (moveRightMatches) commands.push(...moveRightMatches);
    if (jumpMatches) commands.push(...jumpMatches);
    
    return commands;
  }


  private updateSimulationProgress(): void {
    if (this.simulationState) {
      // Just increment progress but don't stop the simulation
      this.simulationState.progress = Math.min(this.simulationState.progress + 1, 100);
      
      // Reset progress when it reaches 100 to keep simulation running
      if (this.simulationState.progress >= 100) {
        this.simulationState.progress = 0;
        this.simulationState.phase = 'exploration';
      }
    }
  }

  stopSimulation(): void {
    this.isRunning = false;
    
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
    
    this.currentSimulation = null;
    this.currentSystemPrompt = null;
    this.simulationState = null;
  }

  isSimulationRunning(): boolean {
    return this.isRunning;
  }
}

// Create a singleton instance
const customSimulationService = new CustomSimulationService();

export default customSimulationService;
