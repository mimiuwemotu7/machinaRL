import { useState, useEffect, useRef, useCallback } from 'react';
import { Vector3, Quaternion } from '@babylonjs/core';

interface GameState {
  status: 'waiting' | 'playing' | 'paused' | 'finished';
  currentTagger: 'p1' | 'p2';
  p1Score: number;
  p2Score: number;
  gameTime: number;
  lastTagTime: number;
  tagCooldown: number;
  gameDuration: number;
  winner?: 'p1' | 'p2' | 'tie';
}

interface TagEvent {
  tagger: 'p1' | 'p2';
  tagged: 'p1' | 'p2';
  timestamp: number;
  position: Vector3;
}

interface UseTagGameProps {
  p1Physics: any;
  p2Physics: any;
  scene: any;
  onGameStateChange?: (state: GameState) => void;
}

const useTagGame = ({ 
  p1Physics, 
  p2Physics, 
  scene, 
  onGameStateChange
}: UseTagGameProps) => {
  // Game state
  const [gameState, setGameState] = useState<GameState>({
    status: 'waiting',
    currentTagger: 'p1',
    p1Score: 0,
    p2Score: 0,
    gameTime: 0,
    lastTagTime: 0,
    tagCooldown: 2000, // 2 seconds cooldown between tags
    gameDuration: 60000, // 60 seconds game duration
  });

  // Store original cube positions
  const [originalPositions, setOriginalPositions] = useState<{
    p1: Vector3 | null;
    p2: Vector3 | null;
  }>({ p1: null, p2: null });


  // Round state management
  const [roundState, setRoundState] = useState<{
    isResetting: boolean;
    resetTimeout: NodeJS.Timeout | null;
    lastCollisionTime: number;
    lastPointAwardTime: number;
  }>({
    isResetting: false,
    resetTimeout: null,
    lastCollisionTime: 0,
    lastPointAwardTime: 0,
  });

  // Game settings
  const [settings, setSettings] = useState({
    tagDistance: 2.0, // Distance required for tag
    gameDuration: 60, // Game duration in seconds
    tagCooldown: 2, // Cooldown in seconds
    autoStart: false,
    showTrails: true,
  });

  // Refs
  const gameLoopRef = useRef<number | undefined>(undefined);
  const gameStartRef = useRef<number | null>(null);
  const isResettingRef = useRef<boolean>(false);
  const lastCollisionTimeRef = useRef<number>(0);
  const lastPointAwardTimeRef = useRef<number>(0);
  const lastTagEventRef = useRef<TagEvent | null>(null);
  const tagHistoryRef = useRef<TagEvent[]>([]);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const positionResetIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Random movement for cubes
  const moveCubesRandomly = useCallback(() => {
    if (!p1Physics?.body || !p2Physics?.body) return;

    const currentTime = Date.now();
    
    try {
    // P1 cube movement - independent timing
    const p1CurrentVelocity = p1Physics.body.getLinearVelocity();
    const p1NewVelocity = p1CurrentVelocity.clone();
    
    // Random direction change every 0.8-1.5 seconds for P1 (much faster)
    const p1ChangeInterval = 800 + Math.random() * 700; // 0.8-1.5 seconds
    if (Math.floor(currentTime / p1ChangeInterval) !== Math.floor((currentTime - 16) / p1ChangeInterval)) {
      const moveSpeed = 4 + Math.random() * 3; // 4-7 speed (faster)
      const angle = Math.random() * Math.PI * 2; // Random angle
      const randomX = Math.cos(angle) * moveSpeed;
      const randomZ = Math.sin(angle) * moveSpeed;
      p1NewVelocity.x = randomX;
      p1NewVelocity.z = randomZ;
      
      // Random jump chance (40% probability, more frequent)
      if (Math.random() < 0.4 && Math.abs(p1CurrentVelocity.y) < 0.5) {
        p1NewVelocity.y = 5 + Math.random() * 3; // 5-8 jump height (higher)
      }
    }
    
    p1Physics.body.setLinearVelocity(new Vector3(p1NewVelocity.x, p1NewVelocity.y, p1NewVelocity.z));

    // P2 cube movement - independent timing
    const p2CurrentVelocity = p2Physics.body.getLinearVelocity();
    const p2NewVelocity = p2CurrentVelocity.clone();
    
    // Random direction change every 0.6-1.2 seconds for P2 (much faster)
    const p2ChangeInterval = 600 + Math.random() * 600; // 0.6-1.2 seconds
    if (Math.floor(currentTime / p2ChangeInterval) !== Math.floor((currentTime - 16) / p2ChangeInterval)) {
      const moveSpeed = 3.5 + Math.random() * 3.5; // 3.5-7 speed (faster)
      const angle = Math.random() * Math.PI * 2; // Random angle
      const randomX = Math.cos(angle) * moveSpeed;
      const randomZ = Math.sin(angle) * moveSpeed;
      p2NewVelocity.x = randomX;
      p2NewVelocity.z = randomZ;
      
      // Random jump chance (35% probability, more frequent)
      if (Math.random() < 0.35 && Math.abs(p2CurrentVelocity.y) < 0.5) {
        p2NewVelocity.y = 4.5 + Math.random() * 3.5; // 4.5-8 jump height (higher)
      }
    }
    
    p2Physics.body.setLinearVelocity(new Vector3(p2NewVelocity.x, p2NewVelocity.y, p2NewVelocity.z));
    } catch (error) {
      // Physics bodies were disposed or are invalid, skip this update
      console.log('⚠️ Physics bodies disposed or invalid, skipping random movement update');
      return;
    }
  }, [p1Physics, p2Physics]);

  // Visual tag effect
  const showTagEffect = useCallback((tagEvent: TagEvent) => {
    if (!scene) return;

    // Create temporary visual effect at tag position
    const effect = scene.getMeshByName('tagEffect');
    if (effect) {
      effect.dispose();
    }

    // You could add particle effects, sound, or other visual feedback here
    console.log(`🎯 TAG! ${tagEvent.tagger} tagged ${tagEvent.tagged} at position:`, tagEvent.position);
  }, [scene]);

  // Store original positions when game starts
  const storeOriginalPositions = useCallback(() => {
    console.log('🔍 storeOriginalPositions called with:', {
      p1Physics: !!p1Physics,
      p2Physics: !!p2Physics,
      p1Body: !!p1Physics?.body,
      p2Body: !!p2Physics?.body,
      scene: !!scene
    });

    // Try to ensure physics bodies exist
    if (!p1Physics?.body || !p2Physics?.body) {
      console.log('❌ Cannot store original positions: Missing physics bodies');
      return;
    }

    // Try to get transform nodes from physics aggregates; fall back to scene lookup
    let p1Mesh: any = p1Physics.transformNode;
    let p2Mesh: any = p2Physics.transformNode;

    console.log('🔍 Initial mesh lookup:', {
      p1TransformNode: !!p1Mesh,
      p2TransformNode: !!p2Mesh,
      p1MeshName: p1Mesh?.name,
      p2MeshName: p2Mesh?.name
    });

    if (!p1Mesh && scene) {
      p1Mesh = scene.getMeshByName('p1') || scene.meshes.find((m: any) => m.name && m.name.toLowerCase().includes('p1'));
      console.log('🔍 P1 fallback lookup:', { found: !!p1Mesh, name: p1Mesh?.name });
    }
    if (!p2Mesh && scene) {
      p2Mesh = scene.getMeshByName('p2') || scene.meshes.find((m: any) => m.name && m.name.toLowerCase().includes('p2'));
      console.log('🔍 P2 fallback lookup:', { found: !!p2Mesh, name: p2Mesh?.name });
    }

    if (!p1Mesh || !p2Mesh) {
      console.log('❌ Cannot store original positions: Missing mesh objects (tried physics.transformNode and scene lookup)');
      console.log('🔍 Available meshes:', scene?.meshes?.map((m: any) => m.name) || 'No scene');
      return;
    }

  // Find top-most ancestor for each mesh to capture GLB world transform
    const topAncestor = (m: any) => {
      let cur = m;
      const chain: string[] = [cur.name || '<unnamed>'];
      while (cur.parent) {
        cur = cur.parent;
        chain.push(cur.name || '<unnamed>');
      }
      return { node: cur, chain };
    };

    const p1Top = topAncestor(p1Mesh);
    const p2Top = topAncestor(p2Mesh);

    const p1Pos = (p1Top.node.getAbsolutePosition ? p1Top.node.getAbsolutePosition() : p1Mesh.getAbsolutePosition()).clone();
    const p2Pos = (p2Top.node.getAbsolutePosition ? p2Top.node.getAbsolutePosition() : p2Mesh.getAbsolutePosition()).clone();

    console.log('🔎 p1 parent chain:', p1Top.chain.join(' <- '));
    console.log('🔎 p2 parent chain:', p2Top.chain.join(' <- '));

    console.log('📍 About to store original positions:', { p1: p1Pos, p2: p2Pos });
    setOriginalPositions({ p1: p1Pos, p2: p2Pos });
    console.log('✅ Original positions stored successfully');
  }, [p1Physics, p2Physics, scene]);

  // Reset cubes to original positions
  const resetCubesToOriginalPositions = useCallback(() => {
    if (!p1Physics?.body || !p2Physics?.body || !originalPositions.p1 || !originalPositions.p2) {
      console.log('❌ Cannot reset: Missing physics or original positions');
      return;
    }

    // Find meshes (prefer physics.transformNode, fallback to scene lookup)
    let p1Mesh: any = p1Physics.transformNode;
    let p2Mesh: any = p2Physics.transformNode;

    if ((!p1Mesh || !p2Mesh) && scene) {
      p1Mesh = p1Mesh || scene.getMeshByName('p1') || scene.meshes.find((m: any) => m.name && m.name.toLowerCase().includes('p1'));
      p2Mesh = p2Mesh || scene.getMeshByName('p2') || scene.meshes.find((m: any) => m.name && m.name.toLowerCase().includes('p2'));
    }

    if (!p1Mesh || !p2Mesh) {
      console.log('❌ Cannot reset: Mesh objects not found for reset');
      return;
    }

    try {
      // Reset positions to original GLB positions
      p1Mesh.position = originalPositions.p1.clone();
      p2Mesh.position = originalPositions.p2.clone();

      // Log current velocities before reset
      try {
        const v1 = p1Physics.body.getLinearVelocity();
        const v2 = p2Physics.body.getLinearVelocity();
        console.log('   → pre-reset velocities:', { p1: v1, p2: v2 });
      } catch (e) {
        // ignore
      }

      // Zero velocities immediately
      try {
        p1Physics.body.setLinearVelocity(Vector3.Zero());
        p2Physics.body.setLinearVelocity(Vector3.Zero());
        p1Physics.body.setAngularVelocity(Vector3.Zero());
        p2Physics.body.setAngularVelocity(Vector3.Zero());
      } catch (e) {
        console.warn('   → failed to zero velocities on bodies', e);
      }

      // Force physics body to update position (teleport)
      try {
        p1Physics.body.setTransform(p1Mesh.position, p1Mesh.rotationQuaternion || new Quaternion());
        p2Physics.body.setTransform(p2Mesh.position, p2Mesh.rotationQuaternion || new Quaternion());
      } catch (e) {
        console.warn('   → failed to setTransform on bodies', e);
      }

      console.log('🔄 Reset cubes to original positions (initial apply):', {
        p1: originalPositions.p1,
        p2: originalPositions.p2
      });

      // Re-apply after a short delay to ensure physics engine acknowledges the teleport
      setTimeout(() => {
        try {
          p1Physics.body.setLinearVelocity(Vector3.Zero());
          p2Physics.body.setLinearVelocity(Vector3.Zero());
          p1Physics.body.setAngularVelocity(Vector3.Zero());
          p2Physics.body.setAngularVelocity(Vector3.Zero());
          p1Physics.body.setTransform(p1Mesh.position, p1Mesh.rotationQuaternion || new Quaternion());
          p2Physics.body.setTransform(p2Mesh.position, p2Mesh.rotationQuaternion || new Quaternion());
          console.log('🔁 Re-applied reset transforms and zeroed velocities');
        } catch (e) {
          console.warn('   → re-apply reset failed', e);
        }
      }, 50);
    } catch (err) {
      console.error('❌ Error while resetting cube positions:', err);
    }
  }, [p1Physics, p2Physics, originalPositions]);

  // Reset cubes to hardcoded positions (fallback)
  const resetCubesToHardcodedPositions = useCallback(() => {
    if (!p1Physics?.body || !p2Physics?.body) {
      console.log('❌ Cannot reset: Missing physics bodies');
      return;
    }

    // Find meshes (prefer physics.transformNode, fallback to scene lookup)
    let p1Mesh: any = p1Physics.transformNode;
    let p2Mesh: any = p2Physics.transformNode;

    if ((!p1Mesh || !p2Mesh) && scene) {
      p1Mesh = p1Mesh || scene.getMeshByName('p1') || scene.meshes.find((m: any) => m.name && m.name.toLowerCase().includes('p1'));
      p2Mesh = p2Mesh || scene.getMeshByName('p2') || scene.meshes.find((m: any) => m.name && m.name.toLowerCase().includes('p2'));
    }

    if (!p1Mesh || !p2Mesh) {
      console.log('❌ Cannot reset: Mesh objects not found for reset');
      return;
    }

    try {
      // Reset positions to hardcoded positions near original spawn but separated
      const p1Pos = new Vector3(-1, 0.5, 0); // P1 slightly left of center
      const p2Pos = new Vector3(1, 0.5, 0);  // P2 slightly right of center
      p1Mesh.position = p1Pos.clone();
      p2Mesh.position = p2Pos.clone();

      // Zero velocities immediately
      try {
        p1Physics.body.setLinearVelocity(Vector3.Zero());
        p2Physics.body.setLinearVelocity(Vector3.Zero());
        p1Physics.body.setAngularVelocity(Vector3.Zero());
        p2Physics.body.setAngularVelocity(Vector3.Zero());
      } catch (e) {
        console.warn('   → failed to zero velocities on bodies', e);
      }

      // Force physics body to update position (teleport)
      try {
        p1Physics.body.setTransform(p1Mesh.position, p1Mesh.rotationQuaternion || new Quaternion());
        p2Physics.body.setTransform(p2Mesh.position, p2Mesh.rotationQuaternion || new Quaternion());
      } catch (e) {
        console.warn('   → failed to setTransform on bodies', e);
      }

      console.log('🔄 Reset cubes to hardcoded positions: P1(-1,0.5,0), P2(1,0.5,0)');

      // Re-apply after a short delay to ensure physics engine acknowledges the teleport
      setTimeout(() => {
        try {
          p1Physics.body.setLinearVelocity(Vector3.Zero());
          p2Physics.body.setLinearVelocity(Vector3.Zero());
          p1Physics.body.setAngularVelocity(Vector3.Zero());
          p2Physics.body.setAngularVelocity(Vector3.Zero());
          p1Physics.body.setTransform(p1Mesh.position, p1Mesh.rotationQuaternion || new Quaternion());
          p2Physics.body.setTransform(p2Mesh.position, p2Mesh.rotationQuaternion || new Quaternion());
          console.log('🔁 Re-applied hardcoded reset transforms and zeroed velocities');
        } catch (e) {
          console.warn('   → re-apply reset failed', e);
        }
      }, 50);
    } catch (err) {
      console.error('❌ Error while resetting cube positions to hardcoded:', err);
    }
  }, [p1Physics, p2Physics, scene]);

  // Simple mesh separation after tag
  const separateMeshesAfterTag = useCallback((tagger: string, tagged: string) => {
    if (!p1Physics?.body || !p2Physics?.body) {
      console.log('❌ Cannot separate: Missing physics bodies');
      return;
    }

    try {
      // Get current positions
      const p1Pos = p1Physics.transformNode?.getAbsolutePosition() || p1Physics.transformNode?.position || Vector3.Zero();
      const p2Pos = p2Physics.transformNode?.getAbsolutePosition() || p2Physics.transformNode?.position || Vector3.Zero();
      
       // Calculate separation direction
       const direction = p1Pos.subtract(p2Pos).normalize();
       const separationDistance = 5.0; // Push them 5 units apart to ensure they're well separated
      
      // Apply separation force
      const separationForce = direction.scale(separationDistance);
      
      // Push the tagged player away from the tagger
      if (tagged === 'p1') {
        // P1 was tagged, push P1 away from P2
        const p1NewPos = p1Pos.add(separationForce);
        p1Physics.transformNode!.position = p1NewPos;
        p1Physics.transformNode!.computeWorldMatrix(true);
      } else {
        // P2 was tagged, push P2 away from P1
        const p2NewPos = p2Pos.subtract(separationForce);
        p2Physics.transformNode!.position = p2NewPos;
        p2Physics.transformNode!.computeWorldMatrix(true);
      }
      
      // Zero out velocities to prevent sliding
      p1Physics.body.setLinearVelocity(Vector3.Zero());
      p1Physics.body.setAngularVelocity(Vector3.Zero());
      p2Physics.body.setLinearVelocity(Vector3.Zero());
      p2Physics.body.setAngularVelocity(Vector3.Zero());
      
      console.log('✅ Meshes separated after tag');
    } catch (error) {
      console.warn('Failed to separate meshes:', error);
    }
  }, [p1Physics, p2Physics]);

  // Check if cubes are properly separated
  const areCubesSeparated = useCallback(() => {
    if (!p1Physics?.transformNode || !p2Physics?.transformNode) return false;
    
    try {
      const p1Pos = p1Physics.transformNode.getAbsolutePosition();
      const p2Pos = p2Physics.transformNode.getAbsolutePosition();
      const distance = Vector3.Distance(p1Pos, p2Pos);
      const minSeparationDistance = 3.5; // Minimum distance to consider them separated
      
      console.log(`🔍 Checking separation: distance = ${distance.toFixed(2)}, required = ${minSeparationDistance}`);
      return distance >= minSeparationDistance;
    } catch (error) {
      console.warn('Failed to check cube separation:', error);
      return false;
    }
  }, [p1Physics, p2Physics]);

  // Setup physics collision listeners
  const setupCollisionListeners = useCallback(() => {
    if (!p1Physics?.body || !p2Physics?.body || !scene) {
      console.log('❌ setupCollisionListeners: Missing physics or scene');
      return;
    }

    console.log('🔧 Setting up physics collision listeners');

    // Get the mesh objects
    const p1Mesh = p1Physics.transformNode;
    const p2Mesh = p2Physics.transformNode;

    console.log('🔧 Setting up collision detection for meshes:', {
      p1Mesh: !!p1Mesh,
      p2Mesh: !!p2Mesh,
      p1MeshName: p1Mesh?.name,
      p2MeshName: p2Mesh?.name
    });

    if (!p1Mesh || !p2Mesh) {
      console.log('❌ Cannot setup collision detection: Missing mesh objects');
      return;
    }

    // Set up collision detection between P1 and P2
    p1Mesh.checkCollisions = true;
    p2Mesh.checkCollisions = true;

    // Use Babylon.js collision detection
    const checkCollision = () => {
      const currentTime = Date.now();
  // Use refs to avoid stale closure issues
  if (isResettingRef.current) return;
  if (currentTime - lastCollisionTimeRef.current < 1000) return; // 1s collision cooldown
  if (currentTime - lastPointAwardTimeRef.current < 5000) return; // 5s point cooldown
  if (currentTime - (gameState.lastTagTime || 0) < (gameState.tagCooldown || 0)) return;

      // Use proper mesh-to-mesh contact detection
      const p1Pos = p1Mesh.getAbsolutePosition();
      const p2Pos = p2Mesh.getAbsolutePosition();
      const distance = Vector3.Distance(p1Pos, p2Pos);
      
      // Debug: Log when cubes are close
      if (distance < 1.5) {
        console.log(`🔍 Close collision check - Distance: ${distance.toFixed(2)}`);
      }

      // Check for actual mesh contact using Babylon.js mesh intersection
      let isTouching = false;
      
      try {
        // Use mesh intersection to check if meshes are actually touching
        const intersection = p1Mesh.intersectsMesh(p2Mesh, false);
        isTouching = intersection;
        
        if (distance < 1.5) { // Debug intersection check
          console.log(`🔍 Mesh contact check: ${isTouching}`);
        }
      } catch (error) {
        console.log('❌ Error in mesh contact detection:', error);
        // Fallback to distance check if mesh intersection fails
        isTouching = distance < 0.6; // Smaller threshold for actual contact
      }

      if (isTouching) {
        console.log('🎯 COLLISION DETECTED! Round complete!');
        // Set reset refs/state to prevent multiple detections
        isResettingRef.current = true;
        lastCollisionTimeRef.current = currentTime;
        lastPointAwardTimeRef.current = currentTime;
        setRoundState(prev => ({ 
          ...prev, 
          isResetting: true,
          lastCollisionTime: currentTime,
          lastPointAwardTime: currentTime
        }));
        
        // Determine who tagged whom based on current tagger
        const tagger = gameState.currentTagger;
        const tagged = tagger === 'p1' ? 'p2' : 'p1';

        console.log(`Tagger: ${tagger}, Tagged: ${tagged}`);

        // Get positions for tag event
        const p1Position = p1Mesh.getAbsolutePosition();
        const p2Position = p2Mesh.getAbsolutePosition();

        // Record tag event
        const tagEvent: TagEvent = {
          tagger,
          tagged,
          timestamp: currentTime,
          position: tagger === 'p1' ? p1Position.clone() : p2Position.clone(),
        };

        lastTagEventRef.current = tagEvent;
        tagHistoryRef.current.push(tagEvent);

  // Use hardcoded respawn positions near the original spawn (0,0,0) but separated
  // Hardcoded respawn positions removed - using simple mesh separation instead

        // Award point to the tagger (guard to avoid duplicates)
        setGameState(prev => {
          const newP1Score = tagger === 'p1' ? prev.p1Score + 1 : prev.p1Score;
          const newP2Score = tagger === 'p2' ? prev.p2Score + 1 : prev.p2Score;
          console.log(`🏆 Point awarded! P1: ${prev.p1Score} -> ${newP1Score}, P2: ${prev.p2Score} -> ${newP2Score}`);
          return {
            ...prev,
            p1Score: newP1Score,
            p2Score: newP2Score,
            lastTagTime: currentTime,
          };
        });

        // Visual feedback
        showTagEffect(tagEvent);

        // Simple separation: push meshes apart
        console.log('🔄 Separating meshes after point awarded...');
        separateMeshesAfterTag(tagger, tagged);
        
         // Wait for proper separation before starting next round
         const waitForSeparation = () => {
           if (!p1Physics?.transformNode || !p2Physics?.transformNode) {
             console.log('❌ Cannot check separation: Missing transform nodes');
             return;
           }
           
           try {
             const p1Pos = p1Physics.transformNode.getAbsolutePosition();
             const p2Pos = p2Physics.transformNode.getAbsolutePosition();
             const distance = Vector3.Distance(p1Pos, p2Pos);
             const minSeparationDistance = 4.0; // Require 4 units separation
             
             console.log(`🔍 Checking separation: distance = ${distance.toFixed(2)}, required = ${minSeparationDistance}`);
             
             if (distance >= minSeparationDistance) {
               console.log('🚀 Cubes are properly separated! Starting next round!');
          
          // Switch tagger for next round
          setGameState(prev => ({
            ...prev,
            currentTagger: tagged, // The tagged player becomes the new tagger
          }));
          
          // Clear reset state
          isResettingRef.current = false;
          setRoundState(prev => ({ 
            isResetting: false, 
            resetTimeout: null,
            lastCollisionTime: currentTime, // Keep collision time to prevent immediate re-collision
            lastPointAwardTime: prev.lastPointAwardTime // Keep point award time for 5-second cooldown
          }));
               
               // Re-setup collision detection
               console.log('🔧 Re-setting up collision detection...');
               setupCollisionListeners();
          
          // Clear the timeout ref
          resetTimeoutRef.current = null;
             } else {
               console.log('⏳ Cubes still too close, applying additional separation...');
               
               // Apply additional separation force
               const direction = p1Pos.subtract(p2Pos).normalize();
               const additionalSeparation = direction.scale(2.0); // Additional 2 units
               
               if (tagged === 'p1') {
                 const p1NewPos = p1Pos.add(additionalSeparation);
                 p1Physics.transformNode.position = p1NewPos;
                 p1Physics.transformNode.computeWorldMatrix(true);
               } else {
                 const p2NewPos = p2Pos.subtract(additionalSeparation);
                 p2Physics.transformNode.position = p2NewPos;
                 p2Physics.transformNode.computeWorldMatrix(true);
               }
               
               // Zero velocities again
               p1Physics.body.setLinearVelocity(Vector3.Zero());
               p1Physics.body.setAngularVelocity(Vector3.Zero());
               p2Physics.body.setLinearVelocity(Vector3.Zero());
               p2Physics.body.setAngularVelocity(Vector3.Zero());
               
               // Check again in 200ms
               resetTimeoutRef.current = setTimeout(waitForSeparation, 200);
             }
           } catch (error) {
             console.warn('Failed to check separation:', error);
             // Fallback: start next round anyway after delay
             resetTimeoutRef.current = setTimeout(() => {
               console.log('🚀 Starting next round (fallback after separation check failed)!');
               isResettingRef.current = false;
               setRoundState(prev => ({ 
                 isResetting: false, 
                 resetTimeout: null,
                 lastCollisionTime: currentTime,
                 lastPointAwardTime: prev.lastPointAwardTime
               }));
               setupCollisionListeners();
               resetTimeoutRef.current = null;
             }, 1000);
           }
         };
         
         // Start checking for separation after a brief delay
         resetTimeoutRef.current = setTimeout(waitForSeparation, 1000); // 1 second initial delay
      }
    };

    // Store the collision check function for use in game loop
    (p1Mesh as any).tagCollisionCheck = checkCollision;
  }, [p1Physics, p2Physics, gameState.currentTagger, gameState.lastTagTime, gameState.tagCooldown, scene, showTagEffect, resetCubesToOriginalPositions, roundState, originalPositions]);

  // Check for tag collision (now just calls the stored function)
  const checkForTag = useCallback(() => {
    // Debug: Log every 60 frames to see if this function is being called
    const currentTime = Date.now();
    if (Math.floor(currentTime / 1000) !== Math.floor((currentTime - 16) / 1000)) {
      console.log('🔍 checkForTag called');
    }
    
    if (!p1Physics?.body || !p2Physics?.body) {
      console.log('❌ checkForTag: Missing physics bodies');
      return;
    }
    
    try {
    const p1Mesh = p1Physics.transformNode;
      console.log('🔍 checkForTag: p1Mesh found:', !!p1Mesh, 'collision function exists:', !!(p1Mesh as any)?.tagCollisionCheck);
    if (p1Mesh && (p1Mesh as any).tagCollisionCheck) {
      (p1Mesh as any).tagCollisionCheck();
    } else {
        console.log('❌ checkForTag: No collision check function found - p1Mesh:', !!p1Mesh, 'function:', !!(p1Mesh as any)?.tagCollisionCheck);
      }
    } catch (error) {
      // Physics bodies were disposed or are invalid, skip this check
      console.log('⚠️ Physics bodies disposed or invalid, skipping collision check');
      return;
    }
  }, [p1Physics, p2Physics]);

  // End game
  const endGame = useCallback(() => {
    const winner = gameState.p1Score > gameState.p2Score ? 'p1' : 
                   gameState.p2Score > gameState.p1Score ? 'p2' : 'tie';

    setGameState(prev => ({
      ...prev,
      status: 'finished',
      winner,
    }));

    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }

    // Clear any pending reset timeout and intervals
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
    if (positionResetIntervalRef.current) {
      clearInterval(positionResetIntervalRef.current);
      positionResetIntervalRef.current = null;
    }
    
    // Reset round state
    setRoundState(prev => ({ 
      ...prev, 
      resetTimeout: null, 
      isResetting: false,
      lastCollisionTime: 0,
      lastPointAwardTime: 0
    }));

    if (onGameStateChange) {
      onGameStateChange({
        ...gameState,
        status: 'finished',
        winner,
      });
    }
  }, [gameState, onGameStateChange, roundState.resetTimeout]);

  // Game loop
  const gameLoop = useCallback(() => {
    if (gameState.status !== 'playing') return;

    const currentTime = Date.now();
  const startTime = gameStartRef.current ?? gameState.gameTime ?? currentTime;
  const elapsedTime = currentTime - startTime;
  const remainingTime = Math.max(0, gameState.gameDuration - elapsedTime);

    // Debug: Log every 60 frames (about once per second)
    if (Math.floor(currentTime / 1000) !== Math.floor((currentTime - 16) / 1000)) {
      console.log('🔄 Game loop running, remaining time:', Math.ceil(remainingTime / 1000), 'seconds');
      
      // Debug: Check cube positions
      if (p1Physics?.body && p2Physics?.body) {
        try {
        const p1Pos = p1Physics.transformNode.getAbsolutePosition();
        const p2Pos = p2Physics.transformNode.getAbsolutePosition();
        const distance = Vector3.Distance(p1Pos, p2Pos);
        console.log(`📍 P1: (${p1Pos.x.toFixed(1)}, ${p1Pos.y.toFixed(1)}, ${p1Pos.z.toFixed(1)}), P2: (${p2Pos.x.toFixed(1)}, ${p2Pos.y.toFixed(1)}, ${p2Pos.z.toFixed(1)}), Distance: ${distance.toFixed(1)}`);
        } catch (error) {
          console.log('⚠️ Cannot get cube positions - physics bodies may be disposed');
        }
      }
    }

    // Check for game end
    if (remainingTime <= 0) {
      endGame();
      return;
    }

    // Only move cubes if not in reset mode
    if (!roundState.isResetting) {
      moveCubesRandomly();
    }

    // Check for tag collision
    checkForTag();

    // Update game time
  // NOTE: gameTime represents the start time and is set when the game starts.
  // We avoid overwriting it each frame so the remaining time calculation stays correct.
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState.status, gameState.gameTime, gameState.gameDuration, moveCubesRandomly, checkForTag, endGame, roundState.isResetting]);

  // Start game
  const startGame = useCallback(() => {
    console.log('🚀 Starting tag game...');
    // Ensure physics bodies are ready before starting
    if (!p1Physics?.body || !p2Physics?.body) {
      console.log('❌ Cannot start tag game: physics bodies not ready. Wait for physics to initialize.');
      return;
    }
    const startTime = Date.now();
    gameStartRef.current = startTime;
    setGameState(prev => ({
      ...prev,
      status: 'playing',
      gameTime: startTime,
      p1Score: 0,
      p2Score: 0,
      lastTagTime: 0,
    }));

    // Clear any existing timeouts/intervals
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
    if (positionResetIntervalRef.current) {
      clearInterval(positionResetIntervalRef.current);
      positionResetIntervalRef.current = null;
    }

    // Reset round state
    setRoundState({
      isResetting: false,
      resetTimeout: null,
      lastCollisionTime: 0,
      lastPointAwardTime: 0,
    });

    tagHistoryRef.current = [];
    lastTagEventRef.current = null;

    // Store original positions when game starts
    console.log('🚀 About to call storeOriginalPositions...');
    storeOriginalPositions();

    // Setup collision listeners when game starts
    console.log('🔧 Setting up collision listeners...');
    setupCollisionListeners();

    console.log('✅ Tag game started successfully');

    if (onGameStateChange) {
      onGameStateChange({
        status: 'playing',
        currentTagger: gameState.currentTagger,
        p1Score: 0,
        p2Score: 0,
  gameTime: startTime,
        lastTagTime: 0,
        tagCooldown: gameState.tagCooldown,
        gameDuration: gameState.gameDuration,
      });
    }
  }, [gameState.currentTagger, gameState.tagCooldown, gameState.gameDuration, onGameStateChange, setupCollisionListeners, storeOriginalPositions]);

  // Pause game
  const pauseGame = useCallback(() => {
    setGameState(prev => ({ ...prev, status: 'paused' }));
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
  }, []);

  // Resume game
  const resumeGame = useCallback(() => {
    setGameState(prev => ({ ...prev, status: 'playing' }));
  }, []);

  // Reset game
  const resetGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      status: 'waiting',
      p1Score: 0,
      p2Score: 0,
      gameTime: 0,
      lastTagTime: 0,
      winner: undefined,
    }));

    tagHistoryRef.current = [];
    lastTagEventRef.current = null;

    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<typeof settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    
    // Update game state with new settings
    setGameState(prev => ({
      ...prev,
      gameDuration: (newSettings.gameDuration || settings.gameDuration) * 1000,
      tagCooldown: (newSettings.tagCooldown || settings.tagCooldown) * 1000,
    }));
  }, [settings.gameDuration, settings.tagCooldown]);

  // Start game loop when playing
  useEffect(() => {
    if (gameState.status === 'playing') {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.status, gameLoop]);

  // Auto-start if enabled
  useEffect(() => {
    if (settings.autoStart && gameState.status === 'waiting') {
      const timer = setTimeout(startGame, 1000);
      return () => clearTimeout(timer);
    }
  }, [settings.autoStart, gameState.status, startGame]);

  // Format time
  const formatTime = (milliseconds: number) => {
    const seconds = Math.ceil(milliseconds / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get remaining time
  const getRemainingTime = () => {
  if (gameState.status !== 'playing') return gameState.gameDuration;
  const startTime = gameStartRef.current ?? gameState.gameTime ?? Date.now();
  const elapsed = Date.now() - startTime;
  return Math.max(0, gameState.gameDuration - elapsed);
  };

  return {
    // Game state
    gameState,
    settings,
    tagHistory: tagHistoryRef.current,
    lastTagEvent: lastTagEventRef.current,
    
    // Game controls
    startGame,
    pauseGame,
    resumeGame,
    endGame,
    resetGame,
    
    // Settings
    updateSettings,
    
    // Utilities
    formatTime,
    getRemainingTime,
    
    // Game info
    isPlaying: gameState.status === 'playing',
    isPaused: gameState.status === 'paused',
    isFinished: gameState.status === 'finished',
    currentTagger: gameState.currentTagger,
    winner: gameState.winner,
    p1Score: gameState.p1Score,
    p2Score: gameState.p2Score,
    remainingTime: getRemainingTime(),
  };
};

export default useTagGame;
