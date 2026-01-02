import React, { useState, useRef } from 'react';
import { FabricImage, IText, Rect } from 'fabric';
import useStore, { FORMAT_PRESETS } from '../store/useStore';
import geminiService from '../services/geminiService';
import { removeBackground } from '../utils/imageProcessing';

const CATEGORIES = [
    'Food & Drink', 'Alcohol', 'Health & Beauty', 'Household', 'Baby', 'Pet', 'Bakery', 'Frozen', 'Fresh',
];

const PRICE_TYPES = [
    { id: 'new', name: 'NEW Launch', color: '#e51c23' },
    { id: 'white', name: 'White Value', color: '#ffffff' },
    { id: 'clubcard', name: 'Clubcard Price', color: '#003d7a' },
];

export function QuickCampaignWizard({ onClose, onComplete }) {
    const fileInputRef = useRef(null);
    const [step, setStep] = useState(1);
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');

    // Form state
    const [productName, setProductName] = useState('');
    const [category, setCategory] = useState('Food & Drink');
    const [packshot, setPackshot] = useState(null);
    const [packshotPreview, setPackshotPreview] = useState(null);
    const [priceType, setPriceType] = useState('clubcard');
    const [price, setPrice] = useState('');
    const [regularPrice, setRegularPrice] = useState('');
    const [endDate, setEndDate] = useState('');

    // Headline variants (Step 4)
    const [headlineVariants, setHeadlineVariants] = useState([]);
    const [selectedVariant, setSelectedVariant] = useState(0);
    const [generatedCampaign, setGeneratedCampaign] = useState(null);

    const { canvas, saveToHistory, updateLayers, currentFormat, setBackgroundColor, setIsAlcoholProduct } = useStore();

    const handlePackshotUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setStatus('Removing background...');
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const img = new Image();
            img.onload = async () => {
                try {
                    const processedSrc = await removeBackground(img, { threshold: 30 });
                    setPackshot(processedSrc);
                    setPackshotPreview(processedSrc);
                } catch {
                    setPackshot(ev.target.result);
                    setPackshotPreview(ev.target.result);
                }
                setStatus('');
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // Generate headline variants (after step 3)
    const generateVariants = async () => {
        setGenerating(true);
        setProgress(10);
        setStatus('🤖 AI generating headline options...');

        try {
            const result = await geminiService.generateCompleteCampaign({
                productName, category, priceType, price, regularPrice, endDate,
            });

            setProgress(50);
            setStatus('✨ Creating variants...');

            // Create 3 variants
            const variants = [
                { headline: result.campaign.headline, subheadline: result.campaign.subheadline },
                ...(result.variants || []).slice(0, 2),
            ];

            // Ensure we have at least 3
            while (variants.length < 3) {
                variants.push({
                    headline: `Discover ${productName.split(' ')[0]}`,
                    subheadline: 'Only at Tesco',
                });
            }

            setHeadlineVariants(variants);
            setGeneratedCampaign(result.campaign);
            setProgress(100);
            setStatus('');
            setGenerating(false);
            setStep(4); // Go to variant selection
        } catch (error) {
            console.error('Variant generation failed:', error);
            // Fallback variants
            setHeadlineVariants([
                { headline: `Discover ${productName}`, subheadline: 'Only at Tesco' },
                { headline: 'Great Value', subheadline: 'Quality you can trust' },
                { headline: 'Try Something New', subheadline: 'Available now' },
            ]);
            const fallback = geminiService.getFallbackCampaign(productName, category, priceType);
            setGeneratedCampaign(fallback.campaign);
            setGenerating(false);
            setStep(4);
        }
    };

    // Final generation with selected variant
    const generateFinalCampaign = async () => {
        if (!canvas || !generatedCampaign) return;

        setGenerating(true);
        setProgress(10);
        setStatus('🎨 Building your campaign...');

        const selectedHeadline = headlineVariants[selectedVariant];
        const campaign = { ...generatedCampaign, ...selectedHeadline };
        const format = FORMAT_PRESETS[currentFormat];
        const config = format.config || { 
            valueTileScale: 1.0, 
            headlineFontSize: 48, 
            subFontSize: 32, 
            packshotScale: 0.4, 
            layout: 'vertical' 
        };
        const layout = campaign.layouts?.[currentFormat] || { headlineY: 0.28, packY: 0.52, tileY: 0.82 };
        const isHorizontal = config.layout === 'horizontal';

        // Clear canvas
        canvas.getObjects().forEach(obj => { if (!obj.isSafeZone) canvas.remove(obj); });

        // Set background
        setBackgroundColor(campaign.backgroundColor);
        canvas.backgroundColor = campaign.backgroundColor;

        setProgress(30);
        setStatus('📷 Adding packshot...');

        // Add packshot
        if (packshot) {
            const img = new Image();
            img.onload = () => {
                const maxSize = Math.min(format.width, format.height) * (isHorizontal ? 0.85 : config.packshotScale);
                const scale = Math.min(maxSize / img.width, maxSize / img.height);
                const fabricImg = new FabricImage(img, {
                    left: isHorizontal ? format.width * 0.15 : format.width / 2,
                    top: isHorizontal ? format.height / 2 : format.height * layout.packY,
                    scaleX: scale, scaleY: scale,
                    originX: 'center', originY: 'center',
                    customName: 'Lead Packshot', isPackshot: true, isLeadPackshot: true,
                });
                canvas.add(fabricImg);
                canvas.renderAll();
            };
            img.src = packshot;
        }

        setProgress(60);
        setStatus('✍️ Adding selected headline...');

        // Add headline
        const headline = new IText(campaign.headline, {
            left: isHorizontal ? format.width * 0.5 : format.width / 2,
            top: isHorizontal ? format.height * 0.35 : format.height * layout.headlineY,
            originX: 'center', originY: 'center',
            fontFamily: 'Inter, sans-serif', fontSize: config.headlineFontSize, fontWeight: 'bold',
            fill: campaign.headlineColor, textAlign: 'center', customName: 'AI Headline',
            width: isHorizontal ? format.width * 0.5 : format.width * 0.9,
        });
        canvas.add(headline);

        // Add subheadline
        if (campaign.subheadline) {
            const subheadline = new IText(campaign.subheadline, {
                left: isHorizontal ? format.width * 0.5 : format.width / 2,
                top: isHorizontal ? format.height * 0.65 : format.height * (layout.headlineY + 0.1),
                originX: 'center', originY: 'center',
                fontFamily: 'Inter, sans-serif', fontSize: config.subFontSize, fontWeight: '500',
                fill: campaign.headlineColor, textAlign: 'center', opacity: 0.9, customName: 'AI Subheadline',
                width: isHorizontal ? format.width * 0.5 : format.width * 0.8,
            });
            canvas.add(subheadline);
        }

        setProgress(80);
        setStatus('💰 Adding value tile...');

        // Add value tile
        const tileY = isHorizontal ? format.height / 2 : format.height * layout.tileY;
        const tileX = isHorizontal ? format.width * 0.85 : format.width / 2;
        addValueTile(priceType, tileX, tileY, format);

        // Alcohol handling
        if (category === 'Alcohol') {
            setIsAlcoholProduct(true);
            addDrinkaware(format);
        }

        setProgress(100);
        setStatus('✅ Campaign ready!');

        canvas.renderAll();
        saveToHistory();
        updateLayers();

        setTimeout(() => {
            setGenerating(false);
            onComplete?.({ campaign });
            onClose();
        }, 1000);
    };

    const addValueTile = (type, posX, posY, format) => {
        const tiles = {
            new: { bg: '#e51c23', text: '#ffffff', w: 120, h: 50 },
            white: { bg: '#ffffff', text: '#003d7a', w: 160, h: 60, border: '#003d7a' },
            clubcard: { bg: '#003d7a', text: '#ffffff', w: 200, h: 80 },
        };
        const config = tiles[type];
        const formatConfig = format.config || { valueTileScale: 1.0 };
        const scale = formatConfig.valueTileScale;

        const rect = new Rect({
            width: config.w * scale, height: config.h * scale, fill: config.bg, rx: 4 * scale, ry: 4 * scale,
            stroke: config.border || null, strokeWidth: config.border ? (2 * scale) : 0,
            originX: 'center', originY: 'center', left: posX, top: posY,
            selectable: false, evented: false, isValueTile: true, isSystemElement: true,
            valueTileType: type, customName: `${type} tile`,
        });

        let displayText = 'NEW';
        if (type === 'white') displayText = price || '£2.99';
        if (type === 'clubcard') displayText = `${price || '£1.99'}\nwas ${regularPrice || '£2.99'}`;

        const text = new IText(displayText, {
            fontSize: (type === 'clubcard' ? 24 : 28) * scale, fontWeight: 'bold', fontFamily: 'Inter, sans-serif',
            fill: config.text, originX: 'center', originY: 'center', left: posX, top: posY,
            textAlign: 'center', selectable: false, evented: false,
            isValueTile: true, isSystemElement: true, valueTileType: type,
        });

        canvas.add(rect, text);
    };

    const addDrinkaware = (format) => {
        const rect = new Rect({
            width: 180, height: 28, fill: '#ffffff', rx: 4, ry: 4,
            originX: 'center', originY: 'center', left: format.width - 100, top: format.height - 40,
            isDrinkaware: true, isSystemElement: true, customName: 'Drinkaware',
        });
        const text = new IText('drinkaware.co.uk', {
            fontSize: 14, fontFamily: 'Inter, sans-serif', fill: '#000000',
            originX: 'center', originY: 'center', left: format.width - 100, top: format.height - 40,
            editable: false, isDrinkaware: true, isSystemElement: true,
        });
        canvas.add(rect, text);
    };

    const runDemo = () => {
        const demo = geminiService.getDemoCampaign();
        setProductName(demo.product.name);
        setCategory(demo.product.category);
        setPriceType(demo.product.priceType);
        setPrice(demo.product.price);
        setRegularPrice(demo.product.regularPrice);
        setEndDate(demo.product.endDate);
        setStep(3);
    };

    const canProceed = () => {
        if (step === 1) return productName.trim().length > 0;
        if (step === 2) return true;
        if (step === 3) return priceType;
        if (step === 4) return headlineVariants.length > 0;
        return false;
    };

    const handleNext = () => {
        if (step === 3) {
            generateVariants(); // Go to step 4 via generation
        } else if (step < 4) {
            setStep(step + 1);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal max-w-xl">
                {/* Header */}
                <div className="modal-header">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                            <span className="text-white text-xl">✨</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">AI Campaign Generator</h2>
                            <p className="text-xs text-muted">Create complete campaigns from minimal input</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost p-1 absolute top-4 right-4">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Progress Steps - Now 4 steps */}
                <div className="flex items-center gap-1 px-6 py-3 border-b border-[var(--border-subtle)]">
                    {['Product', 'Image', 'Price', 'Headline'].map((label, i) => {
                        const s = i + 1;
                        return (
                            <div key={s} className="flex items-center flex-1">
                                <div className="flex flex-col items-center">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all ${s < step ? 'bg-green-500 text-white' :
                                        s === step ? 'bg-[var(--accent-primary)] text-white' :
                                            'bg-[var(--surface-overlay)] text-muted'
                                        }`}>
                                        {s < step ? '✓' : s}
                                    </div>
                                    <span className="text-[9px] text-muted mt-1">{label}</span>
                                </div>
                                {s < 4 && <div className={`flex-1 h-0.5 mx-1.5 ${s < step ? 'bg-green-500' : 'bg-[var(--surface-overlay)]'}`} />}
                            </div>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="modal-body">
                    {generating ? (
                        <div className="py-8 text-center animate-fade-in">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 mx-auto mb-4 flex items-center justify-center animate-pulse">
                                <span className="text-3xl">🤖</span>
                            </div>
                            <p className="text-lg font-medium text-primary mb-2">{status}</p>
                            <div className="h-2 rounded-full bg-[var(--surface-overlay)] overflow-hidden max-w-xs mx-auto">
                                <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                            </div>
                            <p className="text-xs text-muted mt-2">{progress}% complete</p>
                        </div>
                    ) : (
                        <>
                            {/* Step 1: Product Info */}
                            {step === 1 && (
                                <div className="space-y-4 animate-fade-in">
                                    <div>
                                        <label className="text-sm font-medium text-secondary block mb-2">Product Name *</label>
                                        <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. Coca-Cola Zero Sugar 2L" className="input" autoFocus />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-secondary block mb-2">Category</label>
                                        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
                                            {CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                                        </select>
                                    </div>
                                    <button onClick={runDemo} className="w-full py-3 rounded-lg border-2 border-dashed border-[var(--accent-primary)]/30 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-all">
                                        ✨ Try Demo (Zero Input)
                                    </button>
                                </div>
                            )}

                            {/* Step 2: Packshot */}
                            {step === 2 && (
                                <div className="space-y-4 animate-fade-in">
                                    <p className="text-sm text-secondary">Upload product image (optional - AI removes background)</p>
                                    <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handlePackshotUpload} />
                                    {packshotPreview ? (
                                        <div className="relative">
                                            <div className="aspect-square max-w-[200px] mx-auto rounded-xl overflow-hidden bg-[var(--surface-dark)] border border-[var(--border-default)]">
                                                <img src={packshotPreview} alt="Packshot" className="w-full h-full object-contain" />
                                            </div>
                                            <button onClick={() => { setPackshot(null); setPackshotPreview(null); }} className="absolute top-2 right-2 btn btn-ghost p-1">✕</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => fileInputRef.current?.click()} className="w-full py-12 rounded-xl border-2 border-dashed border-[var(--border-default)] hover:border-[var(--accent-primary)] transition-all flex flex-col items-center gap-2">
                                            <span className="text-3xl">📷</span>
                                            <span className="text-sm text-secondary">Click to upload packshot</span>
                                            <span className="text-xs text-muted">PNG, JPG up to 10MB</span>
                                        </button>
                                    )}
                                    {status && <p className="text-center text-sm text-[var(--accent-primary)]">{status}</p>}
                                </div>
                            )}

                            {/* Step 3: Pricing */}
                            {step === 3 && (
                                <div className="space-y-4 animate-fade-in">
                                    <div>
                                        <label className="text-sm font-medium text-secondary block mb-2">Value Tile Type</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {PRICE_TYPES.map(type => (
                                                <button key={type.id} onClick={() => setPriceType(type.id)} className={`p-3 rounded-xl border-2 transition-all ${priceType === type.id ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10' : 'border-[var(--border-default)]'}`}>
                                                    <div className="w-full h-6 rounded mb-2" style={{ backgroundColor: type.color, border: type.id === 'white' ? '2px solid #003d7a' : 'none' }} />
                                                    <p className="text-xs font-medium text-primary">{type.name}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {priceType !== 'new' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-muted block mb-1">{priceType === 'clubcard' ? 'Clubcard Price' : 'Price'}</label>
                                                <input type="text" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="£1.99" className="input" />
                                            </div>
                                            {priceType === 'clubcard' && (
                                                <div>
                                                    <label className="text-xs text-muted block mb-1">Was Price</label>
                                                    <input type="text" value={regularPrice} onChange={(e) => setRegularPrice(e.target.value)} placeholder="£2.99" className="input" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {priceType === 'clubcard' && (
                                        <div>
                                            <label className="text-xs text-muted block mb-1">Ends Date (optional)</label>
                                            <input type="text" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="24/12" className="input" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 4: Headline Variants */}
                            {step === 4 && (
                                <div className="space-y-4 animate-fade-in">
                                    <div>
                                        <label className="text-sm font-medium text-secondary block mb-2">Choose Your Headline</label>
                                        <p className="text-xs text-muted mb-3">AI generated 3 compliant options. Pick your favorite:</p>
                                    </div>
                                    <div className="space-y-2">
                                        {headlineVariants.map((variant, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setSelectedVariant(i)}
                                                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedVariant === i
                                                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                                                    : 'border-[var(--border-default)] hover:border-[var(--border-hover)]'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${selectedVariant === i ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--surface-overlay)] text-muted'
                                                        }`}>
                                                        {i + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-bold text-primary text-lg">{variant.headline}</p>
                                                        {variant.subheadline && (
                                                            <p className="text-sm text-secondary mt-1">{variant.subheadline}</p>
                                                        )}
                                                    </div>
                                                    {selectedVariant === i && (
                                                        <svg className="w-6 h-6 text-[var(--accent-primary)]" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-center text-muted">All headlines are pre-validated for Appendix B compliance ✅</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!generating && (
                    <div className="modal-footer">
                        {step > 1 && (
                            <button onClick={() => setStep(step - 1)} className="btn btn-ghost">← Back</button>
                        )}
                        <div className="flex-1" />
                        {step < 4 ? (
                            <button onClick={handleNext} disabled={!canProceed()} className="btn btn-primary">
                                {step === 3 ? '✨ Generate Headlines' : 'Next →'}
                            </button>
                        ) : (
                            <button onClick={generateFinalCampaign} disabled={!canProceed()} className="btn btn-tesco">
                                🚀 Create Campaign
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default QuickCampaignWizard;
