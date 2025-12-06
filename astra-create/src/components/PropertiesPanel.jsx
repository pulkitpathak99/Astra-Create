import { useEffect, useState } from 'react';
import useStore from '../store/useStore';
import useCompliance from '../hooks/useCompliance';

export function PropertiesPanel() {
    const {
        selectedObject,
        canvas,
        saveToHistory,
        updateLayers,
        complianceErrors,
        complianceWarnings,
        layers,
    } = useStore();
    const { checkProhibitedTerms, checkPriceText, runFullCompliance } = useCompliance();

    const [localText, setLocalText] = useState('');
    const [fontSize, setFontSize] = useState(48);
    const [textColor, setTextColor] = useState('#000000');
    const [opacity, setOpacity] = useState(100);

    // Sync with selected object
    useEffect(() => {
        if (selectedObject) {
            if (selectedObject.type === 'i-text' || selectedObject.type === 'text') {
                setLocalText(selectedObject.text || '');
                setFontSize(selectedObject.fontSize || 48);
                setTextColor(selectedObject.fill || '#000000');
            }
            setOpacity((selectedObject.opacity || 1) * 100);
        }
    }, [selectedObject]);

    const updateText = (value) => {
        setLocalText(value);
        if (selectedObject && canvas) {
            selectedObject.set('text', value);
            canvas.renderAll();
            // Run compliance checks
            checkProhibitedTerms(value, selectedObject.id || 'current');
            checkPriceText(value, selectedObject.id || 'current', selectedObject.isValueTile);
        }
    };

    const commitText = () => {
        saveToHistory();
        runFullCompliance();
    };

    const updateFontSize = (size) => {
        const s = parseInt(size);
        setFontSize(s);
        if (selectedObject && canvas) {
            selectedObject.set('fontSize', s);
            canvas.renderAll();
        }
    };

    const updateTextColor = (color) => {
        setTextColor(color);
        if (selectedObject && canvas) {
            selectedObject.set('fill', color);
            canvas.renderAll();
            saveToHistory();
        }
    };

    const updateOpacity = (value) => {
        const v = parseInt(value);
        setOpacity(v);
        if (selectedObject && canvas) {
            selectedObject.set('opacity', v / 100);
            canvas.renderAll();
        }
    };

    const toggleBold = () => {
        if (selectedObject && canvas) {
            const current = selectedObject.fontWeight;
            selectedObject.set('fontWeight', current === 'bold' ? 'normal' : 'bold');
            canvas.renderAll();
            saveToHistory();
        }
    };

    const flipHorizontal = () => {
        if (selectedObject && canvas) {
            selectedObject.set('flipX', !selectedObject.flipX);
            canvas.renderAll();
            saveToHistory();
        }
    };

    const flipVertical = () => {
        if (selectedObject && canvas) {
            selectedObject.set('flipY', !selectedObject.flipY);
            canvas.renderAll();
            saveToHistory();
        }
    };

    const bringForward = () => {
        if (selectedObject && canvas) {
            canvas.bringObjectForward(selectedObject);
            canvas.renderAll();
            saveToHistory();
            updateLayers();
        }
    };

    const sendBackward = () => {
        if (selectedObject && canvas) {
            canvas.sendObjectBackwards(selectedObject);
            canvas.renderAll();
            saveToHistory();
            updateLayers();
        }
    };

    const deleteObject = () => {
        if (selectedObject && canvas) {
            canvas.remove(selectedObject);
            canvas.discardActiveObject();
            canvas.renderAll();
            saveToHistory();
            updateLayers();
        }
    };

    const duplicateObject = () => {
        if (selectedObject && canvas) {
            selectedObject.clone().then((cloned) => {
                cloned.set({
                    left: (selectedObject.left || 0) + 30,
                    top: (selectedObject.top || 0) + 30,
                });
                canvas.add(cloned);
                canvas.setActiveObject(cloned);
                canvas.renderAll();
                saveToHistory();
                updateLayers();
            });
        }
    };

    const isText = selectedObject && (selectedObject.type === 'i-text' || selectedObject.type === 'text');
    const allIssues = [...complianceErrors, ...complianceWarnings];

    return (
        <div className="w-80 bg-gray-900/90 border-l border-white/10 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="font-semibold text-white">Properties</h2>
                {selectedObject && (
                    <span className="text-xs px-2 py-0.5 bg-white/10 rounded text-white/60">
                        {selectedObject.customName || selectedObject.type}
                    </span>
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                {selectedObject ? (
                    <div className="p-4 space-y-5">
                        {/* Text properties */}
                        {isText && !selectedObject.isValueTile && (
                            <>
                                <div>
                                    <label className="block text-xs text-white/50 mb-1">Text Content</label>
                                    <textarea
                                        value={localText}
                                        onChange={(e) => updateText(e.target.value)}
                                        onBlur={commitText}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm resize-none focus:outline-none focus:border-tesco-red/50"
                                        rows={3}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-white/50 mb-1">Font Size</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="range"
                                                min="12"
                                                max="150"
                                                value={fontSize}
                                                onChange={(e) => updateFontSize(e.target.value)}
                                                onMouseUp={saveToHistory}
                                                className="flex-1 accent-tesco-red"
                                            />
                                            <span className="text-xs text-white/70 w-10">{fontSize}px</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-white/50 mb-1">Color</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={textColor}
                                                onChange={(e) => updateTextColor(e.target.value)}
                                                className="w-8 h-8 rounded cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={textColor}
                                                onChange={(e) => updateTextColor(e.target.value)}
                                                className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white uppercase"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs text-white/50 mb-1">Style</label>
                                    <button
                                        onClick={toggleBold}
                                        className={`px-3 py-1 rounded text-sm font-bold ${selectedObject.fontWeight === 'bold'
                                                ? 'bg-tesco-red text-white'
                                                : 'bg-white/10 text-white/70'
                                            }`}
                                    >
                                        B
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Opacity */}
                        <div>
                            <label className="block text-xs text-white/50 mb-1">Opacity</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={opacity}
                                    onChange={(e) => updateOpacity(e.target.value)}
                                    onMouseUp={saveToHistory}
                                    className="flex-1 accent-tesco-red"
                                />
                                <span className="text-xs text-white/70 w-10">{opacity}%</span>
                            </div>
                        </div>

                        {/* Transform */}
                        <div>
                            <label className="block text-xs text-white/50 mb-2">Transform</label>
                            <div className="flex gap-2">
                                <button onClick={flipHorizontal} className="btn-secondary text-xs px-3 py-1.5">
                                    ↔ Flip H
                                </button>
                                <button onClick={flipVertical} className="btn-secondary text-xs px-3 py-1.5">
                                    ↕ Flip V
                                </button>
                            </div>
                        </div>

                        {/* Arrange */}
                        <div>
                            <label className="block text-xs text-white/50 mb-2">Arrange</label>
                            <div className="flex gap-2">
                                <button onClick={bringForward} className="btn-secondary text-xs px-3 py-1.5 flex-1">
                                    ↑ Forward
                                </button>
                                <button onClick={sendBackward} className="btn-secondary text-xs px-3 py-1.5 flex-1">
                                    ↓ Back
                                </button>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-3 border-t border-white/10">
                            <button onClick={duplicateObject} className="btn-secondary text-xs px-3 py-2 flex-1">
                                ⧉ Duplicate
                            </button>
                            <button
                                onClick={deleteObject}
                                className="px-3 py-2 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 transition-colors flex-1"
                            >
                                🗑 Delete
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 text-center text-white/40">
                        <p className="text-sm mb-2">No element selected</p>
                        <p className="text-xs">Click an element on canvas to edit</p>
                    </div>
                )}

                {/* Layers Section */}
                <div className="border-t border-white/10">
                    <div className="p-3 flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Layers</h3>
                        <span className="text-xs text-white/40">{layers.length}</span>
                    </div>
                    <div className="px-3 pb-3 space-y-1 max-h-40 overflow-y-auto">
                        {layers.length === 0 ? (
                            <p className="text-xs text-white/30 py-2">No layers yet</p>
                        ) : (
                            layers.map((layer, i) => (
                                <div
                                    key={layer.id}
                                    onClick={() => canvas && canvas.setActiveObject(layer.object)}
                                    className={`px-2 py-1.5 rounded text-xs cursor-pointer flex items-center gap-2 ${selectedObject === layer.object
                                            ? 'bg-tesco-red/30 text-white'
                                            : 'bg-white/5 text-white/70 hover:bg-white/10'
                                        }`}
                                >
                                    <span className="w-4 text-white/40">{layers.length - i}</span>
                                    <span className="truncate flex-1">{layer.name}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Compliance Issues */}
            {allIssues.length > 0 && (
                <div className="border-t border-white/10 p-3 max-h-48 overflow-y-auto bg-red-500/5">
                    <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        ⚠ Compliance Issues ({allIssues.length})
                    </h3>
                    <div className="space-y-2">
                        {allIssues.map(issue => (
                            <div
                                key={issue.id}
                                className={`p-2 rounded text-xs ${issue.severity === 'error'
                                        ? 'bg-red-500/20 border border-red-500/30'
                                        : 'bg-yellow-500/20 border border-yellow-500/30'
                                    }`}
                            >
                                <div className={`font-semibold ${issue.severity === 'error' ? 'text-red-400' : 'text-yellow-400'}`}>
                                    {issue.title}
                                </div>
                                <p className="text-white/70 mt-0.5">{issue.message}</p>
                                {issue.suggestion && (
                                    <p className="text-white/50 mt-1 italic text-[10px]">{issue.suggestion}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default PropertiesPanel;
