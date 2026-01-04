import React, { useState, useCallback } from 'react';
import { FabricImage, IText, Rect, Circle, Ellipse } from 'fabric';
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
    // ============ SHAPE-BASED VISUAL CREATIVES ============
    {
        id: 'christmas-chocolate',
        product: {
            name: 'Lindt Lindor Selection Box',
            brand: 'Lindt',
            category: 'Seasonal',
            isAlcohol: false,
        },
        variants: [
            {
                headline: 'The Gift of Luxury',
                subheadline: 'Melt-in-mouth moments',
                backgroundColor: '#8B0000',
                headlineColor: '#FFD700',
                accentColor: '#FFD700',
                priceType: 'clubcard',
                price: '£6.00',
                wasPrice: '£10.00',
                designStyle: 'festive',
                shapes: [
                    { type: 'circle', x: 0.85, y: 0.15, size: 120, color: 'rgba(255,215,0,0.15)' },
                    { type: 'circle', x: 0.1, y: 0.85, size: 80, color: 'rgba(255,215,0,0.1)' },
                    { type: 'circle', x: 0.75, y: 0.75, size: 60, color: 'rgba(255,255,255,0.08)' },
                ],
            },
            {
                headline: 'Unwrap Joy',
                subheadline: 'Perfect for sharing',
                backgroundColor: '#1a472a',
                headlineColor: '#ffffff',
                accentColor: '#ff6b6b',
                priceType: 'new',
                designStyle: 'festive',
                shapes: [
                    { type: 'circle', x: 0.9, y: 0.1, size: 100, color: 'rgba(255,107,107,0.2)' },
                    { type: 'circle', x: 0.05, y: 0.9, size: 70, color: 'rgba(255,255,255,0.1)' },
                ],
            },
        ],
        generationTime: 2.2,
    },
    {
        id: 'energy-drink',
        product: {
            name: 'Monster Energy 4x500ml',
            brand: 'Monster',
            category: 'Energy',
            isAlcohol: false,
        },
        variants: [
            {
                headline: 'Unleash The Beast',
                subheadline: 'Maximum energy boost',
                backgroundColor: '#0a0a0a',
                headlineColor: '#00ff00',
                accentColor: '#00ff00',
                priceType: 'clubcard',
                price: '£4.50',
                wasPrice: '£6.00',
                designStyle: 'neon',
                shapes: [
                    { type: 'circle', x: 0.5, y: 0.5, size: 300, color: 'rgba(0,255,0,0.05)' },
                    { type: 'circle', x: 0.8, y: 0.2, size: 80, color: 'rgba(0,255,0,0.15)' },
                    { type: 'circle', x: 0.15, y: 0.8, size: 60, color: 'rgba(0,255,0,0.1)' },
                ],
            },
            {
                headline: 'Power Up',
                subheadline: 'Fuel your day',
                backgroundColor: '#1a1a2e',
                headlineColor: '#00d4ff',
                accentColor: '#00d4ff',
                priceType: 'white',
                price: '£5.00',
                designStyle: 'neon',
                shapes: [
                    { type: 'rect', x: 0, y: 0.4, w: 1.0, h: 0.02, color: 'rgba(0,212,255,0.3)' },
                    { type: 'rect', x: 0, y: 0.6, w: 1.0, h: 0.02, color: 'rgba(0,212,255,0.2)' },
                ],
            },
        ],
        generationTime: 1.6,
    },
    {
        id: 'premium-wine',
        product: {
            name: 'Moet & Chandon Champagne',
            brand: 'Moet',
            category: 'Alcohol',
            isAlcohol: true,
        },
        variants: [
            {
                headline: 'Celebrate In Style',
                subheadline: 'The art of celebration',
                backgroundColor: '#1a1a1a',
                headlineColor: '#d4af37',
                accentColor: '#d4af37',
                priceType: 'white',
                price: '£35.00',
                designStyle: 'luxury',
                shapes: [
                    { type: 'ellipse', x: 0.5, y: 0.3, rx: 200, ry: 100, color: 'rgba(212,175,55,0.08)' },
                    { type: 'circle', x: 0.85, y: 0.85, size: 40, color: 'rgba(212,175,55,0.2)' },
                    { type: 'circle', x: 0.9, y: 0.75, size: 25, color: 'rgba(212,175,55,0.15)' },
                ],
            },
            {
                headline: 'Make It Memorable',
                subheadline: 'Every sip tells a story',
                backgroundColor: '#0d0d1a',
                headlineColor: '#ffffff',
                accentColor: '#c9b037',
                priceType: 'clubcard',
                price: '£28.00',
                wasPrice: '£35.00',
                designStyle: 'luxury',
                shapes: [
                    { type: 'circle', x: 0.1, y: 0.1, size: 150, color: 'rgba(201,176,55,0.05)' },
                    { type: 'circle', x: 0.9, y: 0.9, size: 120, color: 'rgba(201,176,55,0.05)' },
                ],
            },
        ],
        generationTime: 2.5,
    },
    {
        id: 'skincare',
        product: {
            name: 'The Ordinary Niacinamide',
            brand: 'The Ordinary',
            category: 'Beauty',
            isAlcohol: false,
        },
        variants: [
            {
                headline: 'Science-Led Skincare',
                subheadline: 'Clinical results, fair price',
                backgroundColor: '#f5f5f5',
                headlineColor: '#1a1a1a',
                accentColor: '#ff6b9d',
                priceType: 'white',
                price: '£5.90',
                designStyle: 'minimal',
                shapes: [
                    { type: 'circle', x: 0.85, y: 0.15, size: 100, color: 'rgba(255,107,157,0.1)' },
                    { type: 'circle', x: 0.1, y: 0.7, size: 60, color: 'rgba(0,0,0,0.03)' },
                ],
            },
            {
                headline: 'Your Skin Deserves It',
                subheadline: 'Visible results in weeks',
                backgroundColor: '#fef6f9',
                headlineColor: '#333333',
                accentColor: '#e91e63',
                priceType: 'new',
                designStyle: 'minimal',
                shapes: [
                    { type: 'ellipse', x: 0.5, y: 0.85, rx: 250, ry: 80, color: 'rgba(233,30,99,0.05)' },
                ],
            },
            {
                headline: 'Glow From Within',
                subheadline: 'Cult favourite formula',
                backgroundColor: '#1a1a2e',
                headlineColor: '#ffffff',
                accentColor: '#9c27b0',
                priceType: 'clubcard',
                price: '£4.50',
                wasPrice: '£5.90',
                designStyle: 'modern',
                shapes: [
                    { type: 'circle', x: 0.2, y: 0.2, size: 180, color: 'rgba(156,39,176,0.08)' },
                    { type: 'circle', x: 0.8, y: 0.8, size: 140, color: 'rgba(156,39,176,0.06)' },
                ],
            },
        ],
        generationTime: 1.9,
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

            // ============ ADD DECORATIVE SHAPES (if available) ============
            if (currentVariantData.shapes && currentVariantData.shapes.length > 0) {
                currentVariantData.shapes.forEach((shape, idx) => {
                    let shapeObj;

                    if (shape.type === 'circle') {
                        shapeObj = new Circle({
                            left: targetFormat.width * shape.x,
                            top: targetFormat.height * shape.y,
                            radius: shape.size / 2,
                            fill: shape.color,
                            originX: 'center',
                            originY: 'center',
                            selectable: false,
                            evented: false,
                            customName: `Decorative Circle ${idx + 1}`,
                            isDecorativeShape: true,
                        });
                    } else if (shape.type === 'ellipse') {
                        shapeObj = new Ellipse({
                            left: targetFormat.width * shape.x,
                            top: targetFormat.height * shape.y,
                            rx: shape.rx,
                            ry: shape.ry,
                            fill: shape.color,
                            originX: 'center',
                            originY: 'center',
                            selectable: false,
                            evented: false,
                            customName: `Decorative Ellipse ${idx + 1}`,
                            isDecorativeShape: true,
                        });
                    } else if (shape.type === 'rect') {
                        shapeObj = new Rect({
                            left: targetFormat.width * shape.x,
                            top: targetFormat.height * shape.y,
                            width: targetFormat.width * shape.w,
                            height: targetFormat.height * shape.h,
                            fill: shape.color,
                            selectable: false,
                            evented: false,
                            customName: `Decorative Rect ${idx + 1}`,
                            isDecorativeShape: true,
                        });
                    }

                    if (shapeObj) {
                        canvas.add(shapeObj);
                    }
                });
            }

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

            // VALUE_TILES definition with format-specific dimensions
            const VALUE_TILES = [
                {
                    id: 'new', name: 'New', bg: '#00539F', text: '#ffffff',
                    w: 100, h: 40, fontSize: 24, editable: false,
                    formatOverrides: {
                        'instagram-feed': { w: 100, h: 40, fontSize: 24 },
                        'instagram-story': { w: 120, h: 48, fontSize: 28 },
                        'facebook-feed': { w: 90, h: 36, fontSize: 22 },
                        'facebook-story': { w: 120, h: 48, fontSize: 28 },
                        'display-banner': { w: 60, h: 24, fontSize: 14 },
                        'display-mpu': { w: 50, h: 20, fontSize: 12 },
                        'pos-portrait': { w: 80, h: 32, fontSize: 18 },
                        'pos-landscape': { w: 80, h: 32, fontSize: 18 },
                    }
                },
                {
                    id: 'white', name: 'White', bg: '#ffffff', text: '#00539F',
                    w: 160, h: 60, fontSize: 24, editable: 'price', border: '#00539F',
                    formatOverrides: {
                        'instagram-feed': { w: 160, h: 60, fontSize: 32 },
                        'instagram-story': { w: 180, h: 70, fontSize: 36 },
                        'facebook-feed': { w: 140, h: 52, fontSize: 28 },
                        'facebook-story': { w: 180, h: 70, fontSize: 36 },
                        'display-banner': { w: 80, h: 30, fontSize: 16 },
                        'display-mpu': { w: 70, h: 28, fontSize: 14 },
                        'pos-portrait': { w: 120, h: 48, fontSize: 22 },
                        'pos-landscape': { w: 120, h: 48, fontSize: 22 },
                    }
                },
                {
                    id: 'clubcard',
                    name: 'Clubcard Price',
                    bg: '#FFD700', text: '#00539F',
                    w: 160, h: 160, fontSize: 48,
                    editable: 'prices', isCircular: true,
                    labelText: 'Clubcard Price', labelFontSize: 14,
                    formatOverrides: {
                        'instagram-feed': { w: 160, h: 160, fontSize: 48, labelFontSize: 14 },
                        'instagram-story': { w: 200, h: 200, fontSize: 56, labelFontSize: 18 },
                        'facebook-feed': { w: 130, h: 130, fontSize: 38, labelFontSize: 12 },
                        'facebook-story': { w: 200, h: 200, fontSize: 56, labelFontSize: 18 },
                        'display-banner': { w: 60, h: 60, fontSize: 18, labelFontSize: 8 },
                        'display-mpu': { w: 70, h: 70, fontSize: 22, labelFontSize: 9 },
                        'pos-portrait': { w: 120, h: 120, fontSize: 36, labelFontSize: 11 },
                        'pos-landscape': { w: 120, h: 120, fontSize: 36, labelFontSize: 11 },
                    }
                },
            ];

            // Helper to get format-specific tile dimensions
            const getTileForFormat = (tile, formatKey) => {
                const overrides = tile.formatOverrides?.[formatKey];
                return overrides ? { ...tile, ...overrides } : tile;
            };

            const baseTile = VALUE_TILES.find(t => t.id === currentVariantData.priceType) || VALUE_TILES[2];
            const tile = getTileForFormat(baseTile, currentFormat);
            const formatConfig = targetFormat.config || {};

            // Fixed position based on tile type
            const standardTileY = targetFormat.height - tile.h - 30;
            const clubcardTileY = targetFormat.height - (tile.h / 2) - 40;

            let tilePositions = {
                'new': { x: targetFormat.width * 0.15, y: standardTileY },
                'white': { x: targetFormat.width * 0.5, y: standardTileY },
                'clubcard': { x: targetFormat.width * 0.65, y: clubcardTileY },
            };

            // If horizontal layout, adjust positions
            if (formatConfig.layout === 'horizontal') {
                tilePositions.new = { x: targetFormat.width * 0.85, y: targetFormat.height * 0.25 };
                tilePositions.white = { x: targetFormat.width * 0.85, y: targetFormat.height * 0.5 };
                tilePositions.clubcard = { x: targetFormat.width * 0.75, y: targetFormat.height * 0.5 };
            }

            const pos = tilePositions[tile.id] || { x: targetFormat.width / 2, y: standardTileY };

            // Handle Clubcard tile differently - circular design matching Tesco's official look
            if (tile.isCircular && tile.id === 'clubcard') {
                const radius = tile.w / 2;
                const clubcardPosY = pos.y;
                const clubcardPosX = pos.x;

                // Yellow circular background
                const circle = new Circle({
                    radius: radius,
                    fill: tile.bg, // Tesco yellow #FFD700
                    originX: 'center',
                    originY: 'center',
                    left: clubcardPosX,
                    top: clubcardPosY,
                    selectable: false,
                    evented: false,
                    lockMovementX: true,
                    lockMovementY: true,
                    isValueTile: true,
                    valueTileType: tile.id,
                    customName: 'Clubcard Circle',
                });
                canvas.add(circle);

                // Offer price - large, bold, centered in circle
                const priceText = new IText(currentVariantData.price || '£1.50', {
                    fontSize: tile.fontSize,
                    fontWeight: 'bold',
                    fontFamily: 'Inter, sans-serif',
                    fill: tile.text, // Tesco blue #00539F
                    originX: 'center',
                    originY: 'center',
                    left: clubcardPosX,
                    top: clubcardPosY - (radius * 0.15),
                    textAlign: 'center',
                    selectable: true,
                    evented: true,
                    editable: true,
                    lockMovementX: true,
                    lockMovementY: true,
                    isValueTile: true,
                    valueTileType: tile.id,
                    customName: 'Clubcard Price',
                });
                canvas.add(priceText);

                // "Clubcard Price" label below price
                const labelText = new IText(tile.labelText || 'Clubcard Price', {
                    fontSize: tile.labelFontSize || 14,
                    fontWeight: 'normal',
                    fontFamily: 'Inter, sans-serif',
                    fill: tile.text,
                    originX: 'center',
                    originY: 'center',
                    left: clubcardPosX,
                    top: clubcardPosY + (radius * 0.45),
                    textAlign: 'center',
                    selectable: false,
                    evented: false,
                    isValueTile: true,
                    valueTileType: tile.id,
                    customName: 'Clubcard Label',
                });
                canvas.add(labelText);

                // Regular price - shown to the left of the circle
                const regularPriceX = clubcardPosX - radius - 90; // Increased spacing

                // "Original Price" label above the regular price
                const originalPriceLabel = new IText('Original Price', {
                    fontSize: tile.fontSize * 0.25,
                    fontWeight: 'normal',
                    fontFamily: 'Inter, sans-serif',
                    fill: '#00539F', // Tesco blue
                    originX: 'center',
                    originY: 'center',
                    left: regularPriceX,
                    top: clubcardPosY - (tile.fontSize * 0.45),
                    textAlign: 'center',
                    selectable: false,
                    evented: false,
                    lockMovementX: true,
                    lockMovementY: true,
                    isValueTile: true,
                    valueTileType: 'clubcard-regular',
                    customName: 'Original Price Label',
                });
                canvas.add(originalPriceLabel);

                const regularPriceText = new IText(currentVariantData.wasPrice || '£2.00', {
                    fontSize: tile.fontSize * 0.7,
                    fontWeight: 'bold',
                    fontFamily: 'Inter, sans-serif',
                    fill: '#00539F',
                    originX: 'center',
                    originY: 'center',
                    left: regularPriceX,
                    top: clubcardPosY + (tile.fontSize * 0.1), // Slightly lower
                    textAlign: 'center',
                    selectable: true,
                    evented: true,
                    editable: true,
                    lockMovementX: true,
                    lockMovementY: true,
                    isValueTile: true,
                    valueTileType: 'clubcard-regular',
                    customName: 'Regular Price',
                });
                canvas.add(regularPriceText);
            } else {
                // Standard rectangular tiles (NEW, White)
                // Create tile rect
                const tileRect = new Rect({
                    width: tile.w,
                    height: tile.h,
                    fill: tile.bg,
                    rx: 4,
                    ry: 4,
                    stroke: tile.border || null,
                    strokeWidth: tile.border ? 2 : 0,
                    originX: 'center',
                    originY: 'center',
                    left: pos.x,
                    top: pos.y,
                    selectable: false,
                    evented: false,
                    lockMovementX: true,
                    lockMovementY: true,
                    isValueTile: true,
                    valueTileType: tile.id,
                    customName: tile.name,
                });

                // Prepare display text based on tile type
                let displayText = tile.name;
                if (tile.id === 'white') displayText = currentVariantData.price || '£2.50';

                // Text editability depends on tile type
                const isEditable = tile.id !== 'new';

                // Create tile text
                const tileText = new IText(displayText, {
                    fontSize: tile.fontSize,
                    fontWeight: 'bold',
                    fontFamily: 'Inter, sans-serif',
                    fill: tile.text,
                    originX: 'center',
                    originY: 'center',
                    left: pos.x,
                    top: pos.y,
                    textAlign: 'center',
                    selectable: isEditable,
                    evented: isEditable,
                    editable: isEditable,
                    lockMovementX: true,
                    lockMovementY: true,
                    isValueTile: true,
                    valueTileType: tile.id,
                    customName: `${tile.name} Text`,
                });

                canvas.add(tileRect);
                canvas.add(tileText);
            }

            // Handle alcohol products - FIXED: font size 20px minimum for compliance
            if (currentDemo.product.isAlcohol) {
                setIsAlcoholProduct(true);
                const drinkRect = new Rect({
                    width: 200, height: 32, fill: '#ffffff', rx: 4, ry: 4,
                    originX: 'center', originY: 'center',
                    left: targetFormat.width - 110, top: targetFormat.height - 45,
                    isDrinkaware: true, customName: 'Drinkaware',
                });
                const drinkText = new IText('drinkaware.co.uk', {
                    fontSize: 20, // FIXED: minimum 20px for compliance
                    fontFamily: 'Inter, sans-serif',
                    fill: '#000000',
                    originX: 'center', originY: 'center',
                    left: targetFormat.width - 110, top: targetFormat.height - 45,
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
                tagText = `Available in selected stores. Clubcard/app required. Ends ${dd}/${mm}`;
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
                                {/* Decorative Shapes Preview */}
                                {currentVariantData.shapes && currentVariantData.shapes.map((shape, idx) => (
                                    <div
                                        key={idx}
                                        className="absolute rounded-full"
                                        style={{
                                            left: `${shape.x * 100}%`,
                                            top: `${shape.y * 100}%`,
                                            width: shape.type === 'circle' ? (shape.size / 3) + 'px' : (shape.rx ? shape.rx / 2 : 20) + 'px',
                                            height: shape.type === 'circle' ? (shape.size / 3) + 'px' : (shape.ry ? shape.ry / 2 : 20) + 'px',
                                            backgroundColor: shape.color,
                                            transform: 'translate(-50%, -50%)',
                                            borderRadius: shape.type === 'rect' ? '4px' : '50%',
                                        }}
                                    />
                                ))}

                                {/* Design Style Badge */}
                                {currentVariantData.designStyle && (
                                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider"
                                        style={{
                                            backgroundColor: currentVariantData.designStyle === 'festive' ? '#ff6b6b' :
                                                currentVariantData.designStyle === 'neon' ? '#00ff00' :
                                                    currentVariantData.designStyle === 'luxury' ? '#d4af37' :
                                                        currentVariantData.designStyle === 'minimal' ? '#888888' : '#9c27b0',
                                            color: currentVariantData.designStyle === 'neon' ? '#000' : '#fff',
                                        }}
                                    >
                                        {currentVariantData.designStyle}
                                    </div>
                                )}

                                <p
                                    className="text-lg font-bold text-center mb-1 leading-tight relative z-10"
                                    style={{ color: currentVariantData.headlineColor }}
                                >
                                    {currentVariantData.headline}
                                </p>
                                <p
                                    className="text-xs text-center opacity-80 mb-4 relative z-10"
                                    style={{ color: currentVariantData.headlineColor }}
                                >
                                    {currentVariantData.subheadline}
                                </p>

                                {/* Packshot Emoji */}
                                <div className="w-20 h-20 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center mb-4 relative z-10">
                                    <span className="text-4xl">{
                                        currentDemo.product.category === 'Alcohol' ? '🍾' :
                                            currentDemo.product.category === 'Baby' ? '👶' :
                                                currentDemo.product.category === 'Pet' ? '🐕' :
                                                    currentDemo.product.category === 'Frozen' ? '🍦' :
                                                        currentDemo.product.category === 'Cleaning' ? '🧹' :
                                                            currentDemo.product.category === 'Seasonal' ? '🎁' :
                                                                currentDemo.product.category === 'Energy' ? '⚡' :
                                                                    currentDemo.product.category === 'Beauty' ? '✨' :
                                                                        '🛒'
                                    }</span>
                                </div>

                                {/* Value tile */}
                                {currentVariantData.priceType === 'clubcard' ? (
                                    /* Clubcard: Yellow circular design */
                                    <div className="flex items-center gap-2 relative z-10">
                                        <span className="font-bold text-sm" style={{ color: '#00539F' }}>
                                            {currentVariantData.wasPrice}
                                        </span>
                                        <div
                                            className="w-16 h-16 rounded-full flex flex-col items-center justify-center"
                                            style={{ backgroundColor: '#FFD700' }}
                                        >
                                            <span className="font-bold text-lg" style={{ color: '#00539F' }}>
                                                {currentVariantData.price}
                                            </span>
                                            <span className="text-[8px]" style={{ color: '#00539F' }}>
                                                Clubcard Price
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    /* NEW and White tiles: rectangular */
                                    <div
                                        className="px-3 py-1.5 rounded text-center text-sm relative z-10"
                                        style={{
                                            backgroundColor: currentVariantData.priceType === 'new' ? '#00539F' : '#ffffff',
                                            color: currentVariantData.priceType === 'white' ? '#00539F' : '#ffffff',
                                            border: currentVariantData.priceType === 'white' ? '2px solid #00539F' : 'none',
                                        }}
                                    >
                                        {currentVariantData.priceType === 'new' && <span className="font-bold">New</span>}
                                        {currentVariantData.priceType === 'white' && <span className="font-bold">{currentVariantData.price}</span>}
                                    </div>
                                )}

                                {currentDemo.product.isAlcohol && (
                                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-white rounded text-[8px] text-black z-10">
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

