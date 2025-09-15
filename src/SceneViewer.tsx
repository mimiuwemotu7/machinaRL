import React, { useRef, useEffect, useState } from 'react';
import {
  Engine,
  Scene,
  Vector3,
  Quaternion,
  HemisphericLight,
  ArcRotateCamera,
  SceneLoader,
  StandardMaterial,
  DynamicTexture,
  Color3,
  FreeCamera,
  UniversalCamera,
  PhysicsShapeType
} from '@babylonjs/core';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import type { PickingInfo } from '@babylonjs/core';
import '@babylonjs/loaders';
import { HDRCubeTexture } from '@babylonjs/core/Materials/Textures/hdrCubeTexture';
import '@babylonjs/core/Materials/Textures/Loaders/exrTextureLoader';
import { Ray } from '@babylonjs/core/Culling/ray';
import useTagGame from './components/TagGame';
import { RotateCcw, Play } from 'lucide-react';

interface SceneViewerProps {
  width?: number;
  height?: number;
  modelFilename?: string;
}

type CamMode = 'glb' | 'free';

const SceneViewer: React.FC<SceneViewerProps> = ({ width = 800, height = 600, modelFilename = 'Untitled.glb' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<string>('Initializing...');
  
  const [sceneRef, setSceneRef] = useState<Scene | null>(null);
  const [glbCam, setGlbCam] = useState<ArcRotateCamera | FreeCamera | null>(null);
  const [freeCam, setFreeCam] = useState<UniversalCamera | null>(null);
  const [camMode, setCamMode] = useState<CamMode>('glb');
  const [freeSpeed, setFreeSpeed] = useState<number>(0.5);
  const [cubePhysics, setCubePhysics] = useState<PhysicsAggregate | null>(null);
  const [p2CubePhysics, setP2CubePhysics] = useState<PhysicsAggregate | null>(null);
  const p1TemplateRef = useRef<any>(null);
  const p2TemplateRef = useRef<any>(null);
  const [selectedCube, setSelectedCube] = useState<'p1' | 'p2'>('p1');
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
  const [tagGameActive, setTagGameActive] = useState<boolean>(false);
  
  // Store original positions for reset functionality
  const [originalPositions, setOriginalPositions] = useState<{
    p1: Vector3 | null;
    p2: Vector3 | null;
  }>({ p1: null, p2: null });

  // Visual refs
  const screensRef = useRef<any[]>([]);

  // Reset cubes to original positions
  const resetCubesToOriginalPositions = () => {
    if (!originalPositions.p1 || !originalPositions.p2) {
      console.warn('❌ Cannot reset: Original positions not stored');
      return;
    }

    console.log('🔄 Resetting cubes to original positions:', {
      p1: originalPositions.p1,
      p2: originalPositions.p2
    });

    // Reset P1 cube
    if (cubePhysics?.body && cubePhysics.transformNode) {
      try {
        // Set mesh position directly
        cubePhysics.transformNode.position = originalPositions.p1.clone();
        cubePhysics.transformNode.computeWorldMatrix(true);
        
        // Zero out velocities
        cubePhysics.body.setLinearVelocity(Vector3.Zero());
        cubePhysics.body.setAngularVelocity(Vector3.Zero());
        console.log('✅ Reset P1 to original position');
      } catch (e) {
        console.warn('Failed to reset P1:', e);
      }
    }

    // Reset P2 cube
    if (p2CubePhysics?.body && p2CubePhysics.transformNode) {
      try {
        // Set mesh position directly
        p2CubePhysics.transformNode.position = originalPositions.p2.clone();
        p2CubePhysics.transformNode.computeWorldMatrix(true);
        
        // Zero out velocities
        p2CubePhysics.body.setLinearVelocity(Vector3.Zero());
        p2CubePhysics.body.setAngularVelocity(Vector3.Zero());
        console.log('✅ Reset P2 to original position');
      } catch (e) {
        console.warn('Failed to reset P2:', e);
      }
    }
  };

  // TS helper: type guard for Babylon pick info
  const isValidHit = (pi: PickingInfo | null): pi is PickingInfo => {
    return !!pi && (pi as any).hit === true;
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const engine = new Engine(canvas, true);
    const scene = new Scene(engine);
    setSceneRef(scene);

    // Basic light (fallback)
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
    light.intensity = 0.3;

    setStatus('Loading GLB...');

    // Load GLB scene
    SceneLoader.Append('/', modelFilename, scene, () => {
      console.log('✅ GLB loaded successfully. Meshes:', scene.meshes.length, 'Cameras:', scene.cameras.length);
      
      console.log('=== ALL MESH NAMES ===');
      scene.meshes.forEach((mesh, index) => {
        console.log(`${index}: "${mesh.name}"`);
      });
      console.log('=== END MESH NAMES ===');

      // Log initial spawn positions for p1 and p2 (use exact name or fallback to include)
      const findByTag = (tag: string) => scene.meshes.find(m => m.name && m.name.toLowerCase().includes(tag) && !m.name.toLowerCase().includes('screen'));
      const p1Mesh = scene.getMeshByName('p1') || findByTag('p1');
      const p2Mesh = scene.getMeshByName('p2') || findByTag('p2');

      if (p1Mesh) {
        const p1Pos = typeof p1Mesh.getAbsolutePosition === 'function' ? p1Mesh.getAbsolutePosition() : p1Mesh.position;
        console.log('📍 p1 spawn:', p1Mesh.name, p1Pos);
        console.log('📍 p1 spawn coordinates: x=' + p1Pos.x.toFixed(2) + ', y=' + p1Pos.y.toFixed(2) + ', z=' + p1Pos.z.toFixed(2));
        p1TemplateRef.current = p1Mesh; // store original template
        
        // Store original position for reset functionality
        setOriginalPositions(prev => ({ ...prev, p1: p1Pos.clone() }));
      } else {
        console.warn('p1 mesh not found on load');
      }

      if (p2Mesh) {
        const p2Pos = typeof p2Mesh.getAbsolutePosition === 'function' ? p2Mesh.getAbsolutePosition() : p2Mesh.position;
        console.log('📍 p2 spawn:', p2Mesh.name, p2Pos);
        console.log('📍 p2 spawn coordinates: x=' + p2Pos.x.toFixed(2) + ', y=' + p2Pos.y.toFixed(2) + ', z=' + p2Pos.z.toFixed(2));
        p2TemplateRef.current = p2Mesh; // store original template
        
        // Store original position for reset functionality
        setOriginalPositions(prev => ({ ...prev, p2: p2Pos.clone() }));
      } else {
        console.warn('p2 mesh not found on load');
      }
      
      // Load HDRI environment
      try {
        const hdrTexture = new HDRCubeTexture('/blocky_photo_studio_2k.hdr', scene, 512);
        scene.environmentTexture = hdrTexture;
        console.log('HDRI environment loaded successfully');
      } catch (e) {
        console.warn('Failed to load HDRI environment:', e);
      }

      // Setup screens
      const setupScreen = (meshName: string, text: string, color: Color3) => {
        const mesh = scene.getMeshByName(meshName);
        if (!mesh) {
          console.warn(`${meshName} mesh not found`);
          return;
        }
        console.log(`Found ${meshName} mesh`);
        const textureSize = 512;
        const dt = new DynamicTexture(`${meshName}Texture`, textureSize, scene);
        const mat = new StandardMaterial(`${meshName}Material`, scene);
        mat.diffuseTexture = dt;
        mat.emissiveTexture = dt;
        mat.emissiveColor = color;
        mesh.material = mat;
        mesh.checkCollisions = false;
        
        const ctx = dt.getContext() as CanvasRenderingContext2D;
        ctx.save();
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, textureSize, textureSize);
        ctx.scale(-1, 1.8);
        ctx.translate(-textureSize, -textureSize * 0.2);
        ctx.fillStyle = color.toHexString();
        ctx.font = 'bold 120px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, textureSize / 2, textureSize / 2);
        ctx.restore();
        dt.update();
      };
      
      setupScreen('p1 screen', '4', new Color3(0.2, 0.8, 1));
      setupScreen('p2 screen', '1', new Color3(1, 0.2, 0.2));
      setupScreen('cycle screen', '1', new Color3(1, 1, 0.2));

      // Stopwatch screen
      const stopwatchMesh = scene.getMeshByName('stopwatch screen');
      if (stopwatchMesh) {
        const textureSize = 512;
        const dt = new DynamicTexture('stopwatchTexture', textureSize, scene);
        const mat = new StandardMaterial('stopwatchMaterial', scene);
        mat.diffuseTexture = dt;
        mat.emissiveTexture = dt;
        mat.emissiveColor = new Color3(0.2, 1, 0.2);
        stopwatchMesh.material = mat;
        
        let start = Date.now();
        const update = () => {
          const e = Date.now() - start;
          const m = Math.floor(e / 60000);
          const s = Math.floor((e % 60000) / 1000);
          const cs = Math.floor((e % 1000) / 10);
          const str = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
          
          const ctx = dt.getContext() as CanvasRenderingContext2D;
          ctx.save();
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, textureSize, textureSize);
          ctx.scale(-1, 1.8);
          ctx.translate(-textureSize, -textureSize * 0.2);
          ctx.fillStyle = '#00FF00';
          ctx.font = 'bold 96px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(str, textureSize / 2, textureSize / 2);
          ctx.restore();
          dt.update();
        };
        const id = setInterval(update, 10);
        update();
        scene.onDisposeObservable.add(() => clearInterval(id));
      }
      
      // Cache screens
      const screens = ['p1 screen', 'p2 screen', 'cycle screen', 'stopwatch screen']
        .map(name => scene.getMeshByName(name))
        .filter(Boolean);
      screensRef.current = screens;

      // Camera setup
      if (scene.cameras.length > 0) {
        const glbCamera = scene.cameras[0];
        console.log('GLB Camera details:', {
          name: glbCamera.name,
          position: (glbCamera as any).position,
          minZ: (glbCamera as any).minZ,
          maxZ: (glbCamera as any).maxZ,
          mode: glbCamera.mode,
          type: glbCamera.getClassName()
        });
        
        (glbCamera as any).minZ = 0.01;
        (glbCamera as any).maxZ = 10000;
        scene.activeCamera = glbCamera as any;
        glbCamera.attachControl(canvas, true);
        setGlbCam(glbCamera as any);

        // Create free camera
        const glbPos = (glbCamera as any).position ? (glbCamera as any).position.clone() : new Vector3(0, 2, -4);
        const free = new UniversalCamera('freeCam', glbPos.add(new Vector3(0, 0.5, 0)), scene);
        free.setTarget(glbPos.add(new Vector3(0, 0.5, 1)));
        free.speed = freeSpeed;
        free.keysUp = [87]; // W
        free.keysDown = [83]; // S
        free.keysLeft = [65]; // A
        free.keysRight = [68]; // D
        free.keysUpward = [69]; // E
        free.keysDownward = [81]; // Q
        setFreeCam(free);

        // Setup physics after GLB load
        setupPhysics(scene);

        // Setup visuals after a delay
        setTimeout(() => {
          engine.resize();
          setStatus('');
        }, 300);
      } else {
        const fallback = new ArcRotateCamera('fallback', 0, Math.PI / 3, 10, Vector3.Zero(), scene);
        fallback.attachControl(canvas, true);
        scene.activeCamera = fallback;
        console.log('No camera in GLB, using fallback');
      }
    }, undefined, (scene, message, exception) => {
      console.error('GLB load error:', message, exception);
      setStatus('Failed to load GLB');
    });

    // Render loop
    engine.runRenderLoop(() => {
      if (!scene.activeCamera) return;
      scene.render();
    });

    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      scene.dispose();
      engine.dispose();
    };
  }, [freeSpeed, modelFilename]);

  // Physics Setup Function
  const setupPhysics = async (scene: Scene) => {
    try {
      setStatus('Loading Havok Physics...');
      
      // Dynamically import Havok
      const { default: HavokPhysics } = await import('@babylonjs/havok');
      const havokInstance = await HavokPhysics();
      // Use HavokPlugin from @babylonjs/core with the initialized Havok instance
      const havokPlugin = new (await import('@babylonjs/core').then(mod => mod.HavokPlugin))(true, havokInstance);
      scene.enablePhysics(new Vector3(0, -9.81, 0), havokPlugin);
      
      console.log('🔵 Havok Physics v2 engine initialized with gravity');
      
      // Setup physics for specific meshes
      setupMeshPhysics(scene);
      
    } catch (error) {
      console.error('Havok Physics setup failed:', error);
      setStatus('Physics setup failed - Havok not available');
    }
  };

  const setupMeshPhysics = (scene: Scene) => {
    let physicsApplied = false;
    
    scene.meshes.forEach((mesh: any) => {
      // Skip root nodes, empty meshes, and screen meshes
      if (!mesh.name || mesh.name.startsWith('__root__') || !mesh.geometry || mesh.name.includes('screen')) return;
      
      console.log(`🔧 Setting up physics for: "${mesh.name}"`);
      
      try {
        let agg: PhysicsAggregate | null = null;
        if (mesh.name.toLowerCase().includes('floor')) {
          // Floor - Static rigid body with MESH shape for subdivided surface with edges
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.MESH, {
            mass: 0,
            restitution: 0.2,
            friction: 0.8
          }, scene);
          console.log(`✅ Floor physics (MESH) applied to: ${mesh.name}`);
          physicsApplied = true;
          
        } else if (mesh.name.toLowerCase().includes('wall')) {
          // Wall - Static rigid body with MESH shape for U-shaped geometry
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.MESH, {
            mass: 0,
            restitution: 0.1,
            friction: 0.6
          }, scene);
          console.log(`✅ Wall physics (MESH) applied to: ${mesh.name}`);
          physicsApplied = true;
          
        } else if (mesh.name.toLowerCase().includes('blocker')) {
          // Blocker - Static rigid body with MESH shape, invisible
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.MESH, {
            mass: 0,
            restitution: 0.1,
            friction: 0.6
          }, scene);
          
          // Make the blocker invisible
          mesh.isVisible = false;
          
          console.log(`✅ Blocker physics (MESH) applied to: ${mesh.name} - INVISIBLE`);
          physicsApplied = true;
          
        } else if (mesh.name.toLowerCase().includes('p1')) {
          // p1 cube - Dynamic rigid body with BOX shape
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, {
            mass: 2,
            restitution: 0.3,
            friction: 0.5
          }, scene);
          setCubePhysics(agg);
          try {
            const abs = (mesh.getAbsolutePosition && mesh.getAbsolutePosition()) || mesh.position;
            // parent chain
            const parentChain: string[] = [];
            let cur: any = mesh;
            while (cur) { parentChain.push(cur.name || '<unnamed>'); cur = cur.parent; }
            console.log(`✅ p1 cube physics (BOX) applied to: ${mesh.name} - absPos:`, abs, 'parentChain:', parentChain.join(' <- '));
            // log aggregate transformNode and body if present
            if (agg) {
              try {
                const tnode = (agg as any).transformNode;
                const tpos = tnode && typeof tnode.getAbsolutePosition === 'function' ? tnode.getAbsolutePosition() : (tnode && tnode.position);
                console.log('   → physicsAggregate.transformNode pos:', tpos, 'bodyPresent:', !!(agg as any).body);
              } catch (e) {
                console.log('   → physicsAggregate info unavailable', e);
              }
            }
          } catch (e) {
            console.log(`✅ p1 cube physics (BOX) applied to: ${mesh.name}`);
          }
          physicsApplied = true;
        } else if (mesh.name.toLowerCase().includes('p2')) {
          // p2 cube - Dynamic rigid body with BOX shape (same as p1)
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, {
            mass: 2,
            restitution: 0.3,
            friction: 0.5
          }, scene);
          setP2CubePhysics(agg);
          try {
            const abs = (mesh.getAbsolutePosition && mesh.getAbsolutePosition()) || mesh.position;
            // parent chain
            const parentChain2: string[] = [];
            let cur2: any = mesh;
            while (cur2) { parentChain2.push(cur2.name || '<unnamed>'); cur2 = cur2.parent; }
            console.log(`✅ p2 cube physics (BOX) applied to: ${mesh.name} - absPos:`, abs, 'parentChain:', parentChain2.join(' <- '));
            if (agg) {
              try {
                const tnode = (agg as any).transformNode;
                const tpos = tnode && typeof tnode.getAbsolutePosition === 'function' ? tnode.getAbsolutePosition() : (tnode && tnode.position);
                console.log('   → physicsAggregate.transformNode pos:', tpos, 'bodyPresent:', !!(agg as any).body);
              } catch (e) {
                console.log('   → physicsAggregate info unavailable', e);
              }
            }
          } catch (e) {
            console.log(`✅ p2 cube physics (BOX) applied to: ${mesh.name}`);
          }
          physicsApplied = true;
        }

        if (agg) {
          mesh.checkCollisions = true; // Ensure collisions are enabled
          mesh.physicsAggregate = agg;
        }
      } catch (error) {
        console.error(`Failed to apply physics to ${mesh.name}:`, error);
      }
    });
    
    if (physicsApplied) {
      setStatus('Havok Physics v2 enabled - p1 cube should fall!');
      setTimeout(() => setStatus(''), 3000);
    } else {
      setStatus('No physics meshes found');
      console.warn('No meshes found for physics. Available meshes:', scene.meshes.map((m: any) => m.name));
    }
  };

  // Initialize tag game
  // Respawn functionality removed - using simple mesh separation instead

  const tagGame = useTagGame({
    p1Physics: cubePhysics,
    p2Physics: p2CubePhysics,
    scene: sceneRef,
    onGameStateChange: (state: any) => {
      console.log('Tag game state changed:', state);
    }
  });

  // Update TagGame with new physics references when they change
  useEffect(() => {
    if (cubePhysics && p2CubePhysics) {
      console.log('🔄 Physics references updated, TagGame should now use new physics bodies');
      // The TagGame hook will automatically use the new physics references
      // since they're passed as props and the hook will re-run with new values
    }
  }, [cubePhysics, p2CubePhysics]);

  // Continuous cube movement function
  const updateCubeMovement = () => {
    // If tag game is active and playing, disable manual control
    if (tagGameActive && tagGame.isPlaying) {
      return;
    }

    const activePhysics = selectedCube === 'p1' ? cubePhysics : p2CubePhysics;
    if (!activePhysics || !activePhysics.body) return;
    
    // Additional safety check to ensure the physics body is still valid
    try {
      const moveSpeed = 3;
      const currentVelocity = activePhysics.body.getLinearVelocity();
      let newVelocity = currentVelocity.clone();
    
      // Apply movement based on currently pressed keys
      if (keysPressed.has('i')) {
        newVelocity.z = -moveSpeed;
      }
      if (keysPressed.has('k')) {
        newVelocity.z = moveSpeed;
      }
      if (keysPressed.has('j')) {
        newVelocity.x = -moveSpeed;
      }
      if (keysPressed.has('l')) {
        newVelocity.x = moveSpeed;
      }
      
      // Handle jumping (M key)
      if (keysPressed.has('m')) {
        // Only jump if the cube is close to the ground (Y velocity is small)
        if (Math.abs(currentVelocity.y) < 0.5) {
          newVelocity.y = 5; // Jump velocity
        }
      }
      
      // If no movement keys are pressed, gradually slow down horizontal movement
      if (!keysPressed.has('i') && !keysPressed.has('k') && !keysPressed.has('j') && !keysPressed.has('l')) {
        newVelocity.x *= 0.9; // Gradually reduce X velocity
        newVelocity.z *= 0.9; // Gradually reduce Z velocity
      }
      
      // Update velocity (including Y for jumping)
      activePhysics.body.setLinearVelocity(new Vector3(newVelocity.x, newVelocity.y, newVelocity.z));
    } catch (error) {
      // Physics body was disposed or is invalid, skip this update
      console.log('⚠️ Physics body disposed or invalid, skipping movement update');
      return;
    }
  };

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event || !event.key) return;
      
      const key = event.key.toLowerCase();
      if (['i', 'k', 'j', 'l', 'm'].includes(key)) {
        event.preventDefault();
        setKeysPressed(prev => new Set(prev).add(key));
      }
    };
    
    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event || !event.key) return;
      
      const key = event.key.toLowerCase();
      if (['i', 'k', 'j', 'l', 'm'].includes(key)) {
        event.preventDefault();
        setKeysPressed(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Continuous movement update
  useEffect(() => {
    if (!sceneRef || (!cubePhysics && !p2CubePhysics)) return;
    
    const updateInterval = setInterval(updateCubeMovement, 16); // ~60fps
    
    return () => clearInterval(updateInterval);
  }, [sceneRef, cubePhysics, p2CubePhysics, keysPressed, selectedCube]);

  // Camera switching helpers
  const switchCamera = (mode: CamMode) => {
    if (!sceneRef || !canvasRef.current) return;
    if (mode === camMode) return;

    if (mode === 'free' && freeCam) {
      sceneRef.activeCamera?.detachControl();
      freeCam.speed = freeSpeed;
      freeCam.attachControl(canvasRef.current, true);
      sceneRef.activeCamera = freeCam;
      setCamMode('free');
    } else if (mode === 'glb' && glbCam) {
      sceneRef.activeCamera?.detachControl();
      (glbCam as any).attachControl(canvasRef.current, true);
      sceneRef.activeCamera = glbCam as any;
      setCamMode('glb');
    }
  };

  const resetCamera = () => {
    if (!sceneRef || !canvasRef.current) return;
    if (camMode === 'free' && freeCam) {
      freeCam.position = new Vector3(0, 2, -4);
      freeCam.setTarget(Vector3.Zero());
    } else if (camMode === 'glb' && glbCam && (glbCam as any).radius !== undefined) {
      (glbCam as any).alpha = 0;
      (glbCam as any).beta = Math.PI / 3;
      (glbCam as any).radius = 10;
    }
  };

  // Zoom helpers
  const zoomIn = () => {
    if (camMode === 'free' && freeCam) {
      const dir = freeCam.getDirection(new Vector3(0, 0, 1));
      freeCam.position.addInPlace(dir.scale(0.5 * (freeSpeed + 0.2)));
    } else if (camMode === 'glb' && glbCam && (glbCam as any).radius !== undefined) {
      const arc = glbCam as any;
      arc.radius = Math.max(0.1, arc.radius * 0.9);
    }
  };

  const zoomOut = () => {
    if (camMode === 'free' && freeCam) {
      const dir = freeCam.getDirection(new Vector3(0, 0, 1));
      freeCam.position.addInPlace(dir.scale(-0.5 * (freeSpeed + 0.2)));
    } else if (camMode === 'glb' && glbCam && (glbCam as any).radius !== undefined) {
      const arc = glbCam as any;
      arc.radius = Math.max(0.1, arc.radius * 1.1);
    }
  };

  // Mouse wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const onWheel = (e: WheelEvent) => {
      if (!sceneRef) return;
      if (!canvasRef.current) return;
      e.preventDefault();
      
      const delta = Math.sign(e.deltaY);
      if (camMode === 'free' && freeCam) {
        const dir = freeCam.getDirection(new Vector3(0, 0, 1));
        freeCam.position.addInPlace(dir.scale(-delta * 0.6 * (freeSpeed + 0.2)));
      } else if (camMode === 'glb' && glbCam && (glbCam as any).radius !== undefined) {
        const arc = glbCam as any;
        const factor = delta > 0 ? 1.1 : 0.9;
        arc.radius = Math.max(0.1, arc.radius * factor);
      }
    };
    
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onWheel as any);
    };
  }, [camMode, freeCam, glbCam, freeSpeed, sceneRef]);

  return (
    <div style={{ 
      width, 
      height, 
      border: '2px solid #ccc', 
      borderRadius: '8px', 
      overflow: 'hidden', 
      backgroundColor: '#f0f0f0', 
      position: 'relative' 
    }}>
      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: '100%', display: 'block' }} 
      />
      
      {status && (
        <div style={{ 
          position: 'absolute', 
          left: 12, 
          bottom: 12, 
          padding: '6px 10px', 
          background: 'rgba(0,0,0,0.6)', 
          color: '#fff', 
          borderRadius: 6, 
          fontSize: 12 
        }}>
          {status}
        </div>
      )}

      {/* Cube controls indicator */}
      {(cubePhysics || p2CubePhysics) && (
        <div style={{ 
          position: 'absolute', 
          right: 12, 
          bottom: 12, 
          padding: '8px 12px', 
          background: 'rgba(0,0,0,0.7)', 
          color: '#fff', 
          borderRadius: 6, 
          fontSize: 11,
          fontFamily: 'monospace'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Cube Controls:</div>
          <div style={{ marginBottom: 4 }}>
            <button 
              onClick={() => setSelectedCube('p1')}
              style={{
                padding: '2px 6px',
                marginRight: 4,
                border: 'none',
                borderRadius: 3,
                background: selectedCube === 'p1' ? '#4CAF50' : '#666',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 10
              }}
            >
              P1
            </button>
            <button 
              onClick={() => setSelectedCube('p2')}
              style={{
                padding: '2px 6px',
                border: 'none',
                borderRadius: 3,
                background: selectedCube === 'p2' ? '#4CAF50' : '#666',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 10
              }}
            >
              P2
            </button>
          </div>
          <div>I - Back</div>
          <div>K - Forward</div>
          <div>J - Left</div>
          <div>L - Right</div>
          <div>M - Jump</div>
        </div>
      )}

      {/* Reset Button */}
      {originalPositions.p1 && originalPositions.p2 && (
        <div style={{ 
          position: 'absolute', 
          right: 12, 
          top: 12, 
          padding: '8px 12px', 
          background: 'rgba(0,0,0,0.7)', 
          color: '#fff', 
          borderRadius: 6, 
          fontSize: 11,
          fontFamily: 'monospace'
        }}>
          <button 
            onClick={resetCubesToOriginalPositions}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderRadius: 4,
              background: '#FF5722',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 'bold'
            }}
          >
            <RotateCcw size={16} /> Reset Cubes
          </button>
        </div>
      )}

      {/* Tag Game Controls */}
      {tagGameActive && (
        <div style={{ 
          position: 'absolute', 
          left: 12, 
          top: 12, 
          padding: '12px', 
          background: 'rgba(0,0,0,0.8)', 
          color: '#fff', 
          borderRadius: 8, 
          fontSize: 12,
          fontFamily: 'monospace',
          minWidth: '200px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#4CAF50' }}>
            <Play size={16} /> TAG GAME
          </div>
          
          {/* Game Status */}
          <div style={{ marginBottom: 8 }}>
            <div>Status: <span style={{ color: tagGame.isPlaying ? '#4CAF50' : tagGame.isPaused ? '#FFC107' : '#666' }}>
              {tagGame.isPlaying ? 'PLAYING' : tagGame.isPaused ? 'PAUSED' : tagGame.isFinished ? 'FINISHED' : 'WAITING'}
            </span></div>
            <div>Current Tagger: <span style={{ color: tagGame.currentTagger === 'p1' ? '#2196F3' : '#FF5722' }}>
              {tagGame.currentTagger.toUpperCase()}
            </span></div>
            <div>Time: {tagGame.formatTime(tagGame.remainingTime)}</div>
          </div>

          {/* Scores */}
          <div style={{ marginBottom: 8 }}>
            <div>P1 Score: <span style={{ color: '#2196F3' }}>{tagGame.p1Score}</span></div>
            <div>P2 Score: <span style={{ color: '#FF5722' }}>{tagGame.p2Score}</span></div>
          </div>

          {/* Winner */}
          {tagGame.isFinished && tagGame.winner && (
            <div style={{ marginBottom: 8, color: '#4CAF50', fontWeight: 'bold' }}>
              🏆 Winner: {tagGame.winner === 'tie' ? 'TIE!' : `${tagGame.winner.toUpperCase()} WINS!`}
            </div>
          )}

          {/* Game Controls */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {!tagGame.isPlaying && !tagGame.isFinished && (
              <button 
                onClick={tagGame.startGame}
                style={{
                  padding: '4px 8px',
                  border: 'none',
                  borderRadius: 4,
                  background: '#4CAF50',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 10
                }}
              >
                Start
              </button>
            )}
            
            {tagGame.isPlaying && (
              <button 
                onClick={tagGame.pauseGame}
                style={{
                  padding: '4px 8px',
                  border: 'none',
                  borderRadius: 4,
                  background: '#FFC107',
                  color: '#000',
                  cursor: 'pointer',
                  fontSize: 10
                }}
              >
                Pause
              </button>
            )}
            
            {tagGame.isPaused && (
              <button 
                onClick={tagGame.resumeGame}
                style={{
                  padding: '4px 8px',
                  border: 'none',
                  borderRadius: 4,
                  background: '#4CAF50',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 10
                }}
              >
                Resume
              </button>
            )}
            
            <button 
              onClick={tagGame.resetGame}
              style={{
                padding: '4px 8px',
                border: 'none',
                borderRadius: 4,
                background: '#666',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 10
              }}
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Camera controls */}
      <div style={{ 
        position: 'absolute', 
        left: tagGameActive ? '220px' : '12px', 
        top: 12, 
        display: 'flex', 
        gap: 8, 
        alignItems: 'center',
        flexWrap: 'wrap' 
      }}>
        <button 
          onClick={() => setTagGameActive(!tagGameActive)}
          style={{ 
            padding: '8px 12px', 
            border: 'none', 
            borderRadius: 6, 
            background: tagGameActive ? '#4CAF50' : '#444', 
            color: '#fff', 
            cursor: 'pointer' 
          }}
        >
          {tagGameActive ? <><Play size={16} /> Tag Game ON</> : <><Play size={16} /> Enable Tag Game</>}
        </button>
        
        <button 
          onClick={() => switchCamera(camMode === 'glb' ? 'free' : 'glb')} 
          style={{ 
            padding: '8px 12px', 
            border: 'none', 
            borderRadius: 6, 
            background: '#444', 
            color: '#fff', 
            cursor: 'pointer' 
          }}
        >
          {camMode === 'glb' ? 'Switch to Free Cam (WASD + mouse)' : 'Switch to GLB Cam'}
        </button>
        
        <button 
          onClick={resetCamera} 
          style={{ 
            padding: '8px 12px', 
            border: 'none', 
            borderRadius: 6, 
            background: '#666', 
            color: '#fff', 
            cursor: 'pointer' 
          }}
        >
          Reset Cam
        </button>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 6, 
          background: '#fff', 
          borderRadius: 6, 
          padding: '4px 8px' 
        }}>
          <span style={{ fontSize: 12 }}>Speed</span>
          <input 
            type="range" 
            min={0.1} 
            max={2} 
            step={0.1} 
            value={freeSpeed} 
            onChange={(e) => setFreeSpeed(parseFloat(e.target.value))} 
          />
        </div>
        
        <button 
          onClick={zoomIn} 
          style={{ 
            padding: '6px 10px', 
            border: 'none', 
            borderRadius: 6, 
            background: '#2d7', 
            color: '#fff', 
            cursor: 'pointer' 
          }}
        >
          Zoom +
        </button>
        
        <button 
          onClick={zoomOut} 
          style={{ 
            padding: '6px 10px', 
            border: 'none', 
            borderRadius: 6, 
            background: '#d72', 
            color: '#fff', 
            cursor: 'pointer' 
          }}
        >
          Zoom -
        </button>
      </div>

    </div>
  );
};

export default SceneViewer;