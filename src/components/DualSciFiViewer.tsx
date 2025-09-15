import React, { useRef, useEffect, useState } from 'react';
import {
  Engine,
  Scene,
  Vector3,
  HemisphericLight,
  ArcRotateCamera,
  SceneLoader,
  UniversalCamera,
  PhysicsShapeType,
  Camera
} from '@babylonjs/core';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import '@babylonjs/loaders';
import { HDRCubeTexture } from '@babylonjs/core/Materials/Textures/hdrCubeTexture';
import '@babylonjs/core/Materials/Textures/Loaders/exrTextureLoader';
import { Video } from 'lucide-react';

interface DualSciFiViewerProps {
  width?: number;
  height?: number;
}

type CamMode = 'glb' | 'free';

const DualSciFiViewer: React.FC<DualSciFiViewerProps> = ({ width = 800, height = 600 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<string>('Initializing...');
  
  const [sceneRef, setSceneRef] = useState<Scene | null>(null);
  const [engineRef, setEngineRef] = useState<Engine | null>(null);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [freeCam, setFreeCam] = useState<UniversalCamera | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [camMode, setCamMode] = useState<CamMode>('glb');
  const [freeSpeed, setFreeSpeed] = useState<number>(0.5);
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
  const [cubePhysics, setCubePhysics] = useState<PhysicsAggregate | null>(null);
  const [p2CubePhysics, setP2CubePhysics] = useState<PhysicsAggregate | null>(null);
  const [selectedCube, setSelectedCube] = useState<'p1' | 'p2'>('p1');

  // Main setup effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setStatus('Creating engine...');
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    setEngineRef(engine);

    const scene = new Scene(engine);
    scene.useRightHandedSystem = true;
    setSceneRef(scene);

    // Setup lighting
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    // Load HDR environment
    const hdrTexture = new HDRCubeTexture('/blocky_photo_studio_2k.hdr', scene, 512);
    scene.environmentTexture = hdrTexture;
    scene.createDefaultSkybox(hdrTexture, true, 1000);

    setStatus('Loading GLB model...');
    SceneLoader.Append('/scifi.glb', '', scene, () => {
      console.log('🎬 GLB loaded successfully');
      
      // Make blocker mesh invisible
      const blockerMesh = scene.getMeshByName('blocker');
      if (blockerMesh) {
        blockerMesh.isVisible = false;
        console.log('🚫 Made blocker mesh invisible');
      }

      console.log('=== ALL CAMERA NAMES ===');
      scene.cameras.forEach((camera, index) => {
        console.log(`${index}: "${camera.name}"`);
      });

      // Find and setup GLB cameras
      const glbCameras = scene.cameras.filter(cam => cam.name && cam.name !== '' && cam.name !== 'freeCam') as Camera[];
      console.log('🎥 Found GLB cameras:', glbCameras.map(cam => cam.name));
      
      setCameras(glbCameras);
      
      // Setup all cameras
      glbCameras.forEach(camera => {
        camera.minZ = 0.01;
        camera.maxZ = 10000;
      });

      // Create free camera with built-in keyboard controls (WASDQE)
      const freeCamera = new UniversalCamera('freeCam', new Vector3(0, 5, -10), scene);
      freeCamera.setTarget(Vector3.Zero());
      freeCamera.speed = freeSpeed;
      freeCamera.keysUp = [87]; // W
      freeCamera.keysDown = [83]; // S
      freeCamera.keysLeft = [65]; // A
      freeCamera.keysRight = [68]; // D
      freeCamera.keysUpward = [69]; // E
      freeCamera.keysDownward = [81]; // Q
      setFreeCam(freeCamera);

      // Set initial camera
      if (glbCameras[0]) {
        scene.activeCamera = glbCameras[0];
        glbCameras[0].attachControl(canvas, true);
      }

      setStatus('Sci-Fi Scene Ready');

      // Setup physics with a small delay to ensure meshes are fully loaded
      setTimeout(() => {
        setupPhysics(scene);
      }, 100);

      // Start render loop
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
  }, []);


  // Update free camera speed
  useEffect(() => {
    if (freeCam) {
      freeCam.speed = freeSpeed;
    }
  }, [freeSpeed, freeCam]);

  // Physics Setup Function
  const setupPhysics = async (scene: Scene) => {
    try {
      setStatus('Loading Havok Physics...');
      
      // Dynamically import Havok
      const { default: HavokPhysics } = await import('@babylonjs/havok');
      const havokInstance = await HavokPhysics();
      const havokPlugin = new (await import('@babylonjs/core').then(mod => mod.HavokPlugin))(true, havokInstance);
      
      scene.enablePhysics(new Vector3(0, -9.81, 0), havokPlugin);
      console.log('🔵 Havok Physics v2 engine initialized with gravity');
      
      setupMeshPhysics(scene);
    } catch (error) {
      console.error('❌ Failed to load Havok Physics:', error);
      setStatus('Physics failed to load');
    }
  };

  // Setup physics for meshes
  const setupMeshPhysics = (scene: Scene) => {
    let physicsApplied = false;
    
    scene.meshes.forEach((mesh: any) => {
      if (!mesh.name || mesh.name.startsWith('__root__') || !mesh.geometry || mesh.name.includes('screen')) return;
      
      try {
        let agg: PhysicsAggregate | null = null;
        
        if (mesh.name.toLowerCase().includes('floor')) {
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.MESH, {
            mass: 0,
            restitution: 0.2,
            friction: 0.8
          }, scene);
          console.log(`✅ Floor physics (MESH) applied to: ${mesh.name}`);
          physicsApplied = true;
        } else if (mesh.name.toLowerCase().includes('wall')) {
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.MESH, {
            mass: 0,
            restitution: 0.2,
            friction: 0.8
          }, scene);
          console.log(`✅ Wall physics (MESH) applied to: ${mesh.name}`);
          physicsApplied = true;
        } else if (mesh.name.toLowerCase().includes('blocker')) {
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.MESH, {
            mass: 0,
            restitution: 0.2,
            friction: 0.8
          }, scene);
          mesh.isVisible = false;
          mesh.checkCollisions = true;
          console.log(`✅ Blocker physics (MESH) applied to: ${mesh.name} - INVISIBLE WITH COLLISION`);
          physicsApplied = true;
        } else if (mesh.name.toLowerCase().includes('p1 cube')) {
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, {
            mass: 2,
            restitution: 0.3,
            friction: 0.5
          }, scene);
          setCubePhysics(agg);
          console.log(`✅ P1 Cube physics (BOX) applied to: ${mesh.name}`);
          physicsApplied = true;
        } else if (mesh.name.toLowerCase().includes('p2 cube')) {
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, {
            mass: 2,
            restitution: 0.3,
            friction: 0.5
          }, scene);
          setP2CubePhysics(agg);
          console.log(`✅ P2 Cube physics (BOX) applied to: ${mesh.name}`);
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
          mesh.checkCollisions = true;
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
   useEffect(() => {
     if (!sceneRef || !cameras.length) return;
     
     let targetCamera;
     if (camMode === 'glb') {
       targetCamera = selectedCamera ? 
         sceneRef.cameras.find(cam => cam.name === selectedCamera) || cameras[0] : 
         cameras[0];
     } else {
       targetCamera = freeCam;
     }
     
     if (targetCamera && targetCamera !== sceneRef.activeCamera) {
       sceneRef.activeCamera?.detachControl();
       sceneRef.activeCamera = targetCamera;
       targetCamera.attachControl(canvasRef.current, true);
     }
   }, [selectedCamera, camMode]);

   // Switch between GLB and free camera
   const switchCamMode = (mode: CamMode) => {
     setCamMode(mode);
   };

  // Handle keyboard input (used for cube movement)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event || !event.key) return;
      setKeysPressed(prev => new Set(prev).add(event.key.toLowerCase()));
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event || !event.key) return;
      setKeysPressed(prev => {
        const newSet = new Set(prev);
        newSet.delete(event.key.toLowerCase());
        return newSet;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Cube movement logic
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
        console.log('⚠️ Physics body disposed or invalid, skipping movement update');
        return;
      }
    };

    const interval = setInterval(moveCube, 16);
    return () => clearInterval(interval);
  }, [cubePhysics, p2CubePhysics, keysPressed, selectedCube, camMode]);

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

      {/* Camera controls - moved to top right to match SceneViewer */}
      <div style={{ 
        position: 'absolute', 
        right: 12, 
        top: 12, 
        display: 'flex', 
        gap: 8, 
        alignItems: 'center',
        flexWrap: 'wrap' 
      }}>
        <button 
          onClick={() => switchCamMode(camMode === 'glb' ? 'free' : 'glb')} 
          style={{ 
            padding: '6px 10px', 
            border: 'none', 
            borderRadius: 4, 
            background: '#444', 
            color: '#fff', 
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          {camMode === 'glb' ? 'Free Cam' : 'GLB Cam'}
        </button>
        
        <select
          value={selectedCamera}
          onChange={(e) => setSelectedCamera(e.target.value)}
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            fontSize: '11px',
            minWidth: '120px',
            background: '#fff'
          }}
        >
          <option value="">Auto</option>
          {cameras.map(camera => (
            <option key={camera.name} value={camera.name}>
              {camera.name}
            </option>
          ))}
        </select>
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
        </div>
      )}

      {/* Current camera info - similar to SceneViewer */}
      {camMode === 'glb' && cameras.length > 0 && (
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
          <Video size={16} /> {selectedCamera || cameras[0]?.name || 'Unknown'} ({cameras.findIndex(cam => cam.name === (selectedCamera || cameras[0]?.name)) + 1}/{cameras.length})
        </div>
      )}

      {/* Cube controls - made more compact */}
      {camMode !== 'free' && (cubePhysics || p2CubePhysics) && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '11px',
          fontFamily: 'monospace',
          minWidth: '180px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Cube Controls:</div>
          <div style={{ marginBottom: 4 }}>
            <button 
              onClick={() => setSelectedCube('p1')} 
              style={{ 
                marginRight: '6px', 
                padding: '2px 6px', 
                background: selectedCube === 'p1' ? '#4CAF50' : '#666',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '10px'
              }}
            >
              P1
            </button>
            <button 
              onClick={() => setSelectedCube('p2')} 
              style={{ 
                padding: '2px 6px', 
                background: selectedCube === 'p2' ? '#4CAF50' : '#666',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '10px'
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
    </div>
  );
};

export default DualSciFiViewer;