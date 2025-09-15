import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatService } from '../ai/services/ChatService';
import { getAPIConfig } from '../ai/config/apiConfig';
import { getSimulationGoalService, SimulationGoal, ParsedSimulation } from '../ai/services/SimulationGoalService';
import { getSystemPromptGenerator, SystemPrompt } from '../ai/services/SystemPromptGenerator';

interface CustomSimulationProps {
  isActive: boolean;
  simulationName: string;
  simulationGoal: string;
  sceneContext: {
    sceneId: string;
    availableMeshes: string[];
    sceneType: string;
  };
  onAIMessage: (message: string, agentId: 'p1' | 'p2' | 'system') => void;
  onMovementCommand: (command: string, agentId: 'p1' | 'p2') => void;
  onSimulationComplete: (result: SimulationResult) => void;
}

interface SimulationResult {
  success: boolean;
  progress: number;
  completionReason: string;
  finalProgress: number;
}

interface AgentStatus {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  status: 'active' | 'idle' | 'stuck' | 'completed' | 'error';
  currentObjective: string;
  progress: number;
}

const CustomSimulation: React.FC<CustomSimulationProps> = ({ 
  isActive, 
  simulationName,
  simulationGoal,
  sceneContext,
  onAIMessage, 
  onMovementCommand,
  onSimulationComplete
}) => {
  console.log('🎯 CustomSimulation component rendered with props:', { isActive, simulationName, simulationGoal });
  
  // Services
  const [chatService] = useState(() => new ChatService());
  const [goalService] = useState(() => getSimulationGoalService());
  const [promptGenerator] = useState(() => getSystemPromptGenerator());
  const [apiConfig] = useState(() => getAPIConfig());
  
  // State
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [sceneData, setSceneData] = useState<any>(null);
  const [parsedSimulation, setParsedSimulation] = useState<ParsedSimulation | null>(null);
  const [systemPrompt, setSystemPrompt] = useState<SystemPrompt | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({
    id: 'p1',
    name: 'Grok',
    position: { x: 0, y: 0, z: 0 },
    status: 'idle',
    currentObjective: 'Waiting for simulation to start',
    progress: 0
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentSenderRef = useRef<'p1' | 'p2'>('p1');
  
  // Gather scene data from unified viewer
  const gatherSceneData = useCallback(() => {
    try {
      // Try to get scene data from the global scene object (exposed by UnifiedViewer)
      const scene = (window as any).currentScene;
      console.log(`🔍 [CUSTOM SIM] Global scene object:`, scene);
      
      if (scene && scene.meshes) {
        const meshes = scene.meshes || [];
        const meshData = meshes.map((mesh: any) => {
          // Try to get absolute position if available, fallback to local position
          let position = null;
          if (mesh.getAbsolutePosition && typeof mesh.getAbsolutePosition === 'function') {
            try {
              const absPos = mesh.getAbsolutePosition();
              position = { x: absPos.x, y: absPos.y, z: absPos.z };
            } catch (error) {
              console.warn(`⚠️ [CUSTOM SIM] Error getting absolute position for ${mesh.name}:`, error);
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
            isVisible: mesh.isVisible,
            type: mesh.getClassName ? mesh.getClassName() : 'unknown'
          };
        }).filter((mesh: any) => mesh.name && mesh.name !== 'hdrSkyBox');
        
        console.log(`🔍 [CUSTOM SIM] Gathered ${meshData.length} meshes:`, meshData.map((m: any) => `${m.name} (${m.position ? `${m.position.x.toFixed(1)}, ${m.position.y.toFixed(1)}, ${m.position.z.toFixed(1)}` : 'no position'})`));
        
        return {
          meshes: meshData,
          scene: sceneContext.sceneId,
          timestamp: Date.now()
        };
      }
      
      // Fallback: try to get meshes from physics objects
      const cubePhysics = (window as any).cubePhysics;
      const p2CubePhysics = (window as any).p2CubePhysics;
      
      if (cubePhysics || p2CubePhysics) {
        console.log(`🔍 [CUSTOM SIM] Found physics objects, creating fallback mesh data`);
        
        const fallbackMeshes = [];
        if (cubePhysics && cubePhysics.body) {
          const p1Pos = cubePhysics.body.getTransformNode().getAbsolutePosition();
          fallbackMeshes.push({
            name: 'p1 cube',
            position: { x: p1Pos.x, y: p1Pos.y, z: p1Pos.z },
            isVisible: true,
            type: 'Mesh'
          });
        }
        if (p2CubePhysics && p2CubePhysics.body) {
          const p2Pos = p2CubePhysics.body.getTransformNode().getAbsolutePosition();
          fallbackMeshes.push({
            name: 'p2 cube',
            position: { x: p2Pos.x, y: p2Pos.y, z: p2Pos.z },
            isVisible: true,
            type: 'Mesh'
          });
        }
        
        return {
          meshes: fallbackMeshes,
          scene: sceneContext.sceneId,
          timestamp: Date.now()
        };
      }
      
      console.warn('🔍 [CUSTOM SIM] No viewer state available');
      return {
        meshes: [],
        scene: 'unknown',
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error gathering scene data:', error);
      return {
        meshes: [],
        scene: 'unknown',
        timestamp: Date.now()
      };
    }
  }, [sceneContext.sceneId]);

  // Parse simulation goal into structured format
  const parseSimulationGoal = useCallback(async () => {
    try {
      console.log('🎯 [CUSTOM SIM] Parsing simulation goal...');
      console.log('📝 Name:', simulationName);
      console.log('📝 Goal:', simulationGoal);
      
      const result = await goalService.parseSimulationDescription(
        simulationName,
        simulationGoal,
        sceneContext
      );
      
      if (result.success && result.data) {
        console.log('✅ [CUSTOM SIM] Simulation goal parsed successfully');
        setParsedSimulation(result.data);
        return result.data;
      } else {
        throw new Error(`Failed to parse simulation: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ [CUSTOM SIM] Failed to parse simulation goal:', error);
      onAIMessage(`❌ Failed to parse simulation goal: ${error}`, 'system');
      throw error;
    }
  }, [simulationName, simulationGoal, sceneContext, goalService, onAIMessage]);

  // Generate system prompt from parsed simulation
  const generateSystemPrompt = useCallback((parsedSim: ParsedSimulation) => {
    try {
      console.log('🎭 [CUSTOM SIM] Generating system prompt...');
      
      const simulationContext = {
        goals: parsedSim.goals,
        agentRoles: parsedSim.agentRoles,
        environment: parsedSim.environment,
        timeline: parsedSim.timeline,
        currentPhase: 0,
        startTime: Date.now()
      };
      
      const agentStatuses = {
        p1: agentStatus,
        p2: {
          id: 'p2',
          name: 'ChatGPT',
          position: { x: 0, y: 0, z: 0 },
          status: 'idle' as const,
          currentObjective: 'Waiting for simulation to start',
          progress: 0
        }
      };
      
      const prompts = promptGenerator.generateSystemPrompts(simulationContext, agentStatuses);
      const p1Prompt = prompts.p1;
      
      console.log('✅ [CUSTOM SIM] System prompt generated');
      setSystemPrompt(p1Prompt);
      return p1Prompt;
    } catch (error) {
      console.error('❌ [CUSTOM SIM] Failed to generate system prompt:', error);
      onAIMessage(`❌ Failed to generate system prompt: ${error}`, 'system');
      throw error;
    }
  }, [agentStatus, promptGenerator, onAIMessage]);

  // Create AI prompt with context
  const createAIPrompt = useCallback((messageNumber: number, sceneData: any) => {
    if (!systemPrompt) {
      return `You are Grok, an AI agent in a 3D simulation. Please analyze the current situation and provide movement commands.

CURRENT SCENE DATA:
- Meshes: ${sceneData.meshes.length} objects detected
- Your role: AI agent controlling movement in 3D environment

Please provide both analysis and movement code in this format:
\`\`\`javascript
// Your movement code here
// Examples: Move red cube forward, Move blue cube right, etc.
\`\`\``;
    }

    // Use the system prompt as the base
    let prompt = systemPrompt.prompt;
    
    // Add current scene context
    const p1Mesh = sceneData.meshes.find((m: any) => 
      m.name && (
        m.name.toLowerCase().includes('p1') || 
        m.name.toLowerCase().includes('red') ||
        m.name.toLowerCase().includes('cube') && m.name.toLowerCase().includes('red')
      )
    );
    const p2Mesh = sceneData.meshes.find((m: any) => 
      m.name && (
        m.name.toLowerCase().includes('p2') || 
        m.name.toLowerCase().includes('blue') ||
        m.name.toLowerCase().includes('cube') && m.name.toLowerCase().includes('blue')
      )
    );
    
    const p1Position = p1Mesh?.position || { x: 0, y: 0, z: 0 };
    const p2Position = p2Mesh?.position || { x: 0, y: 0, z: 0 };
    
    // Add current context to the prompt
    prompt += `\n\nCURRENT CONTEXT (Message #${messageNumber}):
- Scene: ${sceneData.scene}
- Meshes: ${sceneData.meshes.length} objects detected
- P1 Position: (${p1Position.x.toFixed(1)}, ${p1Position.y.toFixed(1)}, ${p1Position.z.toFixed(1)})
- P2 Position: (${p2Position.x.toFixed(1)}, ${p2Position.y.toFixed(1)}, ${p2Position.z.toFixed(1)})
- Your Status: ${agentStatus.status} - ${agentStatus.progress}% progress
- Current Objective: ${agentStatus.currentObjective}

Please analyze the current situation and provide your next action.`;

    return prompt;
  }, [systemPrompt, agentStatus]);

  // Parse AI response for movement commands
  const parseMovementCommands = useCallback((aiResponseText: string, agentId: 'p1' | 'p2') => {
    const commands: string[] = [];
    
    try {
      // Look for JavaScript code blocks
      const codeMatch = aiResponseText.match(/```javascript\n([\s\S]*?)\n```/);
      if (codeMatch && codeMatch[1]) {
        const code = codeMatch[1].trim();
        console.log(`🎮 [CUSTOM SIM] Parsing movement code:`, code);
        
        // Parse movement directions
        const lowerCode = code.toLowerCase();
        
        // Forward movement
        if (lowerCode.includes('forward') || lowerCode.includes('move forward')) {
          commands.push(`moveCube:${agentId}:forward`);
        }
        
        // Backward movement
        if (lowerCode.includes('backward') || lowerCode.includes('move backward')) {
          commands.push(`moveCube:${agentId}:backward`);
        }
        
        // Left movement
        if (lowerCode.includes('left') || lowerCode.includes('move left')) {
          commands.push(`moveCube:${agentId}:left`);
        }
        
        // Right movement
        if (lowerCode.includes('right') || lowerCode.includes('move right')) {
          commands.push(`moveCube:${agentId}:right`);
        }
        
        // Up movement / Jump
        if (lowerCode.includes('up') || lowerCode.includes('move up') || 
            lowerCode.includes('jump')) {
          commands.push(`moveCube:${agentId}:up`);
        }
        
        // Down movement
        if (lowerCode.includes('down') || lowerCode.includes('move down')) {
          commands.push(`moveCube:${agentId}:down`);
        }
        
        // Check for combined jump movements
        if (lowerCode.includes('jump forward')) {
          commands.push(`moveCube:${agentId}:forward`);
          commands.push(`moveCube:${agentId}:up`);
        }
        if (lowerCode.includes('jump backward')) {
          commands.push(`moveCube:${agentId}:backward`);
          commands.push(`moveCube:${agentId}:up`);
        }
        if (lowerCode.includes('jump left')) {
          commands.push(`moveCube:${agentId}:left`);
          commands.push(`moveCube:${agentId}:up`);
        }
        if (lowerCode.includes('jump right')) {
          commands.push(`moveCube:${agentId}:right`);
          commands.push(`moveCube:${agentId}:up`);
        }
        
        console.log(`🎮 [CUSTOM SIM] Generated commands:`, commands);
      }
      
      // If no commands were generated, try to infer from text
      if (commands.length === 0) {
        const lowerText = aiResponseText.toLowerCase();
        if (lowerText.includes('forward') || lowerText.includes('ahead')) {
          commands.push(`moveCube:${agentId}:forward`);
        } else if (lowerText.includes('backward') || lowerText.includes('back')) {
          commands.push(`moveCube:${agentId}:backward`);
        } else if (lowerText.includes('left')) {
          commands.push(`moveCube:${agentId}:left`);
        } else if (lowerText.includes('right')) {
          commands.push(`moveCube:${agentId}:right`);
        } else if (lowerText.includes('jump') || lowerText.includes('up')) {
          commands.push(`moveCube:${agentId}:up`);
        } else {
          // Default movement
          commands.push(`moveCube:${agentId}:forward`);
        }
      }
    } catch (error) {
      console.error(`Error parsing movement commands for ${agentId}:`, error);
      // Fallback: basic forward movement
      commands.push(`moveCube:${agentId}:forward`);
    }
    
    return commands;
  }, []);

  // Execute movement commands
  const executeMovementCommands = useCallback((commands: string[]) => {
    console.log(`🎮 [CUSTOM SIM] Executing movement commands:`, commands);
    commands.forEach(command => {
      const [action, agentId, direction] = command.split(':');
      console.log(`🎮 [CUSTOM SIM] Processing command: ${action} for ${agentId} in direction ${direction}`);
      if (action === 'moveCube' && agentId && direction) {
        // Execute movement using unified viewer control
        if ((window as any).handleUnifiedViewerControl) {
          console.log(`🎮 [CUSTOM SIM] Sending movement command to UnifiedViewer:`, { cube: agentId, direction });
          (window as any).handleUnifiedViewerControl('moveCube', { 
            cube: agentId, 
            direction: direction 
          });
        } else {
          console.warn('🎮 [CUSTOM SIM] handleUnifiedViewerControl not available');
        }
      }
    });
  }, []);

  // Send AI message
  const sendAIMessage = useCallback(async () => {
    if (isLoading) return;
    
    const messageNumber = messageCount + 1;
    setIsLoading(true);
    
    try {
      const currentSceneData = gatherSceneData();
      setSceneData(currentSceneData);
      
      console.log(`🤖 [CUSTOM SIM] Starting AI message processing...`);
      const prompt = createAIPrompt(messageNumber, currentSceneData);
      const aiResponse = await chatService.processChatMessage(
        prompt,
        'custom-simulation-conversation',
        { sceneData: currentSceneData, messageNumber, role: 'p1' }
      );
      
      if (aiResponse.success && aiResponse.data) {
        const aiResponseText = aiResponse.data.message.content || '';
        console.log(`🤖 [CUSTOM SIM] AI response text:`, aiResponseText.substring(0, 100) + '...');
        
        // Send message to system log
        onAIMessage(`🤖 Grok: ${aiResponseText}`, 'p1');
        
        // Parse and execute movement commands
        const p1Mesh = currentSceneData.meshes.find((m: any) => m.name.includes('p1') || m.name.includes('red'));
        const p1Position = p1Mesh?.position || { x: 0, y: 0, z: 0 };
        const commands = parseMovementCommands(aiResponseText, 'p1');
        console.log(`🤖 [CUSTOM SIM] Parsed movement commands:`, commands);
        commands.forEach(command => onMovementCommand(command, 'p1'));
        executeMovementCommands(commands);
        
        // Update agent status
        setAgentStatus(prev => ({
          ...prev,
          status: 'active',
          position: p1Position,
          progress: Math.min(prev.progress + 5, 100) // Increment progress
        }));
        
        // Check if simulation should complete
        if (agentStatus.progress >= 90) {
          console.log('🏁 [CUSTOM SIM] Simulation completed!');
          setIsRunning(false);
          onSimulationComplete({
            success: true,
            progress: agentStatus.progress,
            completionReason: 'Simulation goals achieved',
            finalProgress: agentStatus.progress
          });
        }
      } else {
        console.error(`🤖 [CUSTOM SIM] AI Error:`, aiResponse.error);
        onAIMessage(`❌ AI Error: ${aiResponse.error || 'Service unavailable'}`, 'p1');
      }
      
      setMessageCount(prev => prev + 1);
    } catch (error) {
      console.error('Custom Simulation Error:', error);
      const errorMessage = `Custom Simulation Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      onAIMessage(`❌ ${errorMessage}`, 'p1');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messageCount, gatherSceneData, createAIPrompt, parseMovementCommands, executeMovementCommands, onAIMessage, onMovementCommand, chatService, agentStatus.progress, onSimulationComplete]);

  // Start simulation
  const startSimulation = useCallback(async () => {
    try {
      console.log('🚀 [CUSTOM SIM] Starting custom simulation...');
      setIsRunning(true);
      setMessageCount(0);
      
      // Parse simulation goal
      const parsed = await parseSimulationGoal();
      
      // Generate system prompt
      const prompt = generateSystemPrompt(parsed);
      
      onAIMessage(`🎯 Custom simulation started: ${simulationName}`, 'system');
      onAIMessage(`📝 Goal: ${simulationGoal}`, 'system');
      
      // Start AI communication loop
      intervalRef.current = setInterval(() => {
        if (sendAIMessage) {
          sendAIMessage();
        }
      }, 2000); // Send message every 2 seconds
      
    } catch (error) {
      console.error('❌ [CUSTOM SIM] Failed to start simulation:', error);
      onAIMessage(`❌ Failed to start simulation: ${error}`, 'system');
      setIsRunning(false);
    }
  }, [simulationName, simulationGoal, parseSimulationGoal, generateSystemPrompt, onAIMessage, sendAIMessage]);

  // Stop simulation
  const stopSimulation = useCallback(() => {
    console.log('⏹️ [CUSTOM SIM] Stopping custom simulation...');
    setIsRunning(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    onAIMessage('⏹️ Custom simulation stopped', 'system');
  }, [onAIMessage]);

  // Start/stop AI communication
  useEffect(() => {
    if (isActive && isRunning) {
      console.log('🚀 [CUSTOM SIM] Starting AI communication loop');
    } else {
      console.log('⏹️ [CUSTOM SIM] Stopping AI communication loop');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, isRunning]);

  // Expose control functions globally
  useEffect(() => {
    console.log('🌐 [CUSTOM SIM] Exposing control functions globally');
    (window as any).startCustomSimulation = startSimulation;
    (window as any).stopCustomSimulation = stopSimulation;
    
    return () => {
      console.log('🌐 [CUSTOM SIM] Cleaning up control functions');
      delete (window as any).startCustomSimulation;
      delete (window as any).stopCustomSimulation;
    };
  }, [startSimulation, stopSimulation]);

  // Don't render anything - this is a background service
  return null;
};

export default CustomSimulation;
