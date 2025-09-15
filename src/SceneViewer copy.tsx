import React, { useRef, useEffect, useState } from 'react';
import {
  Engine,
  Scene,
  Vector3,
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

interface SceneViewerProps {
  width?: number;
  height?: number;
}

type CamMode = 'glb' | 'free';

const SceneViewer: React.FC<SceneViewerProps> = ({ width = 800, height = 600 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<string>('Initializing...');
  
  const [sceneRef, setSceneRef] = useState<Scene | null>(null);
  const [glbCam, setGlbCam] = useState<ArcRotateCamera | FreeCamera | null>(null);
  const [freeCam, setFreeCam] = useState<UniversalCamera | null>(null);
  const [camMode, setCamMode] = useState<CamMode>('glb');
  const [freeSpeed, setFreeSpeed] = useState<number>(0.5);
  const [cubePhysics, setCubePhysics] = useState<PhysicsAggregate | null>(null);
  const [p2CubePhysics, setP2CubePhysics] = useState<PhysicsAggregate | null>(null);
  const [selectedCube, setSelectedCube] = useState<'p1' | 'p2'>('p1');
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());

  // Visual refs
  const screensRef = useRef<any[]>([]);

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
    SceneLoader.Append('/', 'Untitled.glb', scene, () => {
      console.log('✅ GLB loaded successfully. Meshes:', scene.meshes.length, 'Cameras:', scene.cameras.length);
      
      console.log('=== ALL MESH NAMES ===');
      scene.meshes.forEach((mesh, index) => {
        console.log(`${index}: "${mesh.name}"`);
      });
      console.log('=== END MESH NAMES ===');
      
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
  }, [freeSpeed]);

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
          
        } else if (mesh.name.toLowerCase().includes('p1')) {
          // p1 cube - Dynamic rigid body with BOX shape
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, {
            mass: 2,
            restitution: 0.3,
            friction: 0.5
          }, scene);
          setCubePhysics(agg);
          console.log(`✅ p1 cube physics (BOX) applied to: ${mesh.name}`);
          physicsApplied = true;
        } else if (mesh.name.toLowerCase().includes('p2')) {
          // p2 cube - Dynamic rigid body with BOX shape (same as p1)
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, {
            mass: 2,
            restitution: 0.3,
            friction: 0.5
          }, scene);
          setP2CubePhysics(agg);
          console.log(`✅ p2 cube physics (BOX) applied to: ${mesh.name}`);
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

  // Continuous cube movement function
  const updateCubeMovement = () => {
    const activePhysics = selectedCube === 'p1' ? cubePhysics : p2CubePhysics;
    if (!activePhysics || !activePhysics.body) return;
    
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
  };

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (['i', 'k', 'j', 'l', 'm'].includes(key)) {
        event.preventDefault();
        setKeysPressed(prev => new Set(prev).add(key));
      }
    };
    
    const handleKeyUp = (event: KeyboardEvent) => {
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
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      {/* Canvas Container */}
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
      </div>

    </div>
  );
};

export default SceneViewer;