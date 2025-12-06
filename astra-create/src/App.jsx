import './index.css';
import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import CanvasEditor from './components/CanvasEditor';
import PropertiesPanel from './components/PropertiesPanel';
import Toolbar from './components/Toolbar';
import Onboarding from './components/Onboarding';
import AIAssistant from './components/AIAssistant';
import CampaignGenerator from './components/CampaignGenerator';
import useStore from './store/useStore';

function App() {
  const { showOnboarding, setShowOnboarding, canvas, saveToHistory } = useStore();
  const [showCampaignGenerator, setShowCampaignGenerator] = useState(false);

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

  // Expose campaign generator to toolbar
  useEffect(() => {
    window.openCampaignGenerator = () => setShowCampaignGenerator(true);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-950">
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

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Canvas Workspace */}
        <CanvasEditor />

        {/* Right Properties Panel */}
        <PropertiesPanel />
      </div>

      {/* AI Assistant (Floating) */}
      <AIAssistant />
    </div>
  );
}

export default App;
