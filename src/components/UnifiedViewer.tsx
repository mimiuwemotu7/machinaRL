import React, { useRef, useEffect, useState } from 'react';
import {
  Engine,
  Scene,
  Vector3,
  Quaternion,
  Matrix,
  HemisphericLight,
  ArcRotateCamera,
  SceneLoader,
  StandardMaterial,
  DynamicTexture,
  Color3,
  FreeCamera,
  UniversalCamera,
  PhysicsShapeType,
  Camera,
  Texture,
  Animation,
  AnimationGroup
} from '@babylonjs/core';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import type { PickingInfo } from '@babylonjs/core';
import '@babylonjs/loaders';
import { HDRCubeTexture } from '@babylonjs/core/Materials/Textures/hdrCubeTexture';
import '@babylonjs/core/Materials/Textures/Loaders/exrTextureLoader';
import { Ray } from '@babylonjs/core/Culling/ray';
import useTagGame from './TagGame';
import Movement from './Movement';
import { Trophy, RotateCcw, Play } from 'lucide-react';


interface UnifiedViewerProps {
  width?: number;
  height?: number;
  modelFilename?: string;
  selectedCamera?: string;
  onStateChange?: (state: {
    camMode: CamMode;
    freeSpeed: number;
    selectedCube: 'p1' | 'p2';
    tagGameActive: boolean;
    currentScene: string;
    screenMeshes: any[];
    cameras: Camera[];
    currentCameraIndex: number;
    glbCam: ArcRotateCamera | FreeCamera | null;
    scene: Scene | null;
  }) => void;
  onControlAction?: (action: string, value?: any) => void;
}

type CamMode = 'glb' | 'free';

const UnifiedViewer: React.FC<UnifiedViewerProps> = ({ 
  width = 800, 
  height = 600, 
  modelFilename = 'scene1.glb',
  selectedCamera: propSelectedCamera,
  onStateChange,
  onControlAction
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<string>('Initializing...');
  
  const [sceneRef, setSceneRef] = useState<Scene | null>(null);
  const [glbCam, setGlbCam] = useState<ArcRotateCamera | FreeCamera | null>(null);
  const [freeCam, setFreeCam] = useState<UniversalCamera | null>(null);
  const [camMode, setCamMode] = useState<CamMode>('glb');
  const [freeSpeed, setFreeSpeed] = useState<number>(0.5);
  const [cubePhysics, setCubePhysics] = useState<any>(null); // Now { body: PhysicsBody, transformNode: Mesh }
  const [p2CubePhysics, setP2CubePhysics] = useState<any>(null);
  const [selectedCube, setSelectedCube] = useState<'p1' | 'p2'>('p1');
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>(propSelectedCamera || '');
  const [currentCameraIndex, setCurrentCameraIndex] = useState<number>(0);
  const [tagGameActive, setTagGameActive] = useState<boolean>(false);
  const [currentScene, setCurrentScene] = useState<string>('');
  const [screenMeshes, setScreenMeshes] = useState<any[]>([]);
  
  
  // Store original positions for reset functionality
  const [originalPositions, setOriginalPositions] = useState<{
    p1: Vector3 | null;
    p2: Vector3 | null;
  }>({ p1: null, p2: null });

  // Expose physics objects and scene state to global scope for AI code execution
  useEffect(() => {
    (window as any).cubePhysics = cubePhysics;
    (window as any).p2CubePhysics = p2CubePhysics;
    (window as any).originalPositions = originalPositions;
    (window as any).currentScene = sceneRef;
    (window as any).Vector3 = Vector3;
    (window as any).Matrix = (window as any).Matrix || require('@babylonjs/core').Matrix;
    
    // console.log('🌐 [UnifiedViewer] Exposed physics objects to global scope for AI code execution');
  }, [cubePhysics, p2CubePhysics, originalPositions, sceneRef]);

  // Visual refs
  const screensRef = useRef<any[]>([]);

  // Tag game hook
  const tagGame = useTagGame({
    p1Physics: cubePhysics,
    p2Physics: p2CubePhysics,
    scene: sceneRef,
    onGameStateChange: (state) => {
      // console.log('🎮 Tag game state changed:', state);
    }
  });

  // Switch to specific GLB camera by index
  const switchToGLBCamera = (cameraIndex: number) => {
    if (!sceneRef || cameras.length === 0 || cameraIndex < 0 || cameraIndex >= cameras.length) return;
    
    const targetCamera = cameras[cameraIndex];
    
    if (targetCamera) {
      // Detach current camera
      if (glbCam) {
        glbCam.detachControl();
      }
      
      // Switch to target camera
      setCurrentCameraIndex(cameraIndex);
      setGlbCam(targetCamera as any);
      sceneRef.activeCamera = targetCamera;
      targetCamera.attachControl(canvasRef.current, true);
      
      // console.log('🎥 Switched to camera:', targetCamera.name);
    }
  };

  // Notify parent component of state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        camMode,
        freeSpeed,
        selectedCube,
        tagGameActive,
        currentScene,
        screenMeshes,
        cameras,
        currentCameraIndex,
        glbCam,
        scene: sceneRef
      });
    }
  }, [camMode, freeSpeed, selectedCube, tagGameActive, currentScene, screenMeshes, cameras, currentCameraIndex, glbCam, sceneRef, onStateChange]);

  // Handle control actions from parent
  useEffect(() => {
    if (onControlAction) {
      const handleControlAction = (action: string, value?: any) => {
        switch (action) {
          case 'selectGLBCamera':
            if (value !== undefined && value < cameras.length) {
              setCurrentCameraIndex(value);
              switchToGLBCamera(value);
            }
            break;
          case 'resetCamera':
            resetCamera();
            break;
          case 'setFreeSpeed':
            setFreeSpeed(value);
            break;
          case 'zoomIn':
            zoomIn();
            break;
          case 'zoomOut':
            zoomOut();
            break;
          case 'toggleTagGame':
            setTagGameActive(!tagGameActive);
            break;
          case 'selectCube':
            setSelectedCube(value);
            break;
          case 'moveCube':
            if (value && value.cube && value.direction) {
              // Handle cube movement
              const targetCube = value.cube === 'p1' ? cubePhysics : p2CubePhysics;
              if (targetCube && targetCube.body && targetCube.body.hpBodyId) {
                const moveSpeed = 3;
                const currentVelocity = targetCube.body.getLinearVelocity();
                let newVelocity = currentVelocity.clone();
                
                // Apply movement based on direction
                switch (value.direction) {
                  case 'forward':
                    newVelocity.z = -moveSpeed;
                    break;
                  case 'backward':
                    newVelocity.z = moveSpeed;
                    break;
                  case 'left':
                    newVelocity.x = -moveSpeed;
                    break;
                  case 'right':
                    newVelocity.x = moveSpeed;
                    break;
                  case 'up':
                    // Jump - only if not already jumping
                    if (Math.abs(currentVelocity.y) < 0.5) {
                      newVelocity.y = 5;
                    }
                    break;
                  case 'down':
                    newVelocity.y = -moveSpeed;
                    break;
                }
                
                // Update velocity
                targetCube.body.setLinearVelocity(newVelocity);
              }
            }
            break;
        }
      };

      // Store the handler for external access
      (window as any).handleUnifiedViewerControl = handleControlAction;
    }
  }, [onControlAction, cameras.length, tagGameActive, selectedCube, cubePhysics, p2CubePhysics]);

  // Parse scene-specific features
  const parseSceneSpecificFeatures = (scene: Scene, filename: string) => {
    // console.log(`🔍 Parsing scene-specific features for: ${filename}`);
    
    // Debug vertex groups and morph targets for all meshes
    const debugVertexGroups = (mesh: any) => {
      if (!mesh.name) return;
      
      console.log(`🔍 [VERTEX DEBUG] Mesh: ${mesh.name}`);
      
      // Check for morph targets (shape keys from Blender)
      if (mesh.morphTargetManager) {
        const numTargets = mesh.morphTargetManager.numTargets;
        console.log(`  📊 Morph targets found: ${numTargets}`);
        
        for (let i = 0; i < numTargets; i++) {
          const target = mesh.morphTargetManager.getTarget(i);
          console.log(`    🎯 Morph target ${i}: "${target.name}"`);
          
          // Check if this is our "bottom" vertex group
          if (target.name && target.name.toLowerCase().includes('bottom')) {
            console.log(`    ✅ FOUND "bottom" vertex group as morph target!`);
            console.log(`    📈 Target influence: ${target.influence}`);
            console.log(`    🎨 Target details:`, {
              name: target.name,
              influence: target.influence,
              positions: target.getPositions()?.length || 0,
              normals: target.getNormals()?.length || 0
            });
          }
        }
      } else {
        console.log(`  ❌ No morph targets found for ${mesh.name}`);
      }
      
      // Check for custom vertex data
      const vertexKinds = mesh.getVerticesDataKinds();
      console.log(`  📋 Available vertex data kinds:`, vertexKinds);
      
      // Check for vertex colors (another way vertex groups might be exported)
      const colorData = mesh.getVerticesData('color');
      if (colorData) {
        console.log(`  🎨 Vertex colors found: ${colorData.length} values`);
        // Check if there are any non-white colors (indicating vertex group data)
        const hasColoredVertices = colorData.some((value: number, index: number) => {
          const channel = index % 4; // RGBA channels
          return channel < 3 && value !== 1.0; // Check RGB channels for non-white
        });
        if (hasColoredVertices) {
          console.log(`  ✅ Found colored vertices - might contain vertex group data!`);
        }
      }
      
      // Check for custom attributes that might contain vertex group data
      const customAttributes = ['_BATCHID', '_CUSTOM_ATTRIBUTE', 'vertex_group'];
      customAttributes.forEach(attr => {
        const data = mesh.getVerticesData(attr);
        if (data) {
          console.log(`  🔧 Custom attribute "${attr}" found: ${data.length} values`);
        }
      });
      
      // Check mesh metadata
      if (mesh.metadata) {
        console.log(`  📝 Mesh metadata:`, mesh.metadata);
      }
      
      console.log(`  ---`);
    };
    
    // Debug all meshes for vertex group data
    console.log(`🔍 [VERTEX DEBUG] Starting vertex group analysis for scene: ${filename}`);
    scene.meshes.forEach(debugVertexGroups);
    
    // Test morph target functionality if "bottom" is found
    const testBottomMorphTarget = () => {
      scene.meshes.forEach((mesh: any) => {
        if (mesh.morphTargetManager) {
          for (let i = 0; i < mesh.morphTargetManager.numTargets; i++) {
            const target = mesh.morphTargetManager.getTarget(i);
            if (target.name && target.name.toLowerCase().includes('bottom')) {
              console.log(`🧪 [TEST] Testing "bottom" morph target on ${mesh.name}`);
              
              // Test morphing the target
              target.influence = 0.5; // Set to 50% influence
              console.log(`🧪 [TEST] Set "bottom" influence to 50%`);
              
              // Expose function to control it globally
              (window as any).controlBottomMorph = (influence: number) => {
                target.influence = Math.max(0, Math.min(1, influence));
                console.log(`🎛️ [CONTROL] Set "bottom" morph influence to ${target.influence}`);
              };
              
              console.log(`🎛️ [CONTROL] Use window.controlBottomMorph(0.0 to 1.0) to control the morph target`);
            }
          }
        }
      });
    };
    
    // Test the morph target after a short delay to ensure scene is loaded
    setTimeout(testBottomMorphTarget, 1000);
    
    // Setup orientation tracking for cubes with eye textures
    const setupOrientationTracking = () => {
      console.log(`🔍 [ORIENTATION SETUP] Starting orientation tracking setup...`);
      console.log(`🔍 [ORIENTATION SETUP] Available meshes:`, scene.meshes.map((m: any) => m.name));
      
      let foundCubes = 0;
      scene.meshes.forEach((mesh: any) => {
        if (mesh.name && (mesh.name.toLowerCase().includes('p1') || mesh.name.toLowerCase().includes('p2')) && 
            (mesh.name.toLowerCase().includes('cube') || mesh.name.toLowerCase().includes('sphere'))) {
          
          foundCubes++;
          console.log(`🎯 [ORIENTATION] Setting up orientation tracking for ${mesh.name}`);
          console.log(`🔍 [ORIENTATION SETUP] Mesh has physics aggregate:`, !!mesh.physicsAggregate);
          
          // Store original rotation for reference
          const originalRotation = mesh.rotation.clone();
          
          // Store the orientation function globally for external control (optional, for manual calls)
          if (mesh.name.toLowerCase().includes('p1')) {
            (window as any).maintainP1Orientation = () => {
              // Manual full reset if needed
              const uprightQuat = Quaternion.FromEulerAngles(0, mesh.rotation.y, 0);
              mesh.rotationQuaternion = uprightQuat;
              if (mesh.physicsAggregate?.body) {
                mesh.physicsAggregate.body.setAngularVelocity(Vector3.Zero());
              }
            };
            console.log(`🎛️ [CONTROL] Use window.maintainP1Orientation() for manual P1 reset`);
          } else if (mesh.name.toLowerCase().includes('p2')) {
            (window as any).maintainP2Orientation = () => {
              // Manual full reset if needed
              const uprightQuat = Quaternion.FromEulerAngles(0, mesh.rotation.y, 0);
              mesh.rotationQuaternion = uprightQuat;
              if (mesh.physicsAggregate?.body) {
                mesh.physicsAggregate.body.setAngularVelocity(Vector3.Zero());
              }
            };
            console.log(`🎛️ [CONTROL] Use window.maintainP2Orientation() for manual P2 reset`);
          }
        }
      });
      
      console.log(`🔍 [ORIENTATION SETUP] Found ${foundCubes} cubes/spheres for orientation tracking`);
      if (foundCubes === 0) {
        console.warn(`⚠️ [ORIENTATION SETUP] No P1/P2 cubes or spheres found for orientation tracking!`);
      }
    };
    
    // Setup orientation tracking after a delay
    setTimeout(setupOrientationTracking, 2000);
    
    // Combined observable for face-forward and autocorrect (runs every frame)
    scene.onBeforeRenderObservable.add(() => {
      // Existing face-forward logic
      [cubePhysics, p2CubePhysics].filter(Boolean).forEach(phys => {
        if (!phys || !phys.body || !phys.body.hpBodyId || !phys.transformNode) return;
        const vel = phys.body.getLinearVelocity();
        if (vel.lengthSquared() > 0.1) {
          // Target yaw (adjust based on forward direction; assumes eyes face -Z)
          const targetYaw = Math.atan2(vel.x, vel.z) + Math.PI;  // Flip 180° if eyes face -Z
          const currentQuat = phys.transformNode.rotationQuaternion?.clone() || Quaternion.Identity();
          const targetQuat = Quaternion.FromEulerAngles(0, targetYaw, 0);
          const deltaQuat = targetQuat.multiply(Quaternion.Inverse(currentQuat));
          const axisAngle = deltaQuat.toAxisAngle();
          const angularVel = axisAngle.axis.scale(axisAngle.angle * 5);  // Adjust factor for rotation speed
          phys.body.setAngularVelocity(angularVel);
        }
      });

      // NEW: Autocorrect logic for upright orientation
      [cubePhysics, p2CubePhysics].filter(Boolean).forEach(phys => {
        if (!phys || !phys.body || !phys.transformNode) return;
        const mesh = phys.transformNode;
        const body = phys.body;

        // Get current up vector (world-space)
        const upVector = new Vector3(0, 1, 0);
        let rotatedUp = new Vector3();
        if (mesh.rotationQuaternion) {
          upVector.rotateByQuaternionToRef(mesh.rotationQuaternion, rotatedUp);
        } else {
          const quat = Quaternion.FromEulerAngles(mesh.rotation.x, mesh.rotation.y, mesh.rotation.z);
          upVector.rotateByQuaternionToRef(quat, rotatedUp);
        }

        // Calculate tilt angle from upright (0 = perfect, PI/2 = fully sideways)
        const tiltAngle = Math.acos(Math.abs(rotatedUp.y));
        const maxTilt = Math.PI / 6; // Start correcting at 30° tilt (adjust as needed)
        if (tiltAngle > maxTilt) {
          // Determine correction direction (torque to upright)
          const correctionSign = rotatedUp.y > 0 ? -1 : 1; // Flip if upside down
          const torqueStrength = Math.sin(tiltAngle) * 10; // Proportional torque (adjust factor)
          const torque = new Vector3(
            rotatedUp.x * torqueStrength * correctionSign, // X axis torque
            0, // No Y correction (keep facing direction)
            -rotatedUp.z * torqueStrength * correctionSign // Z axis torque
          );

          // Apply torque via physics
          body.applyTorque(torque, true); // World space

          // Optional: Hard reset if extremely tilted (>80°), to prevent full flip
          if (tiltAngle > Math.PI * 0.8) {
            const uprightQuat = Quaternion.FromEulerAngles(0, mesh.rotation.y, 0); // Keep Y rotation
            mesh.rotationQuaternion = uprightQuat;
            body.setAngularVelocity(Vector3.Zero());
            console.log(`🔄 Hard autocorrect applied to ${mesh.name} (tilt: ${(tiltAngle * 180 / Math.PI).toFixed(1)}°)`);
          }

          // Debug log (remove in production)
          console.log(`🧭 Autocorrecting ${mesh.name}: tilt ${(tiltAngle * 180 / Math.PI).toFixed(1)}°, torque`, torque);
        }
      });
    });
    
    if (filename === 'scene1.glb') {
      // Scene 1 specific features
      // console.log('📺 Setting up Scene 1 specific features...');
      
      // Find and setup screen meshes
      const screens = scene.meshes.filter(mesh => 
        mesh.name && mesh.name.toLowerCase().includes('screen')
      );
      
      // console.log(`📺 Found ${screens.length} screen meshes:`, screens.map(s => s.name));
      setScreenMeshes(screens);
      
      // Setup screens with specific text and colors (from original SceneViewer)
      const setupScreen = (meshName: string, text: string, color: Color3) => {
        const mesh = scene.getMeshByName(meshName);
        if (!mesh) {
          // console.warn(`${meshName} mesh not found`);
          return;
        }
        // console.log(`Found ${meshName} mesh`);
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
        ctx.scale(1, 1.8);
        ctx.translate(0, -textureSize * 0.2);
        ctx.fillStyle = color.toHexString();
        ctx.font = 'bold 120px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, textureSize / 2, textureSize / 2);
        ctx.restore();
        dt.update();
      };
      
      // Setup specific screens with their text and colors
      setupScreen('p1 screen', '4', new Color3(0.2, 0.8, 1));
      setupScreen('p2 screen', '1', new Color3(1, 0.2, 0.2));
      
      // Note: Eyes texture is already loaded from Blender GLB file
      console.log(`🎨 [TEXTURE] Eyes texture should be loaded from Blender GLB file`);
      setupScreen('cycle screen', '1', new Color3(1, 1, 0.2));

      // Stopwatch screen with running timer
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
          ctx.scale(1, 1.8);
          ctx.translate(0, -textureSize * 0.2);
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
        // console.log('✅ Setup stopwatch screen with running timer');
      }
      
      // Cache screens for reference
      const allScreens = ['p1 screen', 'p2 screen', 'cycle screen', 'stopwatch screen']
        .map(name => scene.getMeshByName(name))
        .filter(Boolean);
      setScreenMeshes(allScreens);
      screensRef.current = allScreens;
      
    } else if (filename === 'scifi.glb') {
      // Sci-Fi scene specific features
      // console.log('🚀 Setting up Sci-Fi scene specific features...');
      
      // Clear screen meshes for sci-fi scene
      setScreenMeshes([]);
      
      // Add any sci-fi specific setup here
      // For example, special lighting, effects, etc.
      
    } else {
      // Default/other scenes
      // console.log('🔧 Setting up default scene features...');
      setScreenMeshes([]);
    }
  };

  // Reset cubes to original positions
  const resetCubesToOriginalPositions = () => {
    if (!originalPositions.p1 || !originalPositions.p2) {
      // console.warn('❌ Cannot reset: Original positions not stored');
      return;
    }

    // console.log('🔄 Resetting cubes to original positions:', {
    //   p1: originalPositions.p1,
    //   p2: originalPositions.p2
    // });

    // Reset P1 cube/sphere
    if (cubePhysics?.body && cubePhysics.transformNode) {
      try {
        cubePhysics.transformNode.position = originalPositions.p1.clone();
        cubePhysics.transformNode.computeWorldMatrix(true);
        cubePhysics.body.setLinearVelocity(Vector3.Zero());
        cubePhysics.body.setAngularVelocity(Vector3.Zero());
        // console.log('✅ Reset P1 to original position');
      } catch (e) {
        // console.warn('Failed to reset P1:', e);
      }
    }

    // Reset P2 cube/sphere
    if (p2CubePhysics?.body && p2CubePhysics.transformNode) {
      try {
        p2CubePhysics.transformNode.position = originalPositions.p2.clone();
        p2CubePhysics.transformNode.computeWorldMatrix(true);
        p2CubePhysics.body.setLinearVelocity(Vector3.Zero());
        p2CubePhysics.body.setAngularVelocity(Vector3.Zero());
        // console.log('✅ Reset P2 to original position');
      } catch (e) {
        // console.warn('Failed to reset P2:', e);
      }
    }
  };

  // Main scene setup effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // setStatus('Creating engine...');
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new Scene(engine);
    scene.useRightHandedSystem = true;
    setSceneRef(scene);

    // Create lighting
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    // Load HDR environment with different intensities for different scenes
    if (modelFilename === 'scifi.glb') {
      const hdrTexture = new HDRCubeTexture('/blocky_photo_studio_2k.hdr', scene, 512);
      scene.environmentTexture = hdrTexture;
      scene.createDefaultSkybox(hdrTexture, true, 1000);
      
      // Reduce HDRI intensity for Sci-Fi scene
      if (scene.environmentTexture) {
        scene.environmentIntensity = 0.1; // Much more reduced from default 1.0
        // console.log('🔧 Reduced HDRI intensity for Sci-Fi scene to 0.1');
      }
    } else if (modelFilename === 'scene1.glb') {
      // Keep default HDRI intensity for Scene 1
      const hdrTexture = new HDRCubeTexture('/blocky_photo_studio_2k.hdr', scene, 512);
      scene.environmentTexture = hdrTexture;
      scene.createDefaultSkybox(hdrTexture, true, 1000);
      // console.log('🔧 Using default HDRI intensity for Scene 1');
    }

    // setStatus(`Loading ${modelFilename}...`);

    // Clear existing meshes before loading new scene
    scene.meshes.forEach(mesh => {
      if (mesh.name !== '__root__') {
        // Clean up POV cameras if they exist
        if ((mesh as any).povCamera) {
          (mesh as any).povCamera.dispose();
          delete (mesh as any).povCamera;
        }
        // Clean up camera update observers if they exist
        if ((mesh as any).cameraUpdateObserver) {
          scene.onBeforeRenderObservable.remove((mesh as any).cameraUpdateObserver);
          delete (mesh as any).cameraUpdateObserver;
        }
        mesh.dispose();
      }
    });
    scene.cameras.forEach(camera => {
      if (camera.name !== 'freeCam') {
        camera.dispose();
      }
    });

    // Load GLB scene
    SceneLoader.Append('/', modelFilename, scene, async () => {
      // console.log(`✅ ${modelFilename} loaded successfully. Meshes:`, scene.meshes.length, 'Cameras:', scene.cameras.length);
      
      // Set current scene type
      setCurrentScene(modelFilename);
      
      // Store original cube positions after load
      scene.meshes.forEach((mesh: any) => {
        if (mesh.name.toLowerCase().includes('p1 cube') || mesh.name.toLowerCase().includes('p1 sphere')) {
          setOriginalPositions(prev => ({ ...prev, p1: mesh.position.clone() }));
        } else if (mesh.name.toLowerCase().includes('p2 cube') || mesh.name.toLowerCase().includes('p2 sphere')) {
          setOriginalPositions(prev => ({ ...prev, p2: mesh.position.clone() }));
        }
      });

      // Parse scene-specific features
      parseSceneSpecificFeatures(scene, modelFilename);
      
      // Setup animations for maze1 scene - PROPER BABYLON.JS APPROACH
      if (modelFilename === 'maze1.glb') {
        console.log('🎬 Setting up maze animations with proper Babylon.js approach...');
        
        // Wait for scene to be fully loaded
        setTimeout(() => {
          console.log('🎬 Scene loaded, setting up cylinder animation...');
          
          // Find animation groups (baked animations are in AnimationGroups)
          if (scene.animationGroups && scene.animationGroups.length > 0) {
            console.log('🎬 Found animation groups:', scene.animationGroups.map(g => g.name));
            
            // Look for the Action.002 animation group (contains cylinder animation)
            const actionGroup = scene.animationGroups.find(ag => ag.name === 'Action.002');
            
            if (actionGroup) {
              console.log('🎬 Found Action.002 animation group with cylinder animations!');
              console.log('🎬 Action.002 details:', {
                name: actionGroup.name,
                targetedAnimations: actionGroup.targetedAnimations.length,
                targets: actionGroup.targetedAnimations.map(t => t.target.name)
              });
              
              // Play all frames and loop - PROPER BABYLON.JS METHOD
              actionGroup.start(true, 1.0);
              console.log('🎬 Started Action.002 cylinder animation: loop=true, speed=1.0, all frames');
              
              // Set up physics body updates for animated meshes
              scene.onBeforeRenderObservable.add(() => {
                // Update physics bodies for animated cylinder meshes
                scene.meshes.forEach(mesh => {
                  if (mesh.name.startsWith('Cylinder.007_primitive') && mesh.physicsBody) {
                    // Update physics body to follow mesh animation
                    const rotation = mesh.rotationQuaternion || Quaternion.FromEulerAngles(mesh.rotation.x, mesh.rotation.y, mesh.rotation.z);
                    mesh.physicsBody.setTargetTransform(mesh.position, rotation);
                  }
                });
              });
              
              // Verify the animation is working
              setTimeout(() => {
                console.log('🎬 Animation status check:', {
                  name: actionGroup.name,
                  isStarted: actionGroup.isStarted,
                  targetedAnimations: actionGroup.targetedAnimations.length
                });
              }, 500);
              
            } else {
              console.warn('⚠️ Action.002 animation group not found');
            }
            
          } else {
            console.warn('⚠️ No animation groups found in scene');
          }
        }, 500); // Wait 500ms for scene to be fully loaded
      }

      // Setup POV cameras for maze1 scene
      if (modelFilename === 'maze1.glb') {
        console.log('📹 Setting up POV cameras for maze1 scene...');
        
        setTimeout(() => {
          // Find P1 and P2 spheres
          const p1Sphere = scene.meshes.find(mesh => mesh.name === 'p1 sphere');
          const p2Sphere = scene.meshes.find(mesh => mesh.name === 'p2 sphere');
          
          if (p1Sphere) {
            // Create P1 POV camera
            const p1POVCamera = new UniversalCamera('Grok POV CAM', new Vector3(0, 0, 0), scene);
            p1POVCamera.attachControl(canvasRef.current, true);
            p1POVCamera.speed = 0; // Disable movement speed - position is controlled by sphere
            p1POVCamera.inertia = 0.9;
            p1POVCamera.checkCollisions = false;
            p1POVCamera.applyGravity = false;
            p1POVCamera.angularSensibility = 2000; // Mouse sensitivity for rotation
            p1POVCamera.keysUp = []; // Disable keyboard movement
            p1POVCamera.keysDown = [];
            p1POVCamera.keysLeft = [];
            p1POVCamera.keysRight = [];
            p1POVCamera.minZ = 0.01; // Reduce clip start to prevent close-up clipping
            
            // Don't parent camera to sphere - keep independent rotation
            // Set initial position and orientation to look forward in -Z direction
            p1POVCamera.position = new Vector3(0, 0.8, 0);
            p1POVCamera.setTarget(new Vector3(0, 0.8, -1)); // Look forward in -Z direction
            
            // Add continuous update to keep camera position following sphere (rotation controlled by user)
            const p1CameraUpdate = scene.onBeforeRenderObservable.add(() => {
              if (p1POVCamera && p1Sphere) {
                // Get sphere's world position
                const spherePosition = p1Sphere.getAbsolutePosition();
                
                // Update camera position to follow sphere (with offset outside the sphere)
                p1POVCamera.position = spherePosition.add(new Vector3(0, 0.8, 0));
                
                // Don't override target - let user control rotation with mouse
                // Camera rotation is now controlled by user input
              }
            });
            
            // Store references for cleanup
            (p1Sphere as any).povCamera = p1POVCamera;
            (p1Sphere as any).cameraUpdateObserver = p1CameraUpdate;
            
            console.log('📹 Grok POV camera following p1 sphere with user-controlled rotation');
            console.log('💡 Hint: Use mouse to look around when in Grok POV camera mode');
          }
          
          if (p2Sphere) {
            // Create P2 POV camera
            const p2POVCamera = new UniversalCamera('ChatGPT POV CAM', new Vector3(0, 0, 0), scene);
            p2POVCamera.attachControl(canvasRef.current, true);
            p2POVCamera.speed = 0; // Disable movement speed - position is controlled by sphere
            p2POVCamera.inertia = 0.9;
            p2POVCamera.checkCollisions = false;
            p2POVCamera.applyGravity = false;
            p2POVCamera.angularSensibility = 2000; // Mouse sensitivity for rotation
            p2POVCamera.keysUp = []; // Disable keyboard movement
            p2POVCamera.keysDown = [];
            p2POVCamera.keysLeft = [];
            p2POVCamera.keysRight = [];
            p2POVCamera.minZ = 0.01; // Reduce clip start to prevent close-up clipping
            
            // Don't parent camera to sphere - keep independent rotation
            // Set initial position and orientation to look forward in -Z direction
            p2POVCamera.position = new Vector3(0, 0.8, 0);
            p2POVCamera.setTarget(new Vector3(0, 0.8, -1)); // Look forward in -Z direction
            
            // Add continuous update to keep camera position following sphere (rotation controlled by user)
            const p2CameraUpdate = scene.onBeforeRenderObservable.add(() => {
              if (p2POVCamera && p2Sphere) {
                // Get sphere's world position
                const spherePosition = p2Sphere.getAbsolutePosition();
                
                // Update camera position to follow sphere (with offset outside the sphere)
                p2POVCamera.position = spherePosition.add(new Vector3(0, 0.8, 0));
                
                // Don't override target - let user control rotation with mouse
                // Camera rotation is now controlled by user input
              }
            });
            
            // Store references for cleanup
            (p2Sphere as any).povCamera = p2POVCamera;
            (p2Sphere as any).cameraUpdateObserver = p2CameraUpdate;
            
            console.log('📹 ChatGPT POV camera following p2 sphere with user-controlled rotation');
            console.log('💡 Hint: Use mouse to look around when in ChatGPT POV camera mode');
          }
          
          // Add POV cameras to the cameras list
          const povCameras: Camera[] = [];
          if (p1Sphere && (p1Sphere as any).povCamera) {
            povCameras.push((p1Sphere as any).povCamera as Camera);
          }
          if (p2Sphere && (p2Sphere as any).povCamera) {
            povCameras.push((p2Sphere as any).povCamera as Camera);
          }
          
          // Update cameras list to include POV cameras
          if (povCameras.length > 0) {
            setCameras(prev => [...prev, ...povCameras]);
            console.log('📹 Added POV cameras to camera list:', povCameras.map(cam => cam.name));
            console.log('🎮 POV Camera Controls: Use mouse to look around, position follows sphere automatically');
          }
          
        }, 1000); // Wait 1 second for physics to be fully set up
      }

      // Make blocker mesh invisible
      const blockerMesh = scene.meshes.find(mesh => mesh.name === 'blocker');
      if (blockerMesh) {
        blockerMesh.setEnabled(false);
        // console.log('🚫 Made blocker mesh invisible');
      } else {
        // console.log('⚠️ Blocker mesh not found');
      }

      // console.log('=== ALL CAMERA NAMES ===');
      // scene.cameras.forEach((camera, index) => {
      //   console.log(`${index}: "${camera.name}"`);
      // });

      // Find and setup GLB cameras
      const glbCameras = scene.cameras.filter(cam => cam.name && cam.name !== '' && cam.name !== 'freeCam') as Camera[];
      // console.log('🎥 Found GLB cameras:', glbCameras.map(cam => cam.name));
      
      setCameras(glbCameras);
      
      if (glbCameras.length > 0) {
        // Use selected camera or default to first one
        const targetCamera = selectedCamera ? 
          glbCameras.find(cam => cam.name === selectedCamera) || glbCameras[0] : 
          glbCameras[0];
        
        // Set the current camera index
        const cameraIndex = glbCameras.findIndex(cam => cam.name === targetCamera.name);
        setCurrentCameraIndex(cameraIndex >= 0 ? cameraIndex : 0);
        
        // console.log('🎥 Using camera:', targetCamera.name);
        
        try {
          // console.log('🎥 Using right-handed coordinate system - no manual flip needed');
          
          // Setup all cameras
          glbCameras.forEach(camera => {
            (camera as any).minZ = 0.01;
            (camera as any).maxZ = 10000;
          });
          
          setGlbCam(targetCamera as any);
          scene.activeCamera = targetCamera as any;
          targetCamera.attachControl(canvas, true);
        } catch (error) {
          // console.error('❌ Error setting up GLB camera:', error);
          // Fallback to default camera
          const defaultCamera = new ArcRotateCamera('defaultCam', 0, Math.PI / 3, 10, Vector3.Zero(), scene);
          defaultCamera.attachControl(canvas, true);
          setGlbCam(defaultCamera);
          scene.activeCamera = defaultCamera;
        }
      } else {
        // console.log('⚠️ No GLB cameras found, creating default camera');
        const defaultCamera = new ArcRotateCamera('defaultCam', 0, Math.PI / 3, 10, Vector3.Zero(), scene);
        defaultCamera.attachControl(canvas, true);
        setGlbCam(defaultCamera);
        scene.activeCamera = defaultCamera;
      }

      // Create free camera AFTER GLB loads
      const freeCamera = new UniversalCamera('freeCam', new Vector3(0, 5, -10), scene);
      freeCamera.setTarget(Vector3.Zero());
      freeCamera.attachControl(canvas, true);
      freeCamera.detachControl();
      setFreeCam(freeCamera);

      setStatus('Initialized');
      setTimeout(() => setStatus(''), 2000);

      // Enable physics AFTER GLB is fully loaded
      setTimeout(async () => {
        await setupPhysics(scene);
      }, 100);

      // Start render loop only after camera is set
      engine.runRenderLoop(() => {
        scene.render();
      });
    }, (event: any) => {
      console.error(`Failed to load ${modelFilename}:`, event);
      setStatus(`Load failed: ${event.message || 'Unknown error'}`);
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
  }, [modelFilename, selectedCamera]);

  // Physics Setup Function
  const setupPhysics = async (scene: Scene) => {
    try {
      // setStatus('Loading Havok Physics...');
      
      // Dynamically import Havok
      const { default: HavokPhysics } = await import('@babylonjs/havok');
      const havokInstance = await HavokPhysics();
      const havokPlugin = new (await import('@babylonjs/core').then(mod => mod.HavokPlugin))(true, havokInstance);
      scene.enablePhysics(new Vector3(0, -9.81, 0), havokPlugin);
      
      // console.log('🔵 Havok Physics v2 engine initialized with gravity');
      
      setupMeshPhysics(scene);
    } catch (error) {
      // console.error('❌ Failed to load Havok Physics:', error);
      // setStatus('Physics failed to load');
    }
  };

  // Setup physics for specific meshes
  const setupMeshPhysics = (scene: Scene) => {
    let physicsApplied = false;
    
    // console.log(`🔧 Setting up physics for ${scene.meshes.length} meshes...`);
    
    scene.meshes.forEach((mesh: any) => {
      // Skip root nodes, empty meshes, and screen meshes
      if (!mesh.name || mesh.name.startsWith('__root__') || !mesh.geometry || mesh.name.includes('screen')) {
        // console.log(`⏭️ Skipping mesh: "${mesh.name}" (root/empty/screen)`);
        return;
      }
      
      // console.log(`🔧 Setting up physics for: "${mesh.name}"`);
      
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
          // console.log(`✅ Floor physics (MESH) applied to: ${mesh.name}`);
          physicsApplied = true;
          
        } else if (mesh.name.toLowerCase().includes('wall')) {
          // Wall - Static rigid body with MESH shape
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.MESH, {
            mass: 0,
            restitution: 0.1,
            friction: 0.6
          }, scene);
          // console.log(`✅ Wall physics (MESH) applied to: ${mesh.name}`);
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
          
          physicsApplied = true;
          
        } else if (mesh.name.toLowerCase().includes('p1 cube') || mesh.name.toLowerCase().includes('p1 sphere')) {
          // P1 cube/sphere - Enhanced stability with bottom center of mass
          const shapeType = mesh.name.toLowerCase().includes('sphere') ? PhysicsShapeType.SPHERE : PhysicsShapeType.BOX;
          agg = new PhysicsAggregate(mesh, shapeType, {
            mass: 2,
            restitution: 0.1,  // Lowered to reduce bounciness
            friction: 0.8      // Increased for better ground adhesion
          }, scene);
          
          // Apply complete rotation lock - no tilting at all
          try {
            // Set maximum angular damping to prevent rotation
            (agg.body as any).setAngularDamping(1.0);  // Maximum damping
            (agg.body as any).setLinearDamping(0.3);   // Linear damping
            
            // Set center of mass to middle of mesh for spheres
            if (mesh.name.toLowerCase().includes('sphere')) {
              (agg.body as any).setCenterOfMass(Vector3.Zero()); // Center of mass at mesh center
              console.log(`✅ Set center of mass to middle for P1 sphere`);
            }
            
            // Use scene render loop to continuously reset angular velocity
            const rotationLockObserver = scene.onBeforeRenderObservable.add(() => {
              if (agg && agg.body) {
                (agg.body as any).setAngularVelocity(Vector3.Zero());
              }
            });
            
            // Store observer for cleanup
            (mesh as any).rotationLockObserver = rotationLockObserver;
            
            console.log(`✅ Applied complete rotation lock to P1 ${mesh.name.toLowerCase().includes('sphere') ? 'sphere' : 'cube'} - no tilting allowed`);
          } catch (error) {
            console.warn(`⚠️ Could not apply rotation lock to P1 ${mesh.name.toLowerCase().includes('sphere') ? 'sphere' : 'cube'}:`, error);
          }
          
          setCubePhysics(agg);
          console.log(`✅ P1 ${mesh.name.toLowerCase().includes('sphere') ? 'sphere' : 'cube'} physics (${shapeType}) applied with complete rotation lock to: ${mesh.name}`);
          physicsApplied = true;
          
        } else if (mesh.name.toLowerCase().includes('p2 cube') || mesh.name.toLowerCase().includes('p2 sphere')) {
          // P2 cube/sphere - Enhanced stability with bottom center of mass
          const shapeType = mesh.name.toLowerCase().includes('sphere') ? PhysicsShapeType.SPHERE : PhysicsShapeType.BOX;
          agg = new PhysicsAggregate(mesh, shapeType, {
            mass: 2,
            restitution: 0.1,  // Lowered to reduce bounciness
            friction: 0.8      // Increased for better ground adhesion
          }, scene);
          
          // Apply complete rotation lock - no tilting at all
          try {
            // Set maximum angular damping to prevent rotation
            (agg.body as any).setAngularDamping(1.0);  // Maximum damping
            (agg.body as any).setLinearDamping(0.3);   // Linear damping
            
            // Set center of mass to middle of mesh for spheres
            if (mesh.name.toLowerCase().includes('sphere')) {
              (agg.body as any).setCenterOfMass(Vector3.Zero()); // Center of mass at mesh center
              console.log(`✅ Set center of mass to middle for P2 sphere`);
            }
            
            // Use scene render loop to continuously reset angular velocity
            const rotationLockObserver = scene.onBeforeRenderObservable.add(() => {
              if (agg && agg.body) {
                (agg.body as any).setAngularVelocity(Vector3.Zero());
              }
            });
            
            // Store observer for cleanup
            (mesh as any).rotationLockObserver = rotationLockObserver;
            
            console.log(`✅ Applied complete rotation lock to P2 ${mesh.name.toLowerCase().includes('sphere') ? 'sphere' : 'cube'} - no tilting allowed`);
          } catch (error) {
            console.warn(`⚠️ Could not apply rotation lock to P2 ${mesh.name.toLowerCase().includes('sphere') ? 'sphere' : 'cube'}:`, error);
          }
          
          setP2CubePhysics(agg);
          console.log(`✅ P2 ${mesh.name.toLowerCase().includes('sphere') ? 'sphere' : 'cube'} physics (${shapeType}) applied with complete rotation lock to: ${mesh.name}`);
          physicsApplied = true;
          
        } else if (mesh.name === 'box_006.015' || mesh.name === 'box_003.001') {
          // Specific sci-fi scene boxes - Dynamic rigid bodies with BOX shape
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, {
            mass: 1.5,
            restitution: 0.4,
            friction: 0.6
          }, scene);
          physicsApplied = true;
          
        } else if (mesh.name === 'Maze') {
          // Maze walls - Static (unmoveable) with collisions
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.MESH, {
            mass: 0, // Static body
            restitution: 0.1,
            friction: 0.8
          }, scene);
          console.log(`✅ Maze walls physics (STATIC MESH) applied to: ${mesh.name}`);
          physicsApplied = true;
          
        } else if (mesh.name.startsWith('Cylinder.007_primitive')) {
          // Cylinder.007 parts - Animated collision for rotating hammer
          console.log(`🔍 Setting up physics for: ${mesh.name}`);
          console.log(`🔍 Mesh visible before physics: ${mesh.isVisible}`);
          console.log(`🔍 Mesh enabled before physics: ${mesh.isEnabled()}`);
          
          // Ensure mesh remains visible
          mesh.setEnabled(true);
          mesh.isVisible = true;
          
          // Try using a simpler cylinder shape first to avoid mesh conflicts
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.CYLINDER, {
            mass: 0, // Static body (unmoveable by physics, but can be animated)
            restitution: 0.3,
            friction: 0.8
          }, scene);
          
          // Set up physics body to follow mesh animation
          if (agg.body) {
            // Mark as kinematic so it follows mesh transformations
            agg.body.setMotionType(1); // 1 = KINEMATIC
            // Set initial transform
            const rotation = mesh.rotationQuaternion || Quaternion.FromEulerAngles(mesh.rotation.x, mesh.rotation.y, mesh.rotation.z);
            agg.body.setTargetTransform(mesh.position, rotation);
          }
          
          console.log(`🔍 Mesh visible after physics: ${mesh.isVisible}`);
          console.log(`🔍 Mesh enabled after physics: ${mesh.isEnabled()}`);
          console.log(`✅ Cylinder.007 physics (ANIMATED CYLINDER) applied to: ${mesh.name}`);
          physicsApplied = true;
          
        } else if (mesh.name.startsWith('door_011.001_primitive')) {
          // Door parts - Static (unmoveable) with collisions
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, {
            mass: 0, // Static body
            restitution: 0.1,
            friction: 0.6
          }, scene);
          console.log(`✅ Door physics (STATIC BOX) applied to: ${mesh.name}`);
          physicsApplied = true;
          
        } else if (mesh.name === 'bed') {
          // Bed - Static (unmoveable) with box collision for stability
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, {
            mass: 0, // Static body
            restitution: 0.1,
            friction: 0.9 // Higher friction for bed surface
          }, scene);
          console.log(`✅ Bed physics (STATIC BOX) applied to: ${mesh.name}`);
          physicsApplied = true;
          
        } else if (mesh.name === 'blocker' || mesh.name === 'wall' || mesh.name === 'floor' || 
                   mesh.name === 'clothes' || mesh.name === 'frames' || mesh.name === 'frames.001' ||
                   mesh.name === 'mirror' || mesh.name === 'picture' || mesh.name === 'items') {
          // Bedroom scene static items - Static (unmoveable) with collisions
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.MESH, {
            mass: 0, // Static body
            restitution: 0.1,
            friction: 0.7
          }, scene);
          console.log(`✅ Bedroom static physics (STATIC MESH) applied to: ${mesh.name}`);
          physicsApplied = true;
          
        } else if (mesh.name === 'P1 cube' || mesh.name === 'P2 cube') {
          // Bedroom scene player cubes - Dynamic with physics
          const shapeType = mesh.name.toLowerCase().includes('p1 cube') || mesh.name.toLowerCase().includes('p2 cube') 
            ? PhysicsShapeType.BOX 
            : PhysicsShapeType.BOX;
          
          agg = new PhysicsAggregate(mesh, shapeType, {
            mass: 1,
            restitution: 0.3,
            friction: 0.5
          }, scene);
          
          // Store physics reference for AI control
          if (mesh.name === 'P1 cube') {
            setCubePhysics(agg);
            (window as any).cubePhysics = agg;
          } else if (mesh.name === 'P2 cube') {
            setP2CubePhysics(agg);
            (window as any).p2CubePhysics = agg;
          }
          
          console.log(`✅ Bedroom player cube physics (DYNAMIC BOX) applied to: ${mesh.name}`);
          physicsApplied = true;
          
        } else if (mesh.name === 'ladder_001.001') {
          // Ladder - Static (unmoveable) with collisions
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.MESH, {
            mass: 0, // Static body
            restitution: 0.1,
            friction: 0.8
          }, scene);
          console.log(`✅ Ladder physics (STATIC MESH) applied to: ${mesh.name}`);
          physicsApplied = true;
          
        } else if (mesh.name === 'ambry_003_001.001') {
          // Ambry (cabinet) - Static (unmoveable) with collisions
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, {
            mass: 0, // Static body
            restitution: 0.1,
            friction: 0.7
          }, scene);
          console.log(`✅ Ambry physics (STATIC BOX) applied to: ${mesh.name}`);
          physicsApplied = true;
          
        } else if (mesh.name === 'computer_015.001') {
          // Computer - Heavy but moveable with collisions
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, {
            mass: 10, // Heavy but moveable
            restitution: 0.2,
            friction: 0.8
          }, scene);
          console.log(`✅ Computer physics (HEAVY BOX) applied to: ${mesh.name}`);
          physicsApplied = true;
          
        } else if (mesh.name === 'worldfloor') {
          // World floor - Static ground with collisions
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, {
            mass: 0, // Static body
            restitution: 0.1,
            friction: 0.9
          }, scene);
          console.log(`✅ World floor physics (STATIC BOX) applied to: ${mesh.name}`);
          physicsApplied = true;
          
        } else if (mesh.name === 'blocker') {
          // Blocker - Static with collisions
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, {
            mass: 0, // Static body
            restitution: 0.1,
            friction: 0.7
          }, scene);
          console.log(`✅ Blocker physics (STATIC BOX) applied to: ${mesh.name}`);
          physicsApplied = true;
          
        } else if (mesh.name === 'Torus' || mesh.name === 'Torus.001') {
          // Torus objects - Light moveable with collisions
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.CYLINDER, {
            mass: 2, // Light but moveable
            restitution: 0.3,
            friction: 0.6
          }, scene);
          console.log(`✅ Torus physics (LIGHT CYLINDER) applied to: ${mesh.name}`);
          physicsApplied = true;
          
        } else if (mesh.name.startsWith('microwave_001.001_primitive')) {
          // Microwave parts - Static with collisions
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, {
            mass: 0, // Static body
            restitution: 0.1,
            friction: 0.7
          }, scene);
          console.log(`✅ Microwave physics (STATIC BOX) applied to: ${mesh.name}`);
          physicsApplied = true;
          
        } else if (mesh.name === 'seat_007.001' || mesh.name === 'seat_006.001') {
          // Seats - Light moveable with collisions
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, {
            mass: 3, // Light but moveable
            restitution: 0.2,
            friction: 0.8
          }, scene);
          console.log(`✅ Seat physics (LIGHT BOX) applied to: ${mesh.name}`);
          physicsApplied = true;
          
        } else if (mesh.name.startsWith('flower_002.001_primitive')) {
          // Flower parts - Very light moveable with collisions
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, {
            mass: 0.5, // Very light
            restitution: 0.4,
            friction: 0.5
          }, scene);
          console.log(`✅ Flower physics (VERY LIGHT BOX) applied to: ${mesh.name}`);
          physicsApplied = true;
          
        } else if (mesh.name === 'wall_decoration_083.001') {
          // Wall decoration - Static with collisions
          agg = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, {
            mass: 0, // Static body
            restitution: 0.1,
            friction: 0.6
          }, scene);
          console.log(`✅ Wall decoration physics (STATIC BOX) applied to: ${mesh.name}`);
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
      // setStatus('Havok Physics v2 enabled - p1 and p2 cubes/spheres should fall!');
      // setTimeout(() => setStatus(''), 3000);
    } else {
      // setStatus('No physics meshes found');
      // console.warn('No meshes found for physics. Available meshes:', scene.meshes.map((m: any) => m.name));
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
    switchToGLBCamera(nextIndex);
  };

  // Reset camera to default position
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
        
        {/* Movement Component */}
        <Movement
          cubePhysics={cubePhysics}
          p2CubePhysics={p2CubePhysics}
          selectedCube={selectedCube}
          camMode={camMode}
          freeCam={freeCam}
          freeSpeed={freeSpeed}
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

      {/* Tag Game Overlay - Only show for Scene 1 */}
      {tagGameActive && currentScene === 'scene1.glb' && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '2px solid #4CAF50',
          minWidth: '300px',
          textAlign: 'center',
          fontFamily: 'monospace',
          zIndex: 2000
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#4CAF50', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Play size={20} /> TAG GAME
          </div>
          
          {/* Timer */}
          <div style={{ marginBottom: 8, fontSize: '16px', color: '#FFC107' }}>
            <div>Time: {tagGame.formatTime(tagGame.remainingTime)}</div>
          </div>

          {/* Scores */}
          <div style={{ marginBottom: 8 }}>
            <div>P1 Score: <span style={{ color: '#2196F3' }}>{tagGame.p1Score}</span></div>
            <div>P2 Score: <span style={{ color: '#FF5722' }}>{tagGame.p2Score}</span></div>
          </div>

          {/* Winner */}
          {tagGame.isFinished && tagGame.winner && (
            <div style={{ marginBottom: 8, color: '#4CAF50', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <Trophy size={20} /> Winner: {tagGame.winner === 'tie' ? 'TIE!' : `${tagGame.winner.toUpperCase()} WINS!`}
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
    </div>
  );
};

export default UnifiedViewer;