import React, { useState, useRef, useCallback, useEffect } from 'react';
import useStore from '../store/useStore';

export function CanvasControls({ onFit, onZoomIn, onZoomOut, zoomLevel }) {
    const { undo, redo, historyIndex, history } = useStore();

    // Draggable state
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const dragRef = useRef(null);
    const dragStartRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });

    // Initialize position to center-bottom
    useEffect(() => {
        if (!isInitialized && dragRef.current) {
            setIsInitialized(true);
        }
    }, [isInitialized]);

    const handleMouseDown = useCallback((e) => {
        if (e.target.closest('button')) return; // Don't drag when clicking buttons

        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            initialX: position.x,
            initialY: position.y
        };
        e.preventDefault();
    }, [position]);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;

        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;

        setPosition({
            x: dragStartRef.current.initialX + deltaX,
            y: dragStartRef.current.initialY + deltaY
        });
    }, [isDragging]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Add global mouse listeners for drag
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return (
        <div
            ref={dragRef}
            className={`absolute bottom-8 left-1/2 flex items-center gap-2 p-2 rounded-2xl bg-[#1a1f28]/90 backdrop-blur-xl border border-white/10 shadow-2xl z-50 transition-shadow ${isDragging ? 'cursor-grabbing shadow-blue-500/30' : 'hover:shadow-blue-900/20'}`}
            style={{
                transform: `translate(calc(-50% + ${position.x}px), ${position.y}px)`,
                userSelect: 'none',
            }}
            onMouseDown={handleMouseDown}
        >
            {/* Drag Handle */}
            <div
                className={`flex items-center justify-center w-6 h-10 rounded-lg cursor-grab ${isDragging ? 'cursor-grabbing bg-white/10' : 'hover:bg-white/5'} transition-colors`}
                title="Drag to move"
            >
                <svg width="12" height="20" viewBox="0 0 12 20" fill="currentColor" className="text-slate-500">
                    <circle cx="3" cy="4" r="1.5" />
                    <circle cx="9" cy="4" r="1.5" />
                    <circle cx="3" cy="10" r="1.5" />
                    <circle cx="9" cy="10" r="1.5" />
                    <circle cx="3" cy="16" r="1.5" />
                    <circle cx="9" cy="16" r="1.5" />
                </svg>
            </div>

            <div className="w-px h-5 bg-white/10" />

            {/* Undo/Redo Group */}
            <div className="flex items-center gap-1 pr-2 border-r border-white/10">
                <button
                    onClick={(e) => { e.stopPropagation(); undo(); }}
                    disabled={historyIndex <= 0}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-95"
                    title="Undo (Ctrl+Z)"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 7v6h6" />
                        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                    </svg>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); redo(); }}
                    disabled={historyIndex >= history.length - 1}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-95"
                    title="Redo (Ctrl+Shift+Z)"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 7v6h-6" />
                        <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
                    </svg>
                </button>
            </div>

            {/* Zoom Group */}
            <div className="flex items-center gap-1 pl-1">
                <button
                    onClick={(e) => { e.stopPropagation(); onZoomOut(); }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                    title="Zoom Out"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                </button>

                <span className="w-14 text-center text-sm font-bold text-slate-200 font-mono select-none tabular-nums">
                    {zoomLevel}%
                </span>

                <button
                    onClick={(e) => { e.stopPropagation(); onZoomIn(); }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                    title="Zoom In"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <line x1="11" y1="8" x2="11" y2="14" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                </button>

                <div className="w-px h-5 bg-white/10 mx-1" />

                <button
                    onClick={(e) => { e.stopPropagation(); onFit(); }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                    title="Fit to Screen"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
