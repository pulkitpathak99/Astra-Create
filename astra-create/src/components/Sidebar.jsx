import { useRef, useState } from 'react';
import { FabricImage, IText, Rect } from 'fabric';
import useStore, { TEMPLATE_LIBRARY, FORMAT_PRESETS } from '../store/useStore';

const VALUE_TILES = [
    { id: 'new', name: 'NEW', bg: '#e51c23', text: '#fff', w: 100, h: 45 },
    { id: 'clubcard', name: 'Clubcard Price', bg: '#003d7a', text: '#fff', w: 160, h: 50 },
    { id: 'low-price', name: 'Low Everyday Price', bg: '#fff', text: '#003d7a', w: 180, h: 45, border: '#003d7a' },
    { id: 'offer', name: 'Special Offer', bg: '#ffd700', text: '#000', w: 150, h: 45 },
];

export function Sidebar() {
    const fileInputRef = useRef(null);
    const bgInputRef = useRef(null);
    const [processingBg, setProcessingBg] = useState(false);

    const {
        canvas, savedColors, addSavedColor,
        backgroundColor, setBackgroundColor,
        isAlcoholProduct, setIsAlcoholProduct,
        saveToHistory, updateLayers, setCurrentFormat,
        currentFormat, activePanel, setActivePanel,
    } = useStore();

    // Upload packshot/product image
    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !canvas) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const format = FORMAT_PRESETS[currentFormat];
                const scale = Math.min(0.4, (format.width * 0.5) / img.width);

                const fabricImg = new FabricImage(img, {
                    left: format.width / 2,
                    top: format.height / 2,
                    scaleX: scale,
                    scaleY: scale,
                    originX: 'center',
                    originY: 'center',
                    customName: 'Product Image',
                });

                canvas.add(fabricImg);
                canvas.setActiveObject(fabricImg);
                canvas.renderAll();
                saveToHistory();
                updateLayers();
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // Upload background
    const handleBackgroundUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !canvas) return;

        setProcessingBg(true);
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const format = FORMAT_PRESETS[currentFormat];

                // Remove existing background images
                canvas.getObjects().forEach(o => {
                    if (o.isBackground) canvas.remove(o);
                });

                const scaleX = format.width / img.width;
                const scaleY = format.height / img.height;
                const scale = Math.max(scaleX, scaleY);

                const fabricImg = new FabricImage(img, {
                    left: 0, top: 0,
                    scaleX: scale,
                    scaleY: scale,
                    selectable: false,
                    evented: false,
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

    // Add text
    const addText = (preset = 'heading') => {
        if (!canvas) return;
        const format = FORMAT_PRESETS[currentFormat];

        const presets = {
            heading: { text: 'Your Headline', fontSize: 72, fontWeight: 'bold' },
            subheading: { text: 'Subheading text', fontSize: 48, fontWeight: 'normal' },
            body: { text: 'Body copy goes here', fontSize: 32, fontWeight: 'normal' },
        };
        const p = presets[preset];

        const text = new IText(p.text, {
            left: format.width / 2,
            top: format.height / 2,
            originX: 'center',
            originY: 'center',
            fontFamily: 'Inter, sans-serif',
            fontSize: p.fontSize,
            fontWeight: p.fontWeight,
            fill: '#000000',
            customName: preset.charAt(0).toUpperCase() + preset.slice(1),
        });

        canvas.add(text);
        canvas.setActiveObject(text);
        canvas.renderAll();
        saveToHistory();
        updateLayers();
    };

    // Add value tile
    const addValueTile = (tile) => {
        if (!canvas) return;
        const format = FORMAT_PRESETS[currentFormat];

        const rect = new Rect({
            width: tile.w, height: tile.h,
            fill: tile.bg,
            rx: 4, ry: 4,
            stroke: tile.border || null,
            strokeWidth: tile.border ? 2 : 0,
        });

        const text = new IText(tile.name, {
            fontSize: 18,
            fontWeight: 'bold',
            fontFamily: 'Inter, sans-serif',
            fill: tile.text,
            originX: 'center',
            originY: 'center',
        });

        // Create group manually
        canvas.add(rect);
        canvas.add(text);

        rect.set({
            left: format.width / 2 - tile.w / 2,
            top: format.height - 150,
            isValueTile: true,
            customName: tile.name,
        });

        text.set({
            left: format.width / 2,
            top: format.height - 150 + tile.h / 2,
            isValueTile: true,
            editable: false,
        });

        canvas.renderAll();
        saveToHistory();
        updateLayers();
    };

    // Add Drinkaware lockup
    const addDrinkaware = () => {
        if (!canvas) return;
        const format = FORMAT_PRESETS[currentFormat];

        const rect = new Rect({
            width: 180, height: 24,
            fill: '#ffffff',
            rx: 2, ry: 2,
        });

        const text = new IText('drinkaware.co.uk', {
            fontSize: 14,
            fontFamily: 'Inter, sans-serif',
            fill: '#000000',
            editable: false,
        });

        canvas.add(rect);
        canvas.add(text);

        rect.set({
            left: format.width - 200,
            top: format.height - 50,
            isDrinkaware: true,
            customName: 'Drinkaware',
        });

        text.set({
            left: format.width - 190,
            top: format.height - 47,
            isDrinkaware: true,
        });

        canvas.renderAll();
        saveToHistory();
        updateLayers();
    };

    // Apply template
    const applyTemplate = (template) => {
        if (!canvas) return;

        // Clear canvas
        canvas.clear();
        canvas.backgroundColor = '#ffffff';

        // Switch format if needed
        if (template.format !== currentFormat) {
            setCurrentFormat(template.format);
            return; // Format change will recreate canvas
        }

        // Will implement full template rendering
        // For now, just set a background color based on template
        canvas.backgroundColor = template.elements[0]?.props?.fill || '#ffffff';
        canvas.renderAll();
        saveToHistory();
    };

    return (
        <div className="w-80 bg-gray-900/90 border-r border-white/10 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/10">
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="text-2xl">✦</span>
                    <span className="bg-gradient-to-r from-tesco-red to-orange-400 bg-clip-text text-transparent">
                        AstraCreate
                    </span>
                </h1>
                <p className="text-xs text-white/50 mt-1">Retail Media Creative Builder</p>
            </div>

            {/* Tab navigation */}
            <div className="flex border-b border-white/10">
                {[
                    { id: 'assets', icon: '📦', label: 'Assets' },
                    { id: 'templates', icon: '📐', label: 'Templates' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActivePanel(tab.id)}
                        className={`flex-1 py-2 text-sm font-medium transition-colors ${activePanel === tab.id
                                ? 'bg-white/10 text-white border-b-2 border-tesco-red'
                                : 'text-white/50 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <span className="mr-1">{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto">
                {activePanel === 'assets' && (
                    <div className="p-4 space-y-5">
                        {/* Upload buttons */}
                        <div>
                            <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                                Import Assets
                            </h3>
                            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
                            <input type="file" ref={bgInputRef} accept="image/*" className="hidden" onChange={handleBackgroundUpload} />

                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => fileInputRef.current?.click()} className="btn-primary text-sm py-2">
                                    📷 Packshot
                                </button>
                                <button onClick={() => bgInputRef.current?.click()} className="btn-secondary text-sm py-2">
                                    {processingBg ? '...' : '🖼️ Background'}
                                </button>
                            </div>
                        </div>

                        {/* Text elements */}
                        <div>
                            <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                                Add Text
                            </h3>
                            <div className="space-y-2">
                                {['heading', 'subheading', 'body'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => addText(type)}
                                        className="w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded text-sm text-white/80 hover:text-white transition-colors capitalize"
                                    >
                                        {type === 'heading' && <span className="text-lg font-bold mr-2">H</span>}
                                        {type === 'subheading' && <span className="text-base font-semibold mr-2">S</span>}
                                        {type === 'body' && <span className="text-sm mr-2">T</span>}
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Value Tiles */}
                        <div>
                            <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                                Value Tiles
                            </h3>
                            <div className="space-y-2">
                                {VALUE_TILES.map(tile => (
                                    <button
                                        key={tile.id}
                                        onClick={() => addValueTile(tile)}
                                        className="w-full flex items-center gap-3 px-3 py-2 bg-white/5 hover:bg-white/10 rounded transition-colors"
                                    >
                                        <div
                                            className="w-10 h-6 rounded flex items-center justify-center text-[8px] font-bold"
                                            style={{ backgroundColor: tile.bg, color: tile.text, border: tile.border ? `1px solid ${tile.border}` : 'none' }}
                                        >
                                            {tile.name.split(' ')[0]}
                                        </div>
                                        <span className="text-sm text-white/80">{tile.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Background Color */}
                        <div>
                            <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                                Background Color
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {savedColors.map((color, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setBackgroundColor(color); addSavedColor(color); }}
                                        className={`w-7 h-7 rounded border-2 transition-all hover:scale-110 ${backgroundColor === color ? 'border-white scale-110' : 'border-transparent'
                                            }`}
                                        style={{ backgroundColor: color }}
                                        title={color}
                                    />
                                ))}
                                <input
                                    type="color"
                                    value={backgroundColor}
                                    onChange={(e) => { setBackgroundColor(e.target.value); addSavedColor(e.target.value); }}
                                    className="w-7 h-7 rounded cursor-pointer bg-transparent"
                                />
                            </div>
                        </div>

                        {/* Product Type */}
                        <div>
                            <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                                Product Settings
                            </h3>
                            <label className="flex items-center gap-3 cursor-pointer p-2 bg-white/5 rounded hover:bg-white/10 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={isAlcoholProduct}
                                    onChange={(e) => setIsAlcoholProduct(e.target.checked)}
                                    className="w-4 h-4 accent-tesco-red"
                                />
                                <span className="text-sm text-white/80">🍺 Alcohol Product</span>
                            </label>
                            {isAlcoholProduct && (
                                <button onClick={addDrinkaware} className="w-full mt-2 btn-secondary text-sm py-2">
                                    + Add Drinkaware Lockup
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {activePanel === 'templates' && (
                    <div className="p-4">
                        <p className="text-xs text-white/50 mb-3">Click a template to apply</p>
                        <div className="grid grid-cols-2 gap-3">
                            {TEMPLATE_LIBRARY.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => applyTemplate(t)}
                                    className="group relative aspect-square bg-white/5 rounded-lg overflow-hidden hover:ring-2 hover:ring-tesco-red transition-all"
                                >
                                    <div
                                        className="absolute inset-0 flex items-center justify-center text-4xl"
                                        style={{ backgroundColor: t.elements[0]?.props?.fill || '#ccc' }}
                                    >
                                        {t.category === 'Promotion' && '🏷️'}
                                        {t.category === 'Launch' && '🚀'}
                                        {t.category === 'Value' && '💰'}
                                        {t.category === 'Story' && '📱'}
                                        {t.category === 'Clubcard' && '💳'}
                                        {t.category === 'Facebook' && '👍'}
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                        <p className="text-xs font-medium text-white truncate">{t.name}</p>
                                        <p className="text-[10px] text-white/60">{FORMAT_PRESETS[t.format]?.name}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Sidebar;
