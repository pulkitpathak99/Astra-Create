import React, { useState, useCallback } from 'react';
import { FabricImage, IText, Rect } from 'fabric';
import useStore, { FORMAT_PRESETS } from '../store/useStore';

/**
 * Demo Gallery - Showcase of AI-generated creatives
 * Demonstrates autonomous creative generation capabilities
 */

// Pre-generated demo creatives for different categories
const DEMO_CREATIVES = [
    {
        id: 'coca-cola',
        product: {
            name: 'Coca-Cola Zero Sugar 2L',
            brand: 'Coca-Cola',
            category: 'Food & Drink',
            isAlcohol: false,
        },
        variants: [
            {
                headline: 'Zero Sugar, Full Taste',
                subheadline: 'The refreshing choice',
                backgroundColor: '#1a1a1a',
                headlineColor: '#ffffff',
                accentColor: '#e51c23',
                priceType: 'clubcard',
                price: '£1.75',
                wasPrice: '£2.50',
            },
            {
                headline: 'Refresh Your Day',
                subheadline: 'Clubcard exclusive savings',
                backgroundColor: '#0d0d0d',
                headlineColor: '#ffffff',
                accentColor: '#e51c23',
                priceType: 'clubcard',
                price: '£1.75',
                wasPrice: '£2.50',
            },
        ],
        generationTime: 2.3,
    },
    {
        id: 'heineken',
        product: {
            name: 'Heineken Lager 6x330ml',
            brand: 'Heineken',
            category: 'Alcohol',
            isAlcohol: true,
        },
        variants: [
            {
                headline: 'Premium Lager',
                subheadline: 'Brewed with passion',
                backgroundColor: '#1a472a',
                headlineColor: '#ffffff',
                accentColor: '#00a650',
                priceType: 'clubcard',
                price: '£6.50',
                wasPrice: '£8.00',
            },
            {
                headline: 'Taste Excellence',
                subheadline: 'Only at Tesco',
                backgroundColor: '#0f2417',
                headlineColor: '#ffffff',
                accentColor: '#00a650',
                priceType: 'white',
                price: '£7.00',
            },
        ],
        generationTime: 2.8,
    },
    {
        id: 'pampers',
        product: {
            name: 'Pampers Baby-Dry Size 4',
            brand: 'Pampers',
            category: 'Baby',
            isAlcohol: false,
        },
        variants: [
            {
                headline: 'Happy Baby, Happy You',
                subheadline: '12 hours of dryness',
                backgroundColor: '#fff5f5',
                headlineColor: '#333333',
                accentColor: '#ff6b9d',
                priceType: 'new',
            },
            {
                headline: 'Trusted Protection',
                subheadline: 'For peaceful nights',
                backgroundColor: '#fef6f9',
                headlineColor: '#333333',
                accentColor: '#ff6b9d',
                priceType: 'clubcard',
                price: '£8.50',
                wasPrice: '£12.00',
            },
        ],
        generationTime: 1.9,
    },
    {
        id: 'persil',
        product: {
            name: 'Persil Non-Bio 52 Washes',
            brand: 'Persil',
            category: 'Household',
            isAlcohol: false,
        },
        variants: [
            {
                headline: 'Brilliant Clean',
                subheadline: 'Gentle on skin',
                backgroundColor: '#e3f2fd',
                headlineColor: '#1a1a1a',
                accentColor: '#3498db',
                priceType: 'clubcard',
                price: '£9.00',
                wasPrice: '£14.00',
            },
            {
                headline: 'Family Favourite',
                subheadline: 'The trusted choice',
                backgroundColor: '#f0f8ff',
                headlineColor: '#1a1a1a',
                accentColor: '#3498db',
                priceType: 'white',
                price: '£10.00',
            },
        ],
        generationTime: 2.1,
    },
    // NEW PRODUCTS ADDED
    {
        id: 'strawberries',
        product: {
            name: 'British Strawberries 400g',
            brand: 'Tesco Fresh',
            category: 'Fresh',
            isAlcohol: false,
        },
        variants: [
            {
                headline: 'Freshly Picked',
                subheadline: 'British farm to table',
                backgroundColor: '#2d5a3d',
                headlineColor: '#ffffff',
                accentColor: '#ff6b6b',
                priceType: 'new',
            },
            {
                headline: 'Summer Sweetness',
                subheadline: 'In season now',
                backgroundColor: '#1e3a2f',
                headlineColor: '#ffffff',
                accentColor: '#ff6b6b',
                priceType: 'white',
                price: '£2.50',
            },
            {
                headline: 'Nature\'s Best',
                subheadline: 'Hand-selected quality',
                backgroundColor: '#4a7c5c',
                headlineColor: '#ffffff',
                accentColor: '#ff4444',
                priceType: 'clubcard',
                price: '£2.00',
                wasPrice: '£2.50',
            },
        ],
        generationTime: 1.7,
    },
    {
        id: 'sourdough',
        product: {
            name: 'Tesco Finest Sourdough 400g',
            brand: 'Tesco Finest',
            category: 'Bakery',
            isAlcohol: false,
        },
        variants: [
            {
                headline: 'Artisan Baked',
                subheadline: 'Slow fermented perfection',
                backgroundColor: '#3d2c1e',
                headlineColor: '#f5e6d3',
                accentColor: '#d4a574',
                priceType: 'new',
            },
            {
                headline: 'Crusty Goodness',
                subheadline: 'Baked fresh daily',
                backgroundColor: '#2a1f14',
                headlineColor: '#f5e6d3',
                accentColor: '#c9956c',
                priceType: 'white',
                price: '£1.80',
            },
        ],
        generationTime: 1.5,
    },
    {
        id: 'ben-jerrys',
        product: {
            name: 'Ben & Jerry\'s Cookie Dough 465ml',
            brand: 'Ben & Jerry\'s',
            category: 'Frozen',
            isAlcohol: false,
        },
        variants: [
            {
                headline: 'Indulge Tonight',
                subheadline: 'Cookie dough chunks galore',
                backgroundColor: '#1a1a2e',
                headlineColor: '#ffffff',
                accentColor: '#5dade2',
                priceType: 'clubcard',
                price: '£3.75',
                wasPrice: '£5.25',
            },
            {
                headline: 'Treat Yourself',
                subheadline: 'You deserve this',
                backgroundColor: '#16213e',
                headlineColor: '#ffffff',
                accentColor: '#48c9b0',
                priceType: 'clubcard',
                price: '£3.75',
                wasPrice: '£5.25',
            },
            {
                headline: 'Euphoria In A Tub',
                subheadline: 'The ultimate ice cream',
                backgroundColor: '#0f0f23',
                headlineColor: '#ffffff',
                accentColor: '#e74c3c',
                priceType: 'new',
            },
        ],
        generationTime: 2.0,
    },
    {
        id: 'pedigree',
        product: {
            name: 'Pedigree Adult Dog Food 12kg',
            brand: 'Pedigree',
            category: 'Pet',
            isAlcohol: false,
        },
        variants: [
            {
                headline: 'Happy, Healthy Dog',
                subheadline: 'Complete nutrition',
                backgroundColor: '#f0f8e8',
                headlineColor: '#1a472a',
                accentColor: '#27ae60',
                priceType: 'clubcard',
                price: '£18.00',
                wasPrice: '£24.00',
            },
            {
                headline: 'Tail-Wagging Taste',
                subheadline: 'Dogs love it',
                backgroundColor: '#e8f5e9',
                headlineColor: '#2e7d32',
                accentColor: '#4caf50',
                priceType: 'white',
                price: '£20.00',
            },
        ],
        generationTime: 1.8,
    },
];

// Export for use in sidebar gallery
export { DEMO_CREATIVES };

export function DemoGallery({ onClose, onApply }) {
    const [selectedDemo, setSelectedDemo] = useState(0);
    const [selectedVariant, setSelectedVariant] = useState(0);
    const [previewFormat, setPreviewFormat] = useState('instagram-feed');
    const [applying, setApplying] = useState(false);

    const { canvas, saveToHistory, updateLayers, setBackgroundColor, setIsAlcoholProduct, currentFormat } = useStore();

    const currentDemo = DEMO_CREATIVES[selectedDemo];
    const currentVariantData = currentDemo.variants[selectedVariant];
    const format = FORMAT_PRESETS[previewFormat];

    // Apply demo to canvas
    const handleApply = useCallback(async () => {
        if (!canvas) return;

        setApplying(true);

        try {
            // Clear canvas
            canvas.getObjects().forEach(obj => {
                if (!obj.isSafeZone) canvas.remove(obj);
            });

            // Set background
            canvas.backgroundColor = currentVariantData.backgroundColor;
            setBackgroundColor(currentVariantData.backgroundColor);

            const targetFormat = FORMAT_PRESETS[currentFormat];
            const layout = {
                headlineY: 0.25,
                subY: 0.38,
                packY: 0.55,
                tileY: 0.82,
            };

            // Add headline
            const headline = new IText(currentVariantData.headline, {
                left: targetFormat.width / 2,
                top: targetFormat.height * layout.headlineY,
                originX: 'center',
                originY: 'center',
                fontFamily: 'Inter, sans-serif',
                fontSize: 72,
                fontWeight: 'bold',
                fill: currentVariantData.headlineColor,
                textAlign: 'center',
                customName: 'Demo Headline',
            });
            canvas.add(headline);

            // Add subheadline
            const subheadline = new IText(currentVariantData.subheadline, {
                left: targetFormat.width / 2,
                top: targetFormat.height * layout.subY,
                originX: 'center',
                originY: 'center',
                fontFamily: 'Inter, sans-serif',
                fontSize: 36,
                fill: currentVariantData.headlineColor,
                opacity: 0.8,
                textAlign: 'center',
                customName: 'Demo Subheadline',
            });
            canvas.add(subheadline);

            // Add value tile - using exact same logic as Sidebar's addValueTile
            // VALUE_TILES definition matches Sidebar.jsx line 29-33
            const VALUE_TILES = [
                { id: 'new', name: 'NEW', bg: '#e51c23', text: '#ffffff', w: 120, h: 50, fontSize: 28, editable: false },
                { id: 'white', name: 'White', bg: '#ffffff', text: '#003d7a', w: 160, h: 60, fontSize: 24, editable: 'price', border: '#003d7a' },
                { id: 'clubcard', name: 'Clubcard', bg: '#003d7a', text: '#ffffff', w: 200, h: 80, fontSize: 20, editable: 'prices' },
            ];

            const tile = VALUE_TILES.find(t => t.id === currentVariantData.priceType) || VALUE_TILES[2];
            const formatConfig = targetFormat.config || { valueTileScale: 1.0 };
            let tileScale = formatConfig.valueTileScale || 1.0;

            // Robust fallback: ensure scale is correct for known formats if config is missing
            if (tileScale === 1.0 && currentFormat === 'instagram-feed') tileScale = 1.5;
            if (tileScale === 1.0 && currentFormat === 'instagram-story') tileScale = 1.8;
            if (tileScale === 1.0 && currentFormat === 'facebook-feed') tileScale = 1.2;
            if (tileScale === 1.0 && currentFormat === 'facebook-story') tileScale = 1.8;

            // Fixed position based on tile type (predefined positions per compliance)
            // Same as Sidebar.jsx lines 452-463
            let tilePositions = {
                'new': { x: targetFormat.width * 0.15, y: targetFormat.height - (60 * tileScale) },
                'white': { x: targetFormat.width * 0.5, y: targetFormat.height - (60 * tileScale) },
                'clubcard': { x: targetFormat.width * 0.5, y: targetFormat.height - (60 * tileScale) },
            };

            // If horizontal layout, adjust positions
            if (formatConfig.layout === 'horizontal') {
                tilePositions.new = { x: targetFormat.width * 0.85, y: targetFormat.height * 0.25 };
                tilePositions.white = { x: targetFormat.width * 0.85, y: targetFormat.height * 0.5 };
                tilePositions.clubcard = { x: targetFormat.width * 0.85, y: targetFormat.height * 0.5 };
            }

            const pos = tilePositions[tile.id] || { x: targetFormat.width / 2, y: targetFormat.height - (100 * tileScale) };

            // Create tile rect - exact same as Sidebar.jsx lines 467-489
            const tileRect = new Rect({
                width: tile.w * tileScale,
                height: tile.h * tileScale,
                fill: tile.bg,
                rx: 4 * tileScale,
                ry: 4 * tileScale,
                stroke: tile.border || null,
                strokeWidth: tile.border ? (2 * tileScale) : 0,
                originX: 'center',
                originY: 'center',
                left: pos.x,
                top: pos.y,
                // Locked - cannot be moved per compliance
                selectable: false,
                evented: false,
                lockMovementX: true,
                lockMovementY: true,
                lockRotation: true,
                lockScalingX: true,
                lockScalingY: true,
                hasControls: false,
                hasBorders: false,
                isValueTile: true,
                valueTileType: tile.id,
                customName: tile.name,
            });

            // Prepare display text based on tile type
            let displayText = tile.name;
            if (tile.id === 'white') displayText = currentVariantData.price || '£2.50';
            if (tile.id === 'clubcard') displayText = `${currentVariantData.price || '£1.50'}\nwas ${currentVariantData.wasPrice || '£2.00'}`;

            // Text editability depends on tile type per compliance
            const isEditable = tile.id !== 'new';

            // Create tile text - exact same as Sidebar.jsx lines 501-522
            const tileText = new IText(displayText, {
                fontSize: tile.fontSize * tileScale,
                fontWeight: 'bold',
                fontFamily: 'Inter, sans-serif',
                fill: tile.text,
                originX: 'center',
                originY: 'center',
                left: pos.x,
                top: pos.y,
                textAlign: 'center',
                // Editable for price tiles, but position is still locked
                selectable: isEditable,
                evented: isEditable,
                editable: isEditable,
                lockMovementX: true,
                lockMovementY: true,
                lockRotation: true,
                lockScalingX: true,
                lockScalingY: true,
                hasControls: false,
                isValueTile: true,
                valueTileType: tile.id,
                customName: `${tile.name} Text`,
            });

            canvas.add(tileRect);
            canvas.add(tileText);

            // Handle alcohol products
            if (currentDemo.product.isAlcohol) {
                setIsAlcoholProduct(true);
                const drinkRect = new Rect({
                    width: 180, height: 28, fill: '#ffffff', rx: 4, ry: 4,
                    originX: 'center', originY: 'center',
                    left: targetFormat.width - 100, top: targetFormat.height - 40,
                    isDrinkaware: true, customName: 'Drinkaware',
                });
                const drinkText = new IText('drinkaware.co.uk', {
                    fontSize: 14, fontFamily: 'Inter, sans-serif', fill: '#000000',
                    originX: 'center', originY: 'center',
                    left: targetFormat.width - 100, top: targetFormat.height - 40,
                    isDrinkaware: true,
                });
                canvas.add(drinkRect, drinkText);
            }

            // Add tag - must have correct format based on tile type
            // For Clubcard tiles: must include end date per compliance rules
            let tagText = 'Only at Tesco';
            if (currentVariantData.priceType === 'clubcard') {
                // Generate a demo end date (2 weeks from now)
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + 14);
                const dd = String(endDate.getDate()).padStart(2, '0');
                const mm = String(endDate.getMonth() + 1).padStart(2, '0');
                tagText = `Clubcard/app required. Ends ${dd}/${mm}`;
            }

            const tag = new IText(tagText, {
                left: targetFormat.width / 2,
                top: targetFormat.height - 50,
                originX: 'center',
                originY: 'center',
                fontFamily: 'Inter, sans-serif',
                fontSize: 18,
                fill: '#ffffff',
                backgroundColor: 'rgba(0,0,0,0.5)',
                padding: 8,
                isTag: true,
                customName: 'Tesco Tag',
            });
            canvas.add(tag);

            canvas.renderAll();
            saveToHistory();
            updateLayers();

            setApplying(false);
            onApply?.({ demo: currentDemo, variant: currentVariantData });
            onClose();
        } catch (err) {
            console.error('Apply demo failed:', err);
            setApplying(false);
        }
    }, [canvas, currentDemo, currentVariantData, currentFormat, setBackgroundColor, setIsAlcoholProduct, saveToHistory, updateLayers, onApply, onClose]);


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#12161c] border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <span className="text-xl">📸</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">AI Creative Gallery</h2>
                            <p className="text-xs text-slate-400">Demo creatives • Powered by Gemini AI</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                        ✕
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Product List - Horizontal on mobile, vertical on desktop */}
                        <div className="md:w-40 flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
                            {DEMO_CREATIVES.map((demo, i) => (
                                <button
                                    key={demo.id}
                                    onClick={() => { setSelectedDemo(i); setSelectedVariant(0); }}
                                    className={`flex-shrink-0 md:flex-shrink p-2 md:p-3 rounded-lg border-2 text-left transition-all ${selectedDemo === i
                                        ? 'border-purple-500 bg-purple-500/10'
                                        : 'border-white/10 hover:border-purple-500/50'
                                        }`}
                                >
                                    <p className="font-medium text-xs md:text-sm text-white truncate">{demo.product.name.split(' ').slice(0, 2).join(' ')}</p>
                                    <p className="text-[10px] text-slate-400">{demo.product.category}</p>
                                </button>
                            ))}
                        </div>

                        {/* Preview Area */}
                        <div className="flex-1 flex flex-col items-center">
                            {/* Preview Card */}
                            <div
                                className="w-full max-w-[240px] aspect-square rounded-xl overflow-hidden shadow-xl flex flex-col items-center justify-center p-4 relative"
                                style={{ backgroundColor: currentVariantData.backgroundColor }}
                            >
                                <p
                                    className="text-lg font-bold text-center mb-1 leading-tight"
                                    style={{ color: currentVariantData.headlineColor }}
                                >
                                    {currentVariantData.headline}
                                </p>
                                <p
                                    className="text-xs text-center opacity-80 mb-4"
                                    style={{ color: currentVariantData.headlineColor }}
                                >
                                    {currentVariantData.subheadline}
                                </p>

                                {/* Packshot Emoji */}
                                <div className="w-20 h-20 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center mb-4">
                                    <span className="text-4xl">{
                                        currentDemo.product.category === 'Alcohol' ? '🍺' :
                                            currentDemo.product.category === 'Baby' ? '👶' :
                                                currentDemo.product.category === 'Pet' ? '🐕' :
                                                    currentDemo.product.category === 'Frozen' ? '🍦' :
                                                        currentDemo.product.category === 'Cleaning' ? '🧹' :
                                                            '🛒'
                                    }</span>
                                </div>

                                {/* Value tile */}
                                <div
                                    className="px-3 py-1.5 rounded text-center text-sm"
                                    style={{
                                        backgroundColor: currentVariantData.priceType === 'clubcard' ? '#003d7a' :
                                            currentVariantData.priceType === 'new' ? '#e51c23' : '#ffffff',
                                        color: currentVariantData.priceType === 'white' ? '#003d7a' : '#ffffff',
                                        border: currentVariantData.priceType === 'white' ? '2px solid #003d7a' : 'none',
                                    }}
                                >
                                    {currentVariantData.priceType === 'new' && <span className="font-bold">NEW</span>}
                                    {currentVariantData.priceType === 'white' && <span className="font-bold">{currentVariantData.price}</span>}
                                    {currentVariantData.priceType === 'clubcard' && (
                                        <div>
                                            <span className="font-bold">{currentVariantData.price}</span>
                                            <span className="text-xs opacity-70 ml-1">was {currentVariantData.wasPrice}</span>
                                        </div>
                                    )}
                                </div>

                                {currentDemo.product.isAlcohol && (
                                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-white rounded text-[8px] text-black">
                                        drinkaware.co.uk
                                    </div>
                                )}
                            </div>

                            {/* Variant Selector */}
                            <div className="flex justify-center gap-2 mt-3">
                                {currentDemo.variants.map((v, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedVariant(i)}
                                        className={`w-10 h-10 rounded-lg border-2 transition-all ${selectedVariant === i
                                            ? 'border-purple-500 scale-110'
                                            : 'border-white/20'
                                            }`}
                                        style={{ backgroundColor: v.backgroundColor }}
                                    />
                                ))}
                            </div>

                            {/* Stats */}
                            <div className="flex justify-center gap-4 mt-3 text-center">
                                <div>
                                    <p className="text-lg font-bold text-green-400">{currentDemo.generationTime}s</p>
                                    <p className="text-[9px] text-slate-500">Gen Time</p>
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-purple-400">{currentDemo.variants.length}</p>
                                    <p className="text-[9px] text-slate-500">Variants</p>
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-blue-400">100%</p>
                                    <p className="text-[9px] text-slate-500">Compliant</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-white/5">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={applying}
                        className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {applying ? '⏳ Applying...' : '🎨 Apply to Canvas'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default DemoGallery;

