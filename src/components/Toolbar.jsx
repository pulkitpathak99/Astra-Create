import React, { useCallback, useState, useRef, useEffect } from 'react';
import { saveAs } from 'file-saver';
import useStore, { FORMAT_PRESETS } from '../store/useStore';
import { ComplianceScore } from './ComplianceScore';

export function Toolbar({ onOpenMagicWand, onOpenDemoGallery, onOpenTemplates, onOpenGuidedMode, onHome }) {
    const {
        currentFormat, setCurrentFormat,
        canvas,
        complianceErrors,
        hasHardFailErrors,
    } = useStore();
    const [exporting, setExporting] = useState(false);
    const [showCreateMenu, setShowCreateMenu] = useState(false);
    const createMenuRef = useRef(null);

    const format = FORMAT_PRESETS[currentFormat];

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (createMenuRef.current && !createMenuRef.current.contains(e.target)) {
                setShowCreateMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const exportAs = useCallback(async (fileFormat) => {
        if (!canvas) return;
        setExporting(true);

        const safeZones = canvas.getObjects().filter(o => o.isSafeZone);
        safeZones.forEach(o => canvas.remove(o));

        const zoom = canvas.getZoom();
        const scaleFactor = 1 / zoom;
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

    const handleCreateAction = (action) => {
        setShowCreateMenu(false);
        switch(action) {
            case 'magic': onOpenMagicWand?.(); break;
            case 'guided': onOpenGuidedMode?.(); break;
            case 'gallery': onOpenDemoGallery?.(); break;
            case 'templates': onOpenTemplates?.(); break;
        }
    };

    return (
        <header className="h-14 bg-[#12161c] border-b border-white/5 flex items-center px-4 gap-3 sticky top-0 z-50">
            {/* Logo - Click to go Home */}
            <button onClick={onHome} className="flex items-center gap-2 hover:opacity-80 transition-opacity mr-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                    <span className="text-white font-bold">A</span>
                </div>
                <span className="font-semibold text-white text-sm hidden md:inline">AstraCreate</span>
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-white/10" />

            {/* Create Dropdown */}
            <div className="relative" ref={createMenuRef}>
                <button 
                    onClick={() => setShowCreateMenu(!showCreateMenu)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/20"
                >
                    <span>✨ Create</span>
                    <svg className={`w-3 h-3 transition-transform ${showCreateMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {showCreateMenu && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-[#1a1f28] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-slide-in-up z-50">
                        <button onClick={() => handleCreateAction('magic')} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                            <span className="text-xl">🪄</span>
                            <div>
                                <p className="text-sm font-medium text-white">Magic Wand</p>
                                <p className="text-xs text-slate-400">One-click AI generation</p>
                            </div>
                        </button>
                        <button onClick={() => handleCreateAction('guided')} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                            <span className="text-xl">🎯</span>
                            <div>
                                <p className="text-sm font-medium text-white">Guided Mode</p>
                                <p className="text-xs text-slate-400">Step-by-step wizard</p>
                            </div>
                        </button>
                        <div className="h-px bg-white/5" />
                        <button onClick={() => handleCreateAction('gallery')} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                            <span className="text-xl">📸</span>
                            <div>
                                <p className="text-sm font-medium text-white">Demo Gallery</p>
                                <p className="text-xs text-slate-400">View AI examples</p>
                            </div>
                        </button>
                        <button onClick={() => handleCreateAction('templates')} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                            <span className="text-xl">📁</span>
                            <div>
                                <p className="text-sm font-medium text-white">Templates</p>
                                <p className="text-xs text-slate-400">Pre-made layouts</p>
                            </div>
                        </button>
                    </div>
                )}
            </div>

            {/* Format Selector */}
            <div className="flex items-center gap-2 ml-2">
                <select
                    value={currentFormat}
                    onChange={(e) => setCurrentFormat(e.target.value)}
                    className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm cursor-pointer hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                    {Object.entries(FORMAT_PRESETS).map(([key, fmt]) => (
                        <option key={key} value={key} className="bg-[#1a1f28]">
                            {fmt.name}
                        </option>
                    ))}
                </select>
                <span className="text-xs text-slate-500 hidden lg:inline">
                    {format.width}×{format.height}
                </span>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Compliance Score */}
            <ComplianceScore compact={true} />

            {/* Export */}
            <button
                onClick={() => exportAs('png')}
                disabled={exporting || hasHardFailErrors}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    hasHardFailErrors
                        ? 'bg-red-600/50'
                        : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
                title={hasHardFailErrors ? 'Fix compliance issues before exporting' : 'Export creative as PNG'}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {exporting ? 'Exporting...' : hasHardFailErrors ? 'Fix Issues' : 'Export'}
            </button>
        </header>
    );
}

export default Toolbar;
