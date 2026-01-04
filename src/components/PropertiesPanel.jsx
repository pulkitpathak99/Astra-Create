import React, { useEffect, useCallback, useState } from 'react';
import useStore, { FORMAT_PRESETS } from '../store/useStore';
import useCompliance, { COMPLIANCE_RULES } from '../hooks/useCompliance';
import openRouterService from '../services/openRouterService';

export function PropertiesPanel() {
    const {
        canvas, selectedObject, layers,
        complianceErrors, complianceWarnings,
        saveToHistory, updateLayers,
    } = useStore();
    const { runFullCompliance } = useCompliance();
    const [fixedCount, setFixedCount] = useState(0);
    const [showFixedBanner, setShowFixedBanner] = useState(false);
    const [isFixing, setIsFixing] = useState(false);
    const [fixStatus, setFixStatus] = useState('');

    // Run compliance on changes
    useEffect(() => {
        if (canvas) {
            const timer = setTimeout(() => runFullCompliance(), 300);
            return () => clearTimeout(timer);
        }
    }, [canvas, selectedObject, runFullCompliance]);

    const allIssues = [...complianceErrors, ...complianceWarnings];
    const errorCount = complianceErrors.length;

    // AUTO-FIX ALL - AI Powered One Click Fix
    const autoFixAll = useCallback(async () => {
        if (!canvas) return;

        setIsFixing(true);
        setFixStatus('🔍 AI analyzing canvas...');

        try {
            const dataUrl = canvas.toDataURL({
                format: 'jpeg',
                quality: 0.8
            });

            const currentFormat = useStore.getState().currentFormat;
            const format = FORMAT_PRESETS[currentFormat];
            const objects = canvas.getObjects().filter(o => !o.isSafeZone && !o.isBackground);
            
            // Map objects to a simpler format for AI
            const objectData = objects.map(obj => ({
                id: obj.id || `obj-${Math.random().toString(36).substr(2, 9)}`,
                type: obj.type,
                text: obj.text || obj.headline || '',
                left: obj.left,
                top: obj.top,
                fontSize: obj.fontSize,
                fill: obj.fill,
                customName: obj.customName,
                isPackshot: obj.isPackshot,
                isValueTile: obj.isValueTile,
                isDrinkaware: obj.isDrinkaware,
                isTag: obj.isTag,
                _original: obj // Keep reference to apply updates
            }));

            // Assign IDs if missing
            objectData.forEach(od => {
                if (!od._original.id) od._original.set('id', od.id);
            });

            setFixStatus('🪄 AI applying fixes...');
            const result = await openRouterService.autoFixCompliance(
                dataUrl,
                [...complianceErrors, ...complianceWarnings],
                objectData,
                format
            );

            let fixed = 0;
            if (result.fixes && result.fixes.length > 0) {
                result.fixes.forEach(fix => {
                    const obj = objects.find(o => o.id === fix.id);
                    if (obj) {
                        if (fix.updates) {
                            Object.entries(fix.updates).forEach(([prop, value]) => {
                                obj.set(prop, value);
                            });
                            fixed++;
                        }
                    }
                });
            }

            canvas.renderAll();
            saveToHistory();
            updateLayers();

            setFixedCount(fixed);
            setShowFixedBanner(true);
            setTimeout(() => setShowFixedBanner(false), 3000);
            setTimeout(() => runFullCompliance(), 100);
        } catch (error) {
            console.error('AI Auto-fix failed:', error);
        } finally {
            setIsFixing(false);
            setFixStatus('');
        }
    }, [canvas, complianceErrors, complianceWarnings, saveToHistory, updateLayers, runFullCompliance]);

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
                        <button 
                            onClick={autoFixAll} 
                            disabled={isFixing}
                            className={`w-full mb-3 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${isFixing ? 'opacity-70 cursor-not-allowed' : ''}`} 
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white' }}
                        >
                            {isFixing ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>{fixStatus || 'Fixing...'}</span>
                                </>
                            ) : (
                                <>✨ Auto-Fix All Issues</>
                            )}
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
