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
  PhysicsShapeType,
  Matrix,
  Viewport
} from '@babylonjs/core';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import type { PickingInfo } from '@babylonjs/core';
import '@babylonjs/loaders';
import { HDRCubeTexture } from '@babylonjs/core/Materials/Textures/hdrCubeTexture';
import '@babylonjs/core/Materials/Textures/Loaders/exrTextureLoader';
import { Ray } from '@babylonjs/core/Culling/ray';
import { Video } from 'lucide-react';

interface SciFiSceneViewerProps {
  width?: number;
  height?: number;
  selectedCamera?: string;
}

type CamMode = 'glb' | 'free';

const SciFiSceneViewer: React.FC<SciFiSceneViewerProps> = ({ width = 800, height = 600, selectedCamera: propSelectedCamera }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<string>('Initializing...');
  
  const [sceneRef, setSceneRef] = useState<Scene | null>(null);
  const [glbCam, setGlbCam] = useState<ArcRotateCamera | FreeCamera | null>(null);
  const [freeCam, setFreeCam] = useState<UniversalCamera | null>(null);
  const [camMode, setCamMode] = useState<CamMode>('glb');
  const [freeSpeed, setFreeSpeed] = useState<number>(0.5);
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
  const [cubePhysics, setCubePhysics] = useState<PhysicsAggregate | null>(null);
  const [p2CubePhysics, setP2CubePhysics] = useState<PhysicsAggregate | null>(null);
  const [selectedCube, setSelectedCube] = useState<'p1' | 'p2'>('p1');
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>(propSelectedCamera || '');
  const [currentCameraIndex, setCurrentCameraIndex] = useState<number>(0);

  // Main scene setup effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setStatus('Creating engine...');
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new Scene(engine);
    scene.useRightHandedSystem = true; // Fix camera flip issue with proper coordinate system
    setSceneRef(scene);

    // Create lighting
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    setStatus('Loading Sci-Fi GLB...');

    // Load GLB scene
    SceneLoader.Append('/', 'scifi.glb', scene, async () => {
      console.log('✅ Sci-Fi GLB loaded successfully. Meshes:', scene.meshes.length, 'Cameras:', scene.cameras.length);
      
      console.log('=== ALL MESH NAMES ===');
      scene.meshes.forEach((mesh, index) => {
        console.log(`${index}: "${mesh.name}"`);
      });

      // Make blocker mesh invisible
      const blockerMesh = scene.meshes.find(mesh => mesh.name === 'blocker');
      if (blockerMesh) {
        blockerMesh.setEnabled(false);
        console.log('🚫 Made blocker mesh invisible');
      } else {
        console.log('⚠️ Blocker mesh not found');
      }

      console.log('=== ALL CAMERA NAMES ===');
      scene.cameras.forEach((camera, index) => {
        console.log(`${index}: "${camera.name}"`);
      });

      // Find and setup GLB cameras (exclude the free camera we'll create later)
      const glbCameras = scene.cameras.filter(cam => cam.name && cam.name !== '' && cam.name !== 'freeCam');
      console.log('🎥 Found GLB cameras:', glbCameras.map(cam => cam.name));
      
      // Store all cameras for selection
      setCameras(glbCameras);
      
      if (glbCameras.length > 0) {
        // Use selected camera or default to first one
        const targetCamera = selectedCamera ? 
          glbCameras.find(cam => cam.name === selectedCamera) || glbCameras[0] : 
          glbCameras[0];
        
        // Set the current camera index
        const cameraIndex = glbCameras.findIndex(cam => cam.name === targetCamera.name);
        setCurrentCameraIndex(cameraIndex >= 0 ? cameraIndex : 0);
        
        console.log('🎥 Using camera:', targetCamera.name);
        
        try {
          // Camera flip logic removed - right-handed system handles this properly
          console.log('🎥 Using right-handed coordinate system - no manual flip needed');
          
          // Setup all cameras
          glbCameras.forEach(camera => {
            (camera as any).minZ = 0.01;
            (camera as any).maxZ = 10000;
          });
          
          setGlbCam(targetCamera as any);
          scene.activeCamera = targetCamera as any;
          targetCamera.attachControl(canvas, true);
        } catch (error) {
          console.error('❌ Error setting up GLB camera:', error);
          // Fallback to default camera
          const defaultCamera = new ArcRotateCamera('defaultCam', 0, Math.PI / 3, 10, Vector3.Zero(), scene);
          defaultCamera.attachControl(canvas, true);
          setGlbCam(defaultCamera);
          scene.activeCamera = defaultCamera;
        }
      } else {
        console.log('⚠️ No GLB cameras found, creating default camera');
        const defaultCamera = new ArcRotateCamera('defaultCam', 0, Math.PI / 3, 10, Vector3.Zero(), scene);
        defaultCamera.attachControl(canvas, true);
        setGlbCam(defaultCamera);
        scene.activeCamera = defaultCamera;
      }

      // Create free camera AFTER GLB loads
      // Note: In right-handed system, cameras look along -Z by default
      const freeCamera = new UniversalCamera('freeCam', new Vector3(0, 5, -10), scene);
      freeCamera.setTarget(Vector3.Zero());
      freeCamera.attachControl(canvas, true);
      freeCamera.detachControl();
      setFreeCam(freeCamera);

      setStatus('Sci-Fi Scene Ready');

      // Enable physics AFTER GLB is fully loaded
      // Add a small delay to ensure all meshes are fully processed
      setTimeout(async () => {
        await setupPhysics(scene);
      }, 100);

      // Start render loop only after camera is set
      engine.runRenderLoop(() => {
        scene.render();
      });
    });

    // Handle window resize
    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      scene.dispose();
      engine.dispose();
    };
  }, [freeSpeed, selectedCamera]);


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
      
      // Setup physics for specific meshes after physics engine is ready
      setupMeshPhysics(scene);
      
    } catch (error) {
      console.error('❌ Failed to load Havok Physics:', error);
      setStatus('Physics failed to load');
    }
  };

  // Setup physics for specific meshes
  const setupMeshPhysics = (scene: Scene) => {
    let physicsApplied = false;
    
    console.log(`🔧 Setting up physics for ${scene.meshes.length} meshes...`);
    
    scene.meshes.forEach((mesh: any) => {
      // Skip root nodes, empty meshes, and screen meshes
      if (!mesh.name || mesh.name.startsWith('__root__') || !mesh.geometry || mesh.name.includes('screen')) {
        console.log(`⏭️ Skipping mesh: "${mesh.name}" (root/empty/screen)`);
        return;
      }
      
      console.log(`🔧 Setting up physics for: "${mesh.name}"`);
      
      try {
        let agg: PhysicsAggregate | null = null;
        
        // Check for floor meshes
        if (mesh.name.toLowerCase().includes('floor')) {
          // Floor - Static rigid body with MESH shape
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.MESH, {
            mass: 0,
            restitution: 0.2,
            friction: 0.8
          }, scene);
          console.log(`✅ Floor physics (MESH) applied to: ${mesh.name}`);
          physicsApplied = true;
          
        } else if (mesh.name.toLowerCase().includes('wall')) {
          // Wall - Static rigid body with MESH shape
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.MESH, {
            mass: 0,
            restitution: 0.1,
            friction: 0.6
          }, scene);
          console.log(`✅ Wall physics (MESH) applied to: ${mesh.name}`);
          physicsApplied = true;
          
        } else if (mesh.name.toLowerCase().includes('blocker')) {
          // Blocker - Static rigid body with MESH shape, invisible but with collision
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.MESH, {
            mass: 0, // Static (immovable)
            restitution: 0.2, // Slight bounce
            friction: 0.8 // High friction for better collision response
          }, scene);
          
          // Make the blocker invisible but keep collision
          mesh.isVisible = false;
          mesh.checkCollisions = true; // Ensure collisions are enabled
          
          console.log(`✅ Blocker physics (MESH) applied to: ${mesh.name} - INVISIBLE WITH COLLISION`);
          physicsApplied = true;
          
        } else if (mesh.name.toLowerCase().includes('p1 cube')) {
          // p1 cube - Dynamic rigid body with BOX shape
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, {
            mass: 2,
            restitution: 0.3,
            friction: 0.5
          }, scene);
          setCubePhysics(agg);
          console.log(`✅ p1 cube physics (BOX) applied to: ${mesh.name}`);
          physicsApplied = true;
          
        } else if (mesh.name.toLowerCase().includes('p2 cube')) {
          // p2 cube - Dynamic rigid body with BOX shape
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, {
            mass: 2,
            restitution: 0.3,
            friction: 0.5
          }, scene);
          setP2CubePhysics(agg);
          console.log(`✅ p2 cube physics (BOX) applied to: ${mesh.name}`);
          physicsApplied = true;
          
        } else if (mesh.name === 'box_006.015' || mesh.name === 'box_003.001') {
          // Specific sci-fi scene boxes - Dynamic rigid bodies with BOX shape
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, {
            mass: 1.5,
            restitution: 0.4,
            friction: 0.6
          }, scene);
          console.log(`✅ Sci-fi box physics (BOX) applied to: ${mesh.name}`);
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
      setStatus('Havok Physics v2 enabled - p1 and p2 cubes should fall!');
      setTimeout(() => setStatus(''), 3000);
    } else {
      setStatus('No physics meshes found');
      console.warn('No meshes found for physics. Available meshes:', scene.meshes.map((m: any) => m.name));
    }
  };

  // Camera switching
  const switchCamera = (mode: CamMode) => {
    if (!sceneRef || !glbCam || !freeCam) return;
    
    if (mode === 'glb') {
      sceneRef.activeCamera = glbCam as any;
      glbCam.attachControl(canvasRef.current, true);
      freeCam.detachControl();
    } else {
      sceneRef.activeCamera = freeCam;
      freeCam.attachControl(canvasRef.current, true);
      glbCam.detachControl();
    }
    setCamMode(mode);
  };

  // Switch to next GLB camera
  const switchToNextGLBCamera = () => {
    if (!sceneRef || cameras.length <= 1 || camMode !== 'glb') return;
    
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    
    if (nextCamera) {
      // Detach current camera
      if (glbCam) {
        glbCam.detachControl();
      }
      
      // Switch to next camera
      setCurrentCameraIndex(nextIndex);
      setGlbCam(nextCamera);
      sceneRef.activeCamera = nextCamera;
      nextCamera.attachControl(canvasRef.current, true);
      
      console.log('🎥 Switched to camera:', nextCamera.name);
    }
  };

  // Handle keyboard input for free camera and cube movement
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event || !event.key) return;
      
      const key = event.key.toLowerCase();
      
      if (camMode === 'free') {
        setKeysPressed(prev => new Set(prev).add(key));
      } else if (['i', 'k', 'j', 'l', 'm'].includes(key)) {
        // Cube movement keys
        event.preventDefault();
        setKeysPressed(prev => new Set(prev).add(key));
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event || !event.key) return;
      
      const key = event.key.toLowerCase();
      setKeysPressed(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [camMode]);

  // Free camera movement
  useEffect(() => {
    if (!freeCam || camMode !== 'free') return;

    const moveCamera = () => {
      const speed = freeSpeed;
      const right = freeCam.getDirection(Vector3.Right());
      const forward = freeCam.getDirection(Vector3.Forward());
      const up = Vector3.Up();

      if (keysPressed.has('w')) {
        freeCam.position.addInPlace(forward.scale(speed));
      }
      if (keysPressed.has('s')) {
        freeCam.position.addInPlace(forward.scale(-speed));
      }
      if (keysPressed.has('a')) {
        freeCam.position.addInPlace(right.scale(-speed));
      }
      if (keysPressed.has('d')) {
        freeCam.position.addInPlace(right.scale(speed));
      }
      if (keysPressed.has('q')) {
        freeCam.position.addInPlace(up.scale(-speed));
      }
      if (keysPressed.has('e')) {
        freeCam.position.addInPlace(up.scale(speed));
      }
    };

    const interval = setInterval(moveCamera, 16); // ~60fps
    return () => clearInterval(interval);
  }, [freeCam, keysPressed, freeSpeed, camMode]);

  // Cube movement
  useEffect(() => {
    if (camMode === 'free') return; // Only move cubes when not in free camera mode

    const moveCube = () => {
      const activePhysics = selectedCube === 'p1' ? cubePhysics : p2CubePhysics;
      if (!activePhysics || !activePhysics.body) return;
      
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

    const interval = setInterval(moveCube, 16); // ~60fps
    return () => clearInterval(interval);
  }, [cubePhysics, p2CubePhysics, keysPressed, selectedCube, camMode]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
        width={width}
        height={height}
      />
      
      {/* Status overlay */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '14px',
        fontFamily: 'monospace'
      }}>
        {status}
      </div>

      {/* Camera controls */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        display: 'flex',
        gap: '8px',
        flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => switchCamera('glb')}
            style={{
              padding: '8px 12px',
              background: camMode === 'glb' ? '#007acc' : '#333',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            GLB Camera
          </button>
          <button
            onClick={() => switchCamera('free')}
            style={{
              padding: '8px 12px',
              background: camMode === 'free' ? '#007acc' : '#333',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Free Camera
          </button>
        </div>
        
        {/* Switch GLB Camera Button */}
        {camMode === 'glb' && cameras.length > 1 && (
          <button
            onClick={switchToNextGLBCamera}
            style={{
              padding: '8px 12px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            Switch Camera ({cameras[currentCameraIndex]?.name || 'Unknown'})
          </button>
        )}
        
        {/* Camera selector */}
        {cameras.length > 1 && (
          <select
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            style={{
              padding: '4px 8px',
              background: '#333',
              color: 'white',
              border: '1px solid #555',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            <option value="">Auto (First Camera)</option>
            {cameras.map(camera => (
              <option key={camera.name} value={camera.name}>
                {camera.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Free camera controls info */}
      {camMode === 'free' && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <div>WASD: Move | QE: Up/Down | Mouse: Look</div>
          <div>Speed: {freeSpeed.toFixed(1)}</div>
          <div style={{ color: '#4CAF50', fontSize: '10px' }}>Right-handed system active</div>
        </div>
      )}

      {/* Current camera info */}
      {camMode === 'glb' && glbCam && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '10px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '6px 10px',
          borderRadius: '4px',
          fontSize: '11px',
          fontFamily: 'monospace',
          transform: 'translateY(-50%)'
        }}>
          <Video size={16} /> {glbCam.name} ({currentCameraIndex + 1}/{cameras.length})
        </div>
      )}

      {/* Cube controls */}
      {camMode !== 'free' && (cubePhysics || p2CubePhysics) && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '11px',
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

      {/* Speed control */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        <label>
          Speed: 
          <input
            type="range"
            min="0.1"
            max="2.0"
            step="0.1"
            value={freeSpeed}
            onChange={(e) => setFreeSpeed(parseFloat(e.target.value))}
            style={{ marginLeft: '8px' }}
          />
        </label>
      </div>
    </div>
  );
};

export default SciFiSceneViewer;