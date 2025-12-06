import React, { useCallback, useState } from 'react';
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

    const format = FORMAT_PRESETS[currentFormat];
    const isCompliant = complianceErrors.length === 0;

    const handleComplianceCheck = () => {
        runFullCompliance();
    };

    const exportAs = useCallback(async (fileFormat) => {
        if (!canvas) return;

        setExporting(true);

        const safeZones = canvas.getObjects().filter(o => o.isSafeZone);
        safeZones.forEach(o => canvas.remove(o));

        const scaleFactor = 1 / 0.45;
        const dataURL = canvas.toDataURL({
            format: fileFormat,
            quality: 0.9,
            multiplier: scaleFactor,
        });

        safeZones.forEach(o => canvas.add(o));
        canvas.renderAll();

        const response = await fetch(dataURL);
        const blob = await response.blob();
        saveAs(blob, `creative-${Date.now()}.${fileFormat === 'jpeg' ? 'jpg' : 'png'}`);

        setExporting(false);
    }, [canvas]);

    return (
        <header className="toolbar">
            {/* Logo */}
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                    <span className="text-white text-lg font-bold">A</span>
                </div>
                <span className="font-bold text-sm text-primary">AstraCreate</span>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-[var(--border-subtle)]" />

            {/* Format Selector */}
            <div className="flex items-center gap-2">
                <select
                    value={currentFormat}
                    onChange={(e) => setCurrentFormat(e.target.value)}
                    className="input input-sm w-40 cursor-pointer"
                >
                    {Object.entries(FORMAT_PRESETS).map(([key, fmt]) => (
                        <option key={key} value={key} className="bg-[var(--surface-base)]">
                            {fmt.name}
                        </option>
                    ))}
                </select>
                <span className="text-xs text-tertiary">
                    {format.width} × {format.height}
                </span>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-[var(--border-subtle)]" />

            {/* History Controls */}
            <div className="flex items-center gap-1">
                <button
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    className="icon-rail-btn disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Undo (⌘Z)"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                </button>
                <button
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    className="icon-rail-btn disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Redo (⌘⇧Z)"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
                    </svg>
                </button>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Compliance Check */}
            <button
                onClick={handleComplianceCheck}
                className={`compliance-indicator ${isCompliant ? 'compliant' : 'has-errors'}`}
            >
                <span className={`compliance-dot ${isCompliant ? 'success' : 'error'}`} />
                {isCompliant ? 'Compliant' : `${complianceErrors.length} error${complianceErrors.length !== 1 ? 's' : ''}`}
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-[var(--border-subtle)]" />

            {/* Export Actions */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => exportAs('png')}
                    disabled={exporting}
                    className="btn btn-secondary"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    PNG
                </button>

                <button
                    onClick={onOpenCampaign}
                    className="btn btn-tesco"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Export All
                </button>
            </div>
        </header>
    );
}

export default Toolbar;
