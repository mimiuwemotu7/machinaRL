import React, { useState, useEffect, useCallback } from 'react';
import './MasterClientMonitor.css';

interface MasterClientMonitorProps {
  isMasterClient: boolean;
  clientId: string;
  onGetSceneData: () => any;
  onForceMaster?: () => void;
}

interface CubePosition {
  name: string;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
}

const MasterClientMonitor: React.FC<MasterClientMonitorProps> = ({
  isMasterClient,
  clientId,
  onGetSceneData,
  onForceMaster
}) => {
  const [cubePositions, setCubePositions] = useState<CubePosition[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // Check if admin mode is enabled (via URL parameter)
  const isAdminMode = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isAdmin = urlParams.get('admin') === 'true';
    if (!isAdmin) {
      console.log('🔒 [MasterClientMonitor] Admin mode not detected - Client Monitor hidden');
    }
    return isAdmin;
  }, []);

  console.log('🔍 [MasterClientMonitor] Rendered with props:', { isMasterClient, clientId, isAdmin: isAdminMode() });

  const updatePositions = useCallback(() => {
    if (!isMasterClient) return;
    
    try {
      const sceneData = onGetSceneData();
      if (sceneData && sceneData.meshes) {
        const cubes = sceneData.meshes.filter((mesh: any) => 
          mesh.name && (mesh.name.includes('P1') || mesh.name.includes('P2'))
        );
        
        const positions: CubePosition[] = cubes.map((mesh: any) => ({
          name: mesh.name,
          position: mesh.position || { x: 0, y: 0, z: 0 },
          rotation: mesh.rotation || { x: 0, y: 0, z: 0 }
        }));
        
        setCubePositions(positions);
      }
    } catch (error) {
      console.error('Error updating cube positions:', error);
    }
  }, [isMasterClient, onGetSceneData]);

  useEffect(() => {
    if (!isMasterClient) {
      setCubePositions([]);
      setIsVisible(false);
      return;
    }

    // Update positions immediately
    updatePositions();
    
    // Set up interval to update positions every 500ms
    const interval = setInterval(updatePositions, 500);
    
    return () => clearInterval(interval);
  }, [isMasterClient, updatePositions]);

  // Hide component completely if not in admin mode
  if (!isAdminMode()) {
    return null;
  }

  return (
    <div className="master-client-monitor">
      <div className="monitor-header">
        <h3>
          {isMasterClient ? '👑' : '📖'} Client Monitor {isMasterClient ? '(MASTER)' : '(READ-ONLY)'}
          {isAdminMode() && <span className="admin-badge">🔧 ADMIN</span>}
        </h3>
        <button 
          className="toggle-button"
          onClick={() => setIsVisible(!isVisible)}
        >
          {isVisible ? '▼' : '▶'}
        </button>
      </div>
      
      {isVisible && (
        <div className="monitor-content">
          <div className="client-info">
            <span className="client-id">Client: {clientId}</span>
            <span className="status">Status: {isMasterClient ? 'MASTER' : 'READ-ONLY'}</span>
          </div>
          
          {!isMasterClient && onForceMaster && isAdminMode() && (
            <div className="force-master-section">
              <button 
                className="force-master-button"
                onClick={onForceMaster}
                title="Force this client to become the master (Admin Only)"
              >
                👑 Force Master
              </button>
            </div>
          )}
          
          <div className="cube-positions">
            <h4>Cube Positions (Real-time)</h4>
            {cubePositions.length > 0 ? (
              <div className="position-grid">
                {cubePositions.map((cube, index) => (
                  <div key={index} className="cube-info">
                    <div className="cube-name">{cube.name}</div>
                    <div className="position-data">
                      <div className="position-row">
                        <span className="label">X:</span>
                        <span className="value">{cube.position.x.toFixed(3)}</span>
                      </div>
                      <div className="position-row">
                        <span className="label">Y:</span>
                        <span className="value">{cube.position.y.toFixed(3)}</span>
                      </div>
                      <div className="position-row">
                        <span className="label">Z:</span>
                        <span className="value">{cube.position.z.toFixed(3)}</span>
                      </div>
                    </div>
                    {cube.rotation && (
                      <div className="rotation-data">
                        <div className="rotation-row">
                          <span className="label">RX:</span>
                          <span className="value">{cube.rotation.x.toFixed(3)}</span>
                        </div>
                        <div className="rotation-row">
                          <span className="label">RY:</span>
                          <span className="value">{cube.rotation.y.toFixed(3)}</span>
                        </div>
                        <div className="rotation-row">
                          <span className="label">RZ:</span>
                          <span className="value">{cube.rotation.z.toFixed(3)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data">No P1/P2 cubes found in scene</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterClientMonitor;
