import React, { useRef, useState } from 'react';
import { FabricImage, IText, Rect } from 'fabric';
import useStore, { TEMPLATE_LIBRARY, FORMAT_PRESETS } from '../store/useStore';
import { removeBackground } from '../utils/imageProcessing';
import geminiService from '../services/geminiService';
import backgroundRemovalService from '../services/backgroundRemovalService';
import { addToCanvas, safeHistorySave, getPackshotCount as getPackshotCountHelper } from '../utils/canvasHelpers';

// Icon components
const Icons = {
    elements: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
    ),
    templates: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm10 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
        </svg>
    ),
    ai: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
        </svg>
    ),
};

// Value tile configs
const VALUE_TILES = [
    { id: 'new', name: 'NEW', bg: '#e51c23', text: '#ffffff', w: 120, h: 50, fontSize: 28, editable: false },
    { id: 'white', name: 'White', bg: '#ffffff', text: '#003d7a', w: 160, h: 60, fontSize: 24, editable: 'price', border: '#003d7a' },
    { id: 'clubcard', name: 'Clubcard', bg: '#003d7a', text: '#ffffff', w: 200, h: 80, fontSize: 20, editable: 'prices' },
];

export function Sidebar() {
    const fileInputRef = useRef(null);
    const bgInputRef = useRef(null);
    const bgRemoveInputRef = useRef(null);
    const aiRemoveInputRef = useRef(null);
    const logoInputRef = useRef(null);

    const [activeTab, setActiveTab] = useState('elements');

    // Value tile inputs
    const [whitePrice, setWhitePrice] = useState('£2.50');
    const [clubcardPrice, setClubcardPrice] = useState('£1.50');
    const [clubcardRegular, setClubcardRegular] = useState('£2.00');
    const [clubcardEndDate, setClubcardEndDate] = useState('');
    const [isExclusive, setIsExclusive] = useState(false);

    // AI inputs
    const [productName, setProductName] = useState('');
    const [aiSuggestions, setAiSuggestions] = useState([]);

    // People detection (Appendix B compliance)
    const [showPeopleModal, setShowPeopleModal] = useState(false);
    const [pendingBgImage, setPendingBgImage] = useState(null);
    const [peopleDescription, setPeopleDescription] = useState('');

    // Template confirmation
    const [showTemplateConfirm, setShowTemplateConfirm] = useState(false);
    const [pendingTemplate, setPendingTemplate] = useState(null);

    const {
        canvas, savedColors, addSavedColor,
        backgroundColor, setBackgroundColor,
        isAlcoholProduct, setIsAlcoholProduct,
        saveToHistory, updateLayers, setCurrentFormat,
        currentFormat,
        // Processing state (centralized)
        processingState, startProcessing, updateProgress, clearProcessing,
    } = useStore();

    // Derive processing flags from centralized state
    const isProcessing = processingState.isProcessing;
    const processingStatus = processingState.status;
    const aiRemovingBg = processingState.operation === 'background-removal';
    const aiLoading = processingState.operation === 'ai-generation';
    const uploadingLogo = processingState.operation === 'logo-upload';


    const getPackshotCount = () => canvas?.getObjects().filter(o => o.isPackshot).length || 0;

    // Image handlers
    const handleImageUpload = async (e, withBgRemoval = false) => {
        const file = e.target.files?.[0];
        if (!file || !canvas) return;

        if (getPackshotCount() >= 3) {
            alert('Maximum 3 packshots allowed');
            return;
        }

        if (withBgRemoval) setRemovingBg(true);

        const reader = new FileReader();
        reader.onload = async (ev) => {
            const img = new Image();
            img.onload = async () => {
                let imgSrc = ev.target.result;

                if (withBgRemoval) {
                    try {
                        imgSrc = await removeBackground(img, { threshold: 30 });
                    } catch (err) {
                        console.error(err);
                    }
                }

                const processedImg = new Image();
                processedImg.onload = () => {
                    const format = FORMAT_PRESETS[currentFormat];
                    const maxSize = Math.min(format.width, format.height) * 0.4;
                    const scale = Math.min(maxSize / processedImg.width, maxSize / processedImg.height);

                    const fabricImg = new FabricImage(processedImg, {
                        left: format.width / 2,
                        top: format.height / 2,
                        scaleX: scale,
                        scaleY: scale,
                        originX: 'center',
                        originY: 'center',
                        customName: getPackshotCount() === 0 ? 'Lead Packshot' : `Packshot ${getPackshotCount() + 1}`,
                        isPackshot: true,
                        isLeadPackshot: getPackshotCount() === 0,
                    });

                    canvas.add(fabricImg);
                    canvas.setActiveObject(fabricImg);
                    canvas.renderAll();
                    saveToHistory();
                    updateLayers();
                    setRemovingBg(false);
                };
                processedImg.src = imgSrc;
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // AI-powered background removal using HuggingFace RMBG-1.4
    const handleAiImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !canvas) return;

        if (getPackshotCount() >= 3) {
            alert('Maximum 3 packshots allowed');
            return;
        }

        // Use centralized processing guard
        if (!startProcessing('background-removal', 'Preparing image...')) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            const imageDataUrl = ev.target.result;

            try {
                updateProgress(20, 'Removing background...');
                // Use HuggingFace RMBG-1.4 for state-of-the-art background removal
                const result = await backgroundRemovalService.removeBackgroundWithRetry(
                    imageDataUrl,
                    3, // max retries
                    (progress) => {
                        updateProgress(progress.progress || 50, progress.status);
                    }
                );

                if (!result.success) {
                    throw new Error(result.error || 'Background removal failed');
                }

                updateProgress(80, 'Adding to canvas...');

                // Load the processed image
                const processedImg = new Image();
                processedImg.onload = () => {
                    const format = FORMAT_PRESETS[currentFormat];
                    const maxSize = Math.min(format.width, format.height) * 0.4;
                    const scale = Math.min(maxSize / processedImg.width, maxSize / processedImg.height);

                    const fabricImg = new FabricImage(processedImg, {
                        left: format.width / 2,
                        top: format.height / 2,
                        scaleX: scale,
                        scaleY: scale,
                        originX: 'center',
                        originY: 'center',
                        customName: getPackshotCount() === 0 ? 'Lead Packshot' : `Packshot ${getPackshotCount() + 1}`,
                        isPackshot: true,
                        isLeadPackshot: getPackshotCount() === 0,
                    });

                    canvas.add(fabricImg);
                    canvas.setActiveObject(fabricImg);
                    canvas.renderAll();
                    saveToHistory();
                    updateLayers();

                    console.log(`✅ AI Background removal completed in ${result.processingTimeMs}ms`);
                    clearProcessing();
                };
                processedImg.onerror = () => {
                    clearProcessing();
                };
                processedImg.src = result.resultDataUrl;

            } catch (err) {
                console.error('AI background removal error:', err);
                clearProcessing();

                // Show error with option to use basic removal
                const useBasic = confirm(`AI removal failed: ${err.message}\n\nWould you like to try basic background removal instead?`);
                if (useBasic) {
                    // Start a new processing operation for basic removal
                    if (!startProcessing('basic-bg-removal', 'Using basic removal...')) return;

                    const img = new Image();
                    img.onload = async () => {
                        try {
                            const basicResult = await removeBackground(img, { threshold: 30 });
                            const processedImg = new Image();
                            processedImg.onload = () => {
                                const format = FORMAT_PRESETS[currentFormat];
                                const maxSize = Math.min(format.width, format.height) * 0.4;
                                const scale = Math.min(maxSize / processedImg.width, maxSize / processedImg.height);

                                const fabricImg = new FabricImage(processedImg, {
                                    left: format.width / 2,
                                    top: format.height / 2,
                                    scaleX: scale,
                                    scaleY: scale,
                                    originX: 'center',
                                    originY: 'center',
                                    customName: getPackshotCount() === 0 ? 'Lead Packshot' : `Packshot ${getPackshotCount() + 1}`,
                                    isPackshot: true,
                                    isLeadPackshot: getPackshotCount() === 0,
                                });

                                canvas.add(fabricImg);
                                canvas.setActiveObject(fabricImg);
                                canvas.renderAll();
                                saveToHistory();
                                updateLayers();
                                clearProcessing();
                            };
                            processedImg.src = basicResult;
                        } catch (basicErr) {
                            clearProcessing();
                            alert('Background removal failed. Please try uploading the image without background removal.');
                        }
                    };
                    img.src = imageDataUrl;
                }
            }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !canvas) return;

        // Use centralized processing guard
        if (!startProcessing('logo-upload', 'Processing logo...')) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            const imageDataUrl = ev.target.result;
            let finalImageUrl = imageDataUrl;

            // Try to remove background using AI service
            if (backgroundRemovalService.hasApiKey()) {
                try {
                    updateProgress(30, 'Removing background...');
                    const result = await backgroundRemovalService.removeBackgroundWithRetry(
                        imageDataUrl,
                        2, // max retries
                        () => { } // No status callback needed for logo
                    );

                    if (result.success) {
                        finalImageUrl = result.resultDataUrl;
                    }
                } catch (err) {
                    console.warn('Logo background removal failed, using original:', err);
                }
            }

            updateProgress(70, 'Adding to canvas...');

            // Load the final image (with or without background removed)
            const img = new Image();
            img.onload = () => {
                canvas.getObjects().forEach(o => { if (o.isLogo) canvas.remove(o); });

                const scale = Math.min(120 / img.width, 60 / img.height);
                const fabricImg = new FabricImage(img, {
                    left: 40,
                    top: 40,
                    scaleX: scale,
                    scaleY: scale,
                    customName: 'Brand Logo',
                    isLogo: true,
                });

                canvas.add(fabricImg);
                canvas.renderAll();
                saveToHistory();
                updateLayers();
                clearProcessing();
            };
            img.onerror = () => {
                clearProcessing();
            };
            img.src = finalImageUrl;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleBackgroundUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !canvas) return;

        setProcessingBg(true);
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const imageDataUrl = ev.target.result;

            // Check for people in image using Gemini Vision
            if (geminiService.hasApiKey()) {
                try {
                    const detection = await geminiService.detectPeopleInImage(imageDataUrl);
                    if (detection.containsPeople && detection.confidence > 0.5) {
                        // Store pending image and show modal
                        setPendingBgImage(imageDataUrl);
                        setPeopleDescription(detection.description || 'People detected in image');
                        setShowPeopleModal(true);
                        setProcessingBg(false);
                        return; // Wait for user confirmation
                    }
                } catch (err) {
                    console.warn('People detection failed, continuing with upload:', err);
                }
            }

            // No people detected, proceed with upload
            applyBackgroundImage(imageDataUrl);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // Apply background after confirmation
    const applyBackgroundImage = (imageDataUrl) => {
        const img = new Image();
        img.onload = () => {
            const format = FORMAT_PRESETS[currentFormat];
            canvas.getObjects().forEach(o => { if (o.isBackground) canvas.remove(o); });

            const scale = Math.max(format.width / img.width, format.height / img.height);
            const fabricImg = new FabricImage(img, {
                left: 0, top: 0,
                scaleX: scale, scaleY: scale,
                selectable: false, evented: false,
                isBackground: true,
                customName: 'Background',
            });

            canvas.add(fabricImg);
            canvas.sendObjectToBack(fabricImg);
            canvas.renderAll();
            saveToHistory();
            setProcessingBg(false);
        };
        img.src = imageDataUrl;
    };

    // Handle people confirmation
    const confirmPeopleImage = () => {
        if (pendingBgImage) {
            applyBackgroundImage(pendingBgImage);
        }
        setShowPeopleModal(false);
        setPendingBgImage(null);
        setPeopleDescription('');
    };

    const cancelPeopleImage = () => {
        setShowPeopleModal(false);
        setPendingBgImage(null);
        setPeopleDescription('');
        setProcessingBg(false);
    };


    // Text handlers
    const addText = (type) => {
        if (!canvas) return;
        const format = FORMAT_PRESETS[currentFormat];
        const config = format.config || { headlineFontSize: 48, subFontSize: 32 };

        const presets = {
            heading: { text: 'Your Headline', size: config.headlineFontSize, weight: 'bold', y: 0.3 },
            subheading: { text: 'Subheading text', size: config.subFontSize, weight: '500', y: 0.42 },
            body: { text: 'Body copy', size: Math.round(config.subFontSize * 0.7), weight: 'normal', y: 0.52 },
        };
        const p = presets[type];

        const text = new IText(p.text, {
            left: format.width / 2,
            top: format.height * p.y,
            originX: 'center',
            originY: 'center',
            fontFamily: 'Inter, sans-serif',
            fontSize: p.size,
            fontWeight: p.weight,
            fill: '#000000',
            customName: type.charAt(0).toUpperCase() + type.slice(1),
        });

        canvas.add(text);
        canvas.setActiveObject(text);
        canvas.renderAll();
        saveToHistory();
        updateLayers();
    };

    // Value tile handler
    const addValueTile = (tile) => {
        if (!canvas) return;
        const format = FORMAT_PRESETS[currentFormat];
        const config = format.config || { valueTileScale: 1.0 };
        const scale = config.valueTileScale;

        // Check if this tile type already exists (only one of each type allowed)
        const existingTileOfType = canvas.getObjects().find(
            o => o.isValueTile && o.valueTileType === tile.id && o.type === 'rect'
        );
        if (existingTileOfType) {
            alert(`A ${tile.name} tile already exists on the canvas. Only one of each type is allowed.`);
            return;
        }

        // Fixed position based on tile type (predefined positions per compliance)
        // Value tiles go at the bottom of the canvas
        const tilePositions = {
            'new': { x: format.width * 0.15, y: format.height - (60 * scale) },
            'white': { x: format.width * 0.5, y: format.height - (60 * scale) },
            'clubcard': { x: format.width * 0.5, y: format.height - (60 * scale) },
        };

        // If horizontal layout, adjust positions
        if (config.layout === 'horizontal') {
            tilePositions.new = { x: format.width * 0.85, y: format.height * 0.25 };
            tilePositions.white = { x: format.width * 0.85, y: format.height * 0.5 };
            tilePositions.clubcard = { x: format.width * 0.85, y: format.height * 0.5 };
        }

        const pos = tilePositions[tile.id] || { x: format.width / 2, y: format.height - (100 * scale) };

        const rect = new Rect({
            width: tile.w * scale,
            height: tile.h * scale,
            fill: tile.bg,
            rx: 4 * scale, ry: 4 * scale,
            stroke: tile.border || null,
            strokeWidth: tile.border ? (2 * scale) : 0,
            originX: 'center', originY: 'center',
            left: pos.x, top: pos.y,
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

        let displayText = tile.name;
        if (tile.id === 'white') displayText = whitePrice;
        if (tile.id === 'clubcard') displayText = `${clubcardPrice}\nwas ${clubcardRegular}`;

        // Text editability depends on tile type per compliance:
        // - NEW: not editable at all
        // - White: only price editable (allow text editing)
        // - Clubcard: only prices editable (allow text editing)
        const isEditable = tile.id !== 'new';

        const text = new IText(displayText, {
            fontSize: tile.fontSize * scale,
            fontWeight: 'bold',
            fontFamily: 'Inter, sans-serif',
            fill: tile.text,
            originX: 'center', originY: 'center',
            left: pos.x, top: pos.y,
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

        canvas.add(rect);
        canvas.add(text);
        canvas.renderAll();
        saveToHistory();
        updateLayers();
    };

    // Tag handler
    const addTag = () => {
        if (!canvas) return;
        const format = FORMAT_PRESETS[currentFormat];

        let tagText = isExclusive ? 'Only at Tesco' : 'Available at Tesco';
        const hasClubcard = canvas.getObjects().some(o => o.valueTileType === 'clubcard');
        if (hasClubcard && clubcardEndDate) {
            tagText = `Clubcard/app required. Ends ${clubcardEndDate}`;
        }

        const text = new IText(tagText, {
            left: format.width / 2,
            top: format.height - 40,
            originX: 'center', originY: 'center',
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            fill: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: 8,
            customName: 'Tag',
            isTag: true,
        });

        canvas.add(text);
        canvas.renderAll();
        saveToHistory();
        updateLayers();
    };

    // Drinkaware handler
    const addDrinkaware = () => {
        if (!canvas) return;
        const format = FORMAT_PRESETS[currentFormat];

        const rect = new Rect({
            width: 180, height: 28,
            fill: '#ffffff',
            rx: 4, ry: 4,
            originX: 'center', originY: 'center',
        });

        const text = new IText('drinkaware.co.uk', {
            fontSize: 14,
            fontFamily: 'Inter, sans-serif',
            fill: '#000000',
            originX: 'center', originY: 'center',
            editable: false,
        });

        const posX = format.width - 100;
        const posY = format.height - 40;

        rect.set({ left: posX, top: posY, isDrinkaware: true, customName: 'Drinkaware' });
        text.set({ left: posX, top: posY, isDrinkaware: true });

        canvas.add(rect, text);
        canvas.renderAll();
        saveToHistory();
        updateLayers();
    };

    // Template handler - with confirmation
    const requestTemplateApply = (template) => {
        if (!canvas) return;
        const hasContent = canvas.getObjects().some(o => !o.isSafeZone);
        if (hasContent) {
            setPendingTemplate(template);
            setShowTemplateConfirm(true);
        } else {
            applyTemplate(template);
        }
    };

    const applyTemplate = (template) => {
        if (!canvas) return;
        setShowTemplateConfirm(false);
        setPendingTemplate(null);

        if (template.format !== currentFormat) {
            setCurrentFormat(template.format);
            setTimeout(() => applyTemplate(template), 100);
            return;
        }

        const format = FORMAT_PRESETS[currentFormat];
        canvas.getObjects().forEach(obj => { if (!obj.isSafeZone) canvas.remove(obj); });
        canvas.backgroundColor = template.elements[0]?.props?.fill || '#ffffff';
        canvas.renderAll();
        saveToHistory();
        updateLayers();
    };

    // AI copy generation
    const generateAICopy = async () => {
        if (!productName.trim()) return;
        setAiLoading(true);

        try {
            const result = await geminiService.generateCopySuggestions({
                productName,
                tone: 'friendly',
                format: currentFormat,
            });
            if (result.suggestions) setAiSuggestions(result.suggestions);
        } catch (err) {
            console.error(err);
        }
        setAiLoading(false);
    };

    const applySuggestion = (suggestion) => {
        if (!canvas) return;
        const format = FORMAT_PRESETS[currentFormat];

        const headline = new IText(suggestion.headline, {
            left: format.width / 2,
            top: format.height * 0.35,
            originX: 'center', originY: 'center',
            fontFamily: 'Inter, sans-serif',
            fontSize: 72,
            fontWeight: 'bold',
            fill: '#000000',
            customName: 'AI Headline',
        });

        canvas.add(headline);

        if (suggestion.subheadline) {
            const sub = new IText(suggestion.subheadline, {
                left: format.width / 2,
                top: format.height * 0.48,
                originX: 'center', originY: 'center',
                fontFamily: 'Inter, sans-serif',
                fontSize: 40,
                fill: '#333333',
                customName: 'AI Subheadline',
            });
            canvas.add(sub);
        }

        canvas.renderAll();
        saveToHistory();
        updateLayers();
        setAiSuggestions([]);
    };

    const packshotCount = getPackshotCount();

    // Render panel content based on active tab
    const renderPanelContent = () => {
        switch (activeTab) {
            case 'elements':
                return (
                    <div className="space-y-6 animate-fade-in">
                        {/* Packshots */}
                        <div className="section">
                            <div className="section-header">
                                <span className="section-title">Packshots</span>
                                <span className="badge badge-info">{packshotCount}/3</span>
                            </div>
                            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, false)} />
                            <input type="file" ref={bgRemoveInputRef} accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, true)} />
                            <input type="file" ref={aiRemoveInputRef} accept="image/*" className="hidden" onChange={handleAiImageUpload} />

                            <div className="space-y-2">
                                {/* Standard Upload - keeps background */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={packshotCount >= 3}
                                    className="w-full px-3 py-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] hover:bg-[var(--surface-overlay)] hover:border-[var(--border-default)] transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-md bg-[var(--surface-overlay)] flex items-center justify-center text-base group-hover:scale-105 transition-transform">
                                            📷
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="text-sm font-medium text-primary">Upload Image</div>
                                            <div className="text-[11px] text-muted">Keep original background</div>
                                        </div>
                                    </div>
                                </button>

                                {/* AI Background Removal - recommended */}
                                <button
                                    onClick={() => aiRemoveInputRef.current?.click()}
                                    disabled={aiRemovingBg || packshotCount >= 3}
                                    className="w-full px-3 py-3 rounded-lg border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 hover:bg-[var(--accent-primary)]/10 hover:border-[var(--accent-primary)]/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed group relative"
                                >
                                    <span className="absolute -top-2 right-3 text-[9px] bg-[var(--accent-primary)] text-white px-2 py-0.5 rounded-full font-medium">
                                        Recommended
                                    </span>
                                    {aiRemovingBg ? (
                                        <div className="flex items-center justify-center gap-2 py-1">
                                            <span className="animate-spin text-base">⏳</span>
                                            <span className="text-sm text-[var(--accent-primary)]">{processingStatus || 'Processing...'}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-md bg-[var(--accent-primary)]/20 flex items-center justify-center text-base group-hover:scale-105 transition-transform">
                                                ✂️
                                            </div>
                                            <div className="flex-1 text-left">
                                                <div className="text-sm font-medium text-[var(--accent-primary)]">Remove Background</div>
                                                <div className="text-[11px] text-muted">AI-powered clean cutout</div>
                                            </div>
                                        </div>
                                    )}
                                </button>

                                {!backgroundRemovalService.hasApiKey() && (
                                    <p className="text-[10px] text-amber-400/80 px-1">
                                        💡 Add VITE_WITHOUTBG_API_KEY for AI removal
                                    </p>
                                )}
                            </div>

                            {packshotCount === 0 && (
                                <p className="text-xs text-warning mt-2">Lead packshot required</p>
                            )}
                        </div>

                        {/* Logo */}
                        <div className="section">
                            <div className="section-header">
                                <span className="section-title">Logo</span>
                            </div>
                            <input type="file" ref={logoInputRef} accept="image/*" className="hidden" onChange={handleLogoUpload} />
                            <button
                                onClick={() => logoInputRef.current?.click()}
                                disabled={uploadingLogo}
                                className="btn btn-secondary w-full text-xs disabled:opacity-60 flex flex-col items-center py-2.5"
                            >
                                {uploadingLogo ? (
                                    <span className="flex items-center gap-2">
                                        <span className="animate-spin">⏳</span>
                                        <span>Processing logo...</span>
                                    </span>
                                ) : (
                                    <>
                                        <span className="flex items-center gap-1.5">
                                            <span>🏷️</span>
                                            <span className="font-medium">Upload Brand Logo</span>
                                        </span>
                                        <span className="text-[10px] text-muted mt-0.5">Auto-removes background</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Text */}
                        <div className="section">
                            <div className="section-header">
                                <span className="section-title">Text</span>
                            </div>
                            <div className="space-y-1.5">
                                {[
                                    { type: 'heading', label: 'Headline', req: true },
                                    { type: 'subheading', label: 'Subheading', req: true },
                                    { type: 'body', label: 'Body text', req: false },
                                ].map(item => (
                                    <button
                                        key={item.type}
                                        onClick={() => addText(item.type)}
                                        className="w-full text-left px-3 py-2 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--surface-overlay)] border border-[var(--border-subtle)] transition-all flex items-center justify-between"
                                    >
                                        <span className="text-xs text-secondary">{item.label}</span>
                                        {item.req && <span className="badge badge-warning">required</span>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Value Tiles - Simplified Click-to-Add */}
                        <div className="section">
                            <div className="section-header">
                                <span className="section-title">Value Tiles</span>
                            </div>
                            <p className="text-xs text-muted mb-3">Click to add to canvas</p>

                            <div className="grid grid-cols-1 gap-2">
                                {/* NEW Tile */}
                                <button
                                    onClick={() => addValueTile(VALUE_TILES[0])}
                                    className="flex items-center justify-center p-4 rounded-lg bg-[#e51c23] hover:bg-[#c41820] text-white font-bold text-lg transition-all hover:scale-[1.02] shadow-lg"
                                >
                                    NEW
                                </button>

                                {/* Price Tile */}
                                <button
                                    onClick={() => addValueTile(VALUE_TILES[1])}
                                    className="flex items-center justify-center p-4 rounded-lg bg-white border-2 border-[#003d7a] text-[#003d7a] font-bold text-lg transition-all hover:scale-[1.02] hover:shadow-lg"
                                >
                                    {whitePrice || '£2.50'}
                                </button>

                                {/* Clubcard Tile */}
                                <button
                                    onClick={() => addValueTile(VALUE_TILES[2])}
                                    className="flex flex-col items-center justify-center p-4 rounded-lg bg-[#003d7a] text-white font-bold transition-all hover:scale-[1.02] shadow-lg"
                                >
                                    <span className="text-lg">{clubcardPrice || '£1.50'}</span>
                                    <span className="text-xs font-normal opacity-70">was {clubcardRegular || '£2.00'}</span>
                                </button>
                            </div>

                            {/* Quick Edit Inputs */}
                            <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
                                <p className="text-xs text-muted mb-2">Edit prices before adding:</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <input
                                        type="text"
                                        value={whitePrice}
                                        onChange={(e) => setWhitePrice(e.target.value)}
                                        className="input input-sm text-center"
                                        placeholder="£2.50"
                                    />
                                    <input
                                        type="text"
                                        value={clubcardPrice}
                                        onChange={(e) => setClubcardPrice(e.target.value)}
                                        className="input input-sm text-center"
                                        placeholder="£1.50"
                                    />
                                    <input
                                        type="text"
                                        value={clubcardRegular}
                                        onChange={(e) => setClubcardRegular(e.target.value)}
                                        className="input input-sm text-center"
                                        placeholder="£2.00"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Tags - Enhanced UX */}
                        <div className="section">
                            <div className="section-header">
                                <span className="section-title">Tags</span>
                                {/* Smart indicator when tag is needed */}
                                {canvas?.getObjects().some(o => o.isValueTile || o.isPackshot) && 
                                 !canvas?.getObjects().some(o => o.isTag) && (
                                    <span className="badge badge-warning animate-pulse">Required</span>
                                )}
                            </div>
                            
                            {/* Tesco Tag Type Selection */}
                            <div className="space-y-2 mb-3">
                                <p className="text-xs text-muted">Select tag type:</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setIsExclusive(true)}
                                        className={`p-2.5 rounded-lg text-xs font-medium transition-all border ${
                                            isExclusive 
                                                ? 'bg-[var(--accent-primary)]/20 border-[var(--accent-primary)] text-[var(--accent-primary)]' 
                                                : 'bg-[var(--surface-elevated)] border-[var(--border-subtle)] text-secondary hover:border-[var(--border-default)]'
                                        }`}
                                    >
                                        <div className="flex flex-col items-center gap-1">
                                            <span>⭐</span>
                                            <span>Only at Tesco</span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setIsExclusive(false)}
                                        className={`p-2.5 rounded-lg text-xs font-medium transition-all border ${
                                            !isExclusive 
                                                ? 'bg-[var(--accent-primary)]/20 border-[var(--accent-primary)] text-[var(--accent-primary)]' 
                                                : 'bg-[var(--surface-elevated)] border-[var(--border-subtle)] text-secondary hover:border-[var(--border-default)]'
                                        }`}
                                    >
                                        <div className="flex flex-col items-center gap-1">
                                            <span>🏪</span>
                                            <span>Available at Tesco</span>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Clubcard End Date - Shows when Clubcard tile exists */}
                            {canvas?.getObjects().some(o => o.valueTileType === 'clubcard') && (
                                <div className="p-3 rounded-lg bg-[#003d7a]/10 border border-[#003d7a]/30 mb-3">
                                    <p className="text-xs text-[#6ba3d6] mb-2 flex items-center gap-1.5">
                                        <span>💳</span>
                                        <span className="font-medium">Clubcard Tag Required</span>
                                    </p>
                                    <div className="flex gap-2 items-center">
                                        <label className="text-xs text-muted whitespace-nowrap">Ends:</label>
                                        <input
                                            type="text"
                                            value={clubcardEndDate}
                                            onChange={(e) => setClubcardEndDate(e.target.value)}
                                            placeholder="DD/MM (e.g. 15/01)"
                                            className="input input-sm flex-1"
                                        />
                                    </div>
                                    {!clubcardEndDate && (
                                        <p className="text-[10px] text-amber-400 mt-1.5">
                                            ⚠️ End date required for Clubcard tags
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Tag Preview */}
                            <div className="p-3 rounded-lg bg-[var(--surface-overlay)] border border-[var(--border-subtle)] mb-3">
                                <p className="text-[10px] text-muted mb-2 uppercase tracking-wide">Preview</p>
                                <div className="flex justify-center">
                                    <div className="px-3 py-1.5 rounded text-xs font-medium bg-black/70 text-white">
                                        {canvas?.getObjects().some(o => o.valueTileType === 'clubcard') && clubcardEndDate
                                            ? `Clubcard/app required. Ends ${clubcardEndDate}`
                                            : isExclusive 
                                                ? 'Only at Tesco' 
                                                : 'Available at Tesco'
                                        }
                                    </div>
                                </div>
                            </div>

                            {/* Add Tag Button */}
                            <button 
                                onClick={addTag} 
                                className="btn btn-primary w-full text-xs flex items-center justify-center gap-2"
                            >
                                <span>🏷️</span>
                                <span>Add Tag to Canvas</span>
                            </button>

                            {/* 9:16 Safe Zone Reminder */}
                            {(currentFormat === 'instagram-story' || currentFormat === 'facebook-story') && (
                                <p className="text-[10px] text-muted mt-2 p-2 rounded bg-[var(--surface-elevated)]">
                                    💡 <strong>9:16 Format:</strong> Keep tags outside the top 200px and bottom 250px safe zones
                                </p>
                            )}
                        </div>

                        {/* Background */}
                        <div className="section">
                            <div className="section-header">
                                <span className="section-title">Background</span>
                            </div>
                            <input type="file" ref={bgInputRef} accept="image/*" className="hidden" onChange={handleBackgroundUpload} />
                            <button onClick={() => bgInputRef.current?.click()} className="btn btn-secondary w-full text-xs mb-2" disabled={isProcessing}>
                                {isProcessing ? '⏳' : '🖼️'} Upload Image
                            </button>
                            <div className="flex flex-wrap gap-2">
                                {savedColors.map((color, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setBackgroundColor(color); addSavedColor(color); }}
                                        className={`color-swatch ${backgroundColor === color ? 'active' : ''}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                                <div className="relative">
                                    <input
                                        type="color"
                                        value={backgroundColor}
                                        onChange={(e) => { setBackgroundColor(e.target.value); addSavedColor(e.target.value); }}
                                        className="w-7 h-7 opacity-0 absolute inset-0 cursor-pointer"
                                    />
                                    <div className="color-swatch border-2 border-dashed border-[var(--border-default)] flex items-center justify-center text-muted text-sm">+</div>
                                </div>
                            </div>
                        </div>

                        {/* Alcohol */}
                        <div className="section">
                            <label className="checkbox-label card">
                                <input type="checkbox" checked={isAlcoholProduct} onChange={(e) => setIsAlcoholProduct(e.target.checked)} />
                                <span>🍺 Alcohol product</span>
                            </label>
                            {isAlcoholProduct && (
                                <button onClick={addDrinkaware} className="btn btn-warning w-full text-xs mt-2">
                                    + Drinkaware (required)
                                </button>
                            )}
                        </div>
                    </div>
                );

            case 'templates':
                return (
                    <div className="animate-fade-in">
                        <div className="grid grid-cols-2 gap-2">
                            {TEMPLATE_LIBRARY.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => requestTemplateApply(t)}
                                    className="card aspect-square relative overflow-hidden group hover:border-[var(--accent-primary)] transition-all"
                                >
                                    <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: t.elements[0]?.props?.fill || '#ccc' }}>
                                        <span className="text-2xl opacity-60">
                                            {t.category === 'Promotion' && '🏷️'}
                                            {t.category === 'Launch' && '🚀'}
                                            {t.category === 'Value' && '💰'}
                                            {t.category === 'Story' && '📱'}
                                            {t.category === 'Clubcard' && '💳'}
                                            {t.category === 'Facebook' && '👍'}
                                        </span>
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                                        <p className="text-[10px] font-medium text-white truncate">{t.name}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                );

            case 'ai':
                return (
                    <div className="space-y-4 animate-fade-in">
                        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1))', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
                            <p className="text-xs text-secondary mb-3">Generate compelling copy with AI</p>
                            <input
                                type="text"
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                placeholder="Product name (e.g., Coca-Cola Zero)"
                                className="input mb-2"
                            />
                            <button
                                onClick={generateAICopy}
                                disabled={aiLoading || !geminiService.hasApiKey()}
                                className="btn btn-primary w-full"
                            >
                                {aiLoading ? '⏳ Generating...' : '✨ Generate Copy'}
                            </button>
                        </div>

                        {aiSuggestions.length > 0 && (
                            <div className="space-y-2">
                                <span className="section-title">Suggestions</span>
                                {aiSuggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => applySuggestion(s)}
                                        className="w-full text-left card hover:border-[var(--accent-secondary)]"
                                    >
                                        <p className="font-semibold text-sm text-primary">{s.headline}</p>
                                        {s.subheadline && <p className="text-xs text-secondary mt-1">{s.subheadline}</p>}
                                    </button>
                                ))}
                            </div>
                        )}

                        {!geminiService.hasApiKey() && (
                            <div className="card" style={{ background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                                <p className="text-xs text-warning mb-2">Enter Gemini API key</p>
                                <input
                                    type="password"
                                    placeholder="API key"
                                    className="input input-sm"
                                    onBlur={(e) => {
                                        if (e.target.value) {
                                            geminiService.setApiKey(e.target.value);
                                            window.location.reload();
                                        }
                                    }}
                                />
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <>
            {/* Icon Rail */}
            <nav className="icon-rail">
                {[
                    { id: 'elements', icon: Icons.elements, label: 'Elements' },
                    { id: 'templates', icon: Icons.templates, label: 'Templates' },
                    { id: 'ai', icon: Icons.ai, label: 'AI Copy' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`icon-rail-btn tooltip ${activeTab === tab.id ? 'active' : ''}`}
                        data-tooltip={tab.label}
                    >
                        {tab.icon}
                    </button>
                ))}
            </nav>

            {/* Panel */}
            <aside className="sidebar-panel">
                <div className="sidebar-header">
                    <h2>{
                        activeTab === 'elements' ? 'Elements' :
                            activeTab === 'templates' ? 'Templates' : 'AI Copy'
                    }</h2>
                </div>
                <div className="sidebar-content">
                    {renderPanelContent()}
                </div>
            </aside>

            {/* People Detection Modal */}
            {showPeopleModal && (
                <div className="modal-overlay">
                    <div className="modal max-w-md">
                        <div className="modal-header">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                    <span className="text-white text-xl">👤</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold">People Detected</h2>
                                    <p className="text-xs text-muted">Appendix B Compliance Check</p>
                                </div>
                            </div>
                        </div>
                        <div className="modal-body">
                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-4">
                                <p className="text-sm text-primary mb-2">
                                    <strong>AI detected people in this image:</strong>
                                </p>
                                <p className="text-xs text-secondary">{peopleDescription}</p>
                            </div>
                            <p className="text-sm text-secondary mb-4">
                                Per Appendix B guidelines, images containing people require confirmation
                                that the person(s) are <strong>integral to the campaign</strong>.
                            </p>
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--surface-overlay)]">
                                <input type="checkbox" id="peopleConfirm" className="w-4 h-4" />
                                <label htmlFor="peopleConfirm" className="text-xs text-secondary">
                                    I confirm the person(s) in this image are integral to this campaign
                                </label>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={cancelPeopleImage} className="btn btn-ghost">
                                Cancel
                            </button>
                            <button onClick={confirmPeopleImage} className="btn btn-primary">
                                Use Image
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Template Confirmation Modal */}
            {showTemplateConfirm && (
                <div className="modal-overlay">
                    <div className="modal max-w-sm">
                        <div className="modal-header">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                                    <span className="text-white text-xl">🎨</span>
                                </div>
                                <h2 className="text-lg font-bold">Apply Template?</h2>
                            </div>
                        </div>
                        <div className="modal-body">
                            <p className="text-sm text-secondary">
                                This will replace your current canvas content with the <strong>{pendingTemplate?.name}</strong> template.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button
                                onClick={() => { setShowTemplateConfirm(false); setPendingTemplate(null); }}
                                className="btn btn-ghost"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => applyTemplate(pendingTemplate)}
                                className="btn btn-primary"
                            >
                                Apply Template
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default Sidebar;
