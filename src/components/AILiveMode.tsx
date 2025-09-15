import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AICommunicationSystem, CommunicationHelper } from '../ai/communication';
import { ChatService } from '../ai/services/ChatService';
import { getAPIConfig } from '../ai/config/apiConfig';
import { listenForAIResponses, markResponseAsProcessed, saveMeshPositions, fetchMeshPositions, tryBecomeMasterClient, updateMasterHeartbeat, forceBecomeMasterClient, database, ref, onValue, DataSnapshot, type AIResponse, type MeshPositions } from '../firebase';
import MasterClientMonitor from './MasterClientMonitor';

interface AILiveModeProps {
  isActive: boolean;
  onAIMessage: (message: string, agentId: 'p1' | 'p2' | 'system') => void;
  onMovementCommand: (command: string, agentId: 'p1' | 'p2') => void;
  onMasterClientChange?: (isMaster: boolean, clientId: string) => void;
}

const AILiveMode: React.FC<AILiveModeProps> = ({ 
  isActive, 
  onAIMessage, 
  onMovementCommand,
  onMasterClientChange
}) => {
  console.log('🤖 AILiveMode component rendered with props:', { isActive });
  // Communication system
  const [communicationSystem] = useState(() => new AICommunicationSystem({
    maxMessageHistory: 100,
    messageExpirationTime: 30000,
    enableLearning: true,
    enableEmotionalModeling: true,
    enableStrategySharing: true,
    debugMode: false
  }));

  const [p1Helper] = useState(() => new CommunicationHelper('p1', communicationSystem));
  const [p2Helper] = useState(() => new CommunicationHelper('p2', communicationSystem));
  
  // AI services
  const [p1ChatService] = useState(() => new ChatService());
  const [p2ChatService] = useState(() => new ChatService());
  const [apiConfig] = useState(() => getAPIConfig());
  
  // State
  const [isRunning, setIsRunning] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [sceneData, setSceneData] = useState<any>(null);
  const currentSenderRef = useRef<'p1' | 'p2'>('p1');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Firebase state
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  const [firebaseMessageCount, setFirebaseMessageCount] = useState(0);
  const [processedFirebaseResponses, setProcessedFirebaseResponses] = useState<Set<string>>(new Set());
  const firebaseCleanupRef = useRef<(() => void) | null>(null);
  
  // Movement tracking
  const lastPositionsRef = useRef<{
    p1: { x: number; y: number; z: number } | null;
    p2: { x: number; y: number; z: number } | null;
  }>({ p1: null, p2: null });
  
  const stuckCounterRef = useRef<{
    p1: number;
    p2: number;
  }>({ p1: 0, p2: 0 });
  
  // Race state
  const [raceFinished, setRaceFinished] = useState(false);
  const [winner, setWinner] = useState<'p1' | 'p2' | null>(null);
  const finishLineZ = -10; // Define finish line position (negative Z direction)

  // Initialize channels
  useEffect(() => {
    communicationSystem.createChannel('p1-channel', 'P1 Live Communication', ['p1', 'p2'], 10);
    communicationSystem.createChannel('p2-channel', 'P2 Live Communication', ['p1', 'p2'], 10);
  }, [communicationSystem]);

  // Gather scene data from unified viewer
  const gatherSceneData = useCallback(() => {
    try {
      // Try to get scene data from the global scene object (exposed by UnifiedViewer)
      const scene = (window as any).currentScene;
      console.log(`🔍 [SCENE DATA] Global scene object:`, scene);
      console.log(`🔍 [SCENE DATA] Scene meshes:`, scene?.meshes);
      console.log(`🔍 [SCENE DATA] Scene meshes length:`, scene?.meshes?.length);
      console.log(`🔍 [SCENE DATA] All window properties:`, Object.keys(window).filter(key => key.includes('viewer') || key.includes('scene') || key.includes('mesh')));
      
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
              console.warn(`⚠️ [SCENE DATA] Error getting absolute position for ${mesh.name}:`, error);
              if (mesh.position) {
                position = { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z };
              }
            }
          } else if (mesh.position) {
            position = { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z };
          }
          
          // Debug: Log position extraction for important meshes
          if (mesh.name && (mesh.name.toLowerCase().includes('p1') || mesh.name.toLowerCase().includes('p2') || mesh.name.toLowerCase().includes('cube'))) {
            console.log(`🔍 [SCENE DATA] ${mesh.name} position extraction:`, {
              hasGetAbsolutePosition: !!mesh.getAbsolutePosition,
              absolutePosition: mesh.getAbsolutePosition ? mesh.getAbsolutePosition() : 'N/A',
              localPosition: mesh.position,
              finalPosition: position
            });
          }
          
          return {
            name: mesh.name,
            position: position,
            isVisible: mesh.isVisible,
            type: mesh.getClassName ? mesh.getClassName() : 'unknown'
          };
        }).filter((mesh: any) => mesh.name && mesh.name !== 'hdrSkyBox');
        
        console.log(`🔍 [SCENE DATA] Gathered ${meshData.length} meshes:`, meshData.map((m: any) => `${m.name} (${m.position ? `${m.position.x.toFixed(1)}, ${m.position.y.toFixed(1)}, ${m.position.z.toFixed(1)}` : 'no position'})`));
        
        // Debug: Check for P1 and P2 meshes specifically
        const p1Debug = meshData.find((m: any) => m.name && (m.name.toLowerCase().includes('p1') || m.name.toLowerCase().includes('red')));
        const p2Debug = meshData.find((m: any) => m.name && (m.name.toLowerCase().includes('p2') || m.name.toLowerCase().includes('blue')));
        console.log(`🔍 [SCENE DATA] P1 Debug:`, p1Debug ? `${p1Debug.name} at (${p1Debug.position?.x.toFixed(1)}, ${p1Debug.position?.y.toFixed(1)}, ${p1Debug.position?.z.toFixed(1)})` : 'NOT FOUND');
        console.log(`🔍 [SCENE DATA] P2 Debug:`, p2Debug ? `${p2Debug.name} at (${p2Debug.position?.x.toFixed(1)}, ${p2Debug.position?.y.toFixed(1)}, ${p2Debug.position?.z.toFixed(1)})` : 'NOT FOUND');
        
        return {
          meshes: meshData,
          scene: 'scifi.glb', // Default scene name
          timestamp: Date.now()
        };
      }
      
      // Fallback: try to get meshes from other global sources
      console.log(`🔍 [SCENE DATA] No scene found, trying fallback sources...`);
      
      // Try to get meshes from physics objects
      const cubePhysics = (window as any).cubePhysics;
      const p2CubePhysics = (window as any).p2CubePhysics;
      
      if (cubePhysics || p2CubePhysics) {
        console.log(`🔍 [SCENE DATA] Found physics objects, creating fallback mesh data`);
        
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
          scene: 'scifi.glb',
          timestamp: Date.now()
        };
      }
      
      console.warn('🔍 [SCENE DATA] No viewer state available');
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
  }, []);

  // Check if this client is the master (first to save positions)
  const [isMasterClient, setIsMasterClient] = useState<boolean>(false);
  const [clientId] = useState<string>(() => `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if admin mode is enabled
  const isAdminMode = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isAdmin = urlParams.get('admin') === 'true';
    if (isAdmin) {
      console.log('🔧 [Admin Mode] Admin mode detected - Force Master features enabled');
    }
    return isAdmin;
  }, []);

  // Monitor master client status changes
  useEffect(() => {
    if (!isAdminMode()) return;

    console.log(`🔍 [${clientId}] Setting up master client status monitor...`);
    
    // Listen for changes to master client status
    const masterRef = ref(database, 'masterClient');
    const unsubscribe = onValue(masterRef, (snapshot: DataSnapshot) => {
      if (snapshot.exists()) {
        const masterData = snapshot.val();
        console.log(`🔍 [${clientId}] Master client status changed:`, masterData);
        
        if (masterData.clientId === clientId) {
          if (!isMasterClient) {
            console.log(`👑 [${clientId}] Regained master status from Firebase`);
            setIsMasterClient(true);
            onMasterClientChange?.(true, clientId);
          }
        } else {
          if (isMasterClient) {
            console.log(`📖 [${clientId}] Lost master status to: ${masterData.clientId}`);
            setIsMasterClient(false);
            onMasterClientChange?.(false, clientId);
          }
        }
      } else {
        console.log(`🔍 [${clientId}] No master client in Firebase`);
        if (isMasterClient) {
          console.log(`📖 [${clientId}] Lost master status - no master in Firebase`);
          setIsMasterClient(false);
          onMasterClientChange?.(false, clientId);
        }
      }
    });

    return () => {
      console.log(`🔍 [${clientId}] Cleaning up master client status monitor`);
      unsubscribe();
    };
  }, [clientId, isMasterClient, isAdminMode, onMasterClientChange]);


  // Extract mesh positions and save to Firebase (only if master client)
  const saveCurrentMeshPositions = useCallback(async () => {
    // Only save if this client is the master
    if (!isMasterClient) {
      console.log('📖 [Client] Not master client, skipping position save');
      return;
    }

    try {
      const sceneData = gatherSceneData();
      const positions: MeshPositions = {};
      
      sceneData.meshes.forEach((mesh: any) => {
        if (mesh.name && mesh.position) {
          positions[mesh.name] = {
            meshId: mesh.name,
            position: mesh.position,
            timestamp: Date.now()
          };
        }
      });
      
      if (Object.keys(positions).length > 0) {
        await saveMeshPositions(positions);
        console.log(`✅ [Master Client] Saved ${Object.keys(positions).length} mesh positions to Firebase`);
      }
    } catch (error) {
      console.error('❌ Error saving mesh positions:', error);
    }
  }, [gatherSceneData, isMasterClient]);

  // Apply mesh positions from Firebase
  const applyMeshPositions = useCallback(async (positions: MeshPositions) => {
    try {
      console.log('🔍 [applyMeshPositions] Starting with positions:', positions);
      const scene = (window as any).currentScene;
      console.log('🔍 [applyMeshPositions] Scene found:', !!scene);
      console.log('🔍 [applyMeshPositions] Scene meshes:', scene?.meshes?.length);
      
      if (!scene || !scene.meshes) {
        console.warn('⚠️ No scene available to apply mesh positions');
        return;
      }

      let appliedCount = 0;
      scene.meshes.forEach((mesh: any) => {
        console.log(`🔍 [applyMeshPositions] Checking mesh: ${mesh.name}, has position data: ${!!positions[mesh.name]}`);
        if (mesh.name && positions[mesh.name]) {
          const pos = positions[mesh.name].position;
          console.log(`🔍 [applyMeshPositions] Before: ${mesh.name} at (${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}, ${mesh.position.z.toFixed(2)})`);
          mesh.position.set(pos.x, pos.y, pos.z);
          console.log(`🔍 [applyMeshPositions] After: ${mesh.name} at (${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}, ${mesh.position.z.toFixed(2)})`);
          appliedCount++;
          console.log(`📍 Applied position to ${mesh.name}: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`);
        }
      });

      console.log(`✅ Applied positions to ${appliedCount} meshes`);
    } catch (error) {
      console.error('❌ Error applying mesh positions:', error);
    }
  }, []);

  // Check if cube is stuck and get aggressive movement direction
  const checkStuckAndGetAggressiveMovement = useCallback((agentId: 'p1' | 'p2', currentPosition: { x: number; y: number; z: number }) => {
    const lastPosition = lastPositionsRef.current[agentId];
    
    console.log(`🔍 [${agentId.toUpperCase()}] Stuck check - Current:`, currentPosition, 'Last:', lastPosition);
    
    if (!lastPosition) {
      // First time seeing this cube, store position
      lastPositionsRef.current[agentId] = { ...currentPosition };
      console.log(`🔍 [${agentId.toUpperCase()}] First position recorded`);
      return null;
    }
    
    // Calculate distance moved
    const distanceMoved = Math.sqrt(
      Math.pow(currentPosition.x - lastPosition.x, 2) +
      Math.pow(currentPosition.y - lastPosition.y, 2) +
      Math.pow(currentPosition.z - lastPosition.z, 2)
    );
    
    console.log(`🔍 [${agentId.toUpperCase()}] Distance moved: ${distanceMoved.toFixed(2)} (threshold: 0.5)`);
    
    // If moved less than 0.5 units, consider stuck
    if (distanceMoved < 0.5) {
      stuckCounterRef.current[agentId]++;
      console.log(`🚨 [${agentId.toUpperCase()}] STUCK! Counter: ${stuckCounterRef.current[agentId]} (threshold: 2)`);
      
      // After 2 consecutive stuck detections, get aggressive
      if (stuckCounterRef.current[agentId] >= 2) {
        // Calculate opposite direction from last movement
        const deltaX = currentPosition.x - lastPosition.x;
        const deltaZ = currentPosition.z - lastPosition.z;
        
        // Determine aggressive direction
        let aggressiveDirection: string;
        
        if (agentId === 'p2') {
          // P2 racer always prefers RIGHT when stuck (race towards finish line)
          aggressiveDirection = 'right';
          console.log(`🚀 [P2] RACER STUCK - FORCING RIGHT MOVEMENT!`);
        } else {
          // P1 racer also prefers RIGHT when stuck (race towards finish line)
          aggressiveDirection = 'right';
          console.log(`🚀 [P1] RACER STUCK - FORCING RIGHT MOVEMENT!`);
        }
        
        // Reset stuck counter
        stuckCounterRef.current[agentId] = 0;
        
        return {
          direction: aggressiveDirection,
          isAggressive: true,
          reason: `Stuck for ${stuckCounterRef.current[agentId]} cycles, forcing ${aggressiveDirection} movement`
        };
      }
    } else {
      // Cube moved enough, reset stuck counter
      stuckCounterRef.current[agentId] = 0;
      console.log(`✅ [${agentId.toUpperCase()}] Moving well, reset stuck counter`);
    }
    
    // Update last position
    lastPositionsRef.current[agentId] = { ...currentPosition };
    
    return null;
  }, []);

  // Check if cube is close to obstacles (other meshes)
  const checkObstacleProximity = useCallback((agentId: 'p1' | 'p2', currentPosition: { x: number; y: number; z: number }, sceneData: any) => {
    const cubeName = agentId === 'p1' ? 'p1' : 'p2';
    const otherMeshes = sceneData.meshes.filter((mesh: any) => 
      !mesh.name.includes(cubeName) && 
      !mesh.name.includes('red') && 
      !mesh.name.includes('blue') &&
      mesh.name !== 'ground' &&
      mesh.name !== 'floor'
    );
    
    console.log(`🔍 [${agentId.toUpperCase()}] Checking ${otherMeshes.length} potential obstacles`);
    console.log(`🔍 [${agentId.toUpperCase()}] Obstacle names:`, otherMeshes.map((m: any) => m.name));
    
    let closestObstacle = null;
    let minDistance = Infinity;
    
    for (const mesh of otherMeshes) {
      const distance = Math.sqrt(
        Math.pow(currentPosition.x - mesh.position.x, 2) +
        Math.pow(currentPosition.y - mesh.position.y, 2) +
        Math.pow(currentPosition.z - mesh.position.z, 2)
      );
      
      console.log(`🔍 [${agentId.toUpperCase()}] Distance to ${mesh.name}: ${distance.toFixed(2)}`);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestObstacle = mesh;
      }
    }
    
    console.log(`🔍 [${agentId.toUpperCase()}] Closest obstacle: ${closestObstacle?.name} at ${minDistance.toFixed(2)} units (threshold: 2.0)`);
    
    // If within 2 units of an obstacle, consider it close
    if (minDistance < 2.0) {
      console.log(`🚧 [${agentId.toUpperCase()}] CLOSE TO OBSTACLE! Distance: ${minDistance.toFixed(2)}, Obstacle: ${closestObstacle?.name}`);
      return {
        isClose: true,
        distance: minDistance,
        obstacle: closestObstacle
      };
    }
    
    return { isClose: false, distance: minDistance, obstacle: null };
  }, []);

  // Check for race completion
  const checkRaceCompletion = useCallback((p1Position: { x: number; y: number; z: number }, p2Position: { x: number; y: number; z: number }) => {
    if (raceFinished) return;
    
    // Check if either racer has crossed the finish line
    if (p1Position.z <= finishLineZ && p2Position.z <= finishLineZ) {
      // Both crossed, check who's further ahead
      if (p1Position.z < p2Position.z) {
        setWinner('p1');
        onAIMessage(`🏁 RACE FINISHED! P1 (Red Cube) WINS! 🏆`, 'system');
      } else {
        setWinner('p2');
        onAIMessage(`🏁 RACE FINISHED! P2 (Blue Cube) WINS! 🏆`, 'system');
      }
      setRaceFinished(true);
    } else if (p1Position.z <= finishLineZ) {
      setWinner('p1');
      onAIMessage(`🏁 RACE FINISHED! P1 (Red Cube) WINS! 🏆`, 'system');
      setRaceFinished(true);
    } else if (p2Position.z <= finishLineZ) {
      setWinner('p2');
      onAIMessage(`🏁 RACE FINISHED! P2 (Blue Cube) WINS! 🏆`, 'system');
      setRaceFinished(true);
    }
    
    // Log race progress
    const p1Progress = Math.max(0, (finishLineZ - p1Position.z) / Math.abs(finishLineZ) * 100);
    const p2Progress = Math.max(0, (finishLineZ - p2Position.z) / Math.abs(finishLineZ) * 100);
    console.log(`🏁 Race Progress - P1: ${p1Progress.toFixed(1)}%, P2: ${p2Progress.toFixed(1)}%`);
  }, [raceFinished, finishLineZ, onAIMessage]);

  // Create AI prompt with context
  const createAIPrompt = useCallback((agentId: 'p1' | 'p2', messageNumber: number, sceneData: any) => {
    const role = agentId === 'p1' ? 'P1 (Red Cube - Racer)' : 'P2 (Blue Cube - Racer)';
    const opponent = agentId === 'p1' ? 'P2 (Blue Cube)' : 'P1 (Red Cube)';
    
    // Get current positions from scene data (handle null positions)
    // Try multiple name patterns to find the cubes
    const p1Mesh = sceneData.meshes.find((m: any) => 
      m.name && (
        m.name.toLowerCase().includes('p1') || 
        m.name.toLowerCase().includes('red') ||
        m.name.toLowerCase().includes('cube') && m.name.toLowerCase().includes('red') ||
        m.name === 'p1' ||
        m.name === 'red cube' ||
        m.name === 'p1 cube'
      )
    );
    const p2Mesh = sceneData.meshes.find((m: any) => 
      m.name && (
        m.name.toLowerCase().includes('p2') || 
        m.name.toLowerCase().includes('blue') ||
        m.name.toLowerCase().includes('cube') && m.name.toLowerCase().includes('blue') ||
        m.name === 'p2' ||
        m.name === 'blue cube' ||
        m.name === 'p2 cube'
      )
    );
    
    const p1Position = p1Mesh?.position || { x: 0, y: 0, z: 0 };
    const p2Position = p2Mesh?.position || { x: 0, y: 0, z: 0 };
    
    // Debug: Log mesh names and positions
    console.log(`🔍 [${agentId.toUpperCase()}] Scene data meshes:`, sceneData.meshes.map((m: any) => `${m.name}: ${m.position ? `(${m.position.x.toFixed(1)}, ${m.position.y.toFixed(1)}, ${m.position.z.toFixed(1)})` : 'no position'}`));
    console.log(`🔍 [${agentId.toUpperCase()}] P1 mesh:`, p1Mesh?.name, 'Position:', p1Position);
    console.log(`🔍 [${agentId.toUpperCase()}] P2 mesh:`, p2Mesh?.name, 'Position:', p2Position);
    
    // Calculate distance between cubes
    const distance = Math.sqrt(
      Math.pow(p1Position.x - p2Position.x, 2) + 
      Math.pow(p1Position.y - p2Position.y, 2) + 
      Math.pow(p1Position.z - p2Position.z, 2)
    );
    
    // Analyze scene obstacles and environment
    const obstacles = sceneData.meshes.filter((mesh: any) => 
      !mesh.name.includes('p1') && 
      !mesh.name.includes('p2') && 
      !mesh.name.includes('red') && 
      !mesh.name.includes('blue') &&
      mesh.name !== 'ground' &&
      mesh.name !== 'floor'
    );
    
    // Calculate relative positions and competitive analysis
    const myPosition = agentId === 'p1' ? p1Position : p2Position;
    const opponentPosition = agentId === 'p1' ? p2Position : p1Position;
    
    // Determine who's ahead in the race (closer to finish line)
    const myProgress = Math.abs(myPosition.z - finishLineZ);
    const opponentProgress = Math.abs(opponentPosition.z - finishLineZ);
    const isAhead = myProgress < opponentProgress;
    const leadDistance = Math.abs(myProgress - opponentProgress);
    
    // Analyze nearby obstacles
    const nearbyObstacles = obstacles.filter((obstacle: any) => {
      const obstacleDistance = Math.sqrt(
        Math.pow(myPosition.x - obstacle.position.x, 2) +
        Math.pow(myPosition.y - obstacle.position.y, 2) +
        Math.pow(myPosition.z - obstacle.position.z, 2)
      );
      return obstacleDistance < 3.0; // Within 3 units
    });
    
    const raceInstructions = agentId === 'p1' ? `
RACER STRATEGY (P1 - Red Cube):
- You are a RACER - your goal is to REACH THE FINISH LINE FIRST
- Current distance to opponent: ${distance.toFixed(2)} units
- OPPONENT P2 POSITION: (X: ${p2Position.x.toFixed(1)}, Y: ${p2Position.y.toFixed(1)}, Z: ${p2Position.z.toFixed(1)})
- YOUR POSITION: (X: ${p1Position.x.toFixed(1)}, Y: ${p1Position.y.toFixed(1)}, Z: ${p1Position.z.toFixed(1)})
- RACE STATUS: ${isAhead ? `You're AHEAD by ${leadDistance.toFixed(1)} units!` : `You're BEHIND by ${leadDistance.toFixed(1)} units!`}
- SCENE ANALYSIS: ${obstacles.length} obstacles detected, ${nearbyObstacles.length} nearby obstacles
- NEARBY OBSTACLES: ${nearbyObstacles.map((o: any) => `${o.name} (${Math.sqrt(Math.pow(myPosition.x - o.position.x, 2) + Math.pow(myPosition.y - o.position.y, 2) + Math.pow(myPosition.z - o.position.z, 2)).toFixed(1)} units)`).join(', ') || 'None'}
- STRATEGY: MOVE CONSISTENTLY TO THE RIGHT! Race towards the finish line
- Use RIGHT movement 60% of the time to advance towards the finish line
- Use JUMP movements 30% of the time - JUMP FREQUENTLY to overcome obstacles and gain speed
- Use FORWARD movement 10% of the time for direct advancement
- Be AGGRESSIVE - constantly move right and JUMP to get ahead
- JUMP OFTEN: "jump right", "jump forward", "jump left" - jumping is your primary evasion tactic
- When stuck, near obstacles, or want to gain speed - ALWAYS JUMP
- Combine movements: jump right, jump forward for obstacle navigation
- ALWAYS BE RACING RIGHT AND JUMPING - use jumping to overcome obstacles and gain advantage!
- COMPETITIVE FOCUS: Monitor P2's position and adjust strategy accordingly!
- MANDATORY: Include P2's position (X: ${p2Position.x.toFixed(1)}, Y: ${p2Position.y.toFixed(1)}, Z: ${p2Position.z.toFixed(1)}) in your response!` : `
RACER STRATEGY (P2 - Blue Cube):
- You are a RACER - your goal is to REACH THE FINISH LINE FIRST
- Current distance to opponent: ${distance.toFixed(2)} units
- OPPONENT P1 POSITION: (X: ${p1Position.x.toFixed(1)}, Y: ${p1Position.y.toFixed(1)}, Z: ${p1Position.z.toFixed(1)})
- YOUR POSITION: (X: ${p2Position.x.toFixed(1)}, Y: ${p2Position.y.toFixed(1)}, Z: ${p2Position.z.toFixed(1)})
- RACE STATUS: ${isAhead ? `You're AHEAD by ${leadDistance.toFixed(1)} units!` : `You're BEHIND by ${leadDistance.toFixed(1)} units!`}
- SCENE ANALYSIS: ${obstacles.length} obstacles detected, ${nearbyObstacles.length} nearby obstacles
- NEARBY OBSTACLES: ${nearbyObstacles.map((o: any) => `${o.name} (${Math.sqrt(Math.pow(myPosition.x - o.position.x, 2) + Math.pow(myPosition.y - o.position.y, 2) + Math.pow(myPosition.z - o.position.z, 2)).toFixed(1)} units)`).join(', ') || 'None'}
- STRATEGY: MOVE CONSISTENTLY TO THE RIGHT! Race towards the finish line
- Use RIGHT movement 60% of the time to advance towards the finish line
- Use JUMP movements 30% of the time - JUMP FREQUENTLY to overcome obstacles and gain speed
- Use FORWARD movement 10% of the time for direct advancement
- Be COMPETITIVE - constantly move right and JUMP to get ahead
- JUMP OFTEN: "jump right", "jump forward", "jump left" - jumping is your primary evasion tactic
- When stuck, near obstacles, or want to gain speed - ALWAYS JUMP
- Combine movements: jump right, jump forward for obstacle navigation
- ALWAYS BE RACING RIGHT AND JUMPING - use jumping to overcome obstacles and gain advantage!
- COMPETITIVE FOCUS: Monitor P1's position and adjust strategy accordingly!
- MANDATORY: Include P1's position (X: ${p1Position.x.toFixed(1)}, Y: ${p1Position.y.toFixed(1)}, Z: ${p1Position.z.toFixed(1)}) in your response!
- REMEMBER: Move right consistently, jump when stuck or near obstacles!`;
    
    return `You are ${role} in a 3D RACING GAME. You are racing against ${opponent}.

IMPORTANT COORDINATE SYSTEM MAPPING:
- X+ (positive X) = FORWARD direction (towards finish line)
- X- (negative X) = BACKWARD direction (away from finish line)  
- Z+ (positive Z) = RIGHT direction (lateral movement)
- Z- (negative Z) = LEFT direction (lateral movement)
- Y+ (positive Y) = UP direction (jumping)
- Y- (negative Y) = DOWN direction (falling)

CRITICAL: In this racing game, X+ is treated as the primary "forward" direction towards the finish line.

MESSAGE #${messageNumber}

CURRENT RACE STATE:
- Scene: ${sceneData.scene}
- Meshes: ${sceneData.meshes.length} objects detected (including obstacles)
- Your role: ${role}
- Race objective: REACH THE FINISH LINE FIRST - THE FINISH LINE IS ALL THE WAY TO THE RIGHT (positive X direction)
- Your goal is to reach the rightmost edge of the track to win the race
- The further right you go, the closer you are to victory

${raceInstructions}

ANALYTICAL RESPONSE REQUIREMENTS:
You MUST provide a detailed analytical response that includes:

1. SCENE ANALYSIS:
   - Describe the obstacles you can see and their positions
   - Analyze how these obstacles affect your racing path
   - Comment on the overall racing environment

2. OPPONENT ANALYSIS:
   - Analyze your opponent's current position and movement pattern
   - Discuss their strategy and predict their next moves
   - Compare your progress to theirs
   - MANDATORY: Include opponent's exact position coordinates (X, Y, Z) in your response

3. STRATEGIC DECISION:
   - Explain your tactical reasoning for your next move
   - Discuss why you're choosing this specific action
   - Consider how this move affects your race position

4. COMPETITIVE OBSERVATION:
   - Share your thoughts on the current race situation
   - Discuss what you're observing about the competition
   - React to your opponent's previous actions

EXAMPLE RESPONSE FORMAT:
"I can see several obstacles ahead including [obstacle names] at positions [coordinates]. My opponent P2 is currently at position (X: 1.2, Y: 0.5, Z: 2.1) and appears to be [strategy]. Based on my analysis, I need to [tactical reasoning] because [reasoning]. I'm going to move forward to [goal]."

CORRECT TERMINOLOGY EXAMPLES:
- ✅ "I'm going to move forward to reach the finish line" (when moving RIGHT)
- ✅ "I need to adjust left to avoid the obstacle" (when moving LEFT)
- ✅ "I'm going to move left to position myself better" (when moving FORWARD)
- ❌ NEVER say "I'm going to move right" - always say "move forward" instead

MANDATORY REQUIREMENT: You MUST include your opponent's exact position coordinates in EVERY response. Format: "My opponent [P1/P2] is currently at position (X: [x], Y: [y], Z: [z])"

CRITICAL TERMINOLOGY RULES:
- NEVER say "moved right" - always say "moved forward" when moving RIGHT (towards finish line)
- NEVER say "moved right" - always say "moved forward" when moving RIGHT (towards finish line)
- When you move RIGHT (towards finish line), ALWAYS say "moved forward" or "racing forward"
- When you move LEFT (away from finish line), say "moved left" or "adjusted left"
- When you move FORWARD (negative Z), say "moved left" or "adjusted left" (lateral movement)
- When you move BACKWARD (positive Z), say "moved right" or "adjusted right" (lateral movement)
- When you JUMP, say "jumped forward", "jumped left", etc.

REMEMBER: RIGHT = FORWARD (towards finish line), so NEVER say "moved right" - always say "moved forward"!

IMPORTANT: You MUST include JavaScript code to move your cube. Use this format:
\`\`\`javascript
// Move [your cube color] cube [direction/action]
// Examples: 
// Move red cube right (this moves forward towards finish line)
// Move blue cube jump right (this jumps forward towards finish line) - JUMP OFTEN!
// Move red cube jump forward (this jumps left - lateral movement) - JUMP OFTEN!
// Move blue cube jump left (this jumps left) - JUMP OFTEN!
// Move red cube up (this jumps up) - JUMP FREQUENTLY!
// Move blue cube jump right (this jumps forward) - JUMP FREQUENTLY!
\`\`\`

ALTERNATIVE: You can also return a JSON response with your analysis and movement command:
\`\`\`json
{
  "analysis": "I can see obstacles ahead and my opponent P2 is at position (X: 1.2, Y: 0.5, Z: 2.1). I need to jump forward to overcome obstacles and maintain my lead.",
  "movement": "jump right",
  "reasoning": "Jumping forward (jump right) to clear obstacles and gain speed advantage",
  "opponent_position": "P2 is at (X: 1.2, Y: 0.5, Z: 2.1)"
}
\`\`\`

NOTE: In your response text, refer to RIGHT movements as "forward" since right is the direction towards the finish line.

Be analytical, strategic, and competitive! Provide detailed observations and tactical analysis, not just simple movement statements!`;
  }, []);

  // Parse AI response for movement commands
  const parseMovementCommands = useCallback((aiResponseText: string, agentId: 'p1' | 'p2', currentPosition?: { x: number; y: number; z: number }, sceneData?: any) => {
    const commands: string[] = [];
    
    try {
      // Check if cube is stuck and needs aggressive movement
      if (currentPosition) {
        console.log(`🔍 [${agentId.toUpperCase()}] Checking stuck movement for position:`, currentPosition);
        const aggressiveMovement = checkStuckAndGetAggressiveMovement(agentId, currentPosition);
        if (aggressiveMovement) {
          console.log(`🚀 [${agentId.toUpperCase()}] AGGRESSIVE MOVEMENT TRIGGERED:`, aggressiveMovement);
          commands.push(`moveCube:${agentId}:${aggressiveMovement.direction}`);
          return commands;
        }
      }
      
      // Check if cube is close to obstacles and needs evasion
      if (currentPosition && sceneData) {
        console.log(`🔍 [${agentId.toUpperCase()}] Checking obstacle proximity for position:`, currentPosition);
        console.log(`🔍 [${agentId.toUpperCase()}] Scene data meshes:`, sceneData.meshes.length);
        const obstacleCheck = checkObstacleProximity(agentId, currentPosition, sceneData);
        console.log(`🔍 [${agentId.toUpperCase()}] Obstacle check result:`, obstacleCheck);
        if (obstacleCheck.isClose) {
          console.log(`🚧 [${agentId.toUpperCase()}] OBSTACLE EVASION TRIGGERED!`);
          // Prefer jumping when near obstacles
          const evasionCommands = ['up', 'up', 'up', 'right', 'forward'];
          const randomEvasion = evasionCommands[Math.floor(Math.random() * evasionCommands.length)];
          console.log(`🚧 [${agentId.toUpperCase()}] Chosen evasion: ${randomEvasion}`);
          commands.push(`moveCube:${agentId}:${randomEvasion}`);
          return commands;
        }
      }
      
      // Look for JavaScript code blocks
      const codeMatch = aiResponseText.match(/```javascript\n([\s\S]*?)\n```/);
      if (codeMatch && codeMatch[1]) {
        const code = codeMatch[1].trim();
        console.log(`🎮 [${agentId.toUpperCase()}] Parsing movement code:`, code);
        
        // Parse movement directions with more intelligent detection
        const lowerCode = code.toLowerCase();
        
        // Forward movement
        if (lowerCode.includes('forward') || lowerCode.includes('move forward') || 
            lowerCode.includes('chase') || lowerCode.includes('pursue') || 
            lowerCode.includes('towards') || lowerCode.includes('approach')) {
          commands.push(`moveCube:${agentId}:forward`);
        }
        
        // Backward movement
        if (lowerCode.includes('backward') || lowerCode.includes('move backward') || 
            lowerCode.includes('retreat') || lowerCode.includes('back away') || 
            lowerCode.includes('escape') || lowerCode.includes('flee')) {
          commands.push(`moveCube:${agentId}:backward`);
        }
        
        // Left movement
        if (lowerCode.includes('left') || lowerCode.includes('move left') || 
            lowerCode.includes('sidestep left') || lowerCode.includes('strafe left') ||
            lowerCode.includes('dodge left') || lowerCode.includes('weave left') ||
            lowerCode.includes('zig left') || lowerCode.includes('swerve left')) {
          commands.push(`moveCube:${agentId}:left`);
        }
        
        // Right movement
        if (lowerCode.includes('right') || lowerCode.includes('move right') || 
            lowerCode.includes('sidestep right') || lowerCode.includes('strafe right') ||
            lowerCode.includes('dodge right') || lowerCode.includes('weave right') ||
            lowerCode.includes('zig right') || lowerCode.includes('swerve right')) {
          commands.push(`moveCube:${agentId}:right`);
        }
        
        // Up movement / Jump
        if (lowerCode.includes('up') || lowerCode.includes('move up') || 
            lowerCode.includes('jump') || lowerCode.includes('ascend') ||
            lowerCode.includes('leap') || lowerCode.includes('hop')) {
          commands.push(`moveCube:${agentId}:up`);
        }
        
        // Down movement
        if (lowerCode.includes('down') || lowerCode.includes('move down') || 
            lowerCode.includes('descend') || lowerCode.includes('duck')) {
          commands.push(`moveCube:${agentId}:down`);
        }
        
        // Check for combined jump movements
        if (lowerCode.includes('jump forward') || lowerCode.includes('leap forward')) {
          commands.push(`moveCube:${agentId}:forward`);
          commands.push(`moveCube:${agentId}:up`);
        }
        if (lowerCode.includes('jump backward') || lowerCode.includes('leap backward')) {
          commands.push(`moveCube:${agentId}:backward`);
          commands.push(`moveCube:${agentId}:up`);
        }
        if (lowerCode.includes('jump left') || lowerCode.includes('leap left')) {
          commands.push(`moveCube:${agentId}:left`);
          commands.push(`moveCube:${agentId}:up`);
        }
        if (lowerCode.includes('jump right') || lowerCode.includes('leap right')) {
          commands.push(`moveCube:${agentId}:right`);
          commands.push(`moveCube:${agentId}:up`);
        }
        
        // If no specific direction found, try to infer from context with RIGHT MOVEMENT PRIORITY
        if (commands.length === 0) {
          if (agentId === 'p1' && (lowerCode.includes('race') || lowerCode.includes('right') || lowerCode.includes('finish'))) {
            // P1 Racer: Prioritize right movement 80% of the time, forward 20%
            const p1RacerDirections = ['right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'forward', 'forward'];
            const randomDirection = p1RacerDirections[Math.floor(Math.random() * p1RacerDirections.length)];
            commands.push(`moveCube:${agentId}:${randomDirection}`);
          } else if (agentId === 'p2' && (lowerCode.includes('race') || lowerCode.includes('right') || lowerCode.includes('finish'))) {
            // P2 Racer: Prioritize right movement 80% of the time, forward 20%
            const p2RacerDirections = ['right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'forward', 'forward'];
            const randomDirection = p2RacerDirections[Math.floor(Math.random() * p2RacerDirections.length)];
            commands.push(`moveCube:${agentId}:${randomDirection}`);
          } else {
            // Default: Prioritize right movement for racing
            const defaultDirections = ['right', 'right', 'right', 'right', 'right', 'forward'];
            const randomDirection = defaultDirections[Math.floor(Math.random() * defaultDirections.length)];
            commands.push(`moveCube:${agentId}:${randomDirection}`);
          }
        }
        
        console.log(`🎮 [${agentId.toUpperCase()}] Generated commands:`, commands);
      }
      
      // If no commands were generated from AI response, force a movement
      if (commands.length === 0) {
        console.log(`⚠️ [${agentId.toUpperCase()}] No commands generated from AI response, forcing movement`);
        // Force right movement as default
        commands.push(`moveCube:${agentId}:right`);
      }
    } catch (error) {
      console.error(`Error parsing movement commands for ${agentId}:`, error);
      // Fallback: force right movement on error
      commands.push(`moveCube:${agentId}:right`);
    }
    
    return commands;
  }, []);

  // Execute movement commands
  const executeMovementCommands = useCallback((commands: string[]) => {
    console.log(`🎮 Executing movement commands:`, commands);
    commands.forEach(command => {
      const [action, agentId, direction] = command.split(':');
      console.log(`🎮 Processing command: ${action} for ${agentId} in direction ${direction}`);
      if (action === 'moveCube' && agentId && direction) {
        // Execute movement using unified viewer control
        if ((window as any).handleUnifiedViewerControl) {
          console.log(`🎮 Sending movement command to UnifiedViewer:`, { cube: agentId, direction });
          (window as any).handleUnifiedViewerControl('moveCube', { 
            cube: agentId, 
            direction: direction 
          });
        } else {
          console.warn('🎮 handleUnifiedViewerControl not available');
        }
      }
    });
  }, []);

  // Process Firebase AI response
  const processFirebaseAIResponse = useCallback(async (response: AIResponse) => {
    if (!response.id || processedFirebaseResponses.has(response.id)) {
      return; // Already processed
    }

    try {
      console.log(`🔥 [Firebase] Processing AI response from ${response.agentId}:`, {
        id: response.id,
        success: response.success,
        hasData: !!response.data,
        timestamp: response.timestamp
      });

      // Mark as processed to avoid duplicate processing
      setProcessedFirebaseResponses(prev => new Set(prev).add(response.id!));
      setFirebaseMessageCount(prev => prev + 1);

      // Call the callback with the response
      if (response.agentId && response.success && response.data) {
        const aiResponseText = response.data.message.content || '';
        console.log(`🔥 [${response.agentId.toUpperCase()}] Received AI response from Firebase:`, aiResponseText.substring(0, 100) + '...');

        // Send AI message to UI
        onAIMessage(`🤖 ${response.agentId.toUpperCase()}: ${aiResponseText}`, response.agentId);

        // Parse and execute movement commands for P1 and P2
        if (response.agentId === 'p1' || response.agentId === 'p2') {
          const agentId = response.agentId; // Type guard
          const commands = parseMovementCommands(aiResponseText, agentId, { x: 0, y: 0, z: 0 }, sceneData);
          console.log(`🔥 [${agentId.toUpperCase()}] Parsed movement commands:`, commands);
          commands.forEach(command => onMovementCommand(command, agentId));
          executeMovementCommands(commands);
        }
      }

      // Mark response as processed in Firebase
      if (response.id) {
        await markResponseAsProcessed(response.id);
        console.log(`✅ [Firebase] Marked response ${response.id} as processed`);
      }

    } catch (error) {
      console.error(`❌ [Firebase] Error processing AI response:`, error);
    }
  }, [processedFirebaseResponses, onAIMessage, onMovementCommand, parseMovementCommands, executeMovementCommands, sceneData]);

  // Handle new AI responses from Firebase
  const handleFirebaseAIResponses = useCallback((responses: AIResponse[]) => {
    if (!isActive) return;

    console.log(`🔥 [Firebase] Received ${responses.length} AI responses`);
    
    // Process only new responses (not already processed)
    const newResponses = responses.filter(response => 
      response.id && 
      !processedFirebaseResponses.has(response.id) &&
      !response.processed
    );

    console.log(`🔥 [Firebase] Processing ${newResponses.length} new responses`);

    // Process each new response
    newResponses.forEach(response => {
      processFirebaseAIResponse(response);
    });
  }, [isActive, processedFirebaseResponses, processFirebaseAIResponse]);

  // Handle Firebase connection errors
  const handleFirebaseError = useCallback((error: Error) => {
    console.error('🔥 [Firebase] Connection error:', error);
    setIsFirebaseConnected(false);
    onAIMessage(`❌ Firebase Error: ${error.message}`, 'system');
  }, [onAIMessage]);


  // Send AI message - using useRef to avoid dependency issues
  const sendAIMessageRef = useRef<() => Promise<void>>(() => Promise.resolve());
  
  const sendAIMessage = useCallback(async () => {
    if (isLoading) return;
    
    const currentSender = currentSenderRef.current;
    const messageNumber = messageCount + 1;
    
    setIsLoading(true);
    
    try {
      const currentSceneData = gatherSceneData();
      setSceneData(currentSceneData);
      
      // Check for race completion
      const p1Mesh = currentSceneData.meshes.find((m: any) => m.name.includes('p1') || m.name.includes('red'));
      const p2Mesh = currentSceneData.meshes.find((m: any) => m.name.includes('p2') || m.name.includes('blue'));
      const p1Position = p1Mesh?.position || { x: 0, y: 0, z: 0 };
      const p2Position = p2Mesh?.position || { x: 0, y: 0, z: 0 };
      checkRaceCompletion(p1Position, p2Position);
      
      // Stop AI communication if race is finished
      if (raceFinished) {
        console.log(`🏁 Race finished, stopping AI communication`);
        setIsLoading(false);
        return;
      }
      
      // Only one AI responds per cycle
      if (currentSender === 'p1') {
        console.log(`🤖 [P1] Starting P1 AI message processing...`);
        const prompt = createAIPrompt('p1', messageNumber, currentSceneData);
        const aiResponse = await p1ChatService.processChatMessage(
          prompt,
          'p1-live-conversation',
          { sceneData: currentSceneData, messageNumber, role: 'p1' }
        );
        
        if (aiResponse.success && aiResponse.data) {
          const aiResponseText = aiResponse.data.message.content || '';
          console.log(`🤖 [P1] AI response text:`, aiResponseText.substring(0, 100) + '...');
          
          // Send message to system log
          onAIMessage(`🤖 P1: ${aiResponseText}`, 'p1');
          
          // Parse and execute movement commands
          const p1Mesh = currentSceneData.meshes.find((m: any) => m.name.includes('p1') || m.name.includes('red'));
          const p1Position = p1Mesh?.position || { x: 0, y: 0, z: 0 };
          const commands = parseMovementCommands(aiResponseText, 'p1', p1Position, currentSceneData);
          console.log(`🤖 [P1] Parsed movement commands:`, commands);
          commands.forEach(command => onMovementCommand(command, 'p1'));
          executeMovementCommands(commands);
          
          // Save current mesh positions to Firebase after movement
          await saveCurrentMeshPositions();
          
          // Announce intention in communication system
          p1Helper.announceIntention(
            `live_message_${messageNumber}`,
            0.9,
            `🤖 AI Response: ${aiResponseText}`,
            'p1-channel'
          );
        } else {
          console.error(`🤖 [P1] AI Error:`, aiResponse.error);
          onAIMessage(`❌ P1 AI Error: ${aiResponse.error || 'Service unavailable'}`, 'p1');
        }
        // Switch to P2 for next cycle
        currentSenderRef.current = 'p2';
        console.log(`🔄 [TURN] Switching to P2 for next cycle`);
      } else {
        console.log(`🤖 [P2] Starting P2 AI message processing...`);
        const prompt = createAIPrompt('p2', messageNumber, currentSceneData);
        console.log(`🤖 [P2] Created prompt for P2, calling AI service...`);
        
        const aiResponse = await p2ChatService.processChatMessage(
          prompt,
          'p2-live-conversation',
          { sceneData: currentSceneData, messageNumber, role: 'p2' }
        );
        
        console.log(`🤖 [P2] AI response received:`, { success: aiResponse.success, hasData: !!aiResponse.data });
        
        if (aiResponse.success && aiResponse.data) {
          const aiResponseText = aiResponse.data.message.content || '';
          console.log(`🤖 [P2] AI response text:`, aiResponseText.substring(0, 100) + '...');
          
          // Send message to system log
          onAIMessage(`🤖 P2: ${aiResponseText}`, 'p2');
          
          // Parse and execute movement commands
          const p2Mesh = currentSceneData.meshes.find((m: any) => m.name.includes('p2') || m.name.includes('blue'));
          const p2Position = p2Mesh?.position || { x: 0, y: 0, z: 0 };
          const commands = parseMovementCommands(aiResponseText, 'p2', p2Position, currentSceneData);
          console.log(`🤖 [P2] Parsed movement commands:`, commands);
          commands.forEach(command => onMovementCommand(command, 'p2'));
          executeMovementCommands(commands);
          
          // Save current mesh positions to Firebase after movement
          await saveCurrentMeshPositions();
          
          // Announce intention in communication system
          p2Helper.announceIntention(
            `live_message_${messageNumber}`,
            0.9,
            `🤖 AI Response: ${aiResponseText}`,
            'p2-channel'
          );
        } else {
          console.error(`🤖 [P2] AI Error:`, aiResponse.error);
          onAIMessage(`❌ P2 AI Error: ${aiResponse.error || 'Service unavailable'}`, 'p2');
        }
        // Switch to P1 for next cycle
        currentSenderRef.current = 'p1';
        console.log(`🔄 [TURN] Switching to P1 for next cycle`);
      }
      
      setMessageCount(prev => prev + 1);
    } catch (error) {
      console.error('AI Live Mode Error:', error);
      const errorMessage = `AI Live Mode Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      onAIMessage(`❌ ${errorMessage}`, currentSender);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messageCount, gatherSceneData, createAIPrompt, parseMovementCommands, executeMovementCommands, onAIMessage, onMovementCommand, p1Helper, p2Helper, p1ChatService, p2ChatService, saveCurrentMeshPositions]);

  // Store the function in ref to avoid dependency issues
  useEffect(() => {
    sendAIMessageRef.current = sendAIMessage;
  }, [sendAIMessage]);

  // Start/stop AI communication
  useEffect(() => {
    if (isActive && isRunning) {
      console.log('🚀 Starting AI communication loop');
      // Start AI communication loop
      intervalRef.current = setInterval(() => {
        console.log('⏰ AI communication tick');
        if (sendAIMessageRef.current) {
          sendAIMessageRef.current();
        }
      }, 800); // Send message every 0.8 seconds for faster movement
    } else {
      console.log('⏹️ Stopping AI communication loop');
      // Stop AI communication loop
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
  }, [isActive, isRunning]); // Now has stable dependencies

  // Reset race
  const resetRace = useCallback(() => {
    setRaceFinished(false);
    setWinner(null);
    setMessageCount(0);
    lastPositionsRef.current = { p1: null, p2: null };
    stuckCounterRef.current = { p1: 0, p2: 0 };
    onAIMessage('🏁 Race reset! Ready for a new race!', 'system');
  }, [onAIMessage]);

  // Control functions
  const startAI = useCallback(() => {
    console.log('🎮 startAI called, current state:', { isActive, isRunning });
    setIsRunning(true);
    resetRace();
    onAIMessage('🏁 AI Racing Mode started - P1 and P2 are now racing to the finish line!', 'system');
    
    // Emit event for cross-tab communication
    window.dispatchEvent(new CustomEvent('ai-message-sent', { 
      detail: { type: 'system', message: 'AI Racing Mode started' } 
    }));
  }, [onAIMessage, isActive, isRunning, resetRace]);

  const stopAI = useCallback(() => {
    console.log('🎮 stopAI called, current state:', { isActive, isRunning });
    setIsRunning(false);
    onAIMessage('⏹️ AI Live Mode stopped', 'system');
    
    // Emit event for cross-tab communication
    window.dispatchEvent(new CustomEvent('ai-message-sent', { 
      detail: { type: 'system', message: 'AI Live Mode stopped' } 
    }));
  }, [onAIMessage, isActive, isRunning]);

  // Setup Firebase listener (starts automatically when component mounts)
  useEffect(() => {
    const initializeFirebase = async () => {
      console.log('🔥 [Firebase] Initializing Firebase connection...');
      setIsFirebaseConnected(true);

      try {
        // First, try to become the master client
        console.log(`👑 [Firebase] Client ${clientId} attempting to become master...`);
        console.log(`🔍 [Debug] Client ID: ${clientId}`);
        
        try {
          const becameMaster = await tryBecomeMasterClient(clientId, isAdminMode());
          console.log(`🔍 [Debug] tryBecomeMasterClient result: ${becameMaster}`);
          
          if (becameMaster) {
            setIsMasterClient(true);
            console.log(`👑 [Client ${clientId}] Successfully became MASTER CLIENT`);
            onAIMessage(`👑 Client ${clientId} is the MASTER - will save mesh positions`, 'system');
            onMasterClientChange?.(true, clientId);
            
            // Start heartbeat to keep master status alive
            heartbeatIntervalRef.current = setInterval(async () => {
              await updateMasterHeartbeat(clientId);
            }, 10000); // Update every 10 seconds
          } else {
            setIsMasterClient(false);
            console.log(`📖 [Client ${clientId}] Failed to become master - becoming READ-ONLY CLIENT`);
            onAIMessage(`📖 Client ${clientId} is READ-ONLY - will sync to master positions`, 'system');
            onMasterClientChange?.(false, clientId);
          }
        } catch (error) {
          console.error(`❌ [Error] Master client detection failed:`, error);
          setIsMasterClient(false);
          onAIMessage(`❌ Client ${clientId} - Master detection failed, becoming READ-ONLY`, 'system');
          onMasterClientChange?.(false, clientId);
        }
        
        // Then, fetch and apply current mesh positions
        console.log('📍 [Firebase] Fetching current mesh positions...');
        const positions = await fetchMeshPositions();
        
        if (positions) {
          console.log('📍 [Firebase] Applying mesh positions from Firebase...');
          // Add a small delay to ensure scene is fully loaded
          setTimeout(async () => {
            await applyMeshPositions(positions);
            console.log('✅ [Firebase] Mesh positions synchronized');
          }, 1000);
        } else {
          console.log('⚠️ [Firebase] No mesh positions found, using current positions');
        }

        // Then start listening for AI responses
        console.log('🔥 [Firebase] Starting AI response listener...');
        const cleanup = listenForAIResponses(handleFirebaseAIResponses, handleFirebaseError);
        firebaseCleanupRef.current = cleanup;
        
        console.log('✅ [Firebase] Firebase initialization complete');
      } catch (error) {
        console.error('❌ [Firebase] Error during initialization:', error);
        // Still start the AI listener even if position sync fails
        const cleanup = listenForAIResponses(handleFirebaseAIResponses, handleFirebaseError);
        firebaseCleanupRef.current = cleanup;
      }
    };

    initializeFirebase();

    return () => {
      if (firebaseCleanupRef.current) {
        console.log('🔥 [Firebase] Cleaning up AI response listener');
        firebaseCleanupRef.current();
        firebaseCleanupRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        console.log('💓 [Firebase] Cleaning up master heartbeat');
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      setIsFirebaseConnected(false);
    };
  }, [handleFirebaseAIResponses, handleFirebaseError, applyMeshPositions]);

  // Force master client function
  const forceMaster = useCallback(async () => {
    console.log(`🔍 [Force Master] Attempting to force client ${clientId} to become master...`);
    console.log(`🔍 [Force Master] Admin mode: ${isAdminMode()}`);
    try {
      const success = await forceBecomeMasterClient(clientId, isAdminMode());
      console.log(`🔍 [Force Master] Firebase response: ${success}`);
      if (success) {
        setIsMasterClient(true);
        onAIMessage(`👑 Client ${clientId} FORCED to become MASTER`, 'system');
        onMasterClientChange?.(true, clientId);
        
        // Start heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(async () => {
          await updateMasterHeartbeat(clientId);
        }, 10000);
        
        console.log(`✅ [Force Master] Successfully forced client ${clientId} to become master`);
      } else {
        console.error(`❌ [Force Master] Failed to force client ${clientId} to become master`);
        onAIMessage(`❌ Failed to force master status for client ${clientId}`, 'system');
      }
    } catch (error) {
      console.error('❌ [Force Master] Error:', error);
      onAIMessage(`❌ Error forcing master status: ${error}`, 'system');
    }
  }, [clientId, onAIMessage, onMasterClientChange, isAdminMode]);

  // Expose control functions globally
  useEffect(() => {
    console.log('🌐 Exposing AI Live Mode functions globally');
    (window as any).startAILiveMode = startAI;
    (window as any).stopAILiveMode = stopAI;
    
    // Only expose force master function in admin mode
    if (isAdminMode()) {
      (window as any).forceMasterClient = forceMaster;
      console.log('🔧 [Admin Mode] Force Master function exposed');
    }
    
    (window as any).debugAILiveMode = () => {
      console.log('🔍 AI Live Mode Debug Info:', {
        isActive,
        isRunning,
        isLoading,
        messageCount,
        intervalRef: intervalRef.current ? 'active' : 'inactive',
        availableFunctions: {
          startAILiveMode: typeof (window as any).startAILiveMode,
          stopAILiveMode: typeof (window as any).stopAILiveMode
        }
      });
    };
    
    return () => {
      console.log('🌐 Cleaning up AI Live Mode functions');
      delete (window as any).startAILiveMode;
      delete (window as any).stopAILiveMode;
      delete (window as any).forceMasterClient;
      delete (window as any).debugAILiveMode;
    };
  }, [startAI, stopAI, forceMaster, isAdminMode]);

  // Don't render anything - this is a background service
  return null;
};

export default AILiveMode;
