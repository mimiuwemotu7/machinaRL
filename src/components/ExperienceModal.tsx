import React, { useState } from 'react';
import { X, Maximize2 } from 'lucide-react';
import UnifiedViewer from './UnifiedViewer';
import SystemLog from './SystemLog';
import './ExperienceModal.css';

interface ExperienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpand?: () => void;
}

const ExperienceModal: React.FC<ExperienceModalProps> = ({ isOpen, onClose, onExpand }) => {
  const [isClosing, setIsClosing] = useState(false);
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

  // Handle viewer state changes
  const handleViewerStateChange = (state: any) => {
    setViewerState(state);
  };

  // Handle control actions
  const handleControlAction = (action: string, value?: any) => {
    if ((window as any).handleUnifiedViewerControl) {
      (window as any).handleUnifiedViewerControl(action, value);
    }
  };

  // Handle close with animation
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300); // Match animation duration
  };

  if (!isOpen) return null;

  return (
    <div className={`experience-modal-overlay ${isClosing ? 'closing' : ''}`}>
      <div className={`experience-modal ${isClosing ? 'closing' : ''}`}>
        {/* Modal Header */}
        <div className="modal-header">
          <h2>Experience machinaRL</h2>
          <div className="modal-header-buttons">
            {onExpand && (
              <button className="expand-button" onClick={onExpand} title="Open in full screen">
                <Maximize2 size={20} />
              </button>
            )}
            <button className="close-button" onClick={handleClose} title="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="modal-content">
          {/* Left Side - 3D Viewer */}
          <div className="modal-viewer-section">
            <div className="viewer-container">
              <UnifiedViewer 
                width={800} 
                height={500} 
                modelFilename="scifi.glb"
                onStateChange={handleViewerStateChange}
                onControlAction={handleControlAction}
              />
            </div>
          </div>

          {/* Right Side - System Log */}
          <div className="modal-log-section">
            <div className="modal-system-log">
              <SystemLog 
                maxEntries={100}
                showTimestamps={true}
                autoScroll={true}
                enableChat={true}
                showChatInput={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExperienceModal;
