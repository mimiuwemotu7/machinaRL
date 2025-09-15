import React, { useState, useRef, useEffect } from 'react';

interface DraggablePanelProps {
  children: React.ReactNode;
  initialPosition?: { x: number; y: number };
  title?: string;
  className?: string;
}

const DraggablePanel: React.FC<DraggablePanelProps> = ({
  children,
  initialPosition = { x: 20, y: 20 },
  title = "Controls",
  className = ""
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === panelRef.current?.querySelector('.panel-header')) {
      setIsDragging(true);
      const rect = panelRef.current!.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep panel within viewport bounds
      const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 300);
      const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 200);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  return (
    <div
      ref={panelRef}
      className={`draggable-panel ${className}`}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        background: 'rgba(0, 0, 0, 0.85)',
        border: '2px solid #444',
        borderRadius: '8px',
        padding: '0',
        minWidth: '280px',
        maxWidth: '400px',
        zIndex: 1000,
        userSelect: 'none',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(4px)'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Panel Header */}
      <div 
        className="panel-header"
        style={{
          background: 'linear-gradient(135deg, #333, #555)',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: '6px 6px 0 0',
          cursor: isDragging ? 'grabbing' : 'grab',
          borderBottom: '1px solid #666',
          fontSize: '14px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: '12px', opacity: 0.7 }}>⋮⋮</span>
      </div>
      
      {/* Panel Content */}
      <div 
        style={{
          padding: '12px',
          color: '#fff',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default DraggablePanel;

