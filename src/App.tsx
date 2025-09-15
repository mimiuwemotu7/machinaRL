import React, { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';
import './components/HomePage.css';
import UnifiedViewer from './components/UnifiedViewer';
import SystemLog from './components/SystemLog';
import MovementTestPanel from './components/MovementTestPanel';
import BackendUI from './components/BackendUI';
import HomePage from './components/HomePage';
import MeshTracker from './components/MeshTracker';
import AILiveMode from './components/AILiveMode';
import MasterClientMonitor from './components/MasterClientMonitor';
import { getSimulationIntegrationService, SimulationProgress } from './ai/services/SimulationIntegrationService';
import { SimulationEvent } from './ai/services/SimulationExecutionEngine';
import { Globe, FileText, Play, Pause, Square, RotateCcw } from 'lucide-react';
import customSimulationService from './services/CustomSimulationService';

// Debug: Check if CustomSimulationService is imported correctly
console.log('🔍 [App] CustomSimulationService import check:', typeof customSimulationService);

interface ModelOption {
  id: string;
  name: string;
  filename: string;
  description: string;
  thumbnail?: string;
}

const modelOptions: ModelOption[] = [
  {
    id: 'scene1',
    name: 'Scene 1',
    filename: 'scene1.glb',
    description: 'Original scene with cubes and tag game',
    thumbnail: '/scene1.png'
  },
  {
    id: 'scifi',
    name: 'Sci-Fi Scene',
    filename: 'scifi.glb',
    description: 'Futuristic sci-fi environment',
    thumbnail: '/scifi.png'
  },
  {
    id: 'maze1',
    name: 'Maze 1',
    filename: 'maze1.glb',
    description: 'Interactive maze environment for exploration',
    thumbnail: '/maze1.png'
  },
  {
    id: 'bedroom',
    name: 'Bedroom',
    filename: 'bedroom.glb',
    description: 'Cozy bedroom environment for relaxation',
    thumbnail: '/bedroom.png'
  }
];

function App() {
  const [selectedModel, setSelectedModel] = useState<ModelOption>(modelOptions[1]);
  const [activeTab, setActiveTab] = useState<'scenes' | 'controls'>('scenes');
  const [showMovementTest, setShowMovementTest] = useState(false);
  const [showBackendUI, setShowBackendUI] = useState(false);
  const [showMeshTracker, setShowMeshTracker] = useState(false);
  const [currentMode, setCurrentMode] = useState<'custom' | 'live'>('custom' as 'custom' | 'live');
  const [currentPage, setCurrentPage] = useState<'home' | 'simulation' | 'custom-simulation'>('home');
  const [babylonScene, setBabylonScene] = useState<any>(null);
  const [aiLiveModeActive, setAiLiveModeActive] = useState(false);
  const [isMasterClient, setIsMasterClient] = useState(false);
  const [clientId, setClientId] = useState('');
  
  // Viewer state
  const [viewerState, setViewerState] = useState({
    camMode: 'glb' as 'glb' | 'free',
    freeSpeed: 0.5,
    selectedCube: 'p1' as 'p1' | 'p2',
    tagGameActive: false,
    currentScene: '',
    screenMeshes: [] as any[],
    cameras: [] as any[],
    currentCameraIndex: 0,
    glbCam: null as any
  });

  // Simulation state
  const [simulationProgress, setSimulationProgress] = useState<SimulationProgress | null>(null);
  const [simulationName, setSimulationName] = useState('');
  const [simulationGoal, setSimulationGoal] = useState('');
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [simulationIntegrationService] = useState(() => getSimulationIntegrationService());

  // Simulation event handlers
  useEffect(() => {
    // Subscribe to simulation progress updates
    simulationIntegrationService.subscribeToProgress('app-component', (progress: SimulationProgress) => {
      setSimulationProgress(progress);
      setIsSimulationRunning(progress.isRunning);
    });

    // Subscribe to simulation events
    simulationIntegrationService.subscribeToEvents('app-component', (event: SimulationEvent) => {
      console.log('🎬 Simulation event:', event.type, event.message);
    });

    // Cleanup on unmount
    return () => {
      simulationIntegrationService.unsubscribeFromProgress('app-component');
      simulationIntegrationService.unsubscribeFromEvents('app-component');
    };
  }, [simulationIntegrationService]);

  // Handle viewer state changes
  const handleViewerStateChange = useCallback((state: any) => {
    setViewerState(state);
    
    // Capture Babylon scene for mesh tracking
    if (state.scene) {
      setBabylonScene(state.scene);
    }
  }, []);

  // Get scene data for MasterClientMonitor
  const getSceneData = useCallback(() => {
    if (babylonScene && babylonScene.meshes) {
      return {
        meshes: babylonScene.meshes.map((mesh: any) => ({
          name: mesh.name,
          position: mesh.position ? { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z } : { x: 0, y: 0, z: 0 },
          rotation: mesh.rotation ? { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z } : { x: 0, y: 0, z: 0 }
        }))
      };
    }
    return { meshes: [] };
  }, [babylonScene]);

  // Check if admin mode is enabled
  const isAdminMode = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isAdmin = urlParams.get('admin') === 'true';
    if (isAdmin) {
      console.log('🔧 [App] Admin mode detected - Client Monitor will be visible');
    } else {
      console.log('🔒 [App] Regular mode - Client Monitor hidden');
    }
    return isAdmin;
  }, []);

  // Handle control actions
  const handleControlAction = (action: string, value?: any) => {
    if ((window as any).handleUnifiedViewerControl) {
      (window as any).handleUnifiedViewerControl(action, value);
    }
  };

  // Handle AI messages for system log
  const handleAIMessage = useCallback((message: string, agentId: 'p1' | 'p2' | 'system') => {
    // Map agent IDs to display names
    const agentNames = {
      'p1': 'GROK',
      'p2': 'ChatGPT',
      'system': 'System'
    };
    
    const displayName = agentNames[agentId] || agentId;
    
    // Send message to system log
    if ((window as any).addSystemLogMessage) {
      (window as any).addSystemLogMessage(message, 'ai', displayName);
    }
  }, []);

  // Handle AI movement commands
  const handleMovementCommand = useCallback((command: string, agentId: 'p1' | 'p2') => {
    // Map agent IDs to display names
    const agentNames = {
      'p1': 'GROK',
      'p2': 'ChatGPT'
    };
    
    const displayName = agentNames[agentId] || agentId;
    
    // Log movement command
    if ((window as any).addSystemLogMessage) {
      (window as any).addSystemLogMessage(`🎮 ${displayName}: ${command}`, 'info', displayName);
    }
  }, []);

  // Handle simulation execution
  const handleExecuteSimulation = useCallback(async () => {
    if (!simulationName.trim() || !simulationGoal.trim()) {
      alert('Please enter both simulation name and goal description');
      return;
    }

    try {
      console.log('🚀 Starting custom simulation:', simulationName);
      console.log('🔍 Current page:', currentPage);
      console.log('🔍 Current mode:', currentMode);
      console.log('🔍 CustomSimulationService available:', typeof customSimulationService);
      setIsSimulationRunning(true);

      // Use the custom simulation service directly
      await customSimulationService.startSimulation(
        simulationName,
        simulationGoal,
        {
          sceneId: selectedModel.id,
          availableMeshes: viewerState.screenMeshes.map((mesh: any) => mesh.name),
          sceneType: selectedModel.name
        },
        handleAIMessage,
        handleMovementCommand,
        handleSimulationComplete
      );

      console.log('✅ Custom simulation started successfully');

    } catch (error) {
      console.error('❌ Simulation execution failed:', error);
      alert(`Simulation failed: ${error}`);
      setIsSimulationRunning(false);
    }
  }, [simulationName, simulationGoal, currentPage, currentMode, selectedModel, viewerState]);

  // Handle simulation completion
  const handleSimulationComplete = useCallback((result: any) => {
    console.log('🏁 Custom simulation completed:', result);
    setIsSimulationRunning(false);
    
    if (result.success) {
      const progress = result.progress || result.finalProgress || 100;
      alert(`Simulation completed successfully! Progress: ${progress.toFixed(1)}%`);
    } else {
      alert(`Simulation failed: ${result.completionReason}`);
    }
  }, []);

  // Handle simulation controls
  const handleSimulationControl = useCallback((action: 'start' | 'pause' | 'resume' | 'stop' | 'reset') => {
    if (currentMode === 'custom') {
      // Handle custom simulation controls
      switch (action) {
        case 'start':
          handleExecuteSimulation();
          break;
        case 'stop':
          customSimulationService.stopSimulation();
          setIsSimulationRunning(false);
          break;
        case 'pause':
        case 'resume':
        case 'reset':
          // Custom simulation doesn't support these actions yet
          console.log(`Custom simulation doesn't support ${action} yet`);
          break;
      }
    } else {
      // Handle live simulation controls
      const controls = simulationIntegrationService.getControls();
      
      switch (action) {
        case 'start':
          controls.start();
          break;
        case 'pause':
          controls.pause();
          break;
        case 'resume':
          controls.resume();
          break;
        case 'stop':
          controls.stop();
          break;
        case 'reset':
          controls.reset();
          break;
      }
    }
  }, [currentMode, simulationIntegrationService, handleExecuteSimulation]);

  // Helper function to get the dynamic admin URL
  const getAdminURL = () => {
    const currentHost = window.location.hostname;
    const currentPort = window.location.port;
    const serverUrl = `http://${currentHost}:${currentPort || '3000'}`;
    return `${serverUrl}/admin-34321`;
  };

  // Expose BackendUI toggle function globally
  React.useEffect(() => {
    (window as any).toggleBackendUI = () => {
      setShowBackendUI(prev => !prev);
    };
    
    (window as any).setShowBackendUI = (value: boolean) => {
      setShowBackendUI(value);
    };
    
    return () => {
      delete (window as any).toggleBackendUI;
      delete (window as any).setShowBackendUI;
    };
  }, [showBackendUI]);

  // Check for special admin path to show Backend UI
  React.useEffect(() => {
    const currentPath = window.location.pathname;
    const currentHost = window.location.hostname;
    const currentPort = window.location.port;
    
    // Check if we're on the admin path
    if (currentPath === '/admin-34321') {
      setShowBackendUI(true);
      // Clean up the URL to remove the admin path
      window.history.replaceState({}, document.title, '/');
    }
  }, []);

  return (
    <div className="App">
      {currentPage === 'home' ? (
        <HomePage 
          onNavigateToSimulation={() => {
            setCurrentPage('simulation');
            setCurrentMode('live');
          }}
          onNavigateToCustomSimulation={() => {
            setCurrentPage('custom-simulation');
            setCurrentMode('custom');
          }}
          onShowBackendUI={() => setShowBackendUI(true)}
        />
      ) : (
        <>
          {/* Navigation Bar */}
          <nav className="homepage-nav">
            <div className="nav-brand">
              <h1>machinaRL</h1>
            </div>
            <div className="nav-links">
              <a 
                href="#" 
                className="nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage('home');
                }}
              >
                Home
              </a>
              <a 
                href="#" 
                className={`nav-link ${currentPage === 'simulation' ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage('simulation');
                  setCurrentMode('live');
                }}
              >
                Live sim
              </a>
              <a 
                href="#" 
                className={`nav-link ${currentPage === 'custom-simulation' ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage('custom-simulation');
                  setCurrentMode('custom');
                }}
              >
                Make your sim
              </a>
              <a href="#" className="nav-link">docs</a>
            </div>
            <button 
              className="get-started-btn"
              onClick={() => {
                setCurrentPage('simulation');
                setCurrentMode('live');
              }}
            >
              Experience
            </button>
            <button 
              className="admin-btn"
              onClick={() => setShowBackendUI(true)}
              title="Open Backend Admin Dashboard"
            >
              🔧 Admin
            </button>
          </nav>

      {currentMode === 'live' ? (
        <div className="live-mode-layout">
          {/* Live Mode: Main Content Area */}
          <div className="live-mode-main-content">
            {/* 3D Viewer with Scene Information */}
            <div className="live-mode-viewer-section">
              {/* 3D Viewer */}
            <div className="live-mode-viewer-container">
                <UnifiedViewer 
                  width={window.innerWidth * 0.7} 
                  height={(window.innerHeight - 60) * 0.65} 
                  modelFilename={selectedModel.filename}
                  onStateChange={handleViewerStateChange}
                  onControlAction={handleControlAction}
                />
              </div>
              
              {/* Scene Information - Now a child of the viewer section */}
              <div className="scene-information-panel">
                <div className="scene-info-header">
                  <h4>Scene Information</h4>
                      </div>
                <div className="scene-info-content">
                  <div className="scene-details">
                    <div className="detail-row">
                      <span className="label">Name:</span>
                      <span className="value">{selectedModel.name}</span>
                            </div>
                    <div className="detail-row">
                      <span className="label">File:</span>
                      <span className="value">{selectedModel.filename}</span>
                          </div>
                    <div className="detail-row">
                      <span className="label">Scene ID:</span>
                      <span className="value">{selectedModel.id}</span>
                    </div>
                  </div>
                  
                  <div className="scene-features">
                    <div className="features-label">Features:</div>
                    <ul className="features-list">
                              <li>3D Environment Navigation</li>
                              <li>Interactive Cubes (P1 & P2)</li>
                              <li>AI-Powered Movement Commands</li>
                              {selectedModel.id === 'scene1' && <li>Tag Game Simulation</li>}
                              {selectedModel.id === 'scifi' && <li>Advanced Sci-Fi Environment</li>}
                              {selectedModel.id === 'maze1' && <li>Maze Navigation & Exploration</li>}
                              {selectedModel.id === 'bedroom' && <li>Relaxing Bedroom Environment</li>}
                            </ul>
                          </div>
                  
                  {/* Camera Controls */}
                  <div className="camera-controls">
                    <div className="camera-label">Scene Cameras:</div>
                    <div className="camera-buttons">
                      {viewerState.cameras.length > 0 ? (
                        viewerState.cameras.map((camera, index) => (
                          <button
                            key={index}
                            className={`camera-btn ${viewerState.currentCameraIndex === index ? 'active' : ''}`}
                            onClick={() => handleControlAction('selectGLBCamera', index)}
                          >
                            Camera {index + 1}
                          </button>
                        ))
                      ) : (
                        <span className="no-cameras">No cameras available</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Admin Controls - Only show in admin mode */}
            {isAdminMode() && (
              <div className="admin-controls-section">
                <MasterClientMonitor 
                  isMasterClient={isMasterClient}
                  clientId={clientId}
                  onGetSceneData={getSceneData}
                  onForceMaster={() => {
                    if ((window as any).forceMasterClient) {
                      (window as any).forceMasterClient();
                    }
                  }}
                />
              </div>
            )}
          </div>
          
          {/* Live Mode: Right Section (30vw) */}
          <div className="live-mode-right-section">
            <SystemLog 
              maxEntries={100}
              showTimestamps={true}
              autoScroll={true}
              enableChat={true}
              showChatInput={false}
            />
          </div>
          
          {/* AI Live Mode */}
          <AILiveMode 
            isActive={currentMode === 'live'}
            onAIMessage={handleAIMessage}
            onMovementCommand={handleMovementCommand}
            onMasterClientChange={(isMaster, id) => {
              console.log('🔍 [App] Master client status changed:', { isMaster, id });
              setIsMasterClient(isMaster);
              setClientId(id);
            }}
          />
          
          {/* Custom Simulation - Now handled by service directly */}
          
          {/* Mesh Tracker Overlay */}
          <MeshTracker 
            scene={babylonScene} 
            isVisible={showMeshTracker} 
          />
        </div>
      ) : (
      <div className="app-layout">
          {/* Custom Mode: Separate Sections */}
        {/* Left Sidebar - Control Panel */}
        <div className="sidebar">
          <div className="sidebar-header">
            <h2>Control Panel</h2>
            <div className="current-model">
              <span className="model-badge">{selectedModel.name}</span>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button 
              className={`tab-button ${activeTab === 'scenes' ? 'active' : ''}`}
              onClick={() => setActiveTab('scenes')}
            >
              <Globe size={16} /> Scenes
            </button>
            <button 
              className={`tab-button ${activeTab === 'controls' ? 'active' : ''}`}
              onClick={() => setActiveTab('controls')}
            >
                  <FileText size={16} /> Scene Details
            </button>
          </div>
          
          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'scenes' && (
              <div className="model-selector">
                <h3>Scene Selection</h3>
                <div className="model-cards">
                  {modelOptions.map((model) => (
                    <div
                      key={model.id}
                      className={`model-card ${selectedModel.id === model.id ? 'selected' : ''}`}
                      onClick={() => setSelectedModel(model)}
                    >
                      <div className="model-card-header">
                        <h4>{model.name}</h4>
                        <div className={`model-indicator ${selectedModel.id === model.id ? 'active' : ''}`}>
                          {selectedModel.id === model.id ? '✓' : ''}
                        </div>
                      </div>
                      {model.thumbnail && (
                        <div className="model-thumbnail">
                          <img 
                            src={model.thumbnail} 
                            alt={`${model.name} thumbnail`}
                            className="thumbnail-image"
                          />
                        </div>
                      )}
                      <div className="model-card-body">
                        <div className="model-description">{model.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
                    
                    {/* Controls moved here from Controls tab */}
                    <div className="model-card" style={{ marginTop: '20px' }}>
                      <div className="model-card-header">
                        <h4>Controls</h4>
              </div>
                      <div className="model-card-body">
                    {viewerState.cameras.length > 0 && (
                          <div className="camera-selector" style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Scene Cameras:</label>
                            <div className="camera-buttons" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {viewerState.cameras.map((camera, index) => (
                            <button
                              key={index}
                              className={`control-btn ${viewerState.currentCameraIndex === index ? 'active' : ''}`}
                              onClick={() => handleControlAction('selectGLBCamera', index)}
                                  style={{
                                    padding: '8px 12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    background: viewerState.currentCameraIndex === index ? '#007bff' : '#f8f9fa',
                                    color: viewerState.currentCameraIndex === index ? 'white' : '#333',
                                    cursor: 'pointer'
                                  }}
                            >
                              {camera.name || `Camera ${index + 1}`}
                            </button>
                          ))}
                        </div>
                        {/* POV Camera Hint */}
                        {viewerState.cameras.some(cam => cam.name && cam.name.includes('POV CAM')) && (
                          <div style={{ marginTop: '8px', fontSize: '11px', color: '#666', fontStyle: 'italic' }}>
                            💡 Use mouse to look around when in POV camera mode
                          </div>
                        )}
                      </div>
                    )}

                    {/* Simulation Goal Definition */}
                    <div className="simulation-goal-section" style={{ marginTop: '20px' }}>
                      <h4 style={{ marginBottom: '15px', color: '#333' }}>Define Simulation Goal</h4>
                      <div className="simulation-goal-content">
                        <div className="input-group" style={{ marginBottom: '15px' }}>
                          <label htmlFor="simulationName" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Simulation Name:</label>
                          <input
                            type="text"
                            id="simulationName"
                            value={simulationName}
                            onChange={(e) => setSimulationName(e.target.value)}
                            placeholder="Enter a name for your simulation..."
                            className="simulation-input"
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '14px'
                            }}
                          />
                        </div>
                        
                        <div className="input-group" style={{ marginBottom: '15px' }}>
                          <label htmlFor="simulationGoal" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Describe Simulation Goal:</label>
                          <textarea
                            id="simulationGoal"
                            value={simulationGoal}
                            onChange={(e) => setSimulationGoal(e.target.value)}
                            placeholder="Describe what you want Grok and ChatGPT to do in this simulation..."
                            className="simulation-textarea"
                            rows={4}
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '14px',
                              resize: 'vertical'
                            }}
                          />
                        </div>
                        
                        <div className="character-info" style={{ marginBottom: '15px', display: 'flex', gap: '15px', justifyContent: 'center' }}>
                          <div className="character-item" style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 'bold', color: '#007bff' }}>🤖 Grok</div>
                            <div style={{ fontSize: '12px', color: '#666' }}>(P1 Cube)</div>
                          </div>
                          <div className="character-item" style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 'bold', color: '#28a745' }}>💬 ChatGPT</div>
                            <div style={{ fontSize: '12px', color: '#666' }}>(P2 Cube)</div>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                          <button 
                            onClick={handleExecuteSimulation}
                            disabled={isSimulationRunning}
                            className="execute-simulation-btn" 
                            style={{
                              flex: 1,
                              padding: '10px',
                              border: 'none',
                              borderRadius: '4px',
                              background: isSimulationRunning ? '#6c757d' : '#007bff',
                              color: 'white',
                              fontSize: '14px',
                              fontWeight: 'bold',
                              cursor: isSimulationRunning ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {isSimulationRunning ? 'Running...' : 'Execute Simulation'}
                          </button>
                        </div>

                        {/* Simulation Controls */}
                        {isSimulationRunning && (
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                            <button 
                              onClick={() => handleSimulationControl('pause')}
                              style={{
                                padding: '8px 12px',
                                border: '1px solid #ffc107',
                                borderRadius: '4px',
                                background: '#ffc107',
                                color: '#000',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Pause size={14} />
                              Pause
                            </button>
                            <button 
                              onClick={() => handleSimulationControl('stop')}
                              style={{
                                padding: '8px 12px',
                                border: '1px solid #dc3545',
                                borderRadius: '4px',
                                background: '#dc3545',
                                color: 'white',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Square size={14} />
                              Stop
                            </button>
                          </div>
                        )}

                        {/* Simulation Progress */}
                        {simulationProgress && (
                          <div style={{ 
                            padding: '10px', 
                            background: '#f8f9fa', 
                            borderRadius: '4px', 
                            fontSize: '12px',
                            marginBottom: '15px'
                          }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Simulation Progress</div>
                            <div>Progress: {simulationProgress.progress.toFixed(1)}%</div>
                            <div>Time: {simulationProgress.timeElapsed.toFixed(1)}s / {simulationProgress.timeRemaining.toFixed(1)}s remaining</div>
                            <div>Objectives: {simulationProgress.objectivesCompleted}/{simulationProgress.totalObjectives}</div>
                            <div style={{ marginTop: '5px' }}>
                              <div>🤖 Grok: {simulationProgress.agentStatuses.p1.status} - {simulationProgress.agentStatuses.p1.progress.toFixed(1)}%</div>
                              <div>💬 ChatGPT: {simulationProgress.agentStatuses.p2.status} - {simulationProgress.agentStatuses.p2.progress.toFixed(1)}%</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                        <div className="movement-keys">
                          <p style={{ margin: '8px 0', color: '#666' }}>Use the chat box below to tell the AI what to do with the cubes.</p>
                          <p style={{ margin: '8px 0', color: '#666' }}>Examples: "move blue cube forward", "red cube 2 cm", "make P1 jump"</p>
                        </div>
                    </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'controls' && (
                  <div className="viewer-controls">
                    <h3>Scene Details</h3>
                    <div className="controls-content">
                      <div className="model-card">
                        <div className="model-card-header">
                          <h4>{selectedModel.name}</h4>
                        </div>
                        <div className="model-card-body">
                          <div className="model-description" style={{ marginBottom: '15px' }}>
                            {selectedModel.description}
                          </div>
                          <div style={{ marginBottom: '15px' }}>
                            <strong>File:</strong> {selectedModel.filename}
                          </div>
                          <div style={{ marginBottom: '15px' }}>
                            <strong>Scene ID:</strong> {selectedModel.id}
                  </div>
                          <div>
                            <strong>Available Features:</strong>
                            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                              <li>3D Environment Navigation</li>
                              <li>Interactive Cubes (P1 & P2)</li>
                              <li>AI-Powered Movement Commands</li>
                              {selectedModel.id === 'scene1' && <li>Tag Game Simulation</li>}
                              {selectedModel.id === 'scifi' && <li>Advanced Sci-Fi Environment</li>}
                              {selectedModel.id === 'maze1' && <li>Maze Navigation & Exploration</li>}
                              {selectedModel.id === 'bedroom' && <li>Relaxing Bedroom Environment</li>}
                            </ul>
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Panel - 3D Viewer */}
        <div className="main-content">
          <div className="viewer-panel">
            <div className="scene-container">
              <UnifiedViewer 
                width={800} 
                height={600} 
                modelFilename={selectedModel.filename}
                onStateChange={handleViewerStateChange}
                onControlAction={handleControlAction}
              />
            </div>
          </div>
        </div>

        {/* Right Panel - System Log */}
        <div className="chat-sidebar">
          <SystemLog 
            maxEntries={100}
            showTimestamps={true}
            autoScroll={true}
            enableChat={true}
                showChatInput={true}
          />
        </div>
      </div>
        )}

          {/* Movement Test Panel */}
          <MovementTestPanel 
            isOpen={showMovementTest}
            onClose={() => setShowMovementTest(false)}
          />

          {/* Backend UI */}
          <BackendUI 
            isOpen={showBackendUI}
            onClose={() => setShowBackendUI(false)}
          />

        </>
      )}
    </div>
  );
}

export default App;
