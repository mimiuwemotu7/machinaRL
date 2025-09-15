import React, { useState, useEffect, useCallback } from 'react';
import { Play, Square, Pause, RotateCcw, Zap, Monitor, Users } from 'lucide-react';

interface CrossTabAIControlProps {
  isOpen: boolean;
  onClose: () => void;
}

const CrossTabAIControl: React.FC<CrossTabAIControlProps> = ({ isOpen, onClose }) => {
  const [aiStatus, setAiStatus] = useState<'stopped' | 'running' | 'paused'>('stopped');
  const [activeClients, setActiveClients] = useState<number>(0);
  const [messageCount, setMessageCount] = useState<number>(0);
  const [lastActivity, setLastActivity] = useState<string>('No activity');

  // Cross-tab communication using localStorage
  const STORAGE_KEY = 'ai_live_mode_control';
  const CLIENT_ID = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Listen for cross-tab changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data.type === 'status_update') {
            setAiStatus(data.status);
            setActiveClients(data.activeClients || 0);
            setMessageCount(data.messageCount || 0);
            setLastActivity(data.lastActivity || 'No activity');
          }
        } catch (error) {
          console.error('Error parsing cross-tab AI data:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Update cross-tab status
  const updateCrossTabStatus = useCallback((status: string, additionalData: any = {}) => {
    const data = {
      type: 'status_update',
      status,
      clientId: CLIENT_ID,
      timestamp: Date.now(),
      ...additionalData
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    
    // Also trigger for same tab
    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEY,
      newValue: JSON.stringify(data),
      storageArea: localStorage
    }));
  }, [CLIENT_ID]);

  // Start AI Live Mode across all tabs
  const handleStartAI = () => {
    setAiStatus('running');
    updateCrossTabStatus('running', {
      activeClients: activeClients + 1,
      lastActivity: `AI Live Mode started by ${CLIENT_ID}`
    });
    
    // Trigger AI start in the main viewer
    if ((window as any).startAILiveMode) {
      (window as any).startAILiveMode();
    }
    
    console.log('🚀 [CrossTabAI] Started AI Live Mode across all tabs');
  };

  // Stop AI Live Mode across all tabs
  const handleStopAI = () => {
    setAiStatus('stopped');
    updateCrossTabStatus('stopped', {
      activeClients: 0,
      lastActivity: `AI Live Mode stopped by ${CLIENT_ID}`
    });
    
    // Trigger AI stop in the main viewer
    if ((window as any).stopAILiveMode) {
      (window as any).stopAILiveMode();
    }
    
    console.log('⏹️ [CrossTabAI] Stopped AI Live Mode across all tabs');
  };

  // Pause AI Live Mode across all tabs
  const handlePauseAI = () => {
    setAiStatus('paused');
    updateCrossTabStatus('paused', {
      lastActivity: `AI Live Mode paused by ${CLIENT_ID}`
    });
    
    console.log('⏸️ [CrossTabAI] Paused AI Live Mode across all tabs');
  };

  // Reset AI Live Mode across all tabs
  const handleResetAI = () => {
    setAiStatus('stopped');
    setMessageCount(0);
    updateCrossTabStatus('stopped', {
      activeClients: 0,
      messageCount: 0,
      lastActivity: `AI Live Mode reset by ${CLIENT_ID}`
    });
    
    // Trigger AI reset in the main viewer
    if ((window as any).stopAILiveMode) {
      (window as any).stopAILiveMode();
    }
    
    console.log('🔄 [CrossTabAI] Reset AI Live Mode across all tabs');
  };

  // Listen for AI message updates from the main viewer
  useEffect(() => {
    const handleAIMessage = () => {
      setMessageCount(prev => prev + 1);
      updateCrossTabStatus(aiStatus, {
        messageCount: messageCount + 1,
        lastActivity: `Message #${messageCount + 1} sent`
      });
    };

    // Listen for AI messages from the main viewer
    window.addEventListener('ai-message-sent', handleAIMessage);
    
    return () => window.removeEventListener('ai-message-sent', handleAIMessage);
  }, [aiStatus, messageCount, updateCrossTabStatus]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Zap className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Cross-Tab AI Live Mode Control</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Square className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Monitor className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Active Clients</span>
              </div>
              <p className="text-2xl font-bold text-blue-600 mt-1">{activeClients}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Messages Sent</span>
              </div>
              <p className="text-2xl font-bold text-green-600 mt-1">{messageCount}</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Status</span>
              </div>
              <p className="text-lg font-bold text-purple-600 mt-1 capitalize">{aiStatus}</p>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleStartAI}
              disabled={aiStatus === 'running'}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>Start AI Live Mode</span>
            </button>
            
            <button
              onClick={handlePauseAI}
              disabled={aiStatus !== 'running'}
              className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Pause className="w-4 h-4" />
              <span>Pause AI</span>
            </button>
            
            <button
              onClick={handleStopAI}
              disabled={aiStatus === 'stopped'}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Square className="w-4 h-4" />
              <span>Stop AI</span>
            </button>
            
            <button
              onClick={handleResetAI}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset All</span>
            </button>
          </div>

          {/* Activity Log */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Activity Log</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Last Activity:</span>
                <span className="text-gray-900">{lastActivity}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Client ID:</span>
                <span className="text-gray-900 font-mono text-xs">{CLIENT_ID}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Cross-Tab Sync:</span>
                <span className="text-green-600">Active</span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-blue-900 mb-2">How to Use</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Start AI Live Mode to begin AI communication across all open tabs</li>
              <li>• All tabs will sync their AI status automatically</li>
              <li>• Messages and activity are tracked across all clients</li>
              <li>• Use this dashboard to control AI from any tab or client</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrossTabAIControl;
