import React, { useState, useRef, useCallback } from 'react';
import { FabricImage, IText, Rect, Canvas as FabricCanvas } from 'fabric';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import useStore, { FORMAT_PRESETS } from '../store/useStore';
import geminiService, { validateCompliance } from '../services/geminiService';

/**
 * Magic Wand Wizard - One-click autonomous creative generation
 * Upload a single product image → Get complete campaign across all formats
 */
export function MagicWandWizard({ onClose, onComplete }) {
    const fileInputRef = useRef(null);
    const [step, setStep] = useState(1); // 1: Upload, 2: Generating, 3: Select Variant, 4: Preview All Formats
    const [imagePreview, setImagePreview] = useState(null);
    const [imageDataUrl, setImageDataUrl] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const [generatedData, setGeneratedData] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(0);
    const [error, setError] = useState(null);
    const [batchExporting, setBatchExporting] = useState(false);
    const [batchProgress, setBatchProgress] = useState(0);
    const [userPrompt, setUserPrompt] = useState(''); // New: User creative direction

    const {
        canvas, saveToHistory, updateLayers, currentFormat,
        setBackgroundColor, setIsAlcoholProduct
    } = useStore();

    // Handle image upload
    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            setImagePreview(ev.target.result);
            setImageDataUrl(ev.target.result);
            setError(null);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // Generate creative variants from the uploaded image
    const handleGenerate = useCallback(async () => {
        if (!imageDataUrl) return;

        setGenerating(true);
        setStep(2);
        setProgress(0);
        setError(null);

        try {
            setStatus('🔍 Analyzing product image...');
            setProgress(10);

            // Call the autonomous generation with user prompt
            const result = await geminiService.generateAutonomousCreative(imageDataUrl, {
                userPrompt: userPrompt.trim(),
                mood: 'modern' // Could also make this selectable
            });

            setProgress(80);
            setStatus('✨ Finalizing variants...');

            if (!result.success) {
                throw new Error('Generation failed');
            }

            setProgress(100);
            setStatus('✅ Complete!');
            setGeneratedData(result);
            setStep(3);
        } catch (err) {
            console.error('Magic wand generation failed:', err);
            setError(err.message || 'Generation failed. Please try again.');
            setStep(1);
        } finally {
            setGenerating(false);
        }
    }, [imageDataUrl]);

    // Apply selected variant to canvas
    const applyToCanvas = useCallback(async () => {
        if (!canvas || !generatedData) return;

        setGenerating(true);
        setStatus('🎨 Building your creative...');

        const variant = generatedData.variants[selectedVariant];
        const format = FORMAT_PRESETS[currentFormat];
        const config = format.config || {
            valueTileScale: 1.0,
            headlineFontSize: 48,
            subFontSize: 32,
            packshotScale: 0.4,
            layout: 'vertical'
        };
        const layout = variant.layout || {
            packshot: { x: 0.5, y: 0.5, scale: 1.0 },
            headline: { x: 0.5, y: 0.25, align: 'center' },
            subheadline: { x: 0.5, y: 0.35, align: 'center' },
            valueTile: { x: 0.5, y: 0.8 },
            tag: { x: 0.5, y: 0.95 }
        };
        const isHorizontal = config.layout === 'horizontal';

        try {
            // Clear canvas (keep safe zones)
            canvas.getObjects().forEach(obj => {
                if (!obj.isSafeZone) canvas.remove(obj);
            });

            // Set background
            canvas.backgroundColor = variant.backgroundColor;
            setBackgroundColor(variant.backgroundColor);

            // Add packshot (the uploaded image)
            if (imageDataUrl) {
                const img = new Image();
                img.onload = () => {
                    // Use dynamic layout config
                    const layoutConfig = layout.packshot || { x: 0.5, y: 0.5, scale: 1.0 };

                    // Calculate scale based on format size and layout scale
                    const baseScale = Math.min(format.width, format.height) / Math.max(img.width, img.height);
                    // Use layout scale (default 1.0) * base scale * config multiplier (0.5 typically)
                    const finalScale = baseScale * (layoutConfig.scale || 1.0) * (isHorizontal ? 0.8 : 0.5);

                    const fabricImg = new FabricImage(img, {
                        left: format.width * (layoutConfig.x !== undefined ? layoutConfig.x : 0.5),
                        top: format.height * (layoutConfig.y !== undefined ? layoutConfig.y : 0.5),
                        scaleX: finalScale,
                        scaleY: finalScale,
                        originX: 'center',
                        originY: 'center',
                        customName: 'Product Packshot',
                        isPackshot: true,
                        isLeadPackshot: true,
                    });
                    canvas.add(fabricImg);
                    canvas.renderAll();
                };
                img.src = imageDataUrl;
            }

            // Add headline
            const headlineConfig = layout.headline || { x: 0.5, y: 0.25, align: 'center' };
            const headline = new IText(variant.headline, {
                left: format.width * (headlineConfig.x !== undefined ? headlineConfig.x : 0.5),
                top: format.height * (headlineConfig.y !== undefined ? headlineConfig.y : 0.25),
                originX: headlineConfig.align === 'left' ? 'left' : (headlineConfig.align === 'right' ? 'right' : 'center'),
                originY: 'center',
                fontFamily: 'Inter, sans-serif',
                fontSize: config.headlineFontSize * (isHorizontal ? 0.8 : 1.0), // Adjust for horizontal
                fontWeight: 'bold',
                fill: variant.headlineColor,
                textAlign: headlineConfig.align || 'center',
                customName: 'AI Headline',
                width: format.width * (headlineConfig.width || 0.9),
                splitByGrapheme: false,
            });
            canvas.add(headline);

            // Add subheadline
            if (variant.subheadline) {
                const subConfig = layout.subheadline || { x: 0.5, y: 0.35, align: 'center' };
                const subheadline = new IText(variant.subheadline, {
                    left: format.width * (subConfig.x !== undefined ? subConfig.x : 0.5),
                    top: format.height * (subConfig.y !== undefined ? subConfig.y : 0.35),
                    originX: subConfig.align === 'left' ? 'left' : (subConfig.align === 'right' ? 'right' : 'center'),
                    originY: 'center',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: config.subFontSize * (isHorizontal ? 0.8 : 1.0),
                    fontWeight: '500',
                    fill: variant.headlineColor,
                    textAlign: subConfig.align || 'center',
                    opacity: 0.9,
                    customName: 'AI Subheadline',
                    width: format.width * (subConfig.width || 0.8),
                });
                canvas.add(subheadline);
            }

            // Add value tile based on variant.priceType
            const tileConfig = layout.valueTile || { x: 0.5, y: 0.8 };
            const tileX = format.width * (tileConfig.x !== undefined ? tileConfig.x : 0.5);
            const tileY = format.height * (tileConfig.y !== undefined ? tileConfig.y : 0.8);

            addValueTile(variant.priceType, tileX, tileY, format, variant);

            // Handle alcohol products
            if (generatedData.isAlcohol) {
                setIsAlcoholProduct(true);
                addDrinkaware(format);
            }

            // Add tag
            const tagConfig = layout.tag || { x: 0.5, y: 0.95 };
            const tagX = format.width * (tagConfig.x !== undefined ? tagConfig.x : 0.5);
            const tagY = format.height * (tagConfig.y !== undefined ? tagConfig.y : 0.95);
            addTag(variant.tag || 'Only at Tesco', tagX, tagY, format, isHorizontal);

            canvas.renderAll();
            saveToHistory();
            updateLayers();

            setGenerating(false);
            onComplete?.({
                variant,
                product: generatedData.product,
                generationTimeMs: generatedData.generationTimeMs
            });
            onClose();
        } catch (err) {
            console.error('Apply to canvas failed:', err);
            setError('Failed to apply creative. Please try again.');
            setGenerating(false);
        }
    }, [canvas, generatedData, selectedVariant, currentFormat, imageDataUrl,
        setBackgroundColor, setIsAlcoholProduct, saveToHistory, updateLayers, onComplete, onClose]);

    // Helper: Add value tile
    const addValueTile = (type, posX, posY, format, variant) => {
        const tiles = {
            new: { bg: '#e51c23', text: '#ffffff', w: 120, h: 50, label: 'NEW' },
            white: { bg: '#ffffff', text: '#003d7a', w: 160, h: 60, border: '#003d7a', label: '£2.99' },
            clubcard: { bg: '#003d7a', text: '#ffffff', w: 200, h: 80, label: '£1.99\nwas £2.99' },
        };
        const config = tiles[type] || tiles.clubcard;
        const formatConfig = format.config || { valueTileScale: 1.0 };
        const scale = formatConfig.valueTileScale;

        const rect = new Rect({
            width: config.w * scale,
            height: config.h * scale,
            fill: config.bg,
            rx: 6 * scale,
            ry: 6 * scale,
            stroke: config.border || null,
            strokeWidth: config.border ? (2 * scale) : 0,
            originX: 'center',
            originY: 'center',
            left: posX,
            top: posY,
            selectable: true,
            isValueTile: true,
            valueTileType: type,
            customName: `${type} Value Tile`,
        });

        const text = new IText(config.label, {
            fontSize: (type === 'clubcard' ? 22 : 26) * scale,
            fontWeight: 'bold',
            fontFamily: 'Inter, sans-serif',
            fill: config.text,
            originX: 'center',
            originY: 'center',
            left: posX,
            top: posY,
            textAlign: 'center',
            isValueTile: true,
            valueTileType: type,
        });

        canvas.add(rect, text);
    };

    // Helper: Add Drinkaware lockup
    const addDrinkaware = (format) => {
        const rect = new Rect({
            width: 180,
            height: 28,
            fill: '#ffffff',
            rx: 4,
            ry: 4,
            originX: 'center',
            originY: 'center',
            left: format.width - 100,
            top: format.height - 40,
            isDrinkaware: true,
            isSystemElement: true,
            customName: 'Drinkaware',
        });
        const text = new IText('drinkaware.co.uk', {
            fontSize: 14,
            fontFamily: 'Inter, sans-serif',
            fill: '#000000',
            originX: 'center',
            originY: 'center',
            left: format.width - 100,
            top: format.height - 40,
            editable: false,
            isDrinkaware: true,
            isSystemElement: true,
        });
        canvas.add(rect, text);
    };



    // Helper: Add Tesco tag
    const addTag = (tagText, tagX, tagY, format, isHorizontal) => {
        const tag = new IText(tagText, {
            left: tagX,
            top: tagY,
            originX: 'center',
            originY: 'center',
            fontFamily: 'Inter, sans-serif',
            fontSize: isHorizontal ? 12 : 18,
            fill: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.3)',
            padding: 8,
            isTag: true,
            customName: 'Tesco Tag',
        });
        canvas.add(tag);
    };

    // BATCH EXPORT: Generate all 8 formats × 5 variants = 40 images
    const handleBatchExport = useCallback(async () => {
        if (!generatedData || !imageDataUrl) return;

        setBatchExporting(true);
        setBatchProgress(0);
        setStatus('📦 Preparing batch export...');

        const zip = new JSZip();
        const formats = Object.entries(FORMAT_PRESETS);
        const variants = generatedData.variants;
        const total = formats.length * variants.length;
        let completed = 0;

        try {
            // Load the product image once
            const productImg = await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = imageDataUrl !== 'demo' ? imageDataUrl : '/api/placeholder/400/400';
            });

            for (const [formatKey, format] of formats) {
                const formatFolder = zip.folder(formatKey);

                for (let vi = 0; vi < variants.length; vi++) {
                    const variant = variants[vi];

                    // Get layout for this specific variant style and format
                    // Since we now have dynamic layouts per variant, we use the variant's layout object
                    // We might need to adapt it for different aspect ratios if the AI only returned one set of coordinates
                    // For now, we'll assume the layout works for the current format or use a simple heuristic
                    const layout = variant.layout || {
                        packshot: { x: 0.5, y: 0.5, scale: 1.0 },
                        headline: { x: 0.5, y: 0.25 },
                        subheadline: { x: 0.5, y: 0.35 },
                        valueTile: { x: 0.5, y: 0.8 },
                        tag: { x: 0.5, y: 0.95 }
                    };

                    setStatus(`🎨 Generating ${format.name} - Variant ${vi + 1}...`);

                    // Create offscreen canvas
                    const offscreenEl = document.createElement('canvas');
                    offscreenEl.width = format.width;
                    offscreenEl.height = format.height;
                    const ctx = offscreenEl.getContext('2d');

                    // Fill background
                    ctx.fillStyle = variant.backgroundColor;
                    ctx.fillRect(0, 0, format.width, format.height);

                    // Draw product image
                    const packConfig = layout.packshot || { x: 0.5, y: 0.5, scale: 1.0 };
                    const maxSize = Math.min(format.width, format.height) * 0.5 * (packConfig.scale || 1.0);
                    const scale = Math.min(maxSize / productImg.width, maxSize / productImg.height);
                    const imgWidth = productImg.width * scale;
                    const imgHeight = productImg.height * scale;
                    ctx.drawImage(
                        productImg,
                        format.width * (packConfig.x || 0.5) - imgWidth / 2,
                        format.height * (packConfig.y || 0.5) - imgHeight / 2,
                        imgWidth,
                        imgHeight
                    );

                    // Draw headline
                    const headConfig = layout.headline || { x: 0.5, y: 0.25 };
                    ctx.font = `bold ${48}px Inter, sans-serif`; // Simplified font size logic for batch
                    ctx.fillStyle = variant.headlineColor;
                    ctx.textAlign = headConfig.align || 'center';
                    ctx.fillText(variant.headline, format.width * (headConfig.x || 0.5), format.height * (headConfig.y || 0.25));

                    // Draw subheadline
                    const subConfig = layout.subheadline || { x: 0.5, y: 0.35 };
                    ctx.font = `500 ${24}px Inter, sans-serif`;
                    ctx.globalAlpha = 0.85;
                    ctx.textAlign = subConfig.align || 'center';
                    ctx.fillText(variant.subheadline, format.width * (subConfig.x || 0.5), format.height * (subConfig.y || 0.35));
                    ctx.globalAlpha = 1;

                    // Draw value tile
                    const tileConfig = layout.valueTile || { x: 0.5, y: 0.8 };
                    const tileY = format.height * (tileConfig.y || 0.8);
                    const tileX = format.width * (tileConfig.x || 0.5);

                    const tileColors = {
                        clubcard: { bg: '#003d7a', text: '#ffffff' },
                        white: { bg: '#ffffff', text: '#003d7a' },
                        new: { bg: '#e51c23', text: '#ffffff' },
                    };
                    const tileColor = tileColors[variant.priceType] || tileColors.clubcard;
                    ctx.fillStyle = tileColor.bg;
                    ctx.fillRect(tileX - 80, tileY - 25, 160, 50);
                    ctx.fillStyle = tileColor.text;
                    ctx.textAlign = 'center';
                    ctx.font = 'bold 20px Inter, sans-serif';
                    ctx.fillText(variant.priceType === 'new' ? 'NEW' : '£1.99', tileX, tileY + 7);

                    // Draw tag
                    const tagConfig = layout.tag || { x: 0.5, y: 0.95 };
                    ctx.fillStyle = 'rgba(0,0,0,0.5)';
                    ctx.fillRect(format.width * (tagConfig.x || 0.5) - 70, format.height * (tagConfig.y || 0.95) - 13, 140, 26);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '14px Inter, sans-serif';
                    ctx.fillText(variant.tag || 'Only at Tesco', format.width * (tagConfig.x || 0.5), format.height * (tagConfig.y || 0.95) + 5);

                    // Export as PNG
                    const dataUrl = offscreenEl.toDataURL('image/png');
                    const base64 = dataUrl.split(',')[1];
                    formatFolder.file(`variant-${vi + 1}-${variant.tone}.png`, base64, { base64: true });

                    // Export as JPG (compressed)
                    const jpgDataUrl = offscreenEl.toDataURL('image/jpeg', 0.85);
                    const jpgBase64 = jpgDataUrl.split(',')[1];
                    formatFolder.file(`variant-${vi + 1}-${variant.tone}.jpg`, jpgBase64, { base64: true });

                    completed++;
                    setBatchProgress(Math.round((completed / total) * 100));
                }
            }

            // Add README
            const readme = `# AstraCreate Batch Export
Generated: ${new Date().toLocaleString()}
Powered by: Google Gemini AI

## Product
${generatedData.product.productName}
Category: ${generatedData.product.category}
Brand: ${generatedData.product.brand}

## Generation Stats
- AI Generation Time: ${(generatedData.generationTimeMs / 1000).toFixed(1)}s
- Total Images: ${total * 2} (PNG + JPG)
- Formats: ${formats.length}
- Variants: ${variants.length}

## Structure
${formats.map(([k, f]) => `- ${k}/ (${f.width}×${f.height})`).join('\n')}

## Variants
${variants.map((v, i) => `${i + 1}. ${v.tone}: "${v.headline}"`).join('\n')}
`;
            zip.file('README.md', readme);

            setStatus('📦 Creating ZIP...');
            const content = await zip.generateAsync({ type: 'blob' });
            const productSlug = generatedData.product.productName?.replace(/\s+/g, '-').toLowerCase() || 'campaign';
            saveAs(content, `astra-${productSlug}-${Date.now()}.zip`);

            setStatus('✅ Export complete!');
            setBatchProgress(100);

        } catch (err) {
            console.error('Batch export failed:', err);
            setError('Batch export failed. Please try again.');
        } finally {
            setBatchExporting(false);
        }
    }, [generatedData, imageDataUrl]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#12161c] border border-white/10 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 flex items-center justify-center">
                            <span className="text-xl">🪄</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                                Magic Wand
                            </h2>
                            <p className="text-xs text-slate-400">Upload → AI generates campaign</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                        ✕
                    </button>
                </div>

                {/* Progress Indicator */}
                <div className="flex items-center gap-1 px-6 py-3 border-b border-[var(--border-subtle)]">
                    {['Upload', 'Analyze', 'Choose', 'Create'].map((label, i) => {
                        const s = i + 1;
                        return (
                            <div key={s} className="flex items-center flex-1">
                                <div className="flex flex-col items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${s < step ? 'bg-green-500 text-white' :
                                        s === step ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' :
                                            'bg-[var(--surface-overlay)] text-muted'
                                        }`}>
                                        {s < step ? '✓' : s}
                                    </div>
                                    <span className="text-[9px] text-muted mt-1">{label}</span>
                                </div>
                                {s < 4 && <div className={`flex-1 h-0.5 mx-2 ${s < step ? 'bg-green-500' : 'bg-[var(--surface-overlay)]'}`} />}
                            </div>
                        );
                    })}
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4">
                    {error && (
                        <div className="p-3 mb-4 bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-300">
                            {error}
                        </div>
                    )}

                    {/* Step 1: Upload Image */}
                    {step === 1 && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="text-center mb-4">
                                <p className="text-secondary">Upload a product image and let AI do the rest</p>
                                <p className="text-xs text-muted mt-1">Our AI will detect the product, extract colors, and generate 5 creative variants</p>
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef}
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                            />

                            {imagePreview ? (
                                <div className="relative">
                                    <div className="aspect-square max-w-[250px] mx-auto rounded-xl overflow-hidden bg-[var(--surface-dark)] border-2 border-[var(--accent-primary)] shadow-lg">
                                        <img src={imagePreview} alt="Product" className="w-full h-full object-contain" />
                                    </div>
                                    <button
                                        onClick={() => { setImagePreview(null); setImageDataUrl(null); }}
                                        className="absolute top-2 right-2 btn btn-ghost p-1 bg-black/50 hover:bg-black/70 rounded-full"
                                    >
                                        ✕
                                    </button>
                                    <p className="text-center text-xs text-green-400 mt-2">✓ Image ready for analysis</p>
                                </div>
                            ) : (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full py-16 rounded-xl border-2 border-dashed border-[var(--border-default)] hover:border-amber-500 transition-all flex flex-col items-center gap-3 group"
                                >
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <span className="text-3xl">📸</span>
                                    </div>
                                    <span className="text-primary font-medium">Drop product image here</span>
                                    <span className="text-xs text-muted">or click to browse • PNG, JPG up to 10MB</span>
                                </button>
                            )}

                            {/* Demo option */}
                            <div className="pt-4 border-t border-[var(--border-subtle)]">
                                <div className="mb-4">
                                    <label className="text-xs font-medium text-secondary mb-1 block">
                                        Creative Prompt (Optional)
                                    </label>
                                    <textarea
                                        value={userPrompt}
                                        onChange={(e) => setUserPrompt(e.target.value)}
                                        placeholder="e.g. Make it festive for Christmas, use red and gold colors, and focus on family sharing."
                                        className="w-full bg-[var(--surface-dark)] border border-[var(--border-default)] rounded-lg p-3 text-sm text-primary focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none h-20"
                                    />
                                    <p className="text-[10px] text-muted mt-1">
                                        Leave empty for AI to automatically determine the best style.
                                    </p>
                                </div>

                                <p className="text-center text-xs text-muted mb-2">No image? Try with a demo</p>
                                <button
                                    onClick={() => {
                                        // Use demo mode - will use a placeholder creative
                                        setImagePreview('demo');
                                        setImageDataUrl('demo');
                                    }}
                                    className="w-full py-3 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-all text-sm flex items-center justify-center gap-2"
                                >
                                    <span className="text-xl">🥤</span>
                                    <span>Try Demo (Coca-Cola Zero)</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Generating */}
                    {step === 2 && (
                        <div className="py-12 text-center animate-fade-in">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 mx-auto mb-6 flex items-center justify-center animate-pulse shadow-lg shadow-orange-500/30">
                                <span className="text-4xl">🪄</span>
                            </div>
                            <p className="text-xl font-bold text-primary mb-2">{status}</p>
                            <div className="h-3 rounded-full bg-[var(--surface-overlay)] overflow-hidden max-w-sm mx-auto">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-muted mt-3">
                                {progress < 30 && 'Detecting product details...'}
                                {progress >= 30 && progress < 60 && 'Extracting brand colors...'}
                                {progress >= 60 && progress < 90 && 'Generating creative variants...'}
                                {progress >= 90 && 'Almost done!'}
                            </p>
                            {generatedData?.generationTimeMs && (
                                <p className="text-xs text-green-400 mt-2">
                                    ⚡ Generated in {(generatedData.generationTimeMs / 1000).toFixed(1)}s
                                </p>
                            )}
                        </div>
                    )}

                    {/* Step 3: Select Variant */}
                    {step === 3 && generatedData && (
                        <div className="space-y-4 animate-fade-in">
                            {/* Product info */}
                            <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-[var(--surface-dark)] flex items-center justify-center">
                                        {imagePreview && imagePreview !== 'demo' ? (
                                            <img src={imagePreview} alt="" className="w-full h-full object-contain" />
                                        ) : (
                                            <span className="text-2xl">🥤</span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-primary">{generatedData.product.productName}</p>
                                        <p className="text-xs text-muted">{generatedData.product.category} • {generatedData.product.brand}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-green-400">⚡ {(generatedData.generationTimeMs / 1000).toFixed(1)}s</p>
                                        <p className="text-[10px] text-muted">5 variants generated</p>
                                    </div>
                                </div>
                            </div>

                            {/* Variants grid */}
                            <div>
                                <p className="text-sm font-medium text-secondary mb-2">Choose your creative variant:</p>
                                <div className="grid grid-cols-5 gap-2">
                                    {generatedData.variants.map((variant, i) => {
                                        const compliance = validateCompliance(variant.headline + ' ' + (variant.subheadline || ''));
                                        return (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedVariant(i)}
                                            className={`p-2 rounded-lg border-2 transition-all ${selectedVariant === i
                                                ? 'border-amber-500 bg-amber-500/10 scale-105'
                                                : 'border-[var(--border-default)] hover:border-amber-500/50'
                                                }`}
                                        >
                                            {/* Mini preview */}
                                            <div
                                                className="aspect-square rounded-md mb-1 flex items-center justify-center"
                                                style={{ backgroundColor: variant.backgroundColor }}
                                            >
                                                <span className="text-xs text-center px-1 leading-tight" style={{ color: variant.headlineColor }}>
                                                    {variant.headline.split(' ').slice(0, 2).join(' ')}
                                                </span>
                                            </div>
                                            <p className="text-[9px] text-muted text-center capitalize">{variant.tone}</p>
                                        </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Selected variant details */}
                            <div
                                className="p-4 rounded-xl border border-[var(--border-default)]"
                                style={{ backgroundColor: `${generatedData.variants[selectedVariant].backgroundColor}15` }}
                            >
                                <div className="flex gap-4">
                                    {/* Preview */}
                                    <div
                                        className="w-32 h-32 rounded-lg flex flex-col items-center justify-center p-2"
                                        style={{ backgroundColor: generatedData.variants[selectedVariant].backgroundColor }}
                                    >
                                        <p
                                            className="text-sm font-bold text-center leading-tight"
                                            style={{ color: generatedData.variants[selectedVariant].headlineColor }}
                                        >
                                            {generatedData.variants[selectedVariant].headline}
                                        </p>
                                        <p
                                            className="text-[10px] text-center mt-1 opacity-80"
                                            style={{ color: generatedData.variants[selectedVariant].headlineColor }}
                                        >
                                            {generatedData.variants[selectedVariant].subheadline}
                                        </p>
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1">
                                        <h3 className="font-bold text-primary text-lg">{generatedData.variants[selectedVariant].headline}</h3>
                                        <p className="text-sm text-secondary">{generatedData.variants[selectedVariant].subheadline}</p>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            <span className="px-2 py-1 text-[10px] rounded-full bg-[var(--surface-overlay)] text-muted capitalize">
                                                {generatedData.variants[selectedVariant].tone}
                                            </span>
                                            <span className="px-2 py-1 text-[10px] rounded-full bg-[var(--surface-overlay)] text-muted capitalize">
                                                {generatedData.variants[selectedVariant].priceType}
                                            </span>
                                            <span className="px-2 py-1 text-[10px] rounded-full bg-[var(--surface-overlay)] text-muted">
                                                {generatedData.variants[selectedVariant].tag}
                                            </span>
                                        </div>
                                        {generatedData.isAlcohol && (
                                            <p className="text-xs text-amber-400 mt-2">⚠️ Drinkaware lockup will be added</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Color palette extracted */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted">Extracted colors:</span>
                                <div className="flex gap-1">
                                    {generatedData.product.packagingColors?.slice(0, 5).map((color, i) => (
                                        <div
                                            key={i}
                                            className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!generating && !batchExporting && (
                    <div className="flex items-center justify-between p-4 border-t border-white/5">
                        {step > 1 && step < 3 && (
                            <button onClick={() => setStep(1)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                                ← Back
                            </button>
                        )}
                        {step === 3 && (
                            <button onClick={() => setStep(1)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                                ← New Image
                            </button>
                        )}
                        {step === 1 && <div />}

                        {/* Powered by Gemini Badge */}
                        {step === 3 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="url(#gemini-gradient)" />
                                    <path d="M2 17L12 22L22 17" stroke="url(#gemini-gradient)" strokeWidth="2" />
                                    <path d="M2 12L12 17L22 12" stroke="url(#gemini-gradient)" strokeWidth="2" />
                                    <defs>
                                        <linearGradient id="gemini-gradient" x1="2" y1="2" x2="22" y2="22">
                                            <stop stopColor="#4285F4" />
                                            <stop offset="1" stopColor="#A855F7" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <span className="text-[10px] font-medium text-blue-400">Powered by Gemini</span>
                            </div>
                        )}

                        <div className="flex-1" />

                        {step === 1 && (
                            <button
                                onClick={handleGenerate}
                                disabled={!imageDataUrl}
                                className="btn bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold px-6 disabled:opacity-50"
                            >
                                🪄 Generate Campaign
                            </button>
                        )}

                        {step === 3 && (
                            <div className="flex items-center gap-2">
                                {/* Batch Export Button - THE KEY FEATURE */}
                                <button
                                    onClick={handleBatchExport}
                                    className="btn btn-secondary text-sm flex items-center gap-2"
                                    title="Export all 8 formats × 5 variants = 80 images"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    Export All (80 images)
                                </button>

                                <button
                                    onClick={applyToCanvas}
                                    className="btn bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold px-6"
                                >
                                    ✨ Apply to Canvas
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Batch Export Progress */}
                {batchExporting && (
                    <div className="modal-footer flex-col gap-3">
                        <div className="w-full">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-primary">{status}</span>
                                <span className="text-sm font-bold text-amber-400">{batchProgress}%</span>
                            </div>
                            <div className="h-3 rounded-full bg-[var(--surface-overlay)] overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300"
                                    style={{ width: `${batchProgress}%` }}
                                />
                            </div>
                            <p className="text-xs text-muted mt-2 text-center">
                                Generating 8 formats × 5 variants = 80 images...
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MagicWandWizard;
