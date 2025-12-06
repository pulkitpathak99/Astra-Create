import React, { useState, useCallback } from 'react';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import useStore, { FORMAT_PRESETS } from '../store/useStore';

export function CampaignGenerator({ onClose }) {
    const { canvas, complianceErrors } = useStore();
    const [selectedFormats, setSelectedFormats] = useState(['instagram-feed']);
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');

    const formats = Object.entries(FORMAT_PRESETS);
    const isCompliant = complianceErrors.length === 0;

    const toggleFormat = (key) => {
        setSelectedFormats(prev =>
            prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
        );
    };

    const generateCampaign = useCallback(async () => {
        if (!canvas || selectedFormats.length === 0) return;

        setGenerating(true);
        setProgress(0);

        const zip = new JSZip();
        const total = selectedFormats.length;

        for (let i = 0; i < selectedFormats.length; i++) {
            const formatKey = selectedFormats[i];
            const format = FORMAT_PRESETS[formatKey];
            setStatus(`Generating ${format.name}...`);

            // Create offscreen canvas at full resolution
            const offscreenCanvas = document.createElement('canvas');
            offscreenCanvas.width = format.width;
            offscreenCanvas.height = format.height;
            const ctx = offscreenCanvas.getContext('2d');

            // Fill background
            ctx.fillStyle = canvas.backgroundColor || '#ffffff';
            ctx.fillRect(0, 0, format.width, format.height);

            // Scale and draw canvas content
            const scaleFactor = 1 / canvas.getZoom();
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = format.width;
            tempCanvas.height = format.height;

            const safeZones = canvas.getObjects().filter(o => o.isSafeZone);
            safeZones.forEach(o => canvas.remove(o));

            const dataUrl = canvas.toDataURL({
                format: 'png',
                multiplier: scaleFactor,
            });

            safeZones.forEach(o => canvas.add(o));

            await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, format.width, format.height);
                    resolve();
                };
                img.src = dataUrl;
            });

            // PNG
            const pngBlob = await new Promise(resolve => offscreenCanvas.toBlob(resolve, 'image/png'));
            zip.folder(formatKey).file(`${formatKey}.png`, pngBlob);

            // Compressed JPEG
            const jpegBlob = await new Promise(resolve => offscreenCanvas.toBlob(resolve, 'image/jpeg', 0.85));
            zip.folder(formatKey).file(`${formatKey}.jpg`, jpegBlob);

            // Specs
            zip.folder(formatKey).file('specs.txt', `Format: ${format.name}\nDimensions: ${format.width}×${format.height}\nRatio: ${format.ratio}`);

            setProgress(Math.round(((i + 1) / total) * 100));
        }

        // Add README
        const readme = `# Campaign Export
Generated: ${new Date().toLocaleString()}
Formats: ${selectedFormats.length}
Compliance: ${isCompliant ? 'PASSED' : 'REVIEW NEEDED'}

## Contents
${selectedFormats.map(f => `- ${FORMAT_PRESETS[f].name} (${FORMAT_PRESETS[f].width}×${FORMAT_PRESETS[f].height})`).join('\n')}
`;
        zip.file('README.md', readme);

        setStatus('Creating ZIP...');
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `campaign-${Date.now()}.zip`);

        setGenerating(false);
        setProgress(100);
        setStatus('Complete!');
    }, [canvas, selectedFormats, isCompliant]);

    return (
        <div className="modal-overlay">
            <div className="modal max-w-lg">
                <div className="modal-header">
                    <div className="flex items-center justify-between">
                        <h2>Export Campaign</h2>
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

                    {/* Format Selection */}
                    <div className="section">
                        <span className="section-title">Select Formats</span>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            {formats.map(([key, format]) => (
                                <button
                                    key={key}
                                    onClick={() => toggleFormat(key)}
                                    className={`card text-left transition-all ${selectedFormats.includes(key)
                                            ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                                            : ''
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-primary">{format.name}</span>
                                        {selectedFormats.includes(key) && (
                                            <svg className="w-4 h-4 text-[var(--accent-primary)]" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        )}
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
                                    className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] transition-all duration-300"
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
                        {generating ? '⏳ Generating...' : `Export ${selectedFormats.length} Format${selectedFormats.length !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CampaignGenerator;
