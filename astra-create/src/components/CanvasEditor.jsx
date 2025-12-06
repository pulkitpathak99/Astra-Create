import { useEffect, useRef } from 'react';
import { Canvas, Rect } from 'fabric';
import useStore, { FORMAT_PRESETS } from '../store/useStore';

const SCALE_FACTOR = 0.45;

export function CanvasEditor() {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  
  const { 
    setCanvas, 
    canvas,
    currentFormat, 
    backgroundColor,
    setSelectedObject,
    saveToHistory,
    updateLayers,
  } = useStore();

  const format = FORMAT_PRESETS[currentFormat];
  const displayWidth = format.width * SCALE_FACTOR;
  const displayHeight = format.height * SCALE_FACTOR;

  // Initialize or recreate canvas when format changes
  useEffect(() => {
    if (fabricRef.current) {
      fabricRef.current.dispose();
    }

    const fabricCanvas = new Canvas(canvasRef.current, {
      width: displayWidth,
      height: displayHeight,
      backgroundColor: backgroundColor,
      selection: true,
      preserveObjectStacking: true,
    });

    fabricCanvas.setZoom(SCALE_FACTOR);

    // Add safe zones for story formats
    if (format.ratio === '9:16') {
      addSafeZones(fabricCanvas, format);
    }

    // Event listeners
    fabricCanvas.on('selection:created', (e) => {
      setSelectedObject(e.selected[0]);
    });
    fabricCanvas.on('selection:updated', (e) => {
      setSelectedObject(e.selected[0]);
    });
    fabricCanvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });
    fabricCanvas.on('object:modified', () => {
      saveToHistory();
      updateLayers();
    });
    fabricCanvas.on('object:added', () => {
      updateLayers();
    });
    fabricCanvas.on('object:removed', () => {
      updateLayers();
    });

    fabricRef.current = fabricCanvas;
    setCanvas(fabricCanvas);
    saveToHistory();

    return () => {
      fabricCanvas.dispose();
    };
  }, [currentFormat]);

  // Update background color
  useEffect(() => {
    if (fabricRef.current) {
      fabricRef.current.backgroundColor = backgroundColor;
      fabricRef.current.renderAll();
    }
  }, [backgroundColor]);

  const addSafeZones = (fabricCanvas, fmt) => {
    const topZone = new Rect({
      left: 0, top: 0,
      width: fmt.width, height: 200,
      fill: 'rgba(229, 28, 35, 0.12)',
      stroke: 'rgba(229, 28, 35, 0.4)',
      strokeWidth: 2,
      strokeDashArray: [8, 4],
      selectable: false,
      evented: false,
      isSafeZone: true,
      excludeFromExport: true,
    });

    const bottomZone = new Rect({
      left: 0, top: fmt.height - 250,
      width: fmt.width, height: 250,
      fill: 'rgba(229, 28, 35, 0.12)',
      stroke: 'rgba(229, 28, 35, 0.4)',
      strokeWidth: 2,
      strokeDashArray: [8, 4],
      selectable: false,
      evented: false,
      isSafeZone: true,
      excludeFromExport: true,
    });

    fabricCanvas.add(topZone, bottomZone);
    fabricCanvas.sendObjectToBack(bottomZone);
    fabricCanvas.sendObjectToBack(topZone);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gray-900/50 overflow-auto p-6 relative">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-30" 
           style={{
             backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
             backgroundSize: '20px 20px',
           }} />
      
      {/* Canvas container */}
      <div 
        className="relative bg-white shadow-2xl"
        style={{ 
          width: displayWidth,
          height: displayHeight,
          boxShadow: '0 25px 80px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)',
        }}
      >
        <canvas ref={canvasRef} />
        
        {/* Format badge */}
        <div className="absolute -top-8 left-0 flex items-center gap-2 text-xs text-white/60">
          <span className="px-2 py-1 bg-white/10 rounded">{format.name}</span>
          <span>{format.width}×{format.height}</span>
          <span className="text-white/40">{format.ratio}</span>
        </div>

        {/* Safe zone labels for story */}
        {format.ratio === '9:16' && (
          <>
            <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] text-red-400/80 font-medium z-10">
              ⚠ SAFE ZONE - No text/logos
            </div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-red-400/80 font-medium z-10">
              ⚠ SAFE ZONE - No text/logos
            </div>
          </>
        )}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="absolute bottom-4 left-4 text-xs text-white/30 space-y-1">
        <div><kbd className="px-1 py-0.5 bg-white/10 rounded">⌘Z</kbd> Undo</div>
        <div><kbd className="px-1 py-0.5 bg-white/10 rounded">⌫</kbd> Delete</div>
      </div>
    </div>
  );
}

export default CanvasEditor;
