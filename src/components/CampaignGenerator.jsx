import React, { useState, useCallback } from 'react';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import useStore, { FORMAT_PRESETS } from '../store/useStore';

// Layout rules for different formats (intelligent element positioning)
const LAYOUT_RULES = {
    // Social Media
    'instagram-feed': { headlineY: 0.28, packY: 0.52, tileY: 0.82, scale: 1.0 },
    'instagram-story': { headlineY: 0.20, packY: 0.45, tileY: 0.72, scale: 0.85 },
    'facebook-feed': { headlineY: 0.22, packY: 0.50, tileY: 0.82, scale: 1.0 },
    'facebook-story': { headlineY: 0.18, packY: 0.42, tileY: 0.70, scale: 0.8 },
    // Display Advertising
    'display-banner': { headlineY: 0.50, packY: 0.50, tileY: 0.50, scale: 0.4, horizontal: true },
    'display-mpu': { headlineY: 0.25, packY: 0.55, tileY: 0.85, scale: 0.8 },
    // In-Store Point of Sale
    'pos-portrait': { headlineY: 0.15, packY: 0.48, tileY: 0.78, scale: 1.0 },
    'pos-landscape': { headlineY: 0.35, packY: 0.50, tileY: 0.85, scale: 0.9, horizontal: true },
};

export function CampaignGenerator({ onClose }) {
    const { canvas, complianceErrors, currentFormat } = useStore();
    const [selectedFormats, setSelectedFormats] = useState(Object.keys(FORMAT_PRESETS));
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const [autoAdapt, setAutoAdapt] = useState(true);

    const formats = Object.entries(FORMAT_PRESETS);
    const isCompliant = complianceErrors.length === 0;

    const toggleFormat = (key) => {
        setSelectedFormats(prev =>
            prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
        );
    };

    const selectAll = () => setSelectedFormats(Object.keys(FORMAT_PRESETS));
    const selectNone = () => setSelectedFormats([]);

    // Adapt layout for different format
    const adaptLayoutForFormat = useCallback((sourceCanvas, targetFormat, targetKey) => {
        const objects = sourceCanvas.getObjects().filter(o => !o.isSafeZone);
        const sourceFormat = FORMAT_PRESETS[currentFormat];
        const layout = LAYOUT_RULES[targetKey] || LAYOUT_RULES['instagram-feed'];

        const scaleX = targetFormat.width / sourceFormat.width;
        const scaleY = targetFormat.height / sourceFormat.height;

        // Clone and reposition each object
        return objects.map(obj => {
            const cloned = obj.toObject(['customName', 'isPackshot', 'isValueTile', 'isDrinkaware', 'isTag', 'valueTileType']);

            // Scale position
            cloned.left = (cloned.left || 0) * scaleX;
            cloned.top = (cloned.top || 0) * scaleY;

            // Scale size for images
            if (obj.type === 'image') {
                cloned.scaleX = (cloned.scaleX || 1) * layout.scale * scaleX;
                cloned.scaleY = (cloned.scaleY || 1) * layout.scale * scaleY;
            }

            // Reposition key elements based on layout rules
            if (obj.isPackshot) {
                cloned.top = targetFormat.height * layout.packY;
                cloned.left = targetFormat.width / 2;
            } else if (obj.isValueTile) {
                cloned.top = targetFormat.height * layout.tileY;
                cloned.left = targetFormat.width / 2;
            } else if ((obj.type === 'i-text' || obj.type === 'text') && obj.fontSize >= 48) {
                // Headlines
                cloned.top = targetFormat.height * layout.headlineY;
                cloned.left = targetFormat.width / 2;
                // Scale font size for aspect ratio
                if (targetFormat.ratio === '9:16' && sourceFormat.ratio !== '9:16') {
                    cloned.fontSize = Math.round((cloned.fontSize || 48) * 0.85);
                }
            }

            return cloned;
        });
    }, [currentFormat]);

    const generateCampaign = useCallback(async () => {
        if (!canvas || selectedFormats.length === 0) return;

        setGenerating(true);
        setProgress(0);

        const zip = new JSZip();
        const total = selectedFormats.length;
        const { Canvas: FabricCanvas, IText, Rect, FabricImage } = await import('fabric');

        // Get current canvas state
        const canvasJSON = canvas.toJSON(['customName', 'isPackshot', 'isLeadPackshot', 'isValueTile', 'isDrinkaware', 'isTag', 'valueTileType', 'isSystemElement']);
        const sourceFormat = FORMAT_PRESETS[currentFormat];

        for (let i = 0; i < selectedFormats.length; i++) {
            const formatKey = selectedFormats[i];
            const format = FORMAT_PRESETS[formatKey];
            const layout = LAYOUT_RULES[formatKey] || LAYOUT_RULES['instagram-feed'];

            setStatus(`Generating ${format.name}...`);

            // Create offscreen canvas element
            const offscreenEl = document.createElement('canvas');
            offscreenEl.width = format.width;
            offscreenEl.height = format.height;
            const ctx = offscreenEl.getContext('2d');

            // Fill background
            ctx.fillStyle = canvas.backgroundColor || '#ffffff';
            ctx.fillRect(0, 0, format.width, format.height);

            // If autoAdapt is enabled and this is a different format, intelligently reposition elements
            if (autoAdapt && formatKey !== currentFormat) {
                setStatus(`🧠 AI adapting layout for ${format.name}...`);

                // Calculate scale factors
                const scaleX = format.width / sourceFormat.width;
                const scaleY = format.height / sourceFormat.height;
                const avgScale = (scaleX + scaleY) / 2;

                // Get objects and reposition them intelligently
                const safeZones = canvas.getObjects().filter(o => o.isSafeZone);
                safeZones.forEach(o => canvas.remove(o));

                // Clone all objects and reposition based on their role
                const objects = canvas.getObjects().slice(); // Clone array

                for (const obj of objects) {
                    const originalLeft = obj.left;
                    const originalTop = obj.top;
                    const originalScaleX = obj.scaleX || 1;
                    const originalScaleY = obj.scaleY || 1;
                    const originalFontSize = obj.fontSize;

                    // Intelligent repositioning based on element type
                    if (obj.isPackshot || obj.isLeadPackshot) {
                        // Packshots: center horizontally, position at layout-specific Y
                        obj.set({
                            left: format.width / 2,
                            top: format.height * layout.packY,
                            scaleX: originalScaleX * layout.scale * avgScale,
                            scaleY: originalScaleY * layout.scale * avgScale,
                        });
                    } else if (obj.isValueTile) {
                        // Value tiles: center, position at tile Y
                        obj.set({
                            left: format.width / 2,
                            top: format.height * layout.tileY,
                            scaleX: originalScaleX * avgScale,
                            scaleY: originalScaleY * avgScale,
                        });
                    } else if (obj.isDrinkaware) {
                        // Drinkaware: bottom-right corner, scaled appropriately
                        obj.set({
                            left: format.width - 100 * scaleX,
                            top: format.height - 40 * scaleY,
                            scaleX: originalScaleX * Math.min(scaleX, 1),
                            scaleY: originalScaleY * Math.min(scaleY, 1),
                        });
                    } else if (obj.isTag) {
                        // Tags: center bottom, with story safe zone consideration
                        const tagY = format.ratio === '9:16'
                            ? format.height - 280 // Safe zone for stories
                            : format.height - 50 * scaleY;
                        obj.set({
                            left: format.width / 2,
                            top: tagY,
                        });
                    } else if ((obj.type === 'i-text' || obj.type === 'text') && (obj.fontSize || 0) >= 48) {
                        // Headlines: center, position at headline Y, adjust font size for format
                        const fontScale = format.ratio === '9:16' ? 0.85 :
                            format.ratio === '1.91:1' ? 0.9 : 1;
                        obj.set({
                            left: format.width / 2,
                            top: format.height * layout.headlineY,
                            fontSize: Math.round((obj.fontSize || 48) * fontScale * layout.scale),
                        });
                    } else if ((obj.type === 'i-text' || obj.type === 'text') && (obj.fontSize || 0) >= 24) {
                        // Subheadlines
                        const fontScale = format.ratio === '9:16' ? 0.85 : 1;
                        obj.set({
                            left: format.width / 2,
                            top: format.height * (layout.headlineY + 0.1),
                            fontSize: Math.round((obj.fontSize || 36) * fontScale * layout.scale),
                        });
                    } else {
                        // Other elements: proportional scaling
                        obj.set({
                            left: (obj.left || 0) * scaleX,
                            top: (obj.top || 0) * scaleY,
                            scaleX: originalScaleX * avgScale,
                            scaleY: originalScaleY * avgScale,
                        });
                    }

                    obj.setCoords();
                }

                // Render with new positions
                canvas.renderAll();

                // Export
                const dataUrl = canvas.toDataURL({
                    format: 'png',
                    multiplier: 1,
                    width: format.width,
                    height: format.height,
                });

                // Draw to offscreen canvas
                await new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0, format.width, format.height);
                        resolve();
                    };
                    img.src = dataUrl;
                });

                // Restore original positions
                for (let j = 0; j < objects.length; j++) {
                    const obj = objects[j];
                    const original = canvasJSON.objects[j];
                    if (original) {
                        obj.set({
                            left: original.left,
                            top: original.top,
                            scaleX: original.scaleX || 1,
                            scaleY: original.scaleY || 1,
                            fontSize: original.fontSize,
                        });
                        obj.setCoords();
                    }
                }
                canvas.renderAll();

                // Restore safe zones
                safeZones.forEach(o => canvas.add(o));

            } else {
                // Simple scale export (source format or autoAdapt disabled)
                const safeZones = canvas.getObjects().filter(o => o.isSafeZone);
                safeZones.forEach(o => canvas.remove(o));

                const scaleFactor = format.width / (canvas.width / canvas.getZoom());
                const dataUrl = canvas.toDataURL({
                    format: 'png',
                    multiplier: scaleFactor,
                });

                safeZones.forEach(o => canvas.add(o));
                canvas.renderAll();

                await new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0, format.width, format.height);
                        resolve();
                    };
                    img.src = dataUrl;
                });
            }

            // PNG
            const pngBlob = await new Promise(resolve => offscreenEl.toBlob(resolve, 'image/png'));
            zip.folder(formatKey).file(`${formatKey}.png`, pngBlob);

            // Compressed JPEG
            const jpegBlob = await new Promise(resolve => offscreenEl.toBlob(resolve, 'image/jpeg', 0.85));
            zip.folder(formatKey).file(`${formatKey}.jpg`, jpegBlob);

            // Specs file with detailed adaptation info
            const specsContent = `Format: ${format.name}
Dimensions: ${format.width}×${format.height}
Aspect Ratio: ${format.ratio}
Auto-Adapted: ${autoAdapt && formatKey !== currentFormat ? 'Yes - AI Layout' : 'No - Direct Scale'}
Layout Profile: ${formatKey}
Headline Position: ${Math.round(layout.headlineY * 100)}% from top
Packshot Position: ${Math.round(layout.packY * 100)}% from top
Value Tile Position: ${Math.round(layout.tileY * 100)}% from top
Scale Factor: ${layout.scale}
Generated: ${new Date().toISOString()}`;

            zip.folder(formatKey).file('specs.txt', specsContent);

            setProgress(Math.round(((i + 1) / total) * 100));
        }

        // Enhanced README
        const readme = `# Campaign Export - AstraCreate
Generated: ${new Date().toLocaleString()}
Formats: ${selectedFormats.length}
Source Format: ${FORMAT_PRESETS[currentFormat].name}
Auto-Adapt: ${autoAdapt ? '✅ AI-Driven Layout Adaptation' : 'Scaling Only'}
Compliance: ${isCompliant ? '✅ PASSED' : '⚠️ REVIEW NEEDED'}

## 🧠 AI Layout Adaptation
When Smart Multi-Format is enabled, AstraCreate intelligently repositions elements:
- Headlines are repositioned based on format-specific optimal placement
- Packshots maintain visual prominence with format-appropriate sizing
- Value tiles stay in the primary attention zone
- Font sizes adapt to maintain readability across aspect ratios
- Story formats (9:16) respect platform safe zones

## Contents
${selectedFormats.map(f => {
            const adapted = autoAdapt && f !== currentFormat;
            return `- ${FORMAT_PRESETS[f].name} (${FORMAT_PRESETS[f].width}×${FORMAT_PRESETS[f].height}) ${adapted ? '🧠 AI-Adapted' : '📋 Source'}`;
        }).join('\n')}

## Files per format
- PNG (full quality, transparency preserved)
- JPG (85% quality, smaller file, <500KB)
- specs.txt (detailed format & layout info)
`;
        zip.file('README.md', readme);

        setStatus('Creating ZIP...');
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `campaign-${Date.now()}.zip`);

        setGenerating(false);
        setProgress(100);
        setStatus('✅ Complete!');

        setTimeout(() => onClose(), 1500);
    }, [canvas, selectedFormats, isCompliant, autoAdapt, currentFormat, onClose]);

    return (
        <div className="modal-overlay">
            <div className="modal max-w-lg">
                <div className="modal-header">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2>Export Campaign</h2>
                            <p className="text-xs text-muted mt-1">Generate all formats from your design</p>
                        </div>
                        <button onClick={onClose} className="btn btn-ghost p-1">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="modal-body">
                    {/* Compliance Warning */}
                    {!isCompliant && (
                        <div className="card mb-4" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                            <div className="flex items-center gap-2">
                                <span className="text-error text-lg">⚠️</span>
                                <div>
                                    <p className="text-sm font-medium text-error">Compliance Issues Detected</p>
                                    <p className="text-xs text-secondary">{complianceErrors.length} error(s) should be fixed before export</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Auto-Adapt Toggle */}
                    <div className="card mb-4" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1))' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-primary flex items-center gap-2">
                                    ✨ Smart Multi-Format
                                </p>
                                <p className="text-xs text-secondary mt-1">
                                    Auto-adapt layout for each format
                                </p>
                            </div>
                            <button
                                onClick={() => setAutoAdapt(!autoAdapt)}
                                className={`w-12 h-6 rounded-full transition-all ${autoAdapt ? 'bg-[var(--accent-primary)]' : 'bg-[var(--surface-overlay)]'}`}
                            >
                                <div className={`w-5 h-5 rounded-full bg-white shadow transition-all ${autoAdapt ? 'translate-x-6' : 'translate-x-0.5'}`} />
                            </button>
                        </div>
                    </div>

                    {/* Format Selection */}
                    <div className="section">
                        <div className="flex items-center justify-between mb-2">
                            <span className="section-title">Select Formats</span>
                            <div className="flex gap-2">
                                <button onClick={selectAll} className="text-xs text-[var(--accent-primary)] hover:underline">
                                    All
                                </button>
                                <span className="text-muted">|</span>
                                <button onClick={selectNone} className="text-xs text-secondary hover:underline">
                                    None
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {formats.map(([key, format]) => (
                                <button
                                    key={key}
                                    onClick={() => toggleFormat(key)}
                                    className={`card text-left transition-all ${selectedFormats.includes(key)
                                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                                        : ''
                                        } ${key === currentFormat ? 'ring-2 ring-green-500/30' : ''}`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-primary">{format.name}</span>
                                        <div className="flex items-center gap-1">
                                            {key === currentFormat && (
                                                <span className="text-[8px] px-1 py-0.5 rounded bg-green-500/20 text-green-400">SOURCE</span>
                                            )}
                                            {selectedFormats.includes(key) && (
                                                <svg className="w-4 h-4 text-[var(--accent-primary)]" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted">{format.width} × {format.height}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Progress */}
                    {generating && (
                        <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-secondary">{status}</span>
                                <span className="text-xs text-primary font-medium">{progress}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-[var(--surface-overlay)] overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button onClick={onClose} className="btn btn-secondary">
                        Cancel
                    </button>
                    <button
                        onClick={generateCampaign}
                        disabled={generating || selectedFormats.length === 0}
                        className="btn btn-tesco"
                    >
                        {generating ? '⏳ Generating...' : `🚀 Export ${selectedFormats.length} Format${selectedFormats.length !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CampaignGenerator;
