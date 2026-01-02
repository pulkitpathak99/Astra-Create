import React, { useEffect, useCallback, useState } from 'react';
import useStore, { FORMAT_PRESETS, COMPLIANCE_RULES } from '../store/useStore';
import useCompliance from '../hooks/useCompliance';

export function PropertiesPanel() {
    const {
        canvas, selectedObject, layers,
        complianceErrors, complianceWarnings,
        saveToHistory, updateLayers,
    } = useStore();
    const { runFullCompliance } = useCompliance();
    const [fixedCount, setFixedCount] = useState(0);
    const [showFixedBanner, setShowFixedBanner] = useState(false);

    // Run compliance on changes
    useEffect(() => {
        if (canvas) {
            const timer = setTimeout(() => runFullCompliance(), 300);
            return () => clearTimeout(timer);
        }
    }, [canvas, selectedObject, runFullCompliance]);

    const allIssues = [...complianceErrors, ...complianceWarnings];
    const errorCount = complianceErrors.length;

    // AUTO-FIX ALL - One Click Fix
    const autoFixAll = useCallback(async () => {
        if (!canvas) return;

        let fixed = 0;
        const objects = canvas.getObjects();
        const minFontSize = COMPLIANCE_RULES?.minFontSize?.standard || 20;

        objects.forEach(obj => {
            if (obj.isSafeZone || obj.isBackground) return;

            // Fix: Font size too small
            if ((obj.type === 'i-text' || obj.type === 'text') && !obj.isValueTile && !obj.isDrinkaware && !obj.isTag) {
                if (obj.fontSize && obj.fontSize < minFontSize) {
                    obj.set('fontSize', minFontSize);
                    fixed++;
                }
            }
        });

        // Add headline if missing
        const hasHeadline = objects.some(o =>
            (o.type === 'i-text' || o.type === 'text') &&
            o.fontSize >= 48 &&
            !o.isValueTile && !o.isDrinkaware && !o.isTag
        );

        if (!hasHeadline) {
            const { IText } = await import('fabric');
            const format = FORMAT_PRESETS[useStore.getState().currentFormat];
            const headline = new IText('Your Headline Here', {
                left: format.width / 2,
                top: format.height * 0.3,
                originX: 'center',
                originY: 'center',
                fontFamily: 'Inter, sans-serif',
                fontSize: 64,
                fontWeight: 'bold',
                fill: '#ffffff',
                textAlign: 'center',
                customName: 'Auto-Added Headline',
            });
            canvas.add(headline);
            fixed++;
        }

        canvas.renderAll();
        saveToHistory();
        updateLayers();

        setFixedCount(fixed);
        setShowFixedBanner(true);
        setTimeout(() => setShowFixedBanner(false), 3000);
        setTimeout(() => runFullCompliance(), 100);
    }, [canvas, saveToHistory, updateLayers, runFullCompliance]);

    // Update object property
    const updateProperty = useCallback((prop, value) => {
        if (!selectedObject || !canvas) return;
        selectedObject.set(prop, value);
        canvas.renderAll();
        useStore.getState().saveToHistory();
    }, [selectedObject, canvas]);

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

        return (
            <div className="space-y-4 animate-slide-in-up">
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
                            <input type="number" value={Math.round(selectedObject.left || 0)} onChange={(e) => updateProperty('left', parseFloat(e.target.value))} className="input input-sm" />
                        </div>
                        <div>
                            <label className="text-[10px] text-muted block mb-1">Y</label>
                            <input type="number" value={Math.round(selectedObject.top || 0)} onChange={(e) => updateProperty('top', parseFloat(e.target.value))} className="input input-sm" />
                        </div>
                        <div>
                            <label className="text-[10px] text-muted block mb-1">Width</label>
                            <input type="number" value={Math.round((selectedObject.width || 0) * (selectedObject.scaleX || 1))} onChange={(e) => updateProperty('scaleX', parseFloat(e.target.value) / (selectedObject.width || 1))} className="input input-sm" />
                        </div>
                        <div>
                            <label className="text-[10px] text-muted block mb-1">Height</label>
                            <input type="number" value={Math.round((selectedObject.height || 0) * (selectedObject.scaleY || 1))} onChange={(e) => updateProperty('scaleY', parseFloat(e.target.value) / (selectedObject.height || 1))} className="input input-sm" />
                        </div>
                    </div>
                </div>

                {/* Rotation & Opacity */}
                <div className="section">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] text-muted block mb-1">Rotation</label>
                            <input type="number" value={Math.round(selectedObject.angle || 0)} onChange={(e) => updateProperty('angle', parseFloat(e.target.value))} className="input input-sm" />
                        </div>
                        <div>
                            <label className="text-[10px] text-muted block mb-1">Opacity</label>
                            <input type="range" min="0" max="1" step="0.1" value={selectedObject.opacity || 1} onChange={(e) => updateProperty('opacity', parseFloat(e.target.value))} className="w-full accent-[var(--accent-primary)]" />
                        </div>
                    </div>
                </div>

                {/* Text Properties */}
                {isText && (
                    <div className="section">
                        <span className="section-title">Typography</span>
                        <div className="space-y-2 mt-2">
                            <div>
                                <label className="text-[10px] text-muted block mb-1">Font Size</label>
                                <input type="number" value={selectedObject.fontSize || 16} onChange={(e) => updateProperty('fontSize', parseInt(e.target.value))} className="input input-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] text-muted block mb-1">Color</label>
                                <input type="color" value={selectedObject.fill || '#000000'} onChange={(e) => updateProperty('fill', e.target.value)} className="w-full h-8 rounded cursor-pointer" />
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => updateProperty('fontWeight', selectedObject.fontWeight === 'bold' ? 'normal' : 'bold')} className={`flex-1 py-1 px-2 rounded text-xs ${selectedObject.fontWeight === 'bold' ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--surface-elevated)]'}`}><strong>B</strong></button>
                                <button onClick={() => updateProperty('fontStyle', selectedObject.fontStyle === 'italic' ? 'normal' : 'italic')} className={`flex-1 py-1 px-2 rounded text-xs ${selectedObject.fontStyle === 'italic' ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--surface-elevated)]'}`}><em>I</em></button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="section">
                    <span className="section-title">Actions</span>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        <button onClick={() => { canvas.bringObjectForward(selectedObject); canvas.renderAll(); }} className="btn btn-ghost text-xs py-1">↑ Forward</button>
                        <button onClick={() => { canvas.sendObjectBackwards(selectedObject); canvas.renderAll(); }} className="btn btn-ghost text-xs py-1">↓ Back</button>
                        <button onClick={() => { canvas.remove(selectedObject); canvas.renderAll(); saveToHistory(); }} className="btn btn-ghost text-xs py-1 text-error">✕ Delete</button>
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
                <div className="space-y-1 max-h-28 overflow-y-auto">
                    {layers.length === 0 ? (
                        <p className="text-xs text-muted py-2">No layers yet</p>
                    ) : (
                        layers.map((layer, i) => (
                            <button
                                key={layer.id}
                                onClick={() => canvas?.setActiveObject(layer.object)}
                                className={`w-full px-2 py-1 rounded text-xs text-left flex items-center gap-2 transition-all ${selectedObject === layer.object ? 'bg-[var(--accent-primary)]/20 text-primary' : 'bg-[var(--surface-elevated)] text-secondary hover:bg-[var(--surface-overlay)]'}`}
                            >
                                <span className="w-4 text-muted">{layers.length - i}</span>
                                <span className="truncate flex-1">{layer.name}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Fixed Banner */}
            {showFixedBanner && (
                <div className="border-t border-green-500/30 p-3 bg-green-500/10 animate-fade-in">
                    <div className="flex items-center gap-2 text-green-400">
                        <span>✅</span>
                        <span className="text-sm font-medium">Fixed {fixedCount} issue{fixedCount !== 1 ? 's' : ''}!</span>
                    </div>
                </div>
            )}

            {/* Compliance */}
            {allIssues.length > 0 && (
                <div className="border-t border-[var(--border-subtle)] p-4 bg-[var(--error)]/5">
                    <div className="section-header mb-2">
                        <span className="section-title text-error">Compliance</span>
                        <span className="badge badge-error">{allIssues.length}</span>
                    </div>

                    {/* Auto-Fix Button */}
                    {errorCount > 0 && (
                        <button onClick={autoFixAll} className="w-full mb-3 py-2 px-3 rounded-lg text-sm font-medium transition-all" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white' }}>
                            ✨ Auto-Fix All Issues
                        </button>
                    )}

                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {allIssues.map(issue => (
                            <div key={issue.id} className={`p-2 rounded text-xs border-l-2 ${issue.severity === 'error' ? 'bg-[var(--error)]/10 border-[var(--error)]' : 'bg-[var(--warning)]/10 border-[var(--warning)]'}`}>
                                <div className="flex items-center justify-between">
                                    <span className={issue.severity === 'error' ? 'text-error font-medium' : 'text-warning font-medium'}>{issue.title}</span>
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
