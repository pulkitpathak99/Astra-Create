import { useState, useCallback } from 'react';
import { IText } from 'fabric';
import useStore, { FORMAT_PRESETS } from '../store/useStore';
import geminiService from '../services/geminiService';

export function AIAssistant() {
    const {
        canvas, saveToHistory, updateLayers, currentFormat,
        complianceErrors, complianceWarnings
    } = useStore();

    const [isOpen, setIsOpen] = useState(true);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('copy');
    const [suggestions, setSuggestions] = useState([]);
    const [productName, setProductName] = useState('');
    const [tone, setTone] = useState('friendly');
    const [aiCompliance, setAiCompliance] = useState(null);
    const [error, setError] = useState(null);

    const hasApiKey = geminiService.hasApiKey();

    // Generate copy suggestions
    const handleGenerateCopy = useCallback(async () => {
        if (!productName.trim()) {
            setError('Please enter a product name');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await geminiService.generateCopySuggestions({
                productName,
                tone,
                format: currentFormat,
            });

            if (result.suggestions) {
                setSuggestions(result.suggestions);
            } else {
                setError('Could not generate suggestions');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [productName, tone, currentFormat]);

    // Apply copy suggestion to canvas
    const applySuggestion = useCallback((suggestion) => {
        if (!canvas) return;

        const format = FORMAT_PRESETS[currentFormat];

        // Add headline
        const headline = new IText(suggestion.headline, {
            left: format.width / 2,
            top: format.height * 0.35,
            originX: 'center',
            originY: 'center',
            fontFamily: 'Inter, sans-serif',
            fontSize: 72,
            fontWeight: 'bold',
            fill: '#000000',
            textAlign: 'center',
            customName: 'AI Headline',
        });

        // Add subheadline
        const subheadline = new IText(suggestion.subheadline, {
            left: format.width / 2,
            top: format.height * 0.48,
            originX: 'center',
            originY: 'center',
            fontFamily: 'Inter, sans-serif',
            fontSize: 40,
            fill: '#333333',
            textAlign: 'center',
            customName: 'AI Subheadline',
        });

        canvas.add(headline, subheadline);
        canvas.renderAll();
        saveToHistory();
        updateLayers();
    }, [canvas, currentFormat, saveToHistory, updateLayers]);

    // Run AI compliance check
    const handleAIComplianceCheck = useCallback(async () => {
        if (!canvas) return;

        setLoading(true);
        setError(null);
        setActiveTab('compliance');

        try {
            // Gather creative content
            const objects = canvas.getObjects();
            const textContent = objects
                .filter(o => o.type === 'i-text' || o.type === 'text')
                .map(o => ({ text: o.text, fontSize: o.fontSize, fill: o.fill }));

            const creativeContent = {
                format: currentFormat,
                backgroundColor: canvas.backgroundColor,
                textElements: textContent,
                hasValueTile: objects.some(o => o.isValueTile),
                hasDrinkaware: objects.some(o => o.isDrinkaware),
            };

            const result = await geminiService.checkComplianceAI(creativeContent);
            setAiCompliance(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [canvas, currentFormat]);

    // Fix issue with AI
    const handleFixWithAI = useCallback(async (issue) => {
        if (!canvas) return;

        setLoading(true);

        try {
            // Find the problematic text element
            const objects = canvas.getObjects();
            const textObj = objects.find(o =>
                (o.type === 'i-text' || o.type === 'text') &&
                o.text?.toLowerCase().includes(issue.element?.toLowerCase())
            );

            if (textObj) {
                const result = await geminiService.fixComplianceIssue(textObj.text, issue.problem);
                if (result.fixedText) {
                    textObj.set('text', result.fixedText);
                    canvas.renderAll();
                    saveToHistory();
                    // Re-run compliance check
                    handleAIComplianceCheck();
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [canvas, saveToHistory, handleAIComplianceCheck]);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full shadow-lg shadow-purple-500/30 flex items-center justify-center text-2xl hover:scale-110 transition-transform z-50"
                title="Open AI Assistant"
            >
                ✨
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-96 bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden z-50">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xl">✨</span>
                    <div>
                        <h3 className="font-semibold text-white">AI Creative Assistant</h3>
                        <p className="text-xs text-white/50">Powered by Gemini</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                    <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* API Status */}
            {hasApiKey ? (
                <div className="px-4 py-2 bg-green-500/10 border-b border-green-500/20 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <p className="text-xs text-green-300">Gemini API connected</p>
                </div>
            ) : (
                <div className="p-3 bg-yellow-500/20 border-b border-yellow-500/30">
                    <p className="text-xs text-yellow-300">
                        ⚠️ Add your Gemini API key to enable AI features
                    </p>
                    <input
                        type="password"
                        placeholder="Enter Gemini API key"
                        className="mt-2 w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sm text-white"
                        onBlur={(e) => {
                            if (e.target.value) {
                                geminiService.setApiKey(e.target.value);
                                window.location.reload();
                            }
                        }}
                    />
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-white/10">
                {[
                    { id: 'copy', icon: '✍️', label: 'Copy' },
                    { id: 'compliance', icon: '✅', label: 'Compliance' },
                    { id: 'layout', icon: '📐', label: 'Layout' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-2.5 text-xs font-medium transition-colors ${activeTab === tab.id
                            ? 'bg-white/10 text-white'
                            : 'text-white/50 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <span className="mr-1">{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="p-4 max-h-80 overflow-y-auto">
                {/* Error display */}
                {error && (
                    <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-300">
                        {error}
                    </div>
                )}

                {/* Copy Generation Tab */}
                {activeTab === 'copy' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs text-white/60 mb-1">Product Name</label>
                            <input
                                type="text"
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                placeholder="e.g., Coca-Cola Zero Sugar"
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-white/60 mb-1">Tone</label>
                            <div className="flex gap-2">
                                {['friendly', 'bold', 'professional'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setTone(t)}
                                        className={`flex-1 py-1.5 text-xs rounded capitalize ${tone === t
                                            ? 'bg-purple-500/30 border border-purple-500/50 text-white'
                                            : 'bg-white/5 border border-white/10 text-white/60'
                                            }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleGenerateCopy}
                            disabled={loading || !hasApiKey}
                            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-purple-500/20"
                        >
                            {loading ? '⏳ Generating...' : '✨ Generate Copy'}
                        </button>

                        {/* Suggestions */}
                        {suggestions.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs text-white/50">Click to apply:</p>
                                {suggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => applySuggestion(s)}
                                        className="w-full text-left p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                                    >
                                        <p className="font-semibold text-white text-sm">{s.headline}</p>
                                        <p className="text-xs text-white/60 mt-1">{s.subheadline}</p>
                                        {s.callToAction && (
                                            <span className="inline-block mt-2 px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded">
                                                {s.callToAction}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Compliance Tab */}
                {activeTab === 'compliance' && (
                    <div className="space-y-4">
                        <button
                            onClick={handleAIComplianceCheck}
                            disabled={loading || !hasApiKey}
                            className="w-full py-2.5 bg-gradient-to-r from-green-600 to-teal-600 text-white font-medium rounded-lg disabled:opacity-50"
                        >
                            {loading ? '⏳ Analyzing...' : '🔍 Deep Compliance Check'}
                        </button>

                        {/* Current issues from rule engine */}
                        {(complianceErrors.length > 0 || complianceWarnings.length > 0) && !aiCompliance && (
                            <div className="space-y-2">
                                <p className="text-xs text-white/50">Current Issues:</p>
                                {[...complianceErrors, ...complianceWarnings].map((issue, i) => (
                                    <div key={i} className={`p-2 rounded text-xs ${issue.severity === 'error' ? 'bg-red-500/20' : 'bg-yellow-500/20'
                                        }`}>
                                        <p className="font-medium text-white">{issue.title}</p>
                                        <p className="text-white/60">{issue.message}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* AI Compliance Results */}
                        {aiCompliance && (
                            <div className="space-y-3">
                                <div className={`p-3 rounded-lg ${aiCompliance.overallStatus === 'compliant' ? 'bg-green-500/20' :
                                    aiCompliance.overallStatus === 'needs_review' ? 'bg-yellow-500/20' : 'bg-red-500/20'
                                    }`}>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">
                                            {aiCompliance.overallStatus === 'compliant' ? '✅' :
                                                aiCompliance.overallStatus === 'needs_review' ? '⚠️' : '❌'}
                                        </span>
                                        <span className="font-medium text-white capitalize">
                                            {aiCompliance.overallStatus?.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>

                                {/* Issues */}
                                {aiCompliance.issues?.map((issue, i) => (
                                    <div key={i} className={`p-3 rounded-lg border ${issue.severity === 'error' ? 'bg-red-500/10 border-red-500/30' :
                                        issue.severity === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                                            'bg-blue-500/10 border-blue-500/30'
                                        }`}>
                                        <p className="font-medium text-sm text-white mb-1">{issue.problem}</p>
                                        <p className="text-xs text-white/60 mb-2">{issue.explanation}</p>
                                        {issue.suggestion && (
                                            <button
                                                onClick={() => handleFixWithAI(issue)}
                                                className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-purple-300"
                                            >
                                                ✨ Fix with AI
                                            </button>
                                        )}
                                    </div>
                                ))}

                                {/* Strengths */}
                                {aiCompliance.strengths?.length > 0 && (
                                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                                        <p className="text-xs text-green-300 font-medium mb-1">✨ What's working well:</p>
                                        <ul className="text-xs text-white/70 space-y-1">
                                            {aiCompliance.strengths.map((s, i) => (
                                                <li key={i}>• {s}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Layout Tab */}
                {activeTab === 'layout' && (
                    <div className="space-y-4">
                        <p className="text-xs text-white/60">
                            Get AI-powered layout suggestions based on your assets and format.
                        </p>

                        <button
                            disabled={loading || !hasApiKey}
                            className="w-full py-2.5 bg-gradient-to-r from-orange-600 to-pink-600 text-white font-medium rounded-lg disabled:opacity-50"
                        >
                            {loading ? '⏳ Analyzing...' : '🎨 Suggest Layout'}
                        </button>

                        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                            <p className="text-xs text-white/50 mb-2">Quick Layout Presets:</p>
                            <div className="grid grid-cols-2 gap-2">
                                {['Hero Product', 'Text Focus', 'Split Design', 'Minimal'].map(preset => (
                                    <button
                                        key={preset}
                                        className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs text-white/80 transition-colors"
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Actions Footer */}
            <div className="p-3 border-t border-white/10 bg-white/5">
                <div className="flex gap-2">
                    <button
                        onClick={handleAIComplianceCheck}
                        className="flex-1 py-2 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded transition-colors"
                        disabled={!hasApiKey}
                    >
                        ✅ Check
                    </button>
                    <button
                        onClick={handleGenerateCopy}
                        className="flex-1 py-2 text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded transition-colors"
                        disabled={!hasApiKey || !productName}
                    >
                        ✍️ Copy
                    </button>
                    <button
                        className="flex-1 py-2 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded transition-colors"
                        disabled={!hasApiKey}
                    >
                        📦 Export All
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AIAssistant;
