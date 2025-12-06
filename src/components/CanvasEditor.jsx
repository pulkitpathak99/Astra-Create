import React, { useEffect, useRef } from 'react';
import { Canvas, Rect } from 'fabric';
import useStore, { FORMAT_PRESETS, COMPLIANCE_RULES } from '../store/useStore';

export function CanvasEditor() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const {
    setCanvas,
    currentFormat,
    backgroundColor,
    setSelectedObject,
    saveToHistory,
    updateLayers,
  } = useStore();

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const format = FORMAT_PRESETS[currentFormat];
    const scale = 0.45; // Scale to fit workspace

    const canvas = new Canvas(canvasRef.current, {
      width: format.width * scale,
      height: format.height * scale,
      backgroundColor: backgroundColor,
      selection: true,
      preserveObjectStacking: true,
    });

    // Set zoom to simulate larger canvas
    canvas.setZoom(scale);
    canvas.setDimensions({
      width: format.width * scale,
      height: format.height * scale,
    });

    // Add safe zones for story formats
    if (format.ratio === '9:16') {
      const topZone = new Rect({
        left: 0,
        top: 0,
        width: format.width,
        height: COMPLIANCE_RULES.safeZones.story.top,
        fill: 'rgba(239, 68, 68, 0.1)',
        stroke: 'rgba(239, 68, 68, 0.3)',
        strokeWidth: 1,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        isSafeZone: true,
      });

      const bottomZone = new Rect({
        left: 0,
        top: format.height - COMPLIANCE_RULES.safeZones.story.bottom,
        width: format.width,
        height: COMPLIANCE_RULES.safeZones.story.bottom,
        fill: 'rgba(239, 68, 68, 0.1)',
        stroke: 'rgba(239, 68, 68, 0.3)',
        strokeWidth: 1,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        isSafeZone: true,
      });

      canvas.add(topZone, bottomZone);
    }

    // Event handlers
    canvas.on('selection:created', (e) => {
      setSelectedObject(e.selected?.[0] || null);
    });

    canvas.on('selection:updated', (e) => {
      setSelectedObject(e.selected?.[0] || null);
    });

    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });

    canvas.on('object:modified', () => {
      saveToHistory();
      updateLayers();
    });

    canvas.on('object:added', () => {
      updateLayers();
    });

    canvas.on('object:removed', () => {
      updateLayers();
    });

    setCanvas(canvas);
    saveToHistory();

    return () => {
      canvas.dispose();
    };
  }, [currentFormat]);

  // Update background color
  useEffect(() => {
    const canvas = useStore.getState().canvas;
    if (canvas) {
      canvas.backgroundColor = backgroundColor;
      canvas.renderAll();
    }
  }, [backgroundColor]);

  return (
    <div
      ref={containerRef}
      className="canvas-workspace"
    >
      <div className="canvas-container">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

export default CanvasEditor;
