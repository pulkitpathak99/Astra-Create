import './index.css';
import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import CanvasEditor from './components/CanvasEditor';
import PropertiesPanel from './components/PropertiesPanel';
import Toolbar from './components/Toolbar';
import Onboarding from './components/Onboarding';
import CampaignGenerator from './components/CampaignGenerator';
import useStore from './store/useStore';

function App() {
  const { showOnboarding, setShowOnboarding, canvas, saveToHistory, complianceErrors, complianceWarnings } = useStore();
  const [showCampaignGenerator, setShowCampaignGenerator] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(45);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Delete selected object
      if ((e.key === 'Delete' || e.key === 'Backspace') && canvas) {
        const active = canvas.getActiveObject();
        if (active && !active.isEditing) {
          canvas.remove(active);
          canvas.discardActiveObject();
          canvas.renderAll();
          saveToHistory();
        }
      }

      // Undo (Cmd/Ctrl + Z)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useStore.getState().undo();
      }

      // Redo (Cmd/Ctrl + Shift + Z)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        useStore.getState().redo();
      }

      // Export campaign (Cmd/Ctrl + E)
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        setShowCampaignGenerator(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvas, saveToHistory]);

  const isCompliant = complianceErrors.length === 0;
  const totalIssues = complianceErrors.length + complianceWarnings.length;

  return (
    <div className="app-container">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <Onboarding onClose={() => setShowOnboarding(false)} />
      )}

      {/* Campaign Generator Modal */}
      {showCampaignGenerator && (
        <CampaignGenerator onClose={() => setShowCampaignGenerator(false)} />
      )}

      {/* Top Toolbar */}
      <Toolbar onOpenCampaign={() => setShowCampaignGenerator(true)} />

      {/* Main Workspace */}
      <div className="workspace">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Canvas Workspace */}
        <div className="canvas-workspace">
          <CanvasEditor />
        </div>

        {/* Right Properties Panel */}
        <PropertiesPanel />
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        <div className="flex items-center gap-2">
          <span>Zoom: {zoomLevel}%</span>
        </div>

        <div className="flex-1" />

        <div className={`compliance-indicator ${isCompliant ? 'compliant' : 'has-errors'}`}>
          <span className={`compliance-dot ${isCompliant ? 'success' : 'error'}`} />
          {isCompliant ? 'Compliant' : `${totalIssues} issue${totalIssues !== 1 ? 's' : ''}`}
        </div>

        <div className="flex items-center gap-4 ml-4">
          <span className="text-muted">⌘Z Undo</span>
          <span className="text-muted">⌫ Delete</span>
          <span className="text-muted">⌘E Export</span>
        </div>
      </div>
    </div>
  );
}

export default App;
