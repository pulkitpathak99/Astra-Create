import { useCallback, useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import useStore, { FORMAT_PRESETS } from '../store/useStore';
import useCompliance from '../hooks/useCompliance';

export function Toolbar({ onOpenCampaign }) {
    const {
        currentFormat, setCurrentFormat,
        canvas,
        complianceErrors, complianceWarnings,
        undo, redo, history, historyIndex,
    } = useStore();
    const { runFullCompliance } = useCompliance();
    const [exporting, setExporting] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    const format = FORMAT_PRESETS[currentFormat];
    const isCompliant = complianceErrors.length === 0;

    const handleComplianceCheck = () => {
        const result = runFullCompliance();
    };

    const exportAs = useCallback(async (fileFormat, quality = 0.9) => {
        if (!canvas) return null;

        const safeZones = canvas.getObjects().filter(o => o.isSafeZone);
        safeZones.forEach(o => canvas.remove(o));

        const scaleFactor = 1 / 0.45;
        const dataURL = canvas.toDataURL({
            format: fileFormat,
            quality: quality,
            multiplier: scaleFactor,
        });

        safeZones.forEach(o => canvas.add(o));
        canvas.renderAll();

        const response = await fetch(dataURL);
        let blob = await response.blob();

        if (blob.size > 500 * 1024 && fileFormat === 'jpeg') {
            const lowQURL = canvas.toDataURL({
                format: 'jpeg',
                quality: 0.7,
                multiplier: scaleFactor,
            });
            const lowQResponse = await fetch(lowQURL);
            blob = await lowQResponse.blob();
        }

        return blob;
    }, [canvas]);

    const downloadSingle = async (fileFormat) => {
        setExporting(true);
        const blob = await exportAs(fileFormat);
        if (blob) {
            saveAs(blob, `creative-${currentFormat}-${Date.now()}.${fileFormat === 'jpeg' ? 'jpg' : 'png'}`);
        }
        setExporting(false);
        setShowExportMenu(false);
    };

    return (
        <div className="h-16 bg-gray-900/95 border-b border-white/10 flex items-center justify-between px-4">
            {/* Left: Logo & Format selector */}
            <div className="flex items-center gap-6">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <span className="text-2xl">✦</span>
                    <span className="font-bold text-lg bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">
                        AstraCreate
                    </span>
                </div>

                <div className="h-8 w-px bg-white/10" />

                {/* Format selector */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-white/50">Format:</span>
                    <select
                        value={currentFormat}
                        onChange={(e) => setCurrentFormat(e.target.value)}
                        className="bg-white/10 text-white text-sm px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-purple-500/50 cursor-pointer"
                    >
                        {Object.entries(FORMAT_PRESETS).map(([key, fmt]) => (
                            <option key={key} value={key} className="bg-gray-900">
                                {fmt.name} ({fmt.ratio})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Undo/Redo */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={undo}
                        disabled={historyIndex <= 0}
                        className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors group relative"
                        title="Undo (⌘Z)"
                    >
                        <svg className="w-4 h-4 text-white/70 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                    </button>
                    <button
                        onClick={redo}
                        disabled={historyIndex >= history.length - 1}
                        className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors group"
                        title="Redo (⌘⇧Z)"
                    >
                        <svg className="w-4 h-4 text-white/70 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Center: Compliance status */}
            <div className="flex items-center gap-3">
                <button
                    onClick={handleComplianceCheck}
                    className="text-xs text-white/60 hover:text-white transition-colors px-3 py-1.5 hover:bg-white/5 rounded-lg"
                >
                    🔄 Refresh
                </button>

                <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${isCompliant
                        ? 'bg-green-500/20 border border-green-500/30'
                        : 'bg-red-500/20 border border-red-500/30'
                    }`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${isCompliant ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                    <span className={`text-sm font-medium ${isCompliant ? 'text-green-400' : 'text-red-400'}`}>
                        {isCompliant ? '✓ Compliant' : `${complianceErrors.length} Issue${complianceErrors.length !== 1 ? 's' : ''}`}
                    </span>
                </div>

                {complianceWarnings.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full">
                        <span className="text-sm text-yellow-400">
                            {complianceWarnings.length} Warning{complianceWarnings.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
                {/* Help */}
                <div className="relative">
                    <button
                        onClick={() => setShowHelp(!showHelp)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Help"
                    >
                        <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>

                    {showHelp && (
                        <div className="absolute right-0 top-full mt-2 w-72 bg-gray-800 border border-white/10 rounded-xl shadow-2xl p-4 z-50">
                            <h4 className="font-semibold text-white mb-3">Quick Help</h4>
                            <div className="space-y-2 text-xs text-white/70">
                                <div className="flex items-center gap-2">
                                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">⌘Z</kbd>
                                    <span>Undo</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">⌘⇧Z</kbd>
                                    <span>Redo</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">Delete</kbd>
                                    <span>Remove selected</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">⌘E</kbd>
                                    <span>Export campaign</span>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-white/10">
                                <p className="text-xs text-white/50">
                                    Use the ✨ AI Assistant (bottom-right) for smart suggestions
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Single Export */}
                <div className="relative">
                    <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        disabled={exporting}
                        className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                        {exporting ? '⏳' : '📥'} Export
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {showExportMenu && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                            <button
                                onClick={() => downloadSingle('jpeg')}
                                className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                            >
                                <span>🖼</span> JPEG
                                <span className="text-xs text-white/40 ml-auto">&lt;500KB</span>
                            </button>
                            <button
                                onClick={() => downloadSingle('png')}
                                className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                            >
                                <span>🎨</span> PNG
                            </button>
                        </div>
                    )}
                </div>

                {/* Campaign Generator */}
                <button
                    onClick={onOpenCampaign}
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 flex items-center gap-2"
                >
                    🚀 Campaign
                </button>
            </div>

            {/* Click outside to close menus */}
            {(showExportMenu || showHelp) && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => { setShowExportMenu(false); setShowHelp(false); }}
                />
            )}
        </div>
    );
}

export default Toolbar;
