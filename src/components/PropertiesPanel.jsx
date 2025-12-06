import React, { useEffect, useCallback } from 'react';
import useStore, { FORMAT_PRESETS } from '../store/useStore';
import useCompliance from '../hooks/useCompliance';

export function PropertiesPanel() {
    const {
        canvas, selectedObject, layers,
        complianceErrors, complianceWarnings,
    } = useStore();
    const { runFullCompliance } = useCompliance();

    // Run compliance on changes
    useEffect(() => {
        if (canvas) {
            const timer = setTimeout(() => runFullCompliance(), 300);
            return () => clearTimeout(timer);
        }
    }, [canvas, selectedObject, runFullCompliance]);

    const allIssues = [...complianceErrors, ...complianceWarnings];

    // Update object property
    const updateProperty = useCallback((prop, value) => {
        if (!selectedObject || !canvas) return;
        selectedObject.set(prop, value);
        canvas.renderAll();
        useStore.getState().saveToHistory();
    }, [selectedObject, canvas]);

    // Render property controls based on selection
    const renderPropertyControls = () => {
        if (!selectedObject) {
            return (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-[var(--surface-elevated)] flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                        </svg>
                    </div>
                    <p className="text-sm text-secondary">Select an element</p>
                    <p className="text-xs text-muted mt-1">to edit its properties</p>
                </div>
            );
        }

        const isText = selectedObject.type === 'i-text' || selectedObject.type === 'text';
        const isImage = selectedObject.type === 'image';

        return (
            <div className="space-y-5 animate-slide-in-up">
                {/* Object Info */}
                <div className="section">
                    <div className="section-header">
                        <span className="section-title">Selection</span>
                        <span className="badge badge-info">{selectedObject.customName || selectedObject.type}</span>
                    </div>
                </div>

                {/* Position & Size */}
                <div className="section">
                    <span className="section-title">Transform</span>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                            <label className="text-[10px] text-muted block mb-1">X</label>
                            <input
                                type="number"
                                value={Math.round(selectedObject.left || 0)}
                                onChange={(e) => updateProperty('left', parseFloat(e.target.value))}
                                className="input input-sm"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-muted block mb-1">Y</label>
                            <input
                                type="number"
                                value={Math.round(selectedObject.top || 0)}
                                onChange={(e) => updateProperty('top', parseFloat(e.target.value))}
                                className="input input-sm"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-muted block mb-1">Width</label>
                            <input
                                type="number"
                                value={Math.round((selectedObject.width || 0) * (selectedObject.scaleX || 1))}
                                onChange={(e) => {
                                    const newScale = parseFloat(e.target.value) / (selectedObject.width || 1);
                                    updateProperty('scaleX', newScale);
                                }}
                                className="input input-sm"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-muted block mb-1">Height</label>
                            <input
                                type="number"
                                value={Math.round((selectedObject.height || 0) * (selectedObject.scaleY || 1))}
                                onChange={(e) => {
                                    const newScale = parseFloat(e.target.value) / (selectedObject.height || 1);
                                    updateProperty('scaleY', newScale);
                                }}
                                className="input input-sm"
                            />
                        </div>
                    </div>

                    {/* Rotation */}
                    <div className="mt-3">
                        <label className="text-[10px] text-muted block mb-1">Rotation</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="0"
                                max="360"
                                value={selectedObject.angle || 0}
                                onChange={(e) => updateProperty('angle', parseFloat(e.target.value))}
                                className="flex-1"
                            />
                            <span className="text-xs text-secondary w-12 text-right">{Math.round(selectedObject.angle || 0)}°</span>
                        </div>
                    </div>

                    {/* Opacity */}
                    <div className="mt-3">
                        <label className="text-[10px] text-muted block mb-1">Opacity</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={selectedObject.opacity ?? 1}
                                onChange={(e) => updateProperty('opacity', parseFloat(e.target.value))}
                                className="flex-1"
                            />
                            <span className="text-xs text-secondary w-12 text-right">{Math.round((selectedObject.opacity ?? 1) * 100)}%</span>
                        </div>
                    </div>
                </div>

                {/* Text Properties */}
                {isText && (
                    <div className="section">
                        <span className="section-title">Typography</span>

                        {/* Font Size */}
                        <div className="mt-2">
                            <label className="text-[10px] text-muted block mb-1">Font Size</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min="12"
                                    max="144"
                                    value={selectedObject.fontSize || 40}
                                    onChange={(e) => updateProperty('fontSize', parseInt(e.target.value))}
                                    className="flex-1"
                                />
                                <span className="text-xs text-secondary w-12 text-right">{selectedObject.fontSize || 40}px</span>
                            </div>
                        </div>

                        {/* Font Weight */}
                        <div className="mt-3">
                            <label className="text-[10px] text-muted block mb-1">Weight</label>
                            <div className="flex gap-1">
                                {['normal', '500', 'bold'].map(w => (
                                    <button
                                        key={w}
                                        onClick={() => updateProperty('fontWeight', w)}
                                        className={`flex-1 py-1.5 text-xs rounded transition-all ${selectedObject.fontWeight === w
                                            ? 'bg-[var(--accent-primary)] text-white'
                                            : 'bg-[var(--surface-elevated)] text-secondary hover:bg-[var(--surface-overlay)]'
                                            }`}
                                    >
                                        {w === 'normal' ? 'Light' : w === '500' ? 'Medium' : 'Bold'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Text Align */}
                        <div className="mt-3">
                            <label className="text-[10px] text-muted block mb-1">Alignment</label>
                            <div className="flex gap-1">
                                {['left', 'center', 'right'].map(align => (
                                    <button
                                        key={align}
                                        onClick={() => updateProperty('textAlign', align)}
                                        className={`flex-1 py-1.5 rounded transition-all ${selectedObject.textAlign === align
                                            ? 'bg-[var(--accent-primary)] text-white'
                                            : 'bg-[var(--surface-elevated)] text-secondary hover:bg-[var(--surface-overlay)]'
                                            }`}
                                    >
                                        <svg className="w-4 h-4 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                                            {align === 'left' && <path d="M3 4h18v2H3V4zm0 4h10v2H3V8zm0 4h18v2H3v-2zm0 4h10v2H3v-2z" />}
                                            {align === 'center' && <path d="M3 4h18v2H3V4zm4 4h10v2H7V8zm-4 4h18v2H3v-2zm4 4h10v2H7v-2z" />}
                                            {align === 'right' && <path d="M3 4h18v2H3V4zm8 4h10v2H11V8zm-8 4h18v2H3v-2zm8 4h10v2H11v-2z" />}
                                        </svg>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Text Color */}
                        <div className="mt-3">
                            <label className="text-[10px] text-muted block mb-1">Color</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={selectedObject.fill || '#000000'}
                                    onChange={(e) => updateProperty('fill', e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer border-0"
                                />
                                <input
                                    type="text"
                                    value={selectedObject.fill || '#000000'}
                                    onChange={(e) => updateProperty('fill', e.target.value)}
                                    className="input input-sm flex-1 uppercase"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="section">
                    <span className="section-title">Actions</span>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <button
                            onClick={() => {
                                if (canvas && selectedObject) {
                                    canvas.bringObjectForward(selectedObject);
                                    canvas.renderAll();
                                }
                            }}
                            className="btn btn-secondary text-xs"
                        >
                            ↑ Forward
                        </button>
                        <button
                            onClick={() => {
                                if (canvas && selectedObject) {
                                    canvas.sendObjectBackwards(selectedObject);
                                    canvas.renderAll();
                                }
                            }}
                            className="btn btn-secondary text-xs"
                        >
                            ↓ Back
                        </button>
                        <button
                            onClick={() => {
                                if (canvas && selectedObject) {
                                    const clone = selectedObject.clone();
                                    clone.then(cloned => {
                                        cloned.set({ left: cloned.left + 20, top: cloned.top + 20 });
                                        canvas.add(cloned);
                                        canvas.setActiveObject(cloned);
                                        canvas.renderAll();
                                        useStore.getState().saveToHistory();
                                    });
                                }
                            }}
                            className="btn btn-secondary text-xs"
                        >
                            ⎘ Duplicate
                        </button>
                        <button
                            onClick={() => {
                                if (canvas && selectedObject) {
                                    canvas.remove(selectedObject);
                                    canvas.discardActiveObject();
                                    canvas.renderAll();
                                    useStore.getState().saveToHistory();
                                    useStore.getState().updateLayers();
                                }
                            }}
                            className="btn btn-danger text-xs"
                        >
                            ✕ Delete
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <aside className="properties-panel">
            <div className="properties-header">
                <h2>Properties</h2>
            </div>

            <div className="properties-content">
                {renderPropertyControls()}
            </div>

            {/* Layers */}
            <div className="border-t border-[var(--border-subtle)] p-4">
                <div className="section-header mb-2">
                    <span className="section-title">Layers</span>
                    <span className="text-xs text-muted">{layers.length}</span>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                    {layers.length === 0 ? (
                        <p className="text-xs text-muted py-2">No layers yet</p>
                    ) : (
                        layers.map((layer, i) => (
                            <button
                                key={layer.id}
                                onClick={() => canvas?.setActiveObject(layer.object)}
                                className={`w-full px-2 py-1.5 rounded text-xs text-left flex items-center gap-2 transition-all ${selectedObject === layer.object
                                    ? 'bg-[var(--accent-primary)]/20 text-primary border border-[var(--accent-primary)]/30'
                                    : 'bg-[var(--surface-elevated)] text-secondary hover:bg-[var(--surface-overlay)]'
                                    }`}
                            >
                                <span className="w-4 text-muted">{layers.length - i}</span>
                                <span className="truncate flex-1">{layer.name}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Compliance */}
            {allIssues.length > 0 && (
                <div className="border-t border-[var(--border-subtle)] p-4 bg-[var(--error)]/5">
                    <div className="section-header mb-2">
                        <span className="section-title text-error">Compliance</span>
                        <span className="badge badge-error">{allIssues.length}</span>
                    </div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {allIssues.map(issue => (
                            <div
                                key={issue.id}
                                className={`p-2 rounded text-xs border-l-2 ${issue.severity === 'error'
                                    ? 'bg-[var(--error)]/10 border-[var(--error)]'
                                    : 'bg-[var(--warning)]/10 border-[var(--warning)]'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={issue.severity === 'error' ? 'text-error font-medium' : 'text-warning font-medium'}>
                                        {issue.title}
                                    </span>
                                    <span className="text-[8px] text-muted uppercase">{issue.type}</span>
                                </div>
                                <p className="text-secondary mt-0.5 leading-tight">{issue.message}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </aside>
    );
}

export default PropertiesPanel;
