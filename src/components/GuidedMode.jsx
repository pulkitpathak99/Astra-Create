import React, { useState, useCallback, useRef, useEffect } from 'react';
import useStore, { FORMAT_PRESETS } from '../store/useStore';
import geminiService from '../services/geminiService';
import { buildCompliantCanvas, addPackshotToCanvas } from '../services/compliantTemplateBuilder';

/**
 * GuidedMode - Streamlined 3-step wizard
 */
export function GuidedMode({ onClose, onComplete }) {
    const fileInputRef = useRef(null);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [error, setError] = useState(null);

    // User inputs
    const [productImage, setProductImage] = useState(null);
    const [productImageUrl, setProductImageUrl] = useState(null);
    const [selectedFormat, setSelectedFormat] = useState('instagram-feed');
    const [selectedTileType, setSelectedTileType] = useState('clubcard');
    const [headline, setHeadline] = useState('');
    const [subheadline, setSubheadline] = useState('');
    const [isAlcohol, setIsAlcohol] = useState(false);
    const [generatedData, setGeneratedData] = useState(null);

    const {
        canvas, saveToHistory, updateLayers, setCurrentFormat,
        setBackgroundColor, setIsAlcoholProduct
    } = useStore();

    const STEPS = [
        { id: 1, title: '🚀 Setup', desc: 'Image & Format' },
        { id: 2, title: '✨ Content', desc: 'Copy & Pricing' },
        { id: 3, title: '✅ Review', desc: 'Finalize' },
    ];

    // Handle image upload
    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            setProductImage(ev.target.result);
            setProductImageUrl(ev.target.result);
            setError(null);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // Generate AI suggestions
    const generateSuggestions = useCallback(async () => {
        if (!productImageUrl || generatedData) return;

        setAiLoading(true);
        try {
            const result = await geminiService.generateAutonomousCreative(productImageUrl);
            if (result.success && result.variants?.[0]) {
                const v = result.variants[0];
                setHeadline(v.headline || 'Great Value');
                setSubheadline(v.subheadline || 'Available at Tesco');
                setIsAlcohol(result.isAlcohol || false);
                setGeneratedData(result);
            }
        } catch (err) {
            console.error('AI suggestion failed:', err);
            setHeadline('Great Value');
            setSubheadline('Available at Tesco');
        } finally {
            setAiLoading(false);
        }
    }, [productImageUrl, generatedData]);

    // Trigger AI when entering step 2
    useEffect(() => {
        if (step === 2 && !generatedData && productImageUrl) {
            generateSuggestions();
        }
    }, [step, generatedData, productImageUrl, generateSuggestions]);

    // Apply to canvas using COMPLIANT TEMPLATE
    // Uses the same layout structure as AI Creative Gallery for 100% compliance
    const applyToCanvas = useCallback(async () => {
        if (!canvas) return;

        setLoading(true);
        setCurrentFormat(selectedFormat);

        try {
            // Build the variant object matching the format expected by compliantTemplateBuilder
            const variant = {
                headline: headline || 'Great Value',
                subheadline: subheadline || 'Available at Tesco',
                backgroundColor: generatedData?.variants?.[0]?.backgroundColor || '#1a1a2e',
                headlineColor: '#ffffff',
                textColor: '#ffffff',
                priceType: selectedTileType,
                price: selectedTileType === 'clubcard' ? '£1.99' : '£2.99',
                wasPrice: '£2.99',
                tag: 'Only at Tesco', // Will be auto-formatted for Clubcard by the builder
            };

            const product = {
                isAlcohol,
            };

            // Use compliant template builder (same as AI Gallery & Magic Wand)
            await buildCompliantCanvas(
                canvas,
                variant,
                product,
                selectedFormat,
                {
                    setBackgroundColor,
                    setIsAlcoholProduct,
                    saveToHistory,
                    updateLayers
                }
            );

            // Add packshot if available
            if (productImageUrl) {
                await addPackshotToCanvas(canvas, productImageUrl, selectedFormat);
            }

            onComplete?.();
            onClose();
        } catch (err) {
            console.error('Apply failed:', err);
            setError('Failed to create creative');
        } finally {
            setLoading(false);
        }
    }, [canvas, selectedFormat, selectedTileType, headline, subheadline, isAlcohol,
        productImageUrl, generatedData, setCurrentFormat, setBackgroundColor,
        setIsAlcoholProduct, saveToHistory, updateLayers, onComplete, onClose]);

    const canProceed = () => {
        switch (step) {
            case 1: return !!productImage && !!selectedFormat;
            case 2: return headline.length > 0 && !!selectedTileType;
            case 3: return true;
            default: return false;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
            <div className="w-full max-w-5xl h-[85vh] bg-[#12161c] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-slide-in-up">

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-[#1a1f28]">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
                            <span className="text-xl">🎯</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Guided Mode</h2>
                            <p className="text-xs text-slate-400">Create compliant campaigns in 3 simple steps</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="px-8 py-4 bg-[#12161c] border-b border-white/5">
                    <div className="flex items-center justify-between max-w-3xl mx-auto">
                        {STEPS.map((s, i) => (
                            <div key={s.id} className="flex items-center flex-1 last:flex-none">
                                <div className={`flex items-center gap-3 ${s.id === step ? 'opacity-100' : 'opacity-50'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${s.id < step ? 'bg-emerald-500 text-white' :
                                            s.id === step ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/20' :
                                                'bg-white/10 text-slate-400'
                                        }`}>
                                        {s.id < step ? '✓' : s.id}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-medium ${s.id === step ? 'text-white' : 'text-slate-400'}`}>{s.title}</p>
                                        <p className="text-[10px] text-slate-500 hidden sm:block">{s.desc}</p>
                                    </div>
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div className="flex-1 mx-4 h-[1px] bg-white/10" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-4xl mx-auto h-full">

                        {/* Step 1: Setup */}
                        {step === 1 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                                {/* Left: Upload */}
                                <div className="flex flex-col gap-4">
                                    <h3 className="text-lg font-bold text-white">1. Upload Product</h3>
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`flex-1 min-h-[300px] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-4 cursor-pointer group relative overflow-hidden ${productImage ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 hover:border-emerald-500/50 hover:bg-white/5'
                                            }`}
                                    >
                                        <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />

                                        {productImage ? (
                                            <>
                                                <img src={productImage} alt="Preview" className="absolute inset-0 w-full h-full object-contain p-8" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <span className="text-white font-medium">Click to change</span>
                                                </div>
                                                <div className="absolute top-4 right-4 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full shadow-lg">
                                                    ✓ Uploaded
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <span className="text-4xl">📸</span>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-white font-medium mb-1">Click to upload image</p>
                                                    <p className="text-slate-400 text-xs">Supports PNG, JPG</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Format */}
                                <div className="flex flex-col gap-4">
                                    <h3 className="text-lg font-bold text-white">2. Choose Format</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {Object.entries(FORMAT_PRESETS).slice(0, 6).map(([key, format]) => (
                                            <button
                                                key={key}
                                                onClick={() => setSelectedFormat(key)}
                                                className={`p-4 rounded-xl border text-left transition-all ${selectedFormat === key
                                                        ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10'
                                                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-2xl">{key.includes('instagram') ? '📸' : key.includes('facebook') ? '👤' : '📱'}</span>
                                                    {selectedFormat === key && <span className="text-emerald-500">✓</span>}
                                                </div>
                                                <p className={`font-medium text-sm mb-1 ${selectedFormat === key ? 'text-white' : 'text-slate-300'}`}>
                                                    {format.name}
                                                </p>
                                                <p className="text-xs text-slate-500">{format.width} × {format.height}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Content */}
                        {step === 2 && (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 h-full">
                                {/* Left: Preview (Smaller) */}
                                <div className="md:col-span-4 flex flex-col gap-4">
                                    <h3 className="text-lg font-bold text-white">Product</h3>
                                    <div className="aspect-square rounded-2xl bg-[#1a1f28] border border-white/10 p-6 flex items-center justify-center relative overflow-hidden">
                                        {productImage && <img src={productImage} alt="Product" className="w-full h-full object-contain" />}
                                        {aiLoading && (
                                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
                                                <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
                                                <p className="text-emerald-400 font-medium text-sm">AI is analyzing your product...</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                        <p className="text-blue-400 text-xs leading-relaxed">
                                            💡 <strong>AI Tip:</strong> We've analyzed your image and suggested the best copy below. Feel free to edit!
                                        </p>
                                    </div>
                                </div>

                                {/* Right: Controls */}
                                <div className="md:col-span-8 flex flex-col gap-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-4">Customize Content</h3>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-2">Headline</label>
                                                <input
                                                    type="text"
                                                    value={headline}
                                                    onChange={(e) => setHeadline(e.target.value)}
                                                    className="w-full p-4 rounded-xl bg-[#0a0d12] border border-white/10 text-white focus:border-emerald-500 focus:outline-none transition-colors"
                                                    placeholder="e.g. Great Value"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-2">Subheadline</label>
                                                <input
                                                    type="text"
                                                    value={subheadline}
                                                    onChange={(e) => setSubheadline(e.target.value)}
                                                    className="w-full p-4 rounded-xl bg-[#0a0d12] border border-white/10 text-white focus:border-emerald-500 focus:outline-none transition-colors"
                                                    placeholder="e.g. Available at Tesco"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-4">Pricing & Compliance</h3>
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            {[
                                                { key: 'new', label: 'NEW', desc: 'Launch', bg: '#e51c23', text: '#fff' },
                                                { key: 'white', label: '£2.99', desc: 'Standard', bg: '#fff', text: '#003d7a' },
                                                { key: 'clubcard', label: '£1.99', desc: 'Clubcard', bg: '#003d7a', text: '#fff' },
                                            ].map((tile) => (
                                                <button
                                                    key={tile.key}
                                                    onClick={() => setSelectedTileType(tile.key)}
                                                    className={`p-3 rounded-xl border text-center transition-all ${selectedTileType === tile.key
                                                            ? 'border-emerald-500 bg-emerald-500/10'
                                                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                                                        }`}
                                                >
                                                    <div className="w-12 h-8 mx-auto rounded flex items-center justify-center mb-2 shadow-sm"
                                                        style={{ backgroundColor: tile.bg, color: tile.text }}>
                                                        <span className="font-bold text-xs">{tile.label}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-300">{tile.desc}</p>
                                                </button>
                                            ))}
                                        </div>

                                        <label className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={isAlcohol}
                                                onChange={(e) => setIsAlcohol(e.target.checked)}
                                                className="w-5 h-5 rounded accent-emerald-500"
                                            />
                                            <div>
                                                <p className="text-sm font-medium text-white">Alcohol Product</p>
                                                <p className="text-xs text-slate-400">Automatically adds Drinkaware compliance</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Review */}
                        {step === 3 && (
                            <div className="flex flex-col items-center justify-center h-full gap-8">
                                <div className="text-center">
                                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-3xl mb-4 mx-auto">
                                        ✨
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Ready to Create!</h3>
                                    <p className="text-slate-400">Review your settings before we build the creative.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
                                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Format</p>
                                        <p className="text-lg font-medium text-white">{FORMAT_PRESETS[selectedFormat]?.name}</p>
                                        <p className="text-sm text-slate-400">{FORMAT_PRESETS[selectedFormat]?.width} × {FORMAT_PRESETS[selectedFormat]?.height}</p>
                                    </div>
                                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Content</p>
                                        <p className="text-lg font-medium text-white truncate">{headline}</p>
                                        <p className="text-sm text-slate-400 truncate">{subheadline}</p>
                                    </div>
                                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Pricing</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-medium text-white capitalize">{selectedTileType} Tile</span>
                                        </div>
                                    </div>
                                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Compliance</p>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${isAlcohol ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                            <span className="text-lg font-medium text-white">{isAlcohol ? 'Alcohol' : 'Standard'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-[#1a1f28] flex items-center justify-between">
                    <button
                        onClick={() => step > 1 ? setStep(step - 1) : onClose()}
                        className="px-6 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-medium"
                    >
                        {step > 1 ? '← Back' : 'Cancel'}
                    </button>

                    <button
                        onClick={() => step < 3 ? setStep(step + 1) : applyToCanvas()}
                        disabled={!canProceed() || loading}
                        className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${!canProceed() || loading
                                ? 'bg-slate-700 cursor-not-allowed opacity-50'
                                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-emerald-500/25 hover:-translate-y-0.5'
                            }`}
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Building...</span>
                            </>
                        ) : step < 3 ? (
                            <>
                                <span>Next Step</span>
                                <span>→</span>
                            </>
                        ) : (
                            <>
                                <span>✨ Create Campaign</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default GuidedMode;
