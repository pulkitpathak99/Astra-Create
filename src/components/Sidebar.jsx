import React, { useRef, useState } from 'react';
import { FabricImage, IText, Rect } from 'fabric';
import useStore, { TEMPLATE_LIBRARY, FORMAT_PRESETS } from '../store/useStore';
import { removeBackground } from '../utils/imageProcessing';
import geminiService from '../services/geminiService';

// Icon components
const Icons = {
    elements: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
    ),
    templates: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm10 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
        </svg>
    ),
    ai: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
        </svg>
    ),
};

// Value tile configs
const VALUE_TILES = [
    { id: 'new', name: 'NEW', bg: '#e51c23', text: '#ffffff', w: 120, h: 50, fontSize: 28, editable: false },
    { id: 'white', name: 'White', bg: '#ffffff', text: '#003d7a', w: 140, h: 55, fontSize: 24, editable: 'price', border: '#003d7a' },
    { id: 'clubcard', name: 'Clubcard', bg: '#003d7a', text: '#ffffff', w: 180, h: 70, fontSize: 20, editable: 'prices' },
];

export function Sidebar() {
    const fileInputRef = useRef(null);
    const bgInputRef = useRef(null);
    const bgRemoveInputRef = useRef(null);
    const logoInputRef = useRef(null);

    const [activeTab, setActiveTab] = useState('elements');
    const [processingBg, setProcessingBg] = useState(false);
    const [removingBg, setRemovingBg] = useState(false);

    // Value tile inputs
    const [whitePrice, setWhitePrice] = useState('£2.50');
    const [clubcardPrice, setClubcardPrice] = useState('£1.50');
    const [clubcardRegular, setClubcardRegular] = useState('£2.00');
    const [clubcardEndDate, setClubcardEndDate] = useState('');
    const [isExclusive, setIsExclusive] = useState(false);

    // AI inputs
    const [productName, setProductName] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState([]);

    const {
        canvas, savedColors, addSavedColor,
        backgroundColor, setBackgroundColor,
        isAlcoholProduct, setIsAlcoholProduct,
        saveToHistory, updateLayers, setCurrentFormat,
        currentFormat,
    } = useStore();

    const getPackshotCount = () => canvas?.getObjects().filter(o => o.isPackshot).length || 0;

    // Image handlers
    const handleImageUpload = async (e, withBgRemoval = false) => {
        const file = e.target.files?.[0];
        if (!file || !canvas) return;

        if (getPackshotCount() >= 3) {
            alert('Maximum 3 packshots allowed');
            return;
        }

        if (withBgRemoval) setRemovingBg(true);

        const reader = new FileReader();
        reader.onload = async (ev) => {
            const img = new Image();
            img.onload = async () => {
                let imgSrc = ev.target.result;

                if (withBgRemoval) {
                    try {
                        imgSrc = await removeBackground(img, { threshold: 30 });
                    } catch (err) {
                        console.error(err);
                    }
                }

                const processedImg = new Image();
                processedImg.onload = () => {
                    const format = FORMAT_PRESETS[currentFormat];
                    const maxSize = Math.min(format.width, format.height) * 0.4;
                    const scale = Math.min(maxSize / processedImg.width, maxSize / processedImg.height);

                    const fabricImg = new FabricImage(processedImg, {
                        left: format.width / 2,
                        top: format.height / 2,
                        scaleX: scale,
                        scaleY: scale,
                        originX: 'center',
                        originY: 'center',
                        customName: getPackshotCount() === 0 ? 'Lead Packshot' : `Packshot ${getPackshotCount() + 1}`,
                        isPackshot: true,
                        isLeadPackshot: getPackshotCount() === 0,
                    });

                    canvas.add(fabricImg);
                    canvas.setActiveObject(fabricImg);
                    canvas.renderAll();
                    saveToHistory();
                    updateLayers();
                    setRemovingBg(false);
                };
                processedImg.src = imgSrc;
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file || !canvas) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                canvas.getObjects().forEach(o => { if (o.isLogo) canvas.remove(o); });

                const scale = Math.min(120 / img.width, 60 / img.height);
                const fabricImg = new FabricImage(img, {
                    left: 40,
                    top: 40,
                    scaleX: scale,
                    scaleY: scale,
                    customName: 'Brand Logo',
                    isLogo: true,
                });

                canvas.add(fabricImg);
                canvas.renderAll();
                saveToHistory();
                updateLayers();
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleBackgroundUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file || !canvas) return;

        setProcessingBg(true);
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const format = FORMAT_PRESETS[currentFormat];
                canvas.getObjects().forEach(o => { if (o.isBackground) canvas.remove(o); });

                const scale = Math.max(format.width / img.width, format.height / img.height);
                const fabricImg = new FabricImage(img, {
                    left: 0, top: 0,
                    scaleX: scale, scaleY: scale,
                    selectable: false, evented: false,
                    isBackground: true,
                    customName: 'Background',
                });

                canvas.add(fabricImg);
                canvas.sendObjectToBack(fabricImg);
                canvas.renderAll();
                saveToHistory();
                setProcessingBg(false);
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // Text handlers
    const addText = (type) => {
        if (!canvas) return;
        const format = FORMAT_PRESETS[currentFormat];

        const presets = {
            heading: { text: 'Your Headline', size: 72, weight: 'bold', y: 0.3 },
            subheading: { text: 'Subheading text', size: 48, weight: '500', y: 0.42 },
            body: { text: 'Body copy', size: 32, weight: 'normal', y: 0.52 },
        };
        const p = presets[type];

        const text = new IText(p.text, {
            left: format.width / 2,
            top: format.height * p.y,
            originX: 'center',
            originY: 'center',
            fontFamily: 'Inter, sans-serif',
            fontSize: p.size,
            fontWeight: p.weight,
            fill: '#000000',
            customName: type.charAt(0).toUpperCase() + type.slice(1),
        });

        canvas.add(text);
        canvas.setActiveObject(text);
        canvas.renderAll();
        saveToHistory();
        updateLayers();
    };

    // Value tile handler
    const addValueTile = (tile) => {
        if (!canvas) return;
        const format = FORMAT_PRESETS[currentFormat];
        const posY = format.height - 100;

        const rect = new Rect({
            width: tile.w, height: tile.h,
            fill: tile.bg,
            rx: 4, ry: 4,
            stroke: tile.border || null,
            strokeWidth: tile.border ? 2 : 0,
            originX: 'center', originY: 'center',
            left: format.width / 2, top: posY,
            selectable: false, evented: false,
            isValueTile: true,
            valueTileType: tile.id,
            customName: tile.name,
        });

        let displayText = tile.name;
        if (tile.id === 'white') displayText = whitePrice;
        if (tile.id === 'clubcard') displayText = `${clubcardPrice}\nwas ${clubcardRegular}`;

        const text = new IText(displayText, {
            fontSize: tile.fontSize,
            fontWeight: 'bold',
            fontFamily: 'Inter, sans-serif',
            fill: tile.text,
            originX: 'center', originY: 'center',
            left: format.width / 2, top: posY,
            textAlign: 'center',
            selectable: false, evented: false,
            isValueTile: true,
            valueTileType: tile.id,
        });

        canvas.add(rect);
        canvas.add(text);
        canvas.renderAll();
        saveToHistory();
        updateLayers();
    };

    // Tag handler
    const addTag = () => {
        if (!canvas) return;
        const format = FORMAT_PRESETS[currentFormat];

        let tagText = isExclusive ? 'Only at Tesco' : 'Available at Tesco';
        const hasClubcard = canvas.getObjects().some(o => o.valueTileType === 'clubcard');
        if (hasClubcard && clubcardEndDate) {
            tagText = `Clubcard/app required. Ends ${clubcardEndDate}`;
        }

        const text = new IText(tagText, {
            left: format.width / 2,
            top: format.height - 40,
            originX: 'center', originY: 'center',
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            fill: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: 8,
            customName: 'Tag',
            isTag: true,
        });

        canvas.add(text);
        canvas.renderAll();
        saveToHistory();
        updateLayers();
    };

    // Drinkaware handler
    const addDrinkaware = () => {
        if (!canvas) return;
        const format = FORMAT_PRESETS[currentFormat];

        const rect = new Rect({
            width: 180, height: 28,
            fill: '#ffffff',
            rx: 4, ry: 4,
            originX: 'center', originY: 'center',
        });

        const text = new IText('drinkaware.co.uk', {
            fontSize: 14,
            fontFamily: 'Inter, sans-serif',
            fill: '#000000',
            originX: 'center', originY: 'center',
            editable: false,
        });

        const posX = format.width - 100;
        const posY = format.height - 40;

        rect.set({ left: posX, top: posY, isDrinkaware: true, customName: 'Drinkaware' });
        text.set({ left: posX, top: posY, isDrinkaware: true });

        canvas.add(rect, text);
        canvas.renderAll();
        saveToHistory();
        updateLayers();
    };

    // Template handler
    const applyTemplate = (template) => {
        if (!canvas) return;

        if (template.format !== currentFormat) {
            setCurrentFormat(template.format);
            setTimeout(() => applyTemplate(template), 100);
            return;
        }

        const format = FORMAT_PRESETS[currentFormat];
        canvas.getObjects().forEach(obj => { if (!obj.isSafeZone) canvas.remove(obj); });
        canvas.backgroundColor = template.elements[0]?.props?.fill || '#ffffff';
        canvas.renderAll();
        saveToHistory();
        updateLayers();
    };

    // AI copy generation
    const generateAICopy = async () => {
        if (!productName.trim()) return;
        setAiLoading(true);

        try {
            const result = await geminiService.generateCopySuggestions({
                productName,
                tone: 'friendly',
                format: currentFormat,
            });
            if (result.suggestions) setAiSuggestions(result.suggestions);
        } catch (err) {
            console.error(err);
        }
        setAiLoading(false);
    };

    const applySuggestion = (suggestion) => {
        if (!canvas) return;
        const format = FORMAT_PRESETS[currentFormat];

        const headline = new IText(suggestion.headline, {
            left: format.width / 2,
            top: format.height * 0.35,
            originX: 'center', originY: 'center',
            fontFamily: 'Inter, sans-serif',
            fontSize: 72,
            fontWeight: 'bold',
            fill: '#000000',
            customName: 'AI Headline',
        });

        canvas.add(headline);

        if (suggestion.subheadline) {
            const sub = new IText(suggestion.subheadline, {
                left: format.width / 2,
                top: format.height * 0.48,
                originX: 'center', originY: 'center',
                fontFamily: 'Inter, sans-serif',
                fontSize: 40,
                fill: '#333333',
                customName: 'AI Subheadline',
            });
            canvas.add(sub);
        }

        canvas.renderAll();
        saveToHistory();
        updateLayers();
        setAiSuggestions([]);
    };

    const packshotCount = getPackshotCount();

    // Render panel content based on active tab
    const renderPanelContent = () => {
        switch (activeTab) {
            case 'elements':
                return (
                    <div className="space-y-6 animate-fade-in">
                        {/* Packshots */}
                        <div className="section">
                            <div className="section-header">
                                <span className="section-title">Packshots</span>
                                <span className="badge badge-info">{packshotCount}/3</span>
                            </div>
                            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, false)} />
                            <input type="file" ref={bgRemoveInputRef} accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, true)} />

                            <div className="card-grid">
                                <button onClick={() => fileInputRef.current?.click()} disabled={packshotCount >= 3} className="btn btn-secondary text-xs disabled:opacity-40">
                                    📷 Upload
                                </button>
                                <button onClick={() => bgRemoveInputRef.current?.click()} disabled={removingBg || packshotCount >= 3} className="btn btn-secondary text-xs disabled:opacity-40" style={{ background: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
                                    {removingBg ? '⏳' : '✨'} No BG
                                </button>
                            </div>
                            {packshotCount === 0 && (
                                <p className="text-xs text-warning mt-2">Lead packshot required</p>
                            )}
                        </div>

                        {/* Logo */}
                        <div className="section">
                            <div className="section-header">
                                <span className="section-title">Logo</span>
                            </div>
                            <input type="file" ref={logoInputRef} accept="image/*" className="hidden" onChange={handleLogoUpload} />
                            <button onClick={() => logoInputRef.current?.click()} className="btn btn-secondary w-full text-xs">
                                🏷️ Upload Brand Logo
                            </button>
                        </div>

                        {/* Text */}
                        <div className="section">
                            <div className="section-header">
                                <span className="section-title">Text</span>
                            </div>
                            <div className="space-y-1.5">
                                {[
                                    { type: 'heading', label: 'Headline', req: true },
                                    { type: 'subheading', label: 'Subheading', req: true },
                                    { type: 'body', label: 'Body text', req: false },
                                ].map(item => (
                                    <button
                                        key={item.type}
                                        onClick={() => addText(item.type)}
                                        className="w-full text-left px-3 py-2 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--surface-overlay)] border border-[var(--border-subtle)] transition-all flex items-center justify-between"
                                    >
                                        <span className="text-xs text-secondary">{item.label}</span>
                                        {item.req && <span className="badge badge-warning">required</span>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Value Tiles */}
                        <div className="section">
                            <div className="section-header">
                                <span className="section-title">Value Tiles</span>
                            </div>

                            <button onClick={() => addValueTile(VALUE_TILES[0])} className="value-tile-btn value-tile-new w-full mb-2">
                                NEW
                            </button>

                            <div className="card mb-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <input type="text" value={whitePrice} onChange={(e) => setWhitePrice(e.target.value)} className="input input-sm flex-1" placeholder="£2.50" />
                                    <button onClick={() => addValueTile(VALUE_TILES[1])} className="btn btn-secondary text-xs px-3">Add</button>
                                </div>
                                <span className="text-[10px] text-muted">White Value Tile</span>
                            </div>

                            <div className="card" style={{ background: 'rgba(0, 61, 122, 0.2)', borderColor: 'rgba(0, 61, 122, 0.4)' }}>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <input type="text" value={clubcardPrice} onChange={(e) => setClubcardPrice(e.target.value)} className="input input-sm" placeholder="£1.50" />
                                    <input type="text" value={clubcardRegular} onChange={(e) => setClubcardRegular(e.target.value)} className="input input-sm" placeholder="was £2.00" />
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <input type="text" value={clubcardEndDate} onChange={(e) => setClubcardEndDate(e.target.value)} className="input input-sm flex-1" placeholder="DD/MM" />
                                    <button onClick={() => addValueTile(VALUE_TILES[2])} className="btn btn-secondary text-xs px-3">Add</button>
                                </div>
                                <span className="text-[10px] text-muted">Clubcard Price Tile</span>
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="section">
                            <div className="section-header">
                                <span className="section-title">Tags</span>
                            </div>
                            <label className="checkbox-label mb-2">
                                <input type="checkbox" checked={isExclusive} onChange={(e) => setIsExclusive(e.target.checked)} />
                                Exclusive to Tesco
                            </label>
                            <button onClick={addTag} className="btn btn-secondary w-full text-xs">
                                🏷️ Add Tag
                            </button>
                        </div>

                        {/* Background */}
                        <div className="section">
                            <div className="section-header">
                                <span className="section-title">Background</span>
                            </div>
                            <input type="file" ref={bgInputRef} accept="image/*" className="hidden" onChange={handleBackgroundUpload} />
                            <button onClick={() => bgInputRef.current?.click()} className="btn btn-secondary w-full text-xs mb-2">
                                {processingBg ? '⏳' : '🖼️'} Upload Image
                            </button>
                            <div className="flex flex-wrap gap-2">
                                {savedColors.map((color, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setBackgroundColor(color); addSavedColor(color); }}
                                        className={`color-swatch ${backgroundColor === color ? 'active' : ''}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                                <div className="relative">
                                    <input
                                        type="color"
                                        value={backgroundColor}
                                        onChange={(e) => { setBackgroundColor(e.target.value); addSavedColor(e.target.value); }}
                                        className="w-7 h-7 opacity-0 absolute inset-0 cursor-pointer"
                                    />
                                    <div className="color-swatch border-2 border-dashed border-[var(--border-default)] flex items-center justify-center text-muted text-sm">+</div>
                                </div>
                            </div>
                        </div>

                        {/* Alcohol */}
                        <div className="section">
                            <label className="checkbox-label card">
                                <input type="checkbox" checked={isAlcoholProduct} onChange={(e) => setIsAlcoholProduct(e.target.checked)} />
                                <span>🍺 Alcohol product</span>
                            </label>
                            {isAlcoholProduct && (
                                <button onClick={addDrinkaware} className="btn btn-warning w-full text-xs mt-2">
                                    + Drinkaware (required)
                                </button>
                            )}
                        </div>
                    </div>
                );

            case 'templates':
                return (
                    <div className="animate-fade-in">
                        <div className="grid grid-cols-2 gap-2">
                            {TEMPLATE_LIBRARY.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => applyTemplate(t)}
                                    className="card aspect-square relative overflow-hidden group hover:border-[var(--accent-primary)] transition-all"
                                >
                                    <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: t.elements[0]?.props?.fill || '#ccc' }}>
                                        <span className="text-2xl opacity-60">
                                            {t.category === 'Promotion' && '🏷️'}
                                            {t.category === 'Launch' && '🚀'}
                                            {t.category === 'Value' && '💰'}
                                            {t.category === 'Story' && '📱'}
                                            {t.category === 'Clubcard' && '💳'}
                                            {t.category === 'Facebook' && '👍'}
                                        </span>
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                                        <p className="text-[10px] font-medium text-white truncate">{t.name}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                );

            case 'ai':
                return (
                    <div className="space-y-4 animate-fade-in">
                        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1))', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
                            <p className="text-xs text-secondary mb-3">Generate compelling copy with AI</p>
                            <input
                                type="text"
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                placeholder="Product name (e.g., Coca-Cola Zero)"
                                className="input mb-2"
                            />
                            <button
                                onClick={generateAICopy}
                                disabled={aiLoading || !geminiService.hasApiKey()}
                                className="btn btn-primary w-full"
                            >
                                {aiLoading ? '⏳ Generating...' : '✨ Generate Copy'}
                            </button>
                        </div>

                        {aiSuggestions.length > 0 && (
                            <div className="space-y-2">
                                <span className="section-title">Suggestions</span>
                                {aiSuggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => applySuggestion(s)}
                                        className="w-full text-left card hover:border-[var(--accent-secondary)]"
                                    >
                                        <p className="font-semibold text-sm text-primary">{s.headline}</p>
                                        {s.subheadline && <p className="text-xs text-secondary mt-1">{s.subheadline}</p>}
                                    </button>
                                ))}
                            </div>
                        )}

                        {!geminiService.hasApiKey() && (
                            <div className="card" style={{ background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                                <p className="text-xs text-warning mb-2">Enter Gemini API key</p>
                                <input
                                    type="password"
                                    placeholder="API key"
                                    className="input input-sm"
                                    onBlur={(e) => {
                                        if (e.target.value) {
                                            geminiService.setApiKey(e.target.value);
                                            window.location.reload();
                                        }
                                    }}
                                />
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <>
            {/* Icon Rail */}
            <nav className="icon-rail">
                {[
                    { id: 'elements', icon: Icons.elements, label: 'Elements' },
                    { id: 'templates', icon: Icons.templates, label: 'Templates' },
                    { id: 'ai', icon: Icons.ai, label: 'AI' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`icon-rail-btn tooltip ${activeTab === tab.id ? 'active' : ''}`}
                        data-tooltip={tab.label}
                    >
                        {tab.icon}
                    </button>
                ))}
            </nav>

            {/* Panel */}
            <aside className="sidebar-panel">
                <div className="sidebar-header">
                    <h2>{activeTab === 'elements' ? 'Elements' : activeTab === 'templates' ? 'Templates' : 'AI Assistant'}</h2>
                </div>
                <div className="sidebar-content">
                    {renderPanelContent()}
                </div>
            </aside>
        </>
    );
}

export default Sidebar;
