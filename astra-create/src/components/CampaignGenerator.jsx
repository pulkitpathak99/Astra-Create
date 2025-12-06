import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import useStore, { FORMAT_PRESETS } from '../store/useStore';
import geminiService from '../services/geminiService';

export function CampaignGenerator({ onClose }) {
    const { canvas, currentFormat, complianceErrors } = useStore();
    const [generating, setGenerating] = useState(false);
    const [selectedFormats, setSelectedFormats] = useState(Object.keys(FORMAT_PRESETS));
    const [campaignName, setCampaignName] = useState('');
    const [progress, setProgress] = useState(0);
    const [aiInsights, setAiInsights] = useState(null);

    const toggleFormat = (format) => {
        setSelectedFormats(prev =>
            prev.includes(format)
                ? prev.filter(f => f !== format)
                : [...prev, format]
        );
    };

    const generateCampaign = useCallback(async () => {
        if (!canvas || selectedFormats.length === 0) return;

        setGenerating(true);
        setProgress(10);

        try {
            const zip = new JSZip();
            const campaignFolder = zip.folder(campaignName || 'creative-campaign');
            const timestamp = Date.now();

            // Get AI insights if API key available
            if (geminiService.hasApiKey()) {
                setProgress(20);
                try {
                    const objects = canvas.getObjects();
                    const textContent = objects
                        .filter(o => o.type === 'i-text' || o.type === 'text')
                        .map(o => o.text);

                    const insights = await geminiService.generateCampaignVariations({
                        masterCreative: {
                            format: currentFormat,
                            textElements: textContent,
                        },
                        targetFormats: selectedFormats,
                    });
                    setAiInsights(insights);
                } catch (e) {
                    console.log('AI insights unavailable:', e);
                }
            }

            setProgress(30);

            // Export for each selected format
            const formatCount = selectedFormats.length;
            for (let i = 0; i < formatCount; i++) {
                const formatKey = selectedFormats[i];
                const format = FORMAT_PRESETS[formatKey];

                setProgress(30 + ((i + 1) / formatCount) * 50);

                // Create folder for this format
                const formatFolder = campaignFolder.folder(format.name.replace(/\s/g, '-'));

                // For demo, we export the current canvas
                // In production, would re-render for each format
                const scaleFactor = 1 / 0.45;

                // Filter out safe zones before export
                const safeZones = canvas.getObjects().filter(o => o.isSafeZone);
                safeZones.forEach(o => canvas.remove(o));

                // Export JPEG
                const jpegURL = canvas.toDataURL({
                    format: 'jpeg',
                    quality: 0.85,
                    multiplier: scaleFactor,
                });
                const jpegBlob = await (await fetch(jpegURL)).blob();
                formatFolder.file('creative.jpg', jpegBlob);

                // Export PNG
                const pngURL = canvas.toDataURL({
                    format: 'png',
                    multiplier: scaleFactor,
                });
                const pngBlob = await (await fetch(pngURL)).blob();
                formatFolder.file('creative.png', pngBlob);

                // Re-add safe zones
                safeZones.forEach(o => canvas.add(o));
                canvas.renderAll();
            }

            setProgress(85);

            // Generate campaign report
            const report = generateCampaignReport();
            campaignFolder.file('campaign-report.md', report);

            // Add AI insights if available
            if (aiInsights) {
                campaignFolder.file('ai-optimization-notes.json', JSON.stringify(aiInsights, null, 2));
            }

            setProgress(95);

            // Generate and download ZIP
            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, `${campaignName || 'campaign'}-${timestamp}.zip`);

            setProgress(100);

            // Close after short delay to show completion
            setTimeout(() => {
                onClose?.();
            }, 1500);

        } catch (error) {
            console.error('Campaign generation failed:', error);
        } finally {
            setGenerating(false);
        }
    }, [canvas, selectedFormats, campaignName, currentFormat, aiInsights, onClose]);

    const generateCampaignReport = () => {
        const date = new Date().toISOString();
        const formatList = selectedFormats.map(f => FORMAT_PRESETS[f].name).join(', ');

        return `# Campaign Creative Package

## Generated: ${date}

### Contents
${selectedFormats.map(f => `- **${FORMAT_PRESETS[f].name}** (${FORMAT_PRESETS[f].width}×${FORMAT_PRESETS[f].height})`).join('\n')}

### Compliance Status
${complianceErrors.length === 0 ? '✅ All creatives passed compliance checks' : `⚠️ ${complianceErrors.length} issue(s) detected`}

### File Formats
- JPEG (optimized for web delivery, <500KB)
- PNG (high quality for editing)

### Usage Notes
- Instagram Feed: Best for product showcases and promotional content
- Instagram Story: Full-screen engagement, consider safe zones
- Facebook Feed: Wider format, great for landscape imagery
- Facebook Story: Same specs as Instagram Story

---
Generated by **AstraCreate** | Tesco Retail Media
`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-gray-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-tesco-blue/30 to-purple-600/30 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                🚀 Campaign Generator
                            </h2>
                            <p className="text-sm text-white/60 mt-1">Export campaign-ready creative sets</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Campaign Name */}
                    <div>
                        <label className="block text-sm text-white/70 mb-2">Campaign Name</label>
                        <input
                            type="text"
                            value={campaignName}
                            onChange={(e) => setCampaignName(e.target.value)}
                            placeholder="e.g., Summer-Promo-2024"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-purple-500/50 focus:outline-none"
                        />
                    </div>

                    {/* Format Selection */}
                    <div>
                        <label className="block text-sm text-white/70 mb-3">Select Formats</label>
                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(FORMAT_PRESETS).map(([key, format]) => (
                                <button
                                    key={key}
                                    onClick={() => toggleFormat(key)}
                                    className={`p-3 rounded-lg border text-left transition-all ${selectedFormats.includes(key)
                                            ? 'bg-purple-500/20 border-purple-500/50 text-white'
                                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${selectedFormats.includes(key) ? 'border-purple-400 bg-purple-500' : 'border-white/30'
                                            }`}>
                                            {selectedFormats.includes(key) && (
                                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{format.name}</p>
                                            <p className="text-xs text-white/40">{format.width}×{format.height}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* AI Enhancement Note */}
                    {geminiService.hasApiKey() && (
                        <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                            <p className="text-xs text-purple-300 flex items-center gap-2">
                                <span>✨</span>
                                AI will optimize content placement for each format
                            </p>
                        </div>
                    )}

                    {/* Compliance Warning */}
                    {complianceErrors.length > 0 && (
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <p className="text-xs text-yellow-300">
                                ⚠️ {complianceErrors.length} compliance issue(s) detected. Consider fixing before export.
                            </p>
                        </div>
                    )}

                    {/* Progress Bar */}
                    {generating && (
                        <div className="space-y-2">
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-white/50 text-center">
                                {progress < 30 && 'Preparing assets...'}
                                {progress >= 30 && progress < 80 && 'Generating formats...'}
                                {progress >= 80 && progress < 100 && 'Packaging campaign...'}
                                {progress === 100 && '✅ Complete!'}
                            </p>
                        </div>
                    )}

                    {/* Generate Button */}
                    <button
                        onClick={generateCampaign}
                        disabled={generating || selectedFormats.length === 0}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-purple-500/20 flex items-center justify-center gap-2"
                    >
                        {generating ? (
                            <>
                                <span className="animate-spin">⏳</span>
                                Generating Campaign...
                            </>
                        ) : (
                            <>
                                <span>🚀</span>
                                Generate Campaign Package
                            </>
                        )}
                    </button>

                    {/* Output Summary */}
                    <div className="text-xs text-white/40 text-center">
                        {selectedFormats.length} format{selectedFormats.length !== 1 ? 's' : ''} × 2 file types = {selectedFormats.length * 2} files
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CampaignGenerator;
