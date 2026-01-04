import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, Rect } from 'fabric';
import useStore, { FORMAT_PRESETS } from '../store/useStore';
import { COMPLIANCE_RULES } from '../hooks/useCompliance';
import { CanvasControls } from './CanvasControls';

export function CanvasEditor({ onOpenWizard }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [isAutoFit, setIsAutoFit] = useState(true);
  const emptyStateDismissedRef = useRef(false);

  const {
    setCanvas,
    currentFormat,
    backgroundColor,
    setSelectedObject,
    saveToHistory,
    updateLayers,
    canvas,
    setZoomLevel,
    zoomLevel
  } = useStore();

  // Dismiss empty state permanently
  const dismissEmptyState = useCallback(() => {
    emptyStateDismissedRef.current = true;
    setShowEmptyState(false);
  }, []);

  // Check if canvas has user content
  const checkEmpty = useCallback(() => {
    if (emptyStateDismissedRef.current) return;
    const c = useStore.getState().canvas;
    if (c) {
      const userObjects = c.getObjects().filter(o => !o.isSafeZone && !o.isGridLine);
      if (userObjects.length > 0) {
        dismissEmptyState();
      }
    }
  }, [dismissEmptyState]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const format = FORMAT_PRESETS[currentFormat];

    const canvasInstance = new Canvas(canvasRef.current, {
      width: format.width,
      height: format.height,
      backgroundColor: backgroundColor,
      selection: true,
      preserveObjectStacking: true,
      controlsAboveOverlay: true,
    });

    // Add safe zones for story formats
    if (format.ratio === '9:16') {
      const topZone = new Rect({
        left: 0, top: 0,
        width: format.width,
        height: COMPLIANCE_RULES.safeZones.story.top,
        fill: 'rgba(239, 68, 68, 0.05)',
        stroke: 'rgba(239, 68, 68, 0.2)',
        strokeWidth: 1, strokeDashArray: [5, 5],
        selectable: false, evented: false,
        isSafeZone: true,
      });

      const bottomZone = new Rect({
        left: 0,
        top: format.height - COMPLIANCE_RULES.safeZones.story.bottom,
        width: format.width,
        height: COMPLIANCE_RULES.safeZones.story.bottom,
        fill: 'rgba(239, 68, 68, 0.05)',
        stroke: 'rgba(239, 68, 68, 0.2)',
        strokeWidth: 1, strokeDashArray: [5, 5],
        selectable: false, evented: false,
        isSafeZone: true,
      });

      canvasInstance.add(topZone, bottomZone);
    }

    // Event handlers
    const handleSelection = (e) => setSelectedObject(e.selected?.[0] || null);
    const handleUpdate = () => { saveToHistory(); updateLayers(); };
    const handleChange = () => { updateLayers(); checkEmpty(); };

    canvasInstance.on('selection:created', handleSelection);
    canvasInstance.on('selection:updated', handleSelection);
    canvasInstance.on('selection:cleared', () => setSelectedObject(null));
    canvasInstance.on('object:modified', handleUpdate);
    canvasInstance.on('object:added', handleChange);
    canvasInstance.on('object:removed', handleChange);

    setCanvas(canvasInstance);
    saveToHistory();
    setIsAutoFit(true); // Reset auto-fit on format change

    return () => {
      canvasInstance.dispose();
    };
  }, [currentFormat]);

  // Handle Background Color
  useEffect(() => {
    if (canvas) {
      canvas.backgroundColor = backgroundColor;
      canvas.renderAll();
    }
  }, [backgroundColor, canvas]);

  // Responsive Scaling & Auto-Fit
  useEffect(() => {
    if (!containerRef.current || !canvas) return;

    const handleResize = () => {
      if (!isAutoFit) return; // Don't auto-resize if user manually zoomed

      const container = containerRef.current;
      // Safety check: ensure container and canvas exist and are mounted
      if (!container || !canvas || !canvas.lowerCanvasEl) return;

      const format = FORMAT_PRESETS[currentFormat];
      const padding = 80; // More breathing room

      if (container.clientWidth === 0 || container.clientHeight === 0) return;

      const availableWidth = container.clientWidth - padding;
      const availableHeight = container.clientHeight - padding;

      const scaleX = Math.max(0.1, availableWidth / format.width);
      const scaleY = Math.max(0.1, availableHeight / format.height);
      const scale = Math.min(scaleX, scaleY, 0.85); // Cap at 85% for nice margins

      canvas.setZoom(scale);
      canvas.setDimensions({
        width: format.width * scale,
        height: format.height * scale
      });

      setZoomLevel(Math.round(scale * 100));
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    // Initial call
    handleResize();

    return () => resizeObserver.disconnect();
  }, [canvas, currentFormat, setZoomLevel, isAutoFit]);

  // Zoom Controls
  const handleZoom = (delta) => {
    if (!canvas) return;
    setIsAutoFit(false); // Disable auto-fit on manual zoom

    let zoom = canvas.getZoom();
    const newZoom = Math.max(0.1, Math.min(4, zoom + delta));

    canvas.setZoom(newZoom);
    canvas.setDimensions({
      width: FORMAT_PRESETS[currentFormat].width * newZoom,
      height: FORMAT_PRESETS[currentFormat].height * newZoom
    });
    setZoomLevel(Math.round(newZoom * 100));
  };

  const handleFit = () => {
    setIsAutoFit(true); // Re-enable auto-fit which triggers the effect
  };

  return (
    <div ref={containerRef} className="canvas-workspace relative bg-[#0a0d12] flex items-center justify-center overflow-auto w-full h-full">

      {/* Canvas Container - min size ensures scrollability when zoomed */}
      <div className="canvas-container shadow-2xl rounded-sm transition-all duration-300 ease-out relative z-10 m-auto shrink-0">
        <canvas ref={canvasRef} />
      </div>

      {/* Empty State Overlay */}
      {showEmptyState && (
        <div className="fixed inset-0 flex items-center justify-center z-40 bg-black/60 backdrop-blur-sm">
          <div className="text-center p-8 rounded-2xl bg-[#12161c] border border-white/10 shadow-2xl w-[90%] max-w-md animate-slide-in-up">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
              <span className="text-3xl">🎨</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Start Creating</h3>
            <p className="text-slate-400 text-sm mb-6">
              Your canvas is ready. Add elements from the sidebar or use AI.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  dismissEmptyState();
                  onOpenWizard?.();
                }}
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-500/20"
              >
                ✨ Start with AI
              </button>
              <button
                onClick={dismissEmptyState}
                className="w-full py-3 px-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-medium text-sm transition-all"
              >
                Build Manually →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Canvas Controls */}
      {!showEmptyState && (
        <CanvasControls
          onFit={handleFit}
          onZoomIn={() => handleZoom(0.1)}
          onZoomOut={() => handleZoom(-0.1)}
          zoomLevel={zoomLevel}
        />
      )}

      {/* Format Label */}
      <div className="absolute top-6 left-6 px-3 py-1.5 rounded-lg bg-[#1a1f28]/80 backdrop-blur border border-white/5 text-xs text-slate-400 font-medium select-none pointer-events-none z-20">
        {FORMAT_PRESETS[currentFormat]?.name}
      </div>

    </div>
  );
}

export default CanvasEditor;
