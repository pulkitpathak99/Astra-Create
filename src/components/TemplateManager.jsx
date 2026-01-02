import React, { useState, useEffect, useCallback } from 'react';
import useStore, { FORMAT_PRESETS } from '../store/useStore';

/**
 * TemplateManager - Save, load, and manage campaign templates and history
 * Features: Template saving, campaign history, quick-load functionality
 */

const STORAGE_KEY_TEMPLATES = 'astra-templates';
const STORAGE_KEY_HISTORY = 'astra-history';
const MAX_HISTORY_ITEMS = 10;

// Get templates from localStorage
const getStoredTemplates = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_TEMPLATES);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Failed to load templates:', e);
        return [];
    }
};

// Get history from localStorage
const getStoredHistory = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_HISTORY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Failed to load history:', e);
        return [];
    }
};

// Save templates to localStorage
const saveTemplatesToStorage = (templates) => {
    try {
        localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(templates));
    } catch (e) {
        console.error('Failed to save templates:', e);
    }
};

// Save history to localStorage
const saveHistoryToStorage = (history) => {
    try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS)));
    } catch (e) {
        console.error('Failed to save history:', e);
    }
};

export function TemplateManager({ onClose }) {
    const { canvas, currentFormat, saveToHistory, updateLayers, setBackgroundColor } = useStore();

    const [activeTab, setActiveTab] = useState('templates'); // templates | history
    const [templates, setTemplates] = useState(getStoredTemplates);
    const [history, setHistory] = useState(getStoredHistory);
    const [saving, setSaving] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [showSaveForm, setShowSaveForm] = useState(false);
    const [loading, setLoading] = useState(false);

    // Save current canvas as template
    const handleSaveTemplate = useCallback(() => {
        if (!canvas || !newTemplateName.trim()) return;

        setSaving(true);

        const canvasData = canvas.toJSON([
            'customName', 'isPackshot', 'isLeadPackshot', 'isValueTile',
            'isDrinkaware', 'isTag', 'valueTileType', 'isSystemElement'
        ]);

        const template = {
            id: `template-${Date.now()}`,
            name: newTemplateName.trim(),
            format: currentFormat,
            formatName: FORMAT_PRESETS[currentFormat].name,
            thumbnail: canvas.toDataURL({ multiplier: 0.2 }),
            data: canvasData,
            createdAt: new Date().toISOString(),
        };

        const updatedTemplates = [template, ...templates];
        setTemplates(updatedTemplates);
        saveTemplatesToStorage(updatedTemplates);

        setNewTemplateName('');
        setShowSaveForm(false);
        setSaving(false);
    }, [canvas, currentFormat, newTemplateName, templates]);

    // Add to history (called externally or on canvas changes)
    const addToHistory = useCallback((name = 'Unnamed') => {
        if (!canvas) return;

        const canvasData = canvas.toJSON([
            'customName', 'isPackshot', 'isLeadPackshot', 'isValueTile',
            'isDrinkaware', 'isTag', 'valueTileType', 'isSystemElement'
        ]);

        const historyItem = {
            id: `history-${Date.now()}`,
            name,
            format: currentFormat,
            formatName: FORMAT_PRESETS[currentFormat].name,
            thumbnail: canvas.toDataURL({ multiplier: 0.15 }),
            data: canvasData,
            createdAt: new Date().toISOString(),
        };

        const updatedHistory = [historyItem, ...history].slice(0, MAX_HISTORY_ITEMS);
        setHistory(updatedHistory);
        saveHistoryToStorage(updatedHistory);
    }, [canvas, currentFormat, history]);

    // Load template or history item to canvas
    const handleLoad = useCallback(async (item) => {
        if (!canvas) return;

        setLoading(true);

        try {
            // Clear current canvas
            canvas.getObjects().forEach(obj => {
                if (!obj.isSafeZone) canvas.remove(obj);
            });

            // Load from JSON
            await canvas.loadFromJSON(item.data, () => {
                canvas.renderAll();
                if (item.data.background) {
                    setBackgroundColor(item.data.background);
                }
                saveToHistory();
                updateLayers();
            });

            setLoading(false);
        } catch (err) {
            console.error('Failed to load template:', err);
            setLoading(false);
        }
    }, [canvas, setBackgroundColor, saveToHistory, updateLayers]);

    // Delete template
    const handleDeleteTemplate = useCallback((templateId) => {
        const updated = templates.filter(t => t.id !== templateId);
        setTemplates(updated);
        saveTemplatesToStorage(updated);
    }, [templates]);

    // Delete history item
    const handleDeleteHistory = useCallback((historyId) => {
        const updated = history.filter(h => h.id !== historyId);
        setHistory(updated);
        saveHistoryToStorage(updated);
    }, [history]);

    // Clear all history
    const handleClearHistory = useCallback(() => {
        setHistory([]);
        saveHistoryToStorage([]);
    }, []);

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="modal-overlay">
            <div className="modal max-w-2xl modal-premium">
                {/* Header */}
                <div className="modal-header">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                            <span className="text-white text-2xl">📁</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-primary">Templates & History</h2>
                            <p className="text-xs text-muted">Save your work and revisit past creations</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost p-1 absolute top-4 right-4">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[var(--border-subtle)]">
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${activeTab === 'templates'
                                ? 'text-primary border-b-2 border-[var(--accent-primary)]'
                                : 'text-muted hover:text-secondary'
                            }`}
                    >
                        📐 Templates ({templates.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${activeTab === 'history'
                                ? 'text-primary border-b-2 border-[var(--accent-primary)]'
                                : 'text-muted hover:text-secondary'
                            }`}
                    >
                        🕐 History ({history.length})
                    </button>
                </div>

                <div className="modal-body">
                    {/* Templates Tab */}
                    {activeTab === 'templates' && (
                        <div>
                            {/* Save New Template */}
                            {!showSaveForm ? (
                                <button
                                    onClick={() => setShowSaveForm(true)}
                                    className="w-full p-4 mb-4 border-2 border-dashed border-[var(--border-default)] rounded-xl text-center hover:border-[var(--accent-primary)] hover:bg-[var(--surface-overlay)] transition-all group"
                                >
                                    <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">💾</span>
                                    <span className="text-sm text-secondary group-hover:text-primary">Save Current Design as Template</span>
                                </button>
                            ) : (
                                <div className="p-4 mb-4 rounded-xl bg-[var(--surface-overlay)] border border-[var(--border-default)]">
                                    <input
                                        type="text"
                                        value={newTemplateName}
                                        onChange={(e) => setNewTemplateName(e.target.value)}
                                        placeholder="Template name..."
                                        className="input mb-3"
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSaveTemplate}
                                            disabled={!newTemplateName.trim() || saving}
                                            className="btn btn-primary flex-1"
                                        >
                                            {saving ? '⏳ Saving...' : '💾 Save Template'}
                                        </button>
                                        <button
                                            onClick={() => { setShowSaveForm(false); setNewTemplateName(''); }}
                                            className="btn btn-ghost"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Template Grid */}
                            {templates.length === 0 ? (
                                <div className="text-center py-12">
                                    <span className="text-4xl mb-4 block opacity-50">📐</span>
                                    <p className="text-secondary">No templates saved yet</p>
                                    <p className="text-xs text-muted mt-1">Save your designs to reuse them later</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {templates.map((template, i) => (
                                        <div
                                            key={template.id}
                                            className="card-premium stagger-item group cursor-pointer"
                                            style={{ animationDelay: `${i * 50}ms` }}
                                        >
                                            {/* Thumbnail */}
                                            <div className="relative mb-3 rounded-lg overflow-hidden bg-[var(--surface-dark)] aspect-video">
                                                <img
                                                    src={template.thumbnail}
                                                    alt={template.name}
                                                    className="w-full h-full object-contain"
                                                />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleLoad(template)}
                                                        className="btn btn-primary text-xs px-3 py-1"
                                                    >
                                                        Load
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTemplate(template.id)}
                                                        className="btn btn-danger text-xs px-3 py-1"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                            {/* Info */}
                                            <p className="font-medium text-sm text-primary truncate">{template.name}</p>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-[10px] text-muted">{template.formatName}</span>
                                                <span className="text-[10px] text-muted">{formatDate(template.createdAt)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* History Tab */}
                    {activeTab === 'history' && (
                        <div>
                            {history.length > 0 && (
                                <div className="flex justify-end mb-3">
                                    <button
                                        onClick={handleClearHistory}
                                        className="text-xs text-muted hover:text-error transition-colors"
                                    >
                                        Clear All History
                                    </button>
                                </div>
                            )}

                            {history.length === 0 ? (
                                <div className="text-center py-12">
                                    <span className="text-4xl mb-4 block opacity-50">🕐</span>
                                    <p className="text-secondary">No history yet</p>
                                    <p className="text-xs text-muted mt-1">Your recent campaigns will appear here</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {history.map((item, i) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-overlay)] hover:bg-[var(--surface-hover)] transition-all group stagger-item"
                                            style={{ animationDelay: `${i * 30}ms` }}
                                        >
                                            {/* Thumbnail */}
                                            <div className="w-16 h-12 rounded-md overflow-hidden bg-[var(--surface-dark)] flex-shrink-0">
                                                <img
                                                    src={item.thumbnail}
                                                    alt={item.name}
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm text-primary truncate">{item.name}</p>
                                                <div className="flex items-center gap-2 text-[10px] text-muted">
                                                    <span>{item.formatName}</span>
                                                    <span>•</span>
                                                    <span>{formatDate(item.createdAt)}</span>
                                                </div>
                                            </div>
                                            {/* Actions */}
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleLoad(item)}
                                                    className="btn btn-primary text-xs px-3 py-1"
                                                >
                                                    Load
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteHistory(item.id)}
                                                    className="text-muted hover:text-error transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Loading overlay */}
                    {loading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-b-2xl">
                            <div className="flex items-center gap-3 text-white">
                                <div className="flex gap-1">
                                    <div className="typing-dot" />
                                    <div className="typing-dot" />
                                    <div className="typing-dot" />
                                </div>
                                <span>Loading...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button onClick={onClose} className="btn btn-secondary">Close</button>
                    <div className="flex-1" />
                    <p className="text-[10px] text-muted">
                        💡 Templates are stored locally in your browser
                    </p>
                </div>
            </div>
        </div>
    );
}

// Export hook for adding to history programmatically
export const useTemplateHistory = () => {
    const addToHistory = (canvas, currentFormat, name = 'Auto-saved') => {
        if (!canvas) return;

        const canvasData = canvas.toJSON([
            'customName', 'isPackshot', 'isLeadPackshot', 'isValueTile',
            'isDrinkaware', 'isTag', 'valueTileType', 'isSystemElement'
        ]);

        const historyItem = {
            id: `history-${Date.now()}`,
            name,
            format: currentFormat,
            formatName: FORMAT_PRESETS[currentFormat]?.name || 'Unknown',
            thumbnail: canvas.toDataURL({ multiplier: 0.15 }),
            data: canvasData,
            createdAt: new Date().toISOString(),
        };

        const history = getStoredHistory();
        const updatedHistory = [historyItem, ...history].slice(0, MAX_HISTORY_ITEMS);
        saveHistoryToStorage(updatedHistory);
    };

    return { addToHistory };
};

export default TemplateManager;
