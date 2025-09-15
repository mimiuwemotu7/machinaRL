import React, { useState, useEffect, useRef } from 'react';
import { AICommunicationSystem, CommunicationHelper } from '../ai/communication';
import { ChatService } from '../ai/services/ChatService';
import { getAPIConfig } from '../ai/config/apiConfig';
import './AICommunicationTest.css';

interface AICommunicationTestProps {
  isVisible: boolean;
  onClose: () => void;
}

const AICommunicationTest: React.FC<AICommunicationTestProps> = ({ isVisible, onClose }) => {
  const [communicationSystem] = useState(() => new AICommunicationSystem({
    maxMessageHistory: 50,
    messageExpirationTime: 10000,
    enableLearning: true,
    enableEmotionalModeling: true,
    enableStrategySharing: true,
    debugMode: false
  }));

  const [p1Helper] = useState(() => new CommunicationHelper('p1', communicationSystem));
  const [p2Helper] = useState(() => new CommunicationHelper('p2', communicationSystem));

  // Initialize separate channels for P1 and P2 to prevent duplicates
  useEffect(() => {
    communicationSystem.createChannel('p1-channel', 'P1 Communication Channel', ['p1', 'p2'], 10);
    communicationSystem.createChannel('p2-channel', 'P2 Communication Channel', ['p1', 'p2'], 10);
  }, [communicationSystem]);
  
  // Initialize AI services
  const [p1ChatService] = useState(() => new ChatService());
  const [p2ChatService] = useState(() => new ChatService());
  const [apiConfig] = useState(() => getAPIConfig());
  
  const [messages, setMessages] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [sceneData, setSceneData] = useState<any>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentSenderRef = useRef<'p1' | 'p2'>('p1');

  // Initialize communication channels
  useEffect(() => {
    communicationSystem.createChannel('p1-p2-direct', 'Direct P1-P2 Communication', ['p1', 'p2'], 1000);
  }, [communicationSystem]);

  // Function to gather scene data
  const gatherSceneData = () => {
    // Try to get scene data from the global viewer state
    const viewerState = (window as any).unifiedViewerState;
    if (viewerState && viewerState.scene) {
      const meshes = viewerState.scene.meshes || [];
      const meshData = meshes.map((mesh: any) => ({
        name: mesh.name,
        position: mesh.position ? { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z } : null,
        isVisible: mesh.isVisible,
        type: mesh.getClassName ? mesh.getClassName() : 'unknown'
      })).filter((mesh: any) => mesh.name && mesh.name !== 'hdrSkyBox');
      
      return {
        meshes: meshData,
        scene: viewerState.currentScene || 'scifi.glb',
        timestamp: Date.now()
      };
    }
    return null;
  };

  // Function to create AI prompt with context
  const createAIPrompt = (sender: 'p1' | 'p2', messageNumber: number, sceneData: any) => {
    const role = sender === 'p1' ? 'P1 (Red Cube Agent)' : 'P2 (Blue Cube Agent)';
    const opponent = sender === 'p1' ? 'P2 (Blue Cube Agent)' : 'P1 (Red Cube Agent)';
    
    let prompt = `You are ${role} in a 3D tag game. You are communicating with ${opponent}.\n\n`;
    
    if (sceneData && sceneData.meshes) {
      prompt += `CURRENT SCENE STATE:\n`;
      prompt += `- Scene: ${sceneData.scene}\n`;
      prompt += `- Available objects: ${sceneData.meshes.map((m: any) => m.name).join(', ')}\n`;
      
      // Find P1 and P2 cube positions
      const p1Cube = sceneData.meshes.find((m: any) => m.name.toLowerCase().includes('p1') || m.name.toLowerCase().includes('red'));
      const p2Cube = sceneData.meshes.find((m: any) => m.name.toLowerCase().includes('p2') || m.name.toLowerCase().includes('blue'));
      
      if (p1Cube && p1Cube.position) {
        prompt += `- P1 (Red Cube) position: (${p1Cube.position.x.toFixed(2)}, ${p1Cube.position.y.toFixed(2)}, ${p1Cube.position.z.toFixed(2)})\n`;
      }
      if (p2Cube && p2Cube.position) {
        prompt += `- P2 (Blue Cube) position: (${p2Cube.position.x.toFixed(2)}, ${p2Cube.position.y.toFixed(2)}, ${p2Cube.position.z.toFixed(2)})\n`;
      }
      prompt += `\n`;
    }
    
    prompt += `CONVERSATION CONTEXT:\n`;
    prompt += `This is message #${messageNumber} in our conversation. `;
    
    if (sender === 'p1') {
      prompt += `You are P1 (Red Cube Agent). Respond to P2's previous message and share your current strategy, position, or observations about the game.`;
    } else {
      prompt += `You are P2 (Blue Cube Agent). Respond to P1's previous message and share your current strategy, position, or observations about the game.`;
    }
    
    prompt += `\n\nIMPORTANT: Only communicate - do NOT execute any code. Just discuss strategy, position, and game observations.`;
    
    return prompt;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const toggleSimulation = () => {
    if (isRunning) {
      stopSimulation();
    } else {
      startSimulation();
    }
  };

  const startSimulation = () => {
    setIsRunning(true);
    setMessageCount(0);
    currentSenderRef.current = 'p1';
    
    // Start the communication loop
    intervalRef.current = setInterval(() => {
      sendMessage();
    }, 1500); // Send message every 1.5 seconds
  };

  const stopSimulation = () => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const sendMessage = async () => {
    if (isLoading) return; // Prevent overlapping requests
    
    const currentSender = currentSenderRef.current;
    const messageNumber = messageCount + 1;
    
    setIsLoading(true);
    
    try {
      // Gather current scene data
      const currentSceneData = gatherSceneData();
      setSceneData(currentSceneData);
      
      if (currentSender === 'p1') {
        // P1 sends message to P2 using AI service
        console.log(`🤖 P1 calling AI service for message #${messageNumber}`);
        const prompt = createAIPrompt('p1', messageNumber, currentSceneData);
        const aiResponse = await p1ChatService.processChatMessage(
          prompt,
          'p1-conversation',
          { sceneData: currentSceneData, messageNumber, role: 'p1' }
        );
        console.log(`🤖 P1 AI response:`, aiResponse.success ? 'SUCCESS' : 'FAILED', aiResponse.data?.message?.content?.substring(0, 50) || aiResponse.error);
        
        if (aiResponse.success && aiResponse.data) {
          const aiResponseText = aiResponse.data.message.content || 'Hello P2! How are you doing?';
          p1Helper.announceIntention(
            `ai_message_${messageNumber}`, 
            0.9, 
            `🤖 AI Response: ${aiResponseText}`,
            'p1-channel'
          );
          
          // Try to execute movement code from AI response
          tryExecuteMovementCode(aiResponseText, 'p1');
        } else {
          // Show error instead of fallback
          p1Helper.announceIntention(
            `error_message_${messageNumber}`, 
            0.9, 
            `❌ AI Error: ${aiResponse.error || 'Service unavailable'}`,
            'p1-channel'
          );
        }
        currentSenderRef.current = 'p2';
      } else {
        // P2 sends message to P1 using AI service
        console.log(`🤖 P2 calling AI service for message #${messageNumber}`);
        const prompt = createAIPrompt('p2', messageNumber, currentSceneData);
        const aiResponse = await p2ChatService.processChatMessage(
          prompt,
          'p2-conversation',
          { sceneData: currentSceneData, messageNumber, role: 'p2' }
        );
        console.log(`🤖 P2 AI response:`, aiResponse.success ? 'SUCCESS' : 'FAILED', aiResponse.data?.message?.content?.substring(0, 50) || aiResponse.error);
        
        if (aiResponse.success && aiResponse.data) {
          const aiResponseText = aiResponse.data.message.content || 'Hello P1! I\'m doing great, thanks for asking!';
          p2Helper.announceIntention(
            `ai_message_${messageNumber}`, 
            0.9, 
            `🤖 AI Response: ${aiResponseText}`,
            'p2-channel'
          );
          
          // Try to execute movement code from AI response
          tryExecuteMovementCode(aiResponseText, 'p2');
        } else {
          // Show error instead of fallback
          p2Helper.announceIntention(
            `error_message_${messageNumber}`, 
            0.9, 
            `❌ AI Error: ${aiResponse.error || 'Service unavailable'}`,
            'p2-channel'
          );
        }
        currentSenderRef.current = 'p1';
      }
      
      setMessageCount(prev => prev + 1);
      updateMessagesDisplay();
    } catch (error) {
      console.error('AI Communication Error:', error);
      // Show actual error message
      const errorMessage = `AI Communication Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        
      if (currentSender === 'p1') {
        p1Helper.announceIntention(`error_message_${messageNumber}`, 0.9, errorMessage, 'p1-channel');
        currentSenderRef.current = 'p2';
      } else {
        p2Helper.announceIntention(`error_message_${messageNumber}`, 0.9, errorMessage, 'p2-channel');
        currentSenderRef.current = 'p1';
      }
      
      setMessageCount(prev => prev + 1);
      updateMessagesDisplay();
    } finally {
      setIsLoading(false);
    }
  };

  // Try to execute movement code from AI response
  const tryExecuteMovementCode = (aiResponseText: string, agentId: 'p1' | 'p2') => {
    try {
      // Look for JavaScript code blocks in the AI response
      const codeMatch = aiResponseText.match(/```javascript\n([\s\S]*?)\n```/);
      if (codeMatch && codeMatch[1]) {
        const code = codeMatch[1].trim();
        console.log(`🎮 [${agentId.toUpperCase()}] Executing movement code:`, code);
        
        // Execute the movement code using the unified viewer control
        if ((window as any).handleUnifiedViewerControl) {
          // Parse the code to extract movement commands
          if (code.includes('forward') || code.includes('move forward')) {
            (window as any).handleUnifiedViewerControl('moveCube', { cube: agentId, direction: 'forward' });
          } else if (code.includes('backward') || code.includes('move backward')) {
            (window as any).handleUnifiedViewerControl('moveCube', { cube: agentId, direction: 'backward' });
          } else if (code.includes('left') || code.includes('move left')) {
            (window as any).handleUnifiedViewerControl('moveCube', { cube: agentId, direction: 'left' });
          } else if (code.includes('right') || code.includes('move right')) {
            (window as any).handleUnifiedViewerControl('moveCube', { cube: agentId, direction: 'right' });
          } else if (code.includes('up') || code.includes('move up')) {
            (window as any).handleUnifiedViewerControl('moveCube', { cube: agentId, direction: 'up' });
          } else if (code.includes('down') || code.includes('move down')) {
            (window as any).handleUnifiedViewerControl('moveCube', { cube: agentId, direction: 'down' });
          }
        }
      }
    } catch (error) {
      console.error(`❌ [${agentId.toUpperCase()}] Error executing movement code:`, error);
    }
  };

  // Update messages display - fix duplicate issue by using separate channels
  const updateMessagesDisplay = () => {
    const p1Messages = communicationSystem.getMessagesForAgent('p1', 'p1-channel');
    const p2Messages = communicationSystem.getMessagesForAgent('p2', 'p2-channel');
    
    const allMessages = [...p1Messages, ...p2Messages]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20); // Show last 20 messages
    
    setMessages(allMessages);
  };

  if (!isVisible) return null;

  return (
    <div className="ai-communication-test">
      <div className="ai-communication-test-content">
        <div className="ai-communication-test-header">
          <h2>AI Communication Test</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="ai-communication-test-body">
          <div className="controls-section">
            <button 
              className={`control-button ${isRunning ? 'stop' : 'start'}`}
              onClick={toggleSimulation}
            >
              {isRunning ? 'Stop Simulation' : 'Start Simulation'}
            </button>
            
            <div className="status-info">
              <p>Status: {isRunning ? (isLoading ? 'AI Processing...' : 'Running') : 'Stopped'}</p>
              <p>Messages sent: {messageCount}</p>
              <p>Next sender: {currentSenderRef.current.toUpperCase()}</p>
              <p>AI Service: {apiConfig.provider === 'mock' ? 'Mock Mode' : apiConfig.provider.toUpperCase()}</p>
              {sceneData && (
                <p style={{color: '#28a745', fontSize: '12px'}}>
                  ✅ Scene data: {sceneData.meshes?.length || 0} meshes, {sceneData.scene}
                </p>
              )}
              {apiConfig.provider === 'mock' && (
                <p style={{color: '#ff6b6b', fontSize: '12px'}}>
                  ⚠️ Set REACT_APP_OPENAI_API_KEY to use real AI
                </p>
              )}
            </div>
          </div>

          <div className="messages-section">
            <h3>Communication Messages</h3>
            <div className="messages-list">
              {messages.length === 0 ? (
                <p className="no-messages">No messages yet. Start the simulation to see AI communication!</p>
              ) : (
                messages.map((message, index) => (
                  <div key={index} className={`message ${message.senderId}`}>
                    <div className="message-header">
                      <span className="sender">{message.senderId.toUpperCase()}</span>
                      <span className="timestamp">{new Date(message.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="message-content">
                      <strong>{message.type}:</strong> {JSON.stringify(message.content, null, 2)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AICommunicationTest;