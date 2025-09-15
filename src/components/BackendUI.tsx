import React, { useState, useEffect } from 'react';
import AICommunicationTest from './AICommunicationTest';
import CrossTabAIControl from './CrossTabAIControl';
import { 
  Play, 
  Square, 
  Pause, 
  RotateCcw, 
  Settings, 
  Database, 
  Server, 
  Activity,
  Users,
  BarChart3,
  Monitor,
  Zap,
  Shield,
  Globe,
  HardDrive,
  Bot,
  Power
} from 'lucide-react';

interface BackendUIProps {
  isOpen: boolean;
  onClose: () => void;
}

const BackendUI: React.FC<BackendUIProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'simulation' | 'monitoring' | 'settings' | 'users' | 'ai-test' | 'cross-tab-ai' | 'ai-server'>('simulation');
  const [simulationStatus, setSimulationStatus] = useState<'stopped' | 'running' | 'paused'>('stopped');
  const [selectedSimulation, setSelectedSimulation] = useState('scene1.glb');
  const [showCrossTabAI, setShowCrossTabAI] = useState(false);
  
  // AI Server state
  const [aiServerStatus, setAiServerStatus] = useState<'stopped' | 'running' | 'starting' | 'stopping'>('stopped');
  const [aiServerData, setAiServerData] = useState<any>(null);
  const [aiServerError, setAiServerError] = useState<string | null>(null);

  // Handle simulation start/stop
  const handleStartSimulation = () => {
    if (selectedSimulation === 'scene1.glb') {
      // Start tag game for Scene 1
      if ((window as any).handleUnifiedViewerControl) {
        (window as any).handleUnifiedViewerControl('toggleTagGame', true);
        setSimulationStatus('running');
        console.log('🎮 [BackendUI] Started Tag Game simulation for Scene 1');
      }
    } else {
      // For other scenes, just set status (will implement later)
      setSimulationStatus('running');
      console.log(`🎮 [BackendUI] Started simulation for ${selectedSimulation}`);
    }
  };

  const handleStopSimulation = () => {
    if (selectedSimulation === 'scene1.glb') {
      // Stop tag game for Scene 1
      if ((window as any).handleUnifiedViewerControl) {
        (window as any).handleUnifiedViewerControl('toggleTagGame', false);
        setSimulationStatus('stopped');
        console.log('🎮 [BackendUI] Stopped Tag Game simulation for Scene 1');
      }
    } else {
      // For other scenes, just set status
      setSimulationStatus('stopped');
      console.log(`🎮 [BackendUI] Stopped simulation for ${selectedSimulation}`);
    }
  };

  const handlePauseSimulation = () => {
    // Pause functionality (could be implemented later)
    setSimulationStatus('paused');
    console.log(`🎮 [BackendUI] Paused simulation for ${selectedSimulation}`);
  };

  const handleRestartSimulation = () => {
    handleStopSimulation();
    setTimeout(() => {
      handleStartSimulation();
    }, 100);
  };

  // AI Server control functions
  const checkAIServerStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/ai/status');
      if (response.ok) {
        const data = await response.json();
        setAiServerData(data);
        setAiServerStatus(data.data?.isRunning ? 'running' : 'stopped');
        setAiServerError(null);
      } else {
        setAiServerStatus('stopped');
        setAiServerError('Server not responding');
      }
    } catch (error) {
      setAiServerStatus('stopped');
      setAiServerError('Cannot connect to AI server');
    }
  };

  const startAIServer = async () => {
    setAiServerStatus('starting');
    setAiServerError(null);
    
    try {
      const response = await fetch('http://localhost:3001/api/ai/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiServerData(data);
        setAiServerStatus('running');
        console.log('🤖 AI Server started successfully');
      } else {
        const errorData = await response.json();
        setAiServerError(errorData.message || 'Failed to start AI server');
        setAiServerStatus('stopped');
      }
    } catch (error) {
      setAiServerError('Failed to connect to AI server');
      setAiServerStatus('stopped');
    }
  };

  const stopAIServer = async () => {
    setAiServerStatus('stopping');
    setAiServerError(null);
    
    try {
      const response = await fetch('http://localhost:3001/api/ai/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiServerData(data);
        setAiServerStatus('stopped');
        console.log('🤖 AI Server stopped successfully');
      } else {
        const errorData = await response.json();
        setAiServerError(errorData.message || 'Failed to stop AI server');
        setAiServerStatus('running');
      }
    } catch (error) {
      setAiServerError('Failed to connect to AI server');
      setAiServerStatus('running');
    }
  };

  // Check AI server status on component mount and when tab is active
  useEffect(() => {
    if (isOpen && activeTab === 'ai-server') {
      checkAIServerStatus();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const simulationOptions = [
    { id: 'scene1.glb', name: 'Scene 1 - Tag Game Simulation', status: 'ready', simulation: 'Tag Game' },
    { id: 'scifi.glb', name: 'Sci-Fi Scene - Advanced', status: 'ready', simulation: 'Coming Soon' },
    { id: 'custom.glb', name: 'Custom Scene', status: 'loading', simulation: 'None' }
  ];

  const systemMetrics = {
    cpu: 45,
    memory: 67,
    gpu: 23,
    network: 12,
    activeUsers: 3,
    totalRequests: 1247
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.95)',
      color: 'white',
      fontFamily: 'monospace',
      zIndex: 3000,
      overflow: 'auto'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(90deg, #1a1a1a 0%, #2d2d2d 100%)',
        padding: '20px',
        borderBottom: '2px solid #4CAF50',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Server size={32} color="#4CAF50" />
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', color: '#4CAF50' }}>Backend Management</h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#888' }}>3D Simulation Control Panel</p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: '1px solid #666',
            color: 'white',
            padding: '10px 15px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ✕ Close
        </button>
      </div>

      {/* Tab Navigation */}
      <div style={{
        background: '#1a1a1a',
        padding: '0 20px',
        borderBottom: '1px solid #333',
        display: 'flex',
        gap: '0'
      }}>
        {[
          { id: 'simulation', label: 'Simulation Control', icon: Play },
          { id: 'monitoring', label: 'System Monitoring', icon: Monitor },
          { id: 'ai-server', label: 'AI Server Control', icon: Bot },
          { id: 'ai-test', label: 'AI Communication Test', icon: Activity },
          { id: 'cross-tab-ai', label: 'Cross-Tab AI Control', icon: Zap },
          { id: 'settings', label: 'Configuration', icon: Settings },
          { id: 'users', label: 'User Management', icon: Users }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              background: activeTab === tab.id ? '#4CAF50' : 'transparent',
              border: 'none',
              color: 'white',
              padding: '15px 20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              borderBottom: activeTab === tab.id ? '3px solid #4CAF50' : '3px solid transparent'
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
        {activeTab === 'simulation' && (
          <div>
            <h2 style={{ color: '#4CAF50', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Play size={24} />
              Simulation Control
            </h2>

            {/* Simulation Status */}
            <div style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#FFC107' }}>Current Status</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: simulationStatus === 'running' ? '#4CAF50' : 
                             simulationStatus === 'paused' ? '#FFC107' : '#f44336'
                }} />
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {simulationStatus === 'running' ? 'Running' : 
                   simulationStatus === 'paused' ? 'Paused' : 'Stopped'}
                </span>
              </div>
              <p style={{ margin: 0, color: '#888' }}>
                Selected Scene: <strong>{selectedSimulation}</strong>
              </p>
              {selectedSimulation === 'scene1.glb' && simulationStatus === 'running' && (
                <p style={{ margin: '10px 0 0 0', color: '#4CAF50', fontSize: '14px' }}>
                  🎮 Tag Game is running
                </p>
              )}
            </div>

            {/* Scene Selection */}
            <div style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#FFC107' }}>Scene Selection</h3>
              <div style={{ display: 'grid', gap: '10px' }}>
                {simulationOptions.map(scene => (
                  <div
                    key={scene.id}
                    onClick={() => setSelectedSimulation(scene.id)}
                    style={{
                      background: selectedSimulation === scene.id ? '#2d4a2d' : '#2a2a2a',
                      border: selectedSimulation === scene.id ? '2px solid #4CAF50' : '1px solid #444',
                      borderRadius: '6px',
                      padding: '15px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{scene.name}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>ID: {scene.id}</div>
                      <div style={{ fontSize: '12px', color: '#4CAF50' }}>Simulation: {scene.simulation}</div>
                    </div>
                    <div style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: scene.status === 'ready' ? '#4CAF50' : '#FFC107',
                      color: 'white'
                    }}>
                      {scene.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Control Buttons */}
            <div style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '20px'
            }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#FFC107' }}>Simulation Controls</h3>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleStartSimulation}
                  disabled={simulationStatus === 'running'}
                  style={{
                    background: simulationStatus === 'running' ? '#666' : '#4CAF50',
                    border: 'none',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '6px',
                    cursor: simulationStatus === 'running' ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px'
                  }}
                >
                  <Play size={16} />
                  Start Simulation
                </button>
                <button
                  onClick={handlePauseSimulation}
                  disabled={simulationStatus !== 'running'}
                  style={{
                    background: simulationStatus !== 'running' ? '#666' : '#FFC107',
                    border: 'none',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '6px',
                    cursor: simulationStatus !== 'running' ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px'
                  }}
                >
                  <Pause size={16} />
                  Pause Simulation
                </button>
                <button
                  onClick={handleStopSimulation}
                  disabled={simulationStatus === 'stopped'}
                  style={{
                    background: simulationStatus === 'stopped' ? '#666' : '#f44336',
                    border: 'none',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '6px',
                    cursor: simulationStatus === 'stopped' ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px'
                  }}
                >
                  <Square size={16} />
                  Stop Simulation
                </button>
                <button
                  onClick={handleRestartSimulation}
                  style={{
                    background: '#2196F3',
                    border: 'none',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px'
                  }}
                >
                  <RotateCcw size={16} />
                  Restart Simulation
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'monitoring' && (
          <div>
            <h2 style={{ color: '#4CAF50', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Monitor size={24} />
              System Monitoring
            </h2>

            {/* System Metrics */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              {[
                { label: 'CPU Usage', value: systemMetrics.cpu, icon: Activity, color: '#4CAF50' },
                { label: 'Memory Usage', value: systemMetrics.memory, icon: HardDrive, color: '#2196F3' },
                { label: 'GPU Usage', value: systemMetrics.gpu, icon: Zap, color: '#FF9800' },
                { label: 'Network I/O', value: systemMetrics.network, icon: Globe, color: '#9C27B0' }
              ].map(metric => (
                <div
                  key={metric.label}
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center'
                  }}
                >
                  <metric.icon size={32} color={metric.color} style={{ marginBottom: '10px' }} />
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: metric.color }}>
                    {metric.value}%
                  </div>
                  <div style={{ fontSize: '14px', color: '#888' }}>{metric.label}</div>
                </div>
              ))}
            </div>

            {/* Active Users & Requests */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              <div style={{
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '20px'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#FFC107', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={20} />
                  Active Users
                </h3>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4CAF50' }}>
                  {systemMetrics.activeUsers}
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Currently connected</div>
              </div>

              <div style={{
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '20px'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#FFC107', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart3 size={20} />
                  Total Requests
                </h3>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2196F3' }}>
                  {systemMetrics.totalRequests.toLocaleString()}
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Since last restart</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ai-server' && (
          <div>
            <h2 style={{ color: '#4CAF50', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bot size={24} />
              AI Server Control
            </h2>

            {/* AI Server Status */}
            <div style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#FFC107' }}>Server Status</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: aiServerStatus === 'running' ? '#4CAF50' : 
                             aiServerStatus === 'starting' || aiServerStatus === 'stopping' ? '#FFC107' : '#f44336'
                }} />
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {aiServerStatus === 'running' ? 'Running' : 
                   aiServerStatus === 'starting' ? 'Starting...' :
                   aiServerStatus === 'stopping' ? 'Stopping...' : 'Stopped'}
                </span>
              </div>
              
              {aiServerData && (
                <div style={{ marginBottom: '15px' }}>
                  <p style={{ margin: '5px 0', color: '#888' }}>
                    <strong>Message Count:</strong> {aiServerData.data?.messageCount || 0}
                  </p>
                  <p style={{ margin: '5px 0', color: '#888' }}>
                    <strong>Interval:</strong> {aiServerData.data?.intervalMs || 0}ms
                  </p>
                  <p style={{ margin: '5px 0', color: '#888' }}>
                    <strong>Max Messages:</strong> {aiServerData.data?.maxMessages || 0}
                  </p>
                  {aiServerData.data?.nextMessageIn && (
                    <p style={{ margin: '5px 0', color: '#4CAF50' }}>
                      <strong>Next Message In:</strong> {aiServerData.data.nextMessageIn}ms
                    </p>
                  )}
                </div>
              )}

              {aiServerError && (
                <div style={{
                  background: '#2d1a1a',
                  border: '1px solid #f44336',
                  borderRadius: '4px',
                  padding: '10px',
                  color: '#f44336',
                  fontSize: '14px'
                }}>
                  <strong>Error:</strong> {aiServerError}
                </div>
              )}
            </div>

            {/* AI Server Controls */}
            <div style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#FFC107' }}>Server Controls</h3>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '15px' }}>
                <button
                  onClick={startAIServer}
                  disabled={aiServerStatus === 'running' || aiServerStatus === 'starting'}
                  style={{
                    background: (aiServerStatus === 'running' || aiServerStatus === 'starting') ? '#666' : '#4CAF50',
                    border: 'none',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '6px',
                    cursor: (aiServerStatus === 'running' || aiServerStatus === 'starting') ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px'
                  }}
                >
                  <Power size={16} />
                  Start AI Server
                </button>
                <button
                  onClick={stopAIServer}
                  disabled={aiServerStatus === 'stopped' || aiServerStatus === 'stopping'}
                  style={{
                    background: (aiServerStatus === 'stopped' || aiServerStatus === 'stopping') ? '#666' : '#f44336',
                    border: 'none',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '6px',
                    cursor: (aiServerStatus === 'stopped' || aiServerStatus === 'stopping') ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px'
                  }}
                >
                  <Square size={16} />
                  Stop AI Server
                </button>
                <button
                  onClick={checkAIServerStatus}
                  style={{
                    background: '#2196F3',
                    border: 'none',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px'
                  }}
                >
                  <Activity size={16} />
                  Refresh Status
                </button>
              </div>
            </div>

            {/* Server Information */}
            <div style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '20px'
            }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#FFC107' }}>Server Information</h3>
              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>Server URL:</span>
                  <span style={{ color: '#4CAF50' }}>http://localhost:3001</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>API Endpoint:</span>
                  <span style={{ color: '#4CAF50' }}>/api/ai</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>Firebase Integration:</span>
                  <span style={{ color: '#4CAF50' }}>Active</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>Real AI System:</span>
                  <span style={{ color: '#4CAF50' }}>Enabled</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ai-test' && (
          <div>
            <h2 style={{ color: '#4CAF50', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity size={24} />
              AI Communication Test
            </h2>
            
            <div style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <p style={{ color: '#ccc', marginBottom: '20px' }}>
                Test the AI communication system between P1 and P2 agents. This will start a conversation loop where the AIs communicate about their strategies and game state.
              </p>
              
              <AICommunicationTest 
                isVisible={true}
                onClose={() => {}} // No close function needed since it's embedded
              />
            </div>
          </div>
        )}

        {activeTab === 'cross-tab-ai' && (
          <div>
            <h2 style={{ color: '#4CAF50', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Zap size={24} />
              Cross-Tab AI Live Mode Control
            </h2>
            
            <div style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <p style={{ color: '#ccc', marginBottom: '20px' }}>
                Control AI Live Mode across multiple browser tabs and clients. This system allows you to start, stop, and monitor AI communication from any tab or device.
              </p>
              
              <button
                onClick={() => setShowCrossTabAI(true)}
                style={{
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Zap size={20} />
                Open Cross-Tab AI Control
              </button>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <h2 style={{ color: '#4CAF50', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Settings size={24} />
              Configuration
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '20px'
            }}>
              {/* Server Settings */}
              <div style={{
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '20px'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#FFC107' }}>Server Settings</h3>
                <div style={{ display: 'grid', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Server Port</label>
                    <input
                      type="number"
                      defaultValue="3000"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: '#2a2a2a',
                        border: '1px solid #444',
                        color: 'white',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Max Connections</label>
                    <input
                      type="number"
                      defaultValue="100"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: '#2a2a2a',
                        border: '1px solid #444',
                        color: 'white',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Environment</label>
                    <select
                      defaultValue="development"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: '#2a2a2a',
                        border: '1px solid #444',
                        color: 'white',
                        borderRadius: '4px'
                      }}
                    >
                      <option value="development">Development</option>
                      <option value="staging">Staging</option>
                      <option value="production">Production</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Security Settings */}
              <div style={{
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '20px'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#FFC107', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={20} />
                  Security Settings
                </h3>
                <div style={{ display: 'grid', gap: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" defaultChecked style={{ transform: 'scale(1.2)' }} />
                    <label style={{ fontSize: '14px' }}>Enable HTTPS</label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" defaultChecked style={{ transform: 'scale(1.2)' }} />
                    <label style={{ fontSize: '14px' }}>Require Authentication</label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" style={{ transform: 'scale(1.2)' }} />
                    <label style={{ fontSize: '14px' }}>Enable Rate Limiting</label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" defaultChecked style={{ transform: 'scale(1.2)' }} />
                    <label style={{ fontSize: '14px' }}>Log All Requests</label>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div style={{ marginTop: '30px', textAlign: 'center' }}>
              <button
                style={{
                  background: '#4CAF50',
                  border: 'none',
                  color: 'white',
                  padding: '12px 30px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                Save Configuration
              </button>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h2 style={{ color: '#4CAF50', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={24} />
              User Management
            </h2>

            <div style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: '#FFC107' }}>Active Sessions</h3>
                <button
                  style={{
                    background: '#4CAF50',
                    border: 'none',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Refresh
                </button>
              </div>

              <div style={{ display: 'grid', gap: '10px' }}>
                {[
                  { id: 'user1', name: 'Admin User', ip: '192.168.1.100', connected: '2h 15m', status: 'active' },
                  { id: 'user2', name: 'Test User', ip: '192.168.1.101', connected: '45m', status: 'idle' },
                  { id: 'user3', name: 'Guest User', ip: '192.168.1.102', connected: '12m', status: 'active' }
                ].map(user => (
                  <div
                    key={user.id}
                    style={{
                      background: '#2a2a2a',
                      border: '1px solid #444',
                      borderRadius: '6px',
                      padding: '15px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{user.name}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        IP: {user.ip} • Connected: {user.connected}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        background: user.status === 'active' ? '#4CAF50' : '#FFC107',
                        color: 'white'
                      }}>
                        {user.status}
                      </div>
                      <button
                        style={{
                          background: '#f44336',
                          border: 'none',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Cross-Tab AI Control Modal */}
      <CrossTabAIControl 
        isOpen={showCrossTabAI} 
        onClose={() => setShowCrossTabAI(false)} 
      />
    </div>
  );
};

export default BackendUI;
