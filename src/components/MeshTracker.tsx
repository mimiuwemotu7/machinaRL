import React, { useState, useEffect, useRef } from 'react';
import { Scene, AbstractMesh } from '@babylonjs/core';

interface MeshData {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scaling: { x: number; y: number; z: number };
  isVisible: boolean;
  isEnabled: boolean;
  type: string;
  lastUpdated: number;
}

interface MeshTrackerProps {
  scene: Scene | null;
  isVisible?: boolean;
}

const MeshTracker: React.FC<MeshTrackerProps> = ({ scene, isVisible = true }) => {
  const [meshes, setMeshes] = useState<MeshData[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Initialize mesh tracking when scene is available
  useEffect(() => {
    if (scene && !isTracking) {
      initializeMeshTracking();
    }
    
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [scene, isTracking]);

  const initializeMeshTracking = () => {
    if (!scene) {
      console.log('❌ No scene available for mesh tracking');
      return;
    }

    console.log('🔍 Initializing mesh tracking...');
    console.log('🎬 Scene object:', scene);
    console.log('📋 Total meshes in scene:', scene.meshes.length);
    console.log('🎯 Current scene filename:', scene.metadata?.filename || 'Unknown');
    
    // Get all meshes from the scene - be more inclusive
    const sceneMeshes = scene.meshes.filter(mesh => 
      mesh && 
      mesh.name && 
      mesh.name !== '__root__' && 
      !mesh.name.startsWith('__') &&
      !mesh.name.includes('skybox') && // Filter out skybox
      !mesh.name.includes('Skybox') &&
      mesh.getClassName() !== 'GroundMesh' // Filter out ground meshes
    );

    console.log(`📊 Found ${sceneMeshes.length} meshes in scene (after filtering)`);
    console.log('🔍 Mesh names:', sceneMeshes.map(m => m.name));

    // Create initial mesh data
    const initialMeshData: MeshData[] = sceneMeshes.map(mesh => {
      const absolutePosition = mesh.getAbsolutePosition();
      const localPosition = mesh.position;
      const rotation = mesh.rotation;
      const scaling = mesh.scaling;
      
      // Debug logging for important meshes
      if (mesh.name === 'p1 cube' || mesh.name === 'p2 cube' || mesh.name.includes('wall') || mesh.name.includes('box')) {
        console.log(`🔍 ${mesh.name} positions:`, {
          absolute: { x: absolutePosition.x.toFixed(3), y: absolutePosition.y.toFixed(3), z: absolutePosition.z.toFixed(3) },
          local: { x: localPosition.x.toFixed(3), y: localPosition.y.toFixed(3), z: localPosition.z.toFixed(3) }
        });
      }
      
      return {
        id: mesh.id,
        name: mesh.name || `Mesh_${mesh.id}`,
        position: { x: absolutePosition.x, y: absolutePosition.y, z: absolutePosition.z },
        rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
        scaling: { x: scaling.x, y: scaling.y, z: scaling.z },
        isVisible: mesh.isVisible,
        isEnabled: mesh.isEnabled(),
        type: mesh.getClassName(),
        lastUpdated: Date.now()
      };
    });

    setMeshes(initialMeshData);
    setIsTracking(true);

    // Start real-time position updates
    startPositionUpdates();
  };

  const startPositionUpdates = () => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }

    // Update positions every 100ms (10 FPS)
    updateIntervalRef.current = setInterval(() => {
      updateMeshPositions();
    }, 100);
  };

  const updateMeshPositions = () => {
    if (!scene) return;

    const now = Date.now();
    
    // Only update if enough time has passed (throttle updates)
    if (now - lastUpdateRef.current < 50) return;
    lastUpdateRef.current = now;

    setMeshes(prevMeshes => {
      return prevMeshes.map(meshData => {
        const sceneMesh = scene.getMeshByID(meshData.id);
        
        if (sceneMesh && sceneMesh.isEnabled()) {
          const absolutePosition = sceneMesh.getAbsolutePosition();
          const localPosition = sceneMesh.position;
          const rotation = sceneMesh.rotation;
          const scaling = sceneMesh.scaling;

          // Check if position has changed
          const positionChanged = 
            Math.abs(absolutePosition.x - meshData.position.x) > 0.001 ||
            Math.abs(absolutePosition.y - meshData.position.y) > 0.001 ||
            Math.abs(absolutePosition.z - meshData.position.z) > 0.001;

          // Debug logging for important meshes
          if (sceneMesh.name === 'p1 cube' || sceneMesh.name === 'p2 cube') {
            console.log(`🔍 ${sceneMesh.name} update:`, {
              absolute: { x: absolutePosition.x.toFixed(3), y: absolutePosition.y.toFixed(3), z: absolutePosition.z.toFixed(3) },
              local: { x: localPosition.x.toFixed(3), y: localPosition.y.toFixed(3), z: localPosition.z.toFixed(3) },
              changed: positionChanged
            });
          }

          if (positionChanged) {
            return {
              ...meshData,
              position: { x: absolutePosition.x, y: absolutePosition.y, z: absolutePosition.z },
              rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
              scaling: { x: scaling.x, y: scaling.y, z: scaling.z },
              isVisible: sceneMesh.isVisible,
              isEnabled: sceneMesh.isEnabled(),
              lastUpdated: now
            };
          }
        }

        return meshData;
      });
    });
  };

  const stopTracking = () => {
    setIsTracking(false);
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
  };

  const resetTracking = () => {
    stopTracking();
    if (scene) {
      initializeMeshTracking();
    }
  };

  const formatNumber = (num: number): string => {
    return num.toFixed(3);
  };

  const getMeshTypeColor = (type: string): string => {
    switch (type) {
      case 'Mesh': return '#4CAF50';
      case 'InstancedMesh': return '#2196F3';
      case 'GroundMesh': return '#FF9800';
      case 'BoxMesh': return '#9C27B0';
      case 'SphereMesh': return '#F44336';
      default: return '#607D8B';
    }
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '600px',
      maxHeight: '80vh',
      backgroundColor: '#ffffff',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: 1000,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f8f9fa',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#333' }}>
          🎯 Mesh Tracker ({meshes.length} meshes)
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={resetTracking}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Reset
          </button>
          <button
            onClick={() => {
              console.log('🔍 Manual debug - Scene:', scene);
              console.log('🔍 Manual debug - Scene meshes:', scene?.meshes?.length || 'No scene');
              if (scene) {
                console.log('📋 ALL MESHES IN SCENE:');
                scene.meshes.forEach((mesh, index) => {
                  console.log(`${index}: "${mesh.name}" (${mesh.getClassName()}) - Enabled: ${mesh.isEnabled()}`);
                });
                initializeMeshTracking();
              }
            }}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🐛 Debug
          </button>
          <button
            onClick={() => {
              if (scene) {
                // Show ALL meshes including filtered ones
                const allMeshes = scene.meshes.filter(mesh => mesh && mesh.name);
                const allMeshData: MeshData[] = allMeshes.map(mesh => {
                  const absolutePosition = mesh.getAbsolutePosition();
                  const localPosition = mesh.position;
                  const rotation = mesh.rotation;
                  const scaling = mesh.scaling;
                  
                  // Debug logging for position comparison
                  if (mesh.name === 'p1 cube' || mesh.name === 'p2 cube') {
                    console.log(`🔍 ${mesh.name} positions:`, {
                      absolute: { x: absolutePosition.x, y: absolutePosition.y, z: absolutePosition.z },
                      local: { x: localPosition.x, y: localPosition.y, z: localPosition.z },
                      boundingBox: mesh.getBoundingInfo()?.boundingBox
                    });
                  }
                  
                  return {
                    id: mesh.id,
                    name: mesh.name,
                    position: { x: absolutePosition.x, y: absolutePosition.y, z: absolutePosition.z },
                    rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
                    scaling: { x: scaling.x, y: scaling.y, z: scaling.z },
                    isVisible: mesh.isVisible,
                    isEnabled: mesh.isEnabled(),
                    type: mesh.getClassName(),
                    lastUpdated: Date.now()
                  };
                });
                setMeshes(allMeshData);
                console.log(`📊 Showing ALL ${allMeshData.length} meshes (including filtered ones)`);
              }
            }}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: '#ffc107',
              color: 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            👁️ Show All
          </button>
          <button
            onClick={() => {
              if (scene) {
                // Show only sci-fi scene meshes (filter out scene1 meshes)
                const scifiMeshes = scene.meshes.filter(mesh => 
                  mesh && 
                  mesh.name && 
                  !mesh.name.includes('screen') && // Filter out screen meshes
                  !mesh.name.includes('Skybox') &&
                  !mesh.name.includes('skybox') &&
                  mesh.getClassName() !== 'GroundMesh'
                );
                const scifiMeshData: MeshData[] = scifiMeshes.map(mesh => {
                  const position = mesh.getAbsolutePosition();
                  const rotation = mesh.rotation;
                  const scaling = mesh.scaling;
                  
                  return {
                    id: mesh.id,
                    name: mesh.name,
                    position: { x: position.x, y: position.y, z: position.z },
                    rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
                    scaling: { x: scaling.x, y: scaling.y, z: scaling.z },
                    isVisible: mesh.isVisible,
                    isEnabled: mesh.isEnabled(),
                    type: mesh.getClassName(),
                    lastUpdated: Date.now()
                  };
                });
                setMeshes(scifiMeshData);
                console.log(`🎬 Showing ${scifiMeshData.length} sci-fi scene meshes only`);
              }
            }}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🎬 Sci-Fi Only
          </button>
          <button
            onClick={() => {
              if (scene) {
                // Show position comparison for debugging
                console.log('🔍 POSITION DEBUG - All meshes:');
                scene.meshes.forEach(mesh => {
                  if (mesh.name && !mesh.name.includes('Skybox') && !mesh.name.includes('skybox')) {
                    const absolutePos = mesh.getAbsolutePosition();
                    const localPos = mesh.position;
                    const boundingBox = mesh.getBoundingInfo()?.boundingBox;
                    
                    console.log(`📦 ${mesh.name}:`, {
                      absolute: { x: absolutePos.x.toFixed(3), y: absolutePos.y.toFixed(3), z: absolutePos.z.toFixed(3) },
                      local: { x: localPos.x.toFixed(3), y: localPos.y.toFixed(3), z: localPos.z.toFixed(3) },
                      boundingBox: boundingBox ? {
                        min: { x: boundingBox.minimum.x.toFixed(3), y: boundingBox.minimum.y.toFixed(3), z: boundingBox.minimum.z.toFixed(3) },
                        max: { x: boundingBox.maximum.x.toFixed(3), y: boundingBox.maximum.y.toFixed(3), z: boundingBox.maximum.z.toFixed(3) }
                      } : 'No bounding box'
                    });
                  }
                });
              }
            }}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: '#6f42c1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            📍 Debug Positions
          </button>
          <button
            onClick={stopTracking}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ⏹️ Stop
          </button>
        </div>
      </div>

      {/* Status */}
      <div style={{
        padding: '8px 16px',
        backgroundColor: isTracking ? '#d4edda' : '#f8d7da',
        color: isTracking ? '#155724' : '#721c24',
        fontSize: '12px',
        fontWeight: '500'
      }}>
        {isTracking ? '🟢 Tracking active' : '🔴 Tracking stopped'}
      </div>

      {/* Table */}
      <div style={{
        maxHeight: '60vh',
        overflowY: 'auto',
        overflowX: 'auto'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '11px'
        }}>
          <thead style={{
            position: 'sticky',
            top: 0,
            backgroundColor: '#f8f9fa',
            zIndex: 10
          }}>
            <tr>
              <th style={{
                padding: '8px',
                textAlign: 'left',
                borderBottom: '1px solid #e0e0e0',
                fontWeight: '600',
                minWidth: '120px'
              }}>
                Name
              </th>
              <th style={{
                padding: '8px',
                textAlign: 'left',
                borderBottom: '1px solid #e0e0e0',
                fontWeight: '600',
                minWidth: '80px'
              }}>
                Type
              </th>
              <th style={{
                padding: '8px',
                textAlign: 'left',
                borderBottom: '1px solid #e0e0e0',
                fontWeight: '600',
                minWidth: '100px'
              }}>
                Position (X, Y, Z)
              </th>
              <th style={{
                padding: '8px',
                textAlign: 'left',
                borderBottom: '1px solid #e0e0e0',
                fontWeight: '600',
                minWidth: '60px'
              }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {meshes.map((mesh, index) => (
              <tr key={mesh.id} style={{
                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                borderBottom: '1px solid #f0f0f0'
              }}>
                <td style={{
                  padding: '6px 8px',
                  fontFamily: 'monospace',
                  fontSize: '10px',
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {mesh.name}
                </td>
                <td style={{
                  padding: '6px 8px',
                  fontSize: '10px'
                }}>
                  <span style={{
                    backgroundColor: getMeshTypeColor(mesh.type),
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontSize: '9px'
                  }}>
                    {mesh.type}
                  </span>
                </td>
                <td style={{
                  padding: '6px 8px',
                  fontFamily: 'monospace',
                  fontSize: '10px'
                }}>
                  <div style={{ marginBottom: '2px' }}>
                    X: {formatNumber(mesh.position.x)}
                  </div>
                  <div style={{ marginBottom: '2px' }}>
                    Y: {formatNumber(mesh.position.y)}
                  </div>
                  <div>
                    Z: {formatNumber(mesh.position.z)}
                  </div>
                </td>
                <td style={{
                  padding: '6px 8px',
                  fontSize: '10px'
                }}>
                  <div style={{
                    color: mesh.isVisible ? '#28a745' : '#dc3545',
                    fontWeight: '500'
                  }}>
                    {mesh.isVisible ? '👁️ Visible' : '🚫 Hidden'}
                  </div>
                  <div style={{
                    color: mesh.isEnabled ? '#28a745' : '#dc3545',
                    fontWeight: '500',
                    fontSize: '9px'
                  }}>
                    {mesh.isEnabled ? '✅ Enabled' : '❌ Disabled'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 16px',
        borderTop: '1px solid #e0e0e0',
        backgroundColor: '#f8f9fa',
        fontSize: '10px',
        color: '#666',
        textAlign: 'center'
      }}>
        Last update: {new Date().toLocaleTimeString()} | 
        Updates: {isTracking ? '10 FPS' : 'Stopped'}
      </div>
    </div>
  );
};

export default MeshTracker;
