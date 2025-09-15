import React, { useState } from 'react';

interface Tab {
  id: string;
  label: string;
  icon: string;
  content: React.ReactNode;
}

interface TabbedControlPanelProps {
  tabs: Tab[];
  className?: string;
}

const TabbedControlPanel: React.FC<TabbedControlPanelProps> = ({ tabs, className = "" }) => {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || '');

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className={`tabbed-control-panel ${className}`} style={{
      background: 'rgba(0, 0, 0, 0.85)',
      border: '2px solid #444',
      borderRadius: '8px',
      minWidth: '300px',
      maxWidth: '400px',
      backdropFilter: 'blur(4px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
    }}>
      {/* Tab Headers */}
      <div style={{
        display: 'flex',
        background: 'linear-gradient(135deg, #333, #555)',
        borderRadius: '6px 6px 0 0',
        borderBottom: '1px solid #666',
        overflow: 'hidden'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 'none',
              background: activeTab === tab.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.2s ease',
              borderRight: '1px solid #666'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div style={{
        padding: '12px',
        color: '#fff',
        fontSize: '12px',
        fontFamily: 'monospace',
        minHeight: '200px',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        {activeTabContent}
      </div>
    </div>
  );
};

export default TabbedControlPanel;
