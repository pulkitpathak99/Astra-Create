import React, { useRef, useState } from 'react';
import { FabricImage, IText, Rect, Circle, Triangle, Line, Ellipse, Polygon, Path } from 'fabric';
import useStore, { TEMPLATE_LIBRARY, FORMAT_PRESETS, CREATIVE_PROFILES } from '../store/useStore';
import { removeBackground } from '../utils/imageProcessing';
import geminiService from '../services/geminiService';
import backgroundRemovalService from '../services/backgroundRemovalService';
import { addToCanvas, safeHistorySave, getPackshotCount as getPackshotCountHelper } from '../utils/canvasHelpers';
import { DEMO_CREATIVES } from './DemoGallery';

// Icon components
const Icons = {
    elements: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
    ),
    gallery: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    ),
    ai: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
        </svg>
    ),
};

// Value tile base configs - dimensions adjust per format
const VALUE_TILES = [
    {
        id: 'new',
        name: 'New',
        bg: '#00539F',
        text: '#ffffff',
        // Base dimensions (for 1080px formats)
        w: 100,
        h: 40,
        fontSize: 24,
        editable: false,
        // Format-specific overrides
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
        id: 'white',
        name: 'White',
        bg: '#ffffff',
        text: '#00539F',
        w: 160,
        h: 60,
        fontSize: 24,
        editable: 'price',
        border: '#00539F',
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
        bg: '#FFD700', // Tesco yellow
        text: '#00539F', // Tesco blue
        w: 160,
        h: 160,
        fontSize: 48,
        editable: 'prices',
        isCircular: true,
        labelText: 'Clubcard Price',
        labelFontSize: 14,
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

// Helper function to get format-specific tile dimensions
const getTileForFormat = (tile, formatKey) => {
    const overrides = tile.formatOverrides?.[formatKey];
    if (overrides) {
        return { ...tile, ...overrides };
    }
    return tile;
};

// Comprehensive Shapes Library
const SHAPE_LIBRARY = {
    basic: [
        { id: 'rectangle', name: 'Rectangle', icon: '▢', type: 'rect' },
        { id: 'rounded-rect', name: 'Rounded Rectangle', icon: '▢', type: 'rect', rx: 20, ry: 20 },
        { id: 'circle', name: 'Circle', icon: '●', type: 'circle' },
        { id: 'ellipse', name: 'Ellipse', icon: '⬭', type: 'ellipse' },
        { id: 'triangle', name: 'Triangle', icon: '▲', type: 'triangle' },
        { id: 'diamond', name: 'Diamond', icon: '◆', type: 'polygon', points: 4, rotation: 45 },
    ],
    advanced: [
        { id: 'star-5', name: '5-Point Star', icon: '★', type: 'star', points: 5 },
        { id: 'star-6', name: '6-Point Star', icon: '✡', type: 'star', points: 6 },
        { id: 'hexagon', name: 'Hexagon', icon: '⬡', type: 'polygon', points: 6 },
        { id: 'pentagon', name: 'Pentagon', icon: '⬠', type: 'polygon', points: 5 },
        { id: 'octagon', name: 'Octagon', icon: '⯃', type: 'polygon', points: 8 },
        { id: 'heart', name: 'Heart', icon: '❤', type: 'path', pathId: 'heart' },
    ],
    decorative: [
        { id: 'badge', name: 'Badge', icon: '🏷️', type: 'path', pathId: 'badge' },
        { id: 'burst', name: 'Starburst', icon: '💥', type: 'star', points: 12, innerRadius: 0.4 },
        { id: 'arrow-right', name: 'Arrow Right', icon: '➡', type: 'path', pathId: 'arrow-right' },
        { id: 'arrow-left', name: 'Arrow Left', icon: '⬅', type: 'path', pathId: 'arrow-left' },
        { id: 'chevron', name: 'Chevron', icon: '❯', type: 'path', pathId: 'chevron' },
        { id: 'banner', name: 'Banner', icon: '🎗️', type: 'path', pathId: 'banner' },
    ],
    lines: [
        { id: 'line', name: 'Line', icon: '─', type: 'line' },
        { id: 'line-thick', name: 'Thick Line', icon: '━', type: 'line', strokeWidth: 8 },
        { id: 'line-dashed', name: 'Dashed Line', icon: '┅', type: 'line', strokeDashArray: [10, 5] },
        { id: 'line-dotted', name: 'Dotted Line', icon: '┈', type: 'line', strokeDashArray: [3, 3] },
    ],
};

// Default shape properties
const DEFAULT_SHAPE_PROPS = {
    fill: '#003d7a',
    stroke: '#ffffff',
    strokeWidth: 0,
    opacity: 1,
};

// SVG Paths for complex shapes
const SHAPE_PATHS = {
    heart: 'M 50 30 C 50 25 45 20 40 20 C 30 20 25 30 25 35 C 25 55 50 70 50 70 C 50 70 75 55 75 35 C 75 30 70 20 60 20 C 55 20 50 25 50 30 Z',
    badge: 'M 50 5 L 60 20 L 80 20 L 65 35 L 70 55 L 50 45 L 30 55 L 35 35 L 20 20 L 40 20 Z',
    'arrow-right': 'M 10 40 L 60 40 L 60 25 L 90 50 L 60 75 L 60 60 L 10 60 Z',
    'arrow-left': 'M 90 40 L 40 40 L 40 25 L 10 50 L 40 75 L 40 60 L 90 60 Z',
    chevron: 'M 30 20 L 60 50 L 30 80 L 40 80 L 70 50 L 40 20 Z',
    banner: 'M 10 20 L 90 20 L 85 50 L 90 80 L 10 80 L 15 50 Z',
};


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

    // Shape customization state
    const [shapeFill, setShapeFill] = useState('#003d7a');
    const [shapeStroke, setShapeStroke] = useState('#ffffff');
    const [shapeStrokeWidth, setShapeStrokeWidth] = useState(0);
    const [shapeOpacity, setShapeOpacity] = useState(1);
    const [expandedShapeCategory, setExpandedShapeCategory] = useState('basic');


    const {
        canvas, savedColors, addSavedColor,
        backgroundColor, setBackgroundColor,
        isAlcoholProduct, setIsAlcoholProduct,
        isLEPMode, setIsLEPMode,
        creativeProfile, setCreativeProfile,
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

    // Creative Profile helpers
    const currentProfileConfig = CREATIVE_PROFILES[creativeProfile] || CREATIVE_PROFILES.STANDARD;

    const isToolDisabled = (toolId) => {
        return currentProfileConfig.disabledTools.includes(toolId);
    };

    const isValueTileAllowed = (tileId) => {
        return currentProfileConfig.constraints.valueTiles.allowed.includes(tileId);
    };

    // Apply profile constraints to canvas
    const applyProfileConstraints = (profileId) => {
        const profile = CREATIVE_PROFILES[profileId];
        if (!profile || !canvas) return;

        // Lock background if required
        if (profile.constraints.background.locked) {
            canvas.backgroundColor = profile.constraints.background.value;
            setBackgroundColor(profile.constraints.background.value);
        }

        // Update text colors if locked
        if (profile.constraints.textColor.locked) {
            canvas.getObjects().forEach(obj => {
                if (obj.type === 'i-text' || obj.type === 'text') {
                    obj.set('fill', profile.constraints.textColor.value);
                }
            });
        }

        // Auto-add required tag if specified
        if (profile.autoTag) {
            const existingTag = canvas.getObjects().find(o => o.isTag || o.isLEPTag);
            if (!existingTag) {
                const format = FORMAT_PRESETS[currentFormat];
                // Position tag at very bottom to avoid overlapping with value tiles
                const tagY = format.height - 25;
                const tag = new IText(profile.autoTag, {
                    left: format.width / 2,
                    top: tagY,
                    originX: 'center',
                    originY: 'center',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 20, // Minimum accessible font size
                    fill: profile.id === 'LOW_EVERYDAY_PRICE' ? '#666666' : '#ffffff',
                    textAlign: 'center',
                    isTag: true,
                    isLEPTag: profile.id === 'LOW_EVERYDAY_PRICE',
                    customName: 'LEP Tag',
                    // Lock position but allow editing
                    lockMovementX: true,
                    lockMovementY: true,
                    lockRotation: true,
                    lockScalingX: true,
                    lockScalingY: true,
                });
                canvas.add(tag);
            }
        }

        canvas.renderAll();
        saveToHistory();
        updateLayers();
    };

    // Handle profile change
    const handleProfileChange = (profileId) => {
        setCreativeProfile(profileId);
        applyProfileConstraints(profileId);
    };

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

        // Get current profile from store (avoid stale closure)
        const currentProfile = useStore.getState().creativeProfile;
        const profileConfig = CREATIVE_PROFILES[currentProfile] || CREATIVE_PROFILES.STANDARD;

        const presets = {
            heading: { text: 'Your Headline', size: config.headlineFontSize, weight: 'bold', y: 0.3 },
            subheading: { text: 'Subheading text', size: config.subFontSize, weight: '500', y: 0.42 },
            body: { text: 'Body copy', size: Math.round(config.subFontSize * 0.7), weight: 'normal', y: 0.52 },
        };
        const p = presets[type];

        // Use profile's locked text color if applicable, otherwise default
        const textColor = profileConfig.constraints.textColor.locked
            ? profileConfig.constraints.textColor.value
            : '#000000';

        // Use profile's locked text alignment if applicable
        const textAlign = profileConfig.constraints.textAlignment?.locked
            ? profileConfig.constraints.textAlignment.value
            : 'center';

        const text = new IText(p.text, {
            left: textAlign === 'left' ? 50 : format.width / 2,
            top: format.height * p.y,
            originX: textAlign === 'left' ? 'left' : 'center',
            originY: 'center',
            fontFamily: 'Inter, sans-serif',
            fontSize: p.size,
            fontWeight: p.weight,
            fill: textColor,
            textAlign: textAlign,
            customName: type.charAt(0).toUpperCase() + type.slice(1),
        });

        canvas.add(text);
        canvas.setActiveObject(text);
        canvas.renderAll();
        saveToHistory();
        updateLayers();
    };

    // Shape handler - comprehensive shape creation
    const addShape = (shapeConfig) => {
        if (!canvas) return;
        const format = FORMAT_PRESETS[currentFormat];

        const baseProps = {
            left: format.width / 2,
            top: format.height / 2,
            originX: 'center',
            originY: 'center',
            fill: shapeFill,
            stroke: shapeStroke,
            strokeWidth: shapeStrokeWidth,
            opacity: shapeOpacity,
            customName: shapeConfig.name,
            isShape: true,
        };

        let shape;
        const size = Math.min(format.width, format.height) * 0.15; // Default size relative to canvas

        switch (shapeConfig.type) {
            case 'rect':
                shape = new Rect({
                    ...baseProps,
                    width: size * 1.5,
                    height: size,
                    rx: shapeConfig.rx || 0,
                    ry: shapeConfig.ry || 0,
                });
                break;

            case 'circle':
                shape = new Circle({
                    ...baseProps,
                    radius: size / 2,
                });
                break;

            case 'ellipse':
                shape = new Ellipse({
                    ...baseProps,
                    rx: size * 0.75,
                    ry: size * 0.5,
                });
                break;

            case 'triangle':
                shape = new Triangle({
                    ...baseProps,
                    width: size,
                    height: size,
                });
                break;

            case 'polygon': {
                // Create regular polygon with specified number of points
                const points = shapeConfig.points || 6;
                const radius = size / 2;
                const polygonPoints = [];
                const angleOffset = shapeConfig.rotation ? (shapeConfig.rotation * Math.PI / 180) : -Math.PI / 2;

                for (let i = 0; i < points; i++) {
                    const angle = (2 * Math.PI * i / points) + angleOffset;
                    polygonPoints.push({
                        x: radius * Math.cos(angle),
                        y: radius * Math.sin(angle),
                    });
                }

                shape = new Polygon(polygonPoints, {
                    ...baseProps,
                });
                break;
            }

            case 'star': {
                // Create star shape with inner and outer radius
                const points = shapeConfig.points || 5;
                const outerRadius = size / 2;
                const innerRadius = outerRadius * (shapeConfig.innerRadius || 0.5);
                const starPoints = [];

                for (let i = 0; i < points * 2; i++) {
                    const angle = (Math.PI * i / points) - Math.PI / 2;
                    const radius = i % 2 === 0 ? outerRadius : innerRadius;
                    starPoints.push({
                        x: radius * Math.cos(angle),
                        y: radius * Math.sin(angle),
                    });
                }

                shape = new Polygon(starPoints, {
                    ...baseProps,
                });
                break;
            }

            case 'path': {
                // Create complex path shapes from SVG path data
                const pathData = SHAPE_PATHS[shapeConfig.pathId];
                if (pathData) {
                    shape = new Path(pathData, {
                        ...baseProps,
                        scaleX: size / 100,
                        scaleY: size / 100,
                    });
                }
                break;
            }

            case 'line': {
                const lineLength = size * 2;
                shape = new Line([0, 0, lineLength, 0], {
                    ...baseProps,
                    fill: null,
                    stroke: shapeFill, // Use fill color for line stroke
                    strokeWidth: shapeConfig.strokeWidth || 4,
                    strokeDashArray: shapeConfig.strokeDashArray || null,
                });
                break;
            }

            default:
                return;
        }

        if (shape) {
            canvas.add(shape);
            canvas.setActiveObject(shape);
            canvas.renderAll();
            saveToHistory();
            updateLayers();
        }
    };

    // Value tile handler
    const addValueTile = (baseTile) => {
        if (!canvas) return;
        const format = FORMAT_PRESETS[currentFormat];
        const config = format.config || { valueTileScale: 1.0 };

        // Get format-specific tile dimensions (no additional scaling needed)
        const tile = getTileForFormat(baseTile, currentFormat);

        // Check if this tile type already exists (only one of each type allowed)
        const existingTileOfType = canvas.getObjects().find(
            o => o.isValueTile && o.valueTileType === tile.id && (o.type === 'rect' || o.type === 'circle')
        );
        if (existingTileOfType) {
            alert(`A ${tile.name} tile already exists on the canvas. Only one of each type is allowed.`);
            return;
        }

        // Fixed position based on tile type (predefined positions per compliance)
        // Clubcard needs more vertical space due to its circular design
        const clubcardTileY = format.height - (tile.h / 2) - 40;
        const standardTileY = format.height - tile.h - 30;

        const tilePositions = {
            'new': { x: format.width * 0.15, y: standardTileY },
            'white': { x: format.width * 0.5, y: standardTileY },
            'clubcard': { x: format.width * 0.65, y: clubcardTileY },
        };

        // If horizontal layout, adjust positions
        if (config.layout === 'horizontal') {
            tilePositions.new = { x: format.width * 0.85, y: format.height * 0.25 };
            tilePositions.white = { x: format.width * 0.85, y: format.height * 0.5 };
            tilePositions.clubcard = { x: format.width * 0.75, y: format.height * 0.5 };
        }

        const pos = tilePositions[tile.id] || { x: format.width / 2, y: standardTileY };

        // Handle Clubcard tile differently - circular design matching Tesco's official look
        if (tile.isCircular && tile.id === 'clubcard') {
            const radius = tile.w / 2;

            // Yellow circular background
            const circle = new Circle({
                radius: radius,
                fill: tile.bg, // Tesco yellow #FFD700
                originX: 'center',
                originY: 'center',
                left: pos.x,
                top: pos.y,
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
                customName: 'Clubcard Circle',
            });
            canvas.add(circle);

            // Offer price - large, bold, centered in circle (editable)
            const priceText = new IText(clubcardPrice, {
                fontSize: tile.fontSize,
                fontWeight: 'bold',
                fontFamily: 'Inter, sans-serif',
                fill: tile.text, // Tesco blue #00539F
                originX: 'center',
                originY: 'center',
                left: pos.x,
                top: pos.y - (radius * 0.15), // Slightly above center
                textAlign: 'center',
                selectable: true,
                evented: true,
                editable: true,
                lockMovementX: true,
                lockMovementY: true,
                lockRotation: true,
                lockScalingX: true,
                lockScalingY: true,
                hasControls: false,
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
                fill: tile.text, // Same blue
                originX: 'center',
                originY: 'center',
                left: pos.x,
                top: pos.y + (radius * 0.45), // Below the price
                textAlign: 'center',
                selectable: false,
                evented: false,
                editable: false,
                lockMovementX: true,
                lockMovementY: true,
                isValueTile: true,
                valueTileType: tile.id,
                customName: 'Clubcard Label',
            });
            canvas.add(labelText);

            // Regular price - shown to the left of the circle (editable)
            const regularPriceY = pos.y;
            const regularPriceX = pos.x - radius - 90; // Increased spacing

            // "Original Price" label above the regular price
            const originalPriceLabel = new IText('Original Price', {
                fontSize: tile.fontSize * 0.25,
                fontWeight: 'normal',
                fontFamily: 'Inter, sans-serif',
                fill: '#00539F', // Tesco blue
                originX: 'center',
                originY: 'center',
                left: regularPriceX,
                top: regularPriceY - (tile.fontSize * 0.45),
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

            const regularPriceText = new IText(clubcardRegular, {
                fontSize: tile.fontSize * 0.7,
                fontWeight: 'bold',
                fontFamily: 'Inter, sans-serif',
                fill: '#00539F', // Tesco blue
                originX: 'center',
                originY: 'center',
                left: regularPriceX,
                top: regularPriceY + (tile.fontSize * 0.1), // Slightly lower to accommodate label
                textAlign: 'center',
                selectable: true,
                evented: true,
                editable: true,
                lockMovementX: true,
                lockMovementY: true,
                lockRotation: true,
                lockScalingX: true,
                lockScalingY: true,
                hasControls: false,
                isValueTile: true,
                valueTileType: 'clubcard-regular',
                customName: 'Regular Price',
            });
            canvas.add(regularPriceText);

            // Auto-add clubcard tag if end date is set
            if (clubcardEndDate) {
                const existingTag = canvas.getObjects().find(o => o.isTag);
                if (!existingTag) {
                    const tagText = `Available in selected stores. Clubcard/app required. Ends ${clubcardEndDate}`;
                    const tag = new IText(tagText, {
                        left: format.width / 2,
                        top: format.height - 30,
                        originX: 'center',
                        originY: 'center',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: Math.max(12, tile.fontSize * 0.3),
                        fill: '#666666',
                        textAlign: 'center',
                        isTag: true,
                        customName: 'Clubcard Tag',
                        lockMovementX: true,
                        lockMovementY: true,
                    });
                    canvas.add(tag);
                }
            }
        } else {
            // Standard rectangular tiles (NEW, White)
            const rect = new Rect({
                width: tile.w,
                height: tile.h,
                fill: tile.bg,
                rx: 4, ry: 4,
                stroke: tile.border || null,
                strokeWidth: tile.border ? 2 : 0,
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

            // Text editability depends on tile type per compliance:
            // - NEW: not editable at all
            // - White: only price editable
            const isEditable = tile.id !== 'new';

            const text = new IText(displayText, {
                fontSize: tile.fontSize,
                fontWeight: 'bold',
                fontFamily: 'Inter, sans-serif',
                fill: tile.text,
                originX: 'center', originY: 'center',
                left: pos.x, top: pos.y,
                textAlign: 'center',
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
        }

        canvas.renderAll();
        saveToHistory();
        updateLayers();
    };

    // Remove value tile by type
    const removeValueTile = (tileType) => {
        if (!canvas) return;

        // Find and remove all objects associated with this tile type
        const objectsToRemove = canvas.getObjects().filter(o =>
            o.valueTileType === tileType ||
            o.valueTileType === `${tileType}-regular` // For Clubcard regular price
        );

        if (objectsToRemove.length === 0) {
            return;
        }

        objectsToRemove.forEach(obj => canvas.remove(obj));
        canvas.renderAll();
        saveToHistory();
        updateLayers();
    };

    // Check if a specific tile type exists on canvas
    const hasTileOnCanvas = (tileType) => {
        if (!canvas) return false;
        return canvas.getObjects().some(o =>
            o.valueTileType === tileType && (o.type === 'rect' || o.type === 'circle')
        );
    };

    // Tag handler
    const addTag = () => {
        if (!canvas) return;
        const format = FORMAT_PRESETS[currentFormat];

        let tagText = isExclusive ? 'Only at Tesco' : 'Available at Tesco';
        const hasClubcard = canvas.getObjects().some(o => o.valueTileType === 'clubcard');
        if (hasClubcard && clubcardEndDate) {
            tagText = `Available in selected stores. Clubcard/app required. Ends ${clubcardEndDate}`;
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

    const applyTemplate = (template, formatAlreadySet = false) => {
        if (!canvas) return;
        setShowTemplateConfirm(false);
        setPendingTemplate(null);

        // If format needs to change and hasn't been set yet, change format first
        if (template.format !== currentFormat && !formatAlreadySet) {
            setCurrentFormat(template.format);
            // Re-call with flag to indicate format has been updated
            setTimeout(() => applyTemplate(template, true), 150);
            return;
        }

        // Get the format (use template's format since currentFormat might not be updated yet)
        const format = FORMAT_PRESETS[template.format];
        if (!format) return;

        canvas.getObjects().forEach(obj => { if (!obj.isSafeZone) canvas.remove(obj); });
        canvas.backgroundColor = template.elements[0]?.props?.fill || '#ffffff';
        canvas.renderAll();
        saveToHistory();
        updateLayers();
    };

    // Apply demo creative to canvas
    const applyDemoCreative = (demo, variantIndex = 0) => {
        if (!canvas) return;

        const variant = demo.variants[variantIndex];
        if (!variant) return;

        const format = FORMAT_PRESETS[currentFormat];
        const tileScale = format.config?.valueTileScale || 1.0;

        // Clear canvas
        canvas.getObjects().forEach(obj => { if (!obj.isSafeZone) canvas.remove(obj); });

        // Set background
        canvas.backgroundColor = variant.backgroundColor;
        setBackgroundColor(variant.backgroundColor);

        // Add headline
        const headline = new IText(variant.headline, {
            left: format.width / 2,
            top: format.height * 0.25,
            originX: 'center',
            originY: 'center',
            fontFamily: 'Inter, sans-serif',
            fontSize: format.config?.headlineFontSize || 72,
            fontWeight: 'bold',
            fill: variant.headlineColor,
            textAlign: 'center',
            customName: 'Headline',
        });
        canvas.add(headline);

        // Add subheadline
        const subheadline = new IText(variant.subheadline, {
            left: format.width / 2,
            top: format.height * 0.38,
            originX: 'center',
            originY: 'center',
            fontFamily: 'Inter, sans-serif',
            fontSize: format.config?.subFontSize || 36,
            fill: variant.headlineColor,
            opacity: 0.8,
            textAlign: 'center',
            customName: 'Subheadline',
        });
        canvas.add(subheadline);

        // Add value tile based on priceType - using new circular Clubcard design
        const tileConfig = VALUE_TILES.find(t => t.id === variant.priceType) || VALUE_TILES[0];

        if (tileConfig.isCircular && tileConfig.id === 'clubcard') {
            // Circular Clubcard design matching Tesco's official look
            const radius = (tileConfig.w * tileScale) / 2;
            const clubcardPosY = format.height - radius - 80;
            const clubcardPosX = format.width * 0.65;

            // Yellow circular background
            const circle = new Circle({
                radius: radius,
                fill: tileConfig.bg, // Tesco yellow #FFD700
                originX: 'center',
                originY: 'center',
                left: clubcardPosX,
                top: clubcardPosY,
                selectable: false,
                evented: false,
                isValueTile: true,
                valueTileType: tileConfig.id,
                customName: 'Clubcard Circle',
            });
            canvas.add(circle);

            // Offer price - large, bold, centered in circle (editable)
            const priceText = new IText(variant.price || '£1.50', {
                fontSize: tileConfig.fontSize * tileScale,
                fontWeight: 'bold',
                fontFamily: 'Inter, sans-serif',
                fill: tileConfig.text, // Tesco blue #00539F
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
                valueTileType: tileConfig.id,
                customName: 'Clubcard Price',
            });
            canvas.add(priceText);

            // "Clubcard Price" label below price
            const labelText = new IText(tileConfig.labelText || 'Clubcard Price', {
                fontSize: (tileConfig.labelFontSize || 14) * tileScale,
                fontWeight: 'normal',
                fontFamily: 'Inter, sans-serif',
                fill: tileConfig.text,
                originX: 'center',
                originY: 'center',
                left: clubcardPosX,
                top: clubcardPosY + (radius * 0.45),
                textAlign: 'center',
                selectable: false,
                evented: false,
                isValueTile: true,
                valueTileType: tileConfig.id,
                customName: 'Clubcard Label',
            });
            canvas.add(labelText);

            // Regular price - shown to the left of the circle (editable)
            const regularPriceX = clubcardPosX - radius - (60 * tileScale);
            const regularPriceText = new IText(variant.wasPrice || '£2.00', {
                fontSize: (tileConfig.fontSize * 0.7) * tileScale,
                fontWeight: 'bold',
                fontFamily: 'Inter, sans-serif',
                fill: '#00539F',
                originX: 'center',
                originY: 'center',
                left: regularPriceX,
                top: clubcardPosY,
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
            const tilePos = { x: format.width / 2, y: format.height - (80 * tileScale) };

            const tileRect = new Rect({
                width: tileConfig.w * tileScale,
                height: tileConfig.h * tileScale,
                fill: tileConfig.bg,
                rx: 4 * tileScale,
                ry: 4 * tileScale,
                stroke: tileConfig.border || null,
                strokeWidth: tileConfig.border ? (2 * tileScale) : 0,
                originX: 'center',
                originY: 'center',
                left: tilePos.x,
                top: tilePos.y,
                selectable: false,
                evented: false,
                isValueTile: true,
                valueTileType: tileConfig.id,
                customName: tileConfig.name,
            });

            let displayText = tileConfig.name;
            if (tileConfig.id === 'white') displayText = variant.price || '£2.50';

            const tileText = new IText(displayText, {
                fontSize: tileConfig.fontSize * tileScale,
                fontWeight: 'bold',
                fontFamily: 'Inter, sans-serif',
                fill: tileConfig.text,
                originX: 'center',
                originY: 'center',
                left: tilePos.x,
                top: tilePos.y,
                textAlign: 'center',
                selectable: tileConfig.id !== 'new',
                evented: tileConfig.id !== 'new',
                isValueTile: true,
                valueTileType: tileConfig.id,
                customName: `${tileConfig.name} Text`,
            });

            canvas.add(tileRect);
            canvas.add(tileText);
        }

        // Add Drinkaware for alcohol products - FIXED: font size 20px minimum for compliance
        if (demo.product.isAlcohol) {
            setIsAlcoholProduct(true);
            const drinkRect = new Rect({
                width: 200, height: 32, fill: '#ffffff', rx: 4, ry: 4,
                originX: 'center', originY: 'center',
                left: format.width - 110, top: format.height - 45,
                isDrinkaware: true, customName: 'Drinkaware',
                selectable: false, evented: false,
            });
            const drinkText = new IText('drinkaware.co.uk', {
                fontSize: 20, // FIXED: minimum 20px for compliance
                fontFamily: 'Inter, sans-serif',
                fill: '#000000',
                originX: 'center', originY: 'center',
                left: format.width - 110, top: format.height - 45,
                isDrinkaware: true, editable: false,
            });
            canvas.add(drinkRect, drinkText);
        }

        // Add tag - FIXED: use full format for Clubcard
        let tagText = 'Only at Tesco';
        if (variant.priceType === 'clubcard') {
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 14);
            const dd = String(endDate.getDate()).padStart(2, '0');
            const mm = String(endDate.getMonth() + 1).padStart(2, '0');
            tagText = `Available in selected stores. Clubcard/app required. Ends ${dd}/${mm}`;
        }

        const tag = new IText(tagText, {
            left: format.width / 2,
            top: format.height - 30,
            originX: 'center',
            originY: 'center',
            fontFamily: 'Inter, sans-serif',
            fontSize: 20, // FIXED: minimum 20px for accessibility
            fill: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: 8,
            isTag: true,
            customName: 'Tesco Tag',
        });
        canvas.add(tag);

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

                        {/* Shapes */}
                        <div className="section">
                            <div className="section-header">
                                <span className="section-title">Shapes</span>
                                <span className="badge badge-info">New</span>
                            </div>

                            {/* Shape Customization Controls */}
                            <div className="mb-4 p-3 rounded-lg bg-[var(--surface-overlay)] border border-[var(--border-subtle)]">
                                <p className="text-[10px] text-muted uppercase tracking-wide mb-3">Customize</p>

                                {/* Fill Color */}
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-secondary">Fill</span>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={shapeFill}
                                            onChange={(e) => setShapeFill(e.target.value)}
                                            className="w-7 h-7 rounded cursor-pointer border border-[var(--border-subtle)]"
                                        />
                                        <span className="text-[10px] text-muted font-mono">{shapeFill}</span>
                                    </div>
                                </div>

                                {/* Stroke Color */}
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-secondary">Stroke</span>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={shapeStroke}
                                            onChange={(e) => setShapeStroke(e.target.value)}
                                            className="w-7 h-7 rounded cursor-pointer border border-[var(--border-subtle)]"
                                        />
                                        <span className="text-[10px] text-muted font-mono">{shapeStroke}</span>
                                    </div>
                                </div>

                                {/* Stroke Width */}
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-secondary">Stroke Width</span>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="range"
                                            min="0"
                                            max="20"
                                            value={shapeStrokeWidth}
                                            onChange={(e) => setShapeStrokeWidth(Number(e.target.value))}
                                            className="w-16 h-1 accent-[var(--accent-primary)]"
                                        />
                                        <span className="text-[10px] text-muted w-6 text-right">{shapeStrokeWidth}px</span>
                                    </div>
                                </div>

                                {/* Opacity */}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-secondary">Opacity</span>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="range"
                                            min="0.1"
                                            max="1"
                                            step="0.1"
                                            value={shapeOpacity}
                                            onChange={(e) => setShapeOpacity(Number(e.target.value))}
                                            className="w-16 h-1 accent-[var(--accent-primary)]"
                                        />
                                        <span className="text-[10px] text-muted w-8 text-right">{Math.round(shapeOpacity * 100)}%</span>
                                    </div>
                                </div>

                                {/* Quick Color Presets */}
                                <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                                    <p className="text-[10px] text-muted mb-2">Quick Colors</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {['#003d7a', '#e51c23', '#ffffff', '#ffd700', '#00a650', '#000000', '#ff9800', '#9c27b0'].map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setShapeFill(color)}
                                                className={`w-6 h-6 rounded border-2 transition-all hover:scale-110 ${shapeFill === color ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/30' : 'border-[var(--border-subtle)]'}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Shape Categories */}
                            <div className="space-y-2">
                                {/* Basic Shapes */}
                                <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
                                    <button
                                        onClick={() => setExpandedShapeCategory(expandedShapeCategory === 'basic' ? null : 'basic')}
                                        className="w-full flex items-center justify-between p-2.5 bg-[var(--surface-elevated)] hover:bg-[var(--surface-overlay)] transition-all"
                                    >
                                        <span className="text-xs font-medium text-primary flex items-center gap-2">
                                            <span>🔷</span> Basic Shapes
                                        </span>
                                        <span className={`text-muted transition-transform ${expandedShapeCategory === 'basic' ? 'rotate-180' : ''}`}>▼</span>
                                    </button>
                                    {expandedShapeCategory === 'basic' && (
                                        <div className="grid grid-cols-3 gap-1.5 p-2 bg-[var(--surface-base)]">
                                            {SHAPE_LIBRARY.basic.map(shape => (
                                                <button
                                                    key={shape.id}
                                                    onClick={() => addShape(shape)}
                                                    className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--surface-overlay)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] transition-all group"
                                                    title={shape.name}
                                                >
                                                    <span className="text-xl group-hover:scale-110 transition-transform" style={{ color: shapeFill }}>{shape.icon}</span>
                                                    <span className="text-[9px] text-muted mt-1 truncate w-full text-center">{shape.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Advanced Shapes */}
                                <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
                                    <button
                                        onClick={() => setExpandedShapeCategory(expandedShapeCategory === 'advanced' ? null : 'advanced')}
                                        className="w-full flex items-center justify-between p-2.5 bg-[var(--surface-elevated)] hover:bg-[var(--surface-overlay)] transition-all"
                                    >
                                        <span className="text-xs font-medium text-primary flex items-center gap-2">
                                            <span>⭐</span> Advanced Shapes
                                        </span>
                                        <span className={`text-muted transition-transform ${expandedShapeCategory === 'advanced' ? 'rotate-180' : ''}`}>▼</span>
                                    </button>
                                    {expandedShapeCategory === 'advanced' && (
                                        <div className="grid grid-cols-3 gap-1.5 p-2 bg-[var(--surface-base)]">
                                            {SHAPE_LIBRARY.advanced.map(shape => (
                                                <button
                                                    key={shape.id}
                                                    onClick={() => addShape(shape)}
                                                    className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--surface-overlay)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] transition-all group"
                                                    title={shape.name}
                                                >
                                                    <span className="text-xl group-hover:scale-110 transition-transform" style={{ color: shapeFill }}>{shape.icon}</span>
                                                    <span className="text-[9px] text-muted mt-1 truncate w-full text-center">{shape.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Decorative Shapes */}
                                <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
                                    <button
                                        onClick={() => setExpandedShapeCategory(expandedShapeCategory === 'decorative' ? null : 'decorative')}
                                        className="w-full flex items-center justify-between p-2.5 bg-[var(--surface-elevated)] hover:bg-[var(--surface-overlay)] transition-all"
                                    >
                                        <span className="text-xs font-medium text-primary flex items-center gap-2">
                                            <span>🎨</span> Decorative
                                        </span>
                                        <span className={`text-muted transition-transform ${expandedShapeCategory === 'decorative' ? 'rotate-180' : ''}`}>▼</span>
                                    </button>
                                    {expandedShapeCategory === 'decorative' && (
                                        <div className="grid grid-cols-3 gap-1.5 p-2 bg-[var(--surface-base)]">
                                            {SHAPE_LIBRARY.decorative.map(shape => (
                                                <button
                                                    key={shape.id}
                                                    onClick={() => addShape(shape)}
                                                    className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--surface-overlay)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] transition-all group"
                                                    title={shape.name}
                                                >
                                                    <span className="text-xl group-hover:scale-110 transition-transform">{shape.icon}</span>
                                                    <span className="text-[9px] text-muted mt-1 truncate w-full text-center">{shape.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Lines */}
                                <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
                                    <button
                                        onClick={() => setExpandedShapeCategory(expandedShapeCategory === 'lines' ? null : 'lines')}
                                        className="w-full flex items-center justify-between p-2.5 bg-[var(--surface-elevated)] hover:bg-[var(--surface-overlay)] transition-all"
                                    >
                                        <span className="text-xs font-medium text-primary flex items-center gap-2">
                                            <span>➖</span> Lines & Dividers
                                        </span>
                                        <span className={`text-muted transition-transform ${expandedShapeCategory === 'lines' ? 'rotate-180' : ''}`}>▼</span>
                                    </button>
                                    {expandedShapeCategory === 'lines' && (
                                        <div className="grid grid-cols-2 gap-1.5 p-2 bg-[var(--surface-base)]">
                                            {SHAPE_LIBRARY.lines.map(shape => (
                                                <button
                                                    key={shape.id}
                                                    onClick={() => addShape(shape)}
                                                    className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--surface-overlay)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] transition-all group"
                                                    title={shape.name}
                                                >
                                                    <span className="text-xl group-hover:scale-110 transition-transform" style={{ color: shapeFill }}>{shape.icon}</span>
                                                    <span className="text-[9px] text-muted mt-1">{shape.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Creative Profile Selector */}
                        <div className="section">
                            <div className="section-header">
                                <span className="section-title">Creative Profile</span>
                                <span className={`badge ${creativeProfile === 'LOW_EVERYDAY_PRICE' ? 'badge-warning' : creativeProfile === 'CLUBCARD' ? 'badge-info' : 'badge-success'}`}>
                                    {currentProfileConfig.name}
                                </span>
                            </div>
                            <p className="text-xs text-muted mb-3">
                                Profile determines constraints and required elements
                            </p>

                            {/* Profile Cards */}
                            <div className="space-y-2">
                                {Object.values(CREATIVE_PROFILES).map(profile => (
                                    <button
                                        key={profile.id}
                                        onClick={() => handleProfileChange(profile.id)}
                                        className={`w-full p-3 rounded-lg border-2 transition-all text-left ${creativeProfile === profile.id
                                            ? profile.id === 'LOW_EVERYDAY_PRICE'
                                                ? 'bg-[#00539F]/10 border-[#00539F]'
                                                : profile.id === 'CLUBCARD'
                                                    ? 'bg-[#003d7a]/10 border-[#003d7a]'
                                                    : 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]'
                                            : 'bg-[var(--surface-elevated)] border-[var(--border-subtle)] hover:border-[var(--border-default)]'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${creativeProfile === profile.id
                                                ? profile.id === 'LOW_EVERYDAY_PRICE'
                                                    ? 'bg-[#00539F] text-white'
                                                    : profile.id === 'CLUBCARD'
                                                        ? 'bg-[#003d7a] text-white'
                                                        : 'bg-[var(--accent-primary)] text-white'
                                                : 'bg-[var(--surface-overlay)]'
                                                }`}>
                                                {profile.icon}
                                            </div>
                                            <div className="flex-1">
                                                <div className={`font-semibold text-sm ${creativeProfile === profile.id ? 'text-primary' : 'text-secondary'}`}>
                                                    {profile.name}
                                                </div>
                                                <div className="text-[10px] text-muted">
                                                    {profile.description}
                                                </div>
                                            </div>
                                            {creativeProfile === profile.id && (
                                                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                                    <span className="text-white text-xs">✓</span>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Active Profile Constraints */}
                            {creativeProfile !== 'STANDARD' && (
                                <div className={`mt-3 p-3 rounded-lg border ${creativeProfile === 'LOW_EVERYDAY_PRICE'
                                    ? 'bg-[#00539F]/5 border-[#00539F]/20'
                                    : 'bg-[#003d7a]/5 border-[#003d7a]/20'
                                    }`}>
                                    <p className={`text-xs font-medium mb-2 ${creativeProfile === 'LOW_EVERYDAY_PRICE' ? 'text-[#00539F]' : 'text-[#003d7a]'
                                        }`}>
                                        ✓ Active Constraints
                                    </p>
                                    <ul className="text-[11px] text-muted space-y-1">
                                        {currentProfileConfig.constraints.background.locked && (
                                            <li className="flex items-center gap-1.5">
                                                <span className="w-3 h-3 rounded" style={{ backgroundColor: currentProfileConfig.constraints.background.value, border: '1px solid #ccc' }}></span>
                                                Background locked to {currentProfileConfig.constraints.background.value}
                                            </li>
                                        )}
                                        {currentProfileConfig.constraints.textColor.locked && (
                                            <li className="flex items-center gap-1.5">
                                                <span className="w-3 h-3 rounded" style={{ backgroundColor: currentProfileConfig.constraints.textColor.value }}></span>
                                                Text color: {currentProfileConfig.constraints.textColor.value}
                                            </li>
                                        )}
                                        {currentProfileConfig.constraints.textAlignment.locked && (
                                            <li>• Text alignment: {currentProfileConfig.constraints.textAlignment.value}</li>
                                        )}
                                        <li>• Value tiles: {currentProfileConfig.constraints.valueTiles.allowed.join(', ')}</li>
                                        {currentProfileConfig.autoTag && (
                                            <li>• Auto-tag: "{currentProfileConfig.autoTag}"</li>
                                        )}
                                        {currentProfileConfig.disabledTools.length > 0 && (
                                            <li className="text-amber-400">• {currentProfileConfig.disabledTools.length} tools disabled</li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Value Tiles - Simplified Click-to-Add */}
                        <div className="section">
                            <div className="section-header">
                                <span className="section-title">Value Tiles</span>
                                {creativeProfile !== 'STANDARD' && (
                                    <span className="badge badge-info text-[9px]">
                                        {currentProfileConfig.constraints.valueTiles.allowed.length} allowed
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-muted mb-3">Click to add • Right-click to remove</p>

                            <div className="grid grid-cols-1 gap-2">
                                {/* NEW Tile */}
                                <div className="relative">
                                    <button
                                        onClick={() => hasTileOnCanvas('new') ? removeValueTile('new') : addValueTile(VALUE_TILES[0])}
                                        disabled={!isValueTileAllowed('new')}
                                        className={`w-full flex items-center justify-center p-4 rounded-lg font-bold text-lg transition-all ${isValueTileAllowed('new')
                                            ? hasTileOnCanvas('new')
                                                ? 'bg-[#00539F] text-white ring-2 ring-green-400 ring-offset-2 ring-offset-[#1a1f28]'
                                                : 'bg-[#00539F] hover:bg-[#003d7a] text-white hover:scale-[1.02]'
                                            : 'bg-gray-500/30 text-gray-500 cursor-not-allowed'
                                            }`}
                                    >
                                        {hasTileOnCanvas('new') ? '✓ New' : 'New'}
                                        {!isValueTileAllowed('new') && <span className="ml-2 text-xs">🔒</span>}
                                    </button>
                                    {hasTileOnCanvas('new') && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white cursor-pointer hover:bg-red-600"
                                            onClick={() => removeValueTile('new')} title="Remove from canvas">×</span>
                                    )}
                                </div>

                                {/* Price Tile */}
                                <div className="relative">
                                    <button
                                        onClick={() => hasTileOnCanvas('white') ? removeValueTile('white') : addValueTile(VALUE_TILES[1])}
                                        disabled={!isValueTileAllowed('white')}
                                        className={`w-full flex items-center justify-center p-4 rounded-lg font-bold text-lg transition-all ${isValueTileAllowed('white')
                                            ? hasTileOnCanvas('white')
                                                ? 'bg-white border-2 border-[#00539F] text-[#00539F] ring-2 ring-green-400 ring-offset-2 ring-offset-[#1a1f28]'
                                                : 'bg-white border-2 border-[#00539F] text-[#00539F] hover:scale-[1.02] hover:shadow-lg'
                                            : 'bg-gray-500/30 border-2 border-gray-500/30 text-gray-500 cursor-not-allowed'
                                            }`}
                                    >
                                        {hasTileOnCanvas('white') ? `✓ ${whitePrice || '£2.50'}` : whitePrice || '£2.50'}
                                        {!isValueTileAllowed('white') && <span className="ml-2 text-xs">🔒</span>}
                                    </button>
                                    {hasTileOnCanvas('white') && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white cursor-pointer hover:bg-red-600"
                                            onClick={() => removeValueTile('white')} title="Remove from canvas">×</span>
                                    )}
                                </div>

                                {/* Clubcard Tile */}
                                <div className="relative">
                                    <button
                                        onClick={() => hasTileOnCanvas('clubcard') ? removeValueTile('clubcard') : addValueTile(VALUE_TILES[2])}
                                        disabled={!isValueTileAllowed('clubcard')}
                                        className={`w-full flex flex-col items-center justify-center p-4 rounded-lg font-bold transition-all ${isValueTileAllowed('clubcard')
                                            ? hasTileOnCanvas('clubcard')
                                                ? 'bg-[#FFD700] text-[#00539F] ring-2 ring-green-400 ring-offset-2 ring-offset-[#1a1f28]'
                                                : 'bg-[#FFD700] hover:bg-[#e6c200] text-[#00539F] hover:scale-[1.02]'
                                            : 'bg-gray-500/30 text-gray-500 cursor-not-allowed'
                                            }`}
                                    >
                                        <span className="text-lg flex items-center">
                                            {hasTileOnCanvas('clubcard') ? `✓ ${clubcardPrice || '£1.50'}` : clubcardPrice || '£1.50'}
                                            {!isValueTileAllowed('clubcard') && <span className="ml-2 text-xs">🔒</span>}
                                        </span>
                                        <span className="text-xs font-normal opacity-70">Clubcard Price</span>
                                    </button>
                                    {hasTileOnCanvas('clubcard') && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white cursor-pointer hover:bg-red-600"
                                            onClick={() => removeValueTile('clubcard')} title="Remove from canvas">×</span>
                                    )}
                                </div>
                            </div>

                            {/* Profile Restriction Notice */}
                            {creativeProfile !== 'STANDARD' && (
                                <div className="mt-2 p-2 rounded bg-[var(--surface-overlay)] border border-[var(--border-subtle)]">
                                    <p className="text-[10px] text-muted">
                                        <span className="text-amber-400">ℹ️</span> {currentProfileConfig.name} profile only allows: <strong>{currentProfileConfig.constraints.valueTiles.allowed.join(', ')}</strong> tiles
                                    </p>
                                </div>
                            )}

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
                                        disabled={!isValueTileAllowed('white')}
                                    />
                                    <input
                                        type="text"
                                        value={clubcardPrice}
                                        onChange={(e) => setClubcardPrice(e.target.value)}
                                        className="input input-sm text-center"
                                        placeholder="£1.50"
                                        disabled={!isValueTileAllowed('clubcard')}
                                    />
                                    <input
                                        type="text"
                                        value={clubcardRegular}
                                        onChange={(e) => setClubcardRegular(e.target.value)}
                                        className="input input-sm text-center"
                                        placeholder="£2.00"
                                        disabled={!isValueTileAllowed('clubcard')}
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
                                        className={`p-2.5 rounded-lg text-xs font-medium transition-all border ${isExclusive
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
                                        className={`p-2.5 rounded-lg text-xs font-medium transition-all border ${!isExclusive
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
                        <div className={`section ${isToolDisabled('background-picker') ? 'opacity-60' : ''}`}>
                            <div className="section-header">
                                <span className="section-title">Background</span>
                                {isToolDisabled('background-picker') && (
                                    <span className="badge badge-warning text-[9px]">🔒 Locked</span>
                                )}
                            </div>

                            {isToolDisabled('background-picker') ? (
                                <div className="p-3 rounded-lg bg-[var(--surface-overlay)] border border-amber-500/30">
                                    <p className="text-xs text-amber-400 mb-2">
                                        ⚠️ Background is locked by {currentProfileConfig.name} profile
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-8 h-8 rounded border-2 border-amber-500/50"
                                            style={{ backgroundColor: currentProfileConfig.constraints.background.value }}
                                        />
                                        <span className="text-xs text-muted">
                                            {currentProfileConfig.constraints.background.value}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <>
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
                                </>
                            )}
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

            case 'gallery':
                return (
                    <div className="animate-fade-in space-y-4">
                        {/* AI Gallery Header */}
                        <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">✨</span>
                                <span className="text-xs font-semibold text-purple-300">AI-Generated Creatives</span>
                            </div>
                            <p className="text-[11px] text-muted">
                                {DEMO_CREATIVES.length} product campaigns ready to apply. Click to use.
                            </p>
                        </div>

                        {/* Demo Creatives Grid */}
                        <div className="space-y-3">
                            {DEMO_CREATIVES.map(demo => (
                                <div key={demo.id} className="rounded-xl border border-[var(--border-subtle)] overflow-hidden bg-[var(--surface-elevated)]">
                                    {/* Product Header */}
                                    <div className="p-3 border-b border-[var(--border-subtle)]">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">
                                                    {demo.product.category === 'Food & Drink' && '🥤'}
                                                    {demo.product.category === 'Alcohol' && '🍺'}
                                                    {demo.product.category === 'Baby' && '👶'}
                                                    {demo.product.category === 'Household' && '🧹'}
                                                    {demo.product.category === 'Fresh' && '🍓'}
                                                    {demo.product.category === 'Bakery' && '🍞'}
                                                    {demo.product.category === 'Frozen' && '🍦'}
                                                    {demo.product.category === 'Pet' && '🐕'}
                                                </span>
                                                <div>
                                                    <p className="text-xs font-semibold text-primary truncate">{demo.product.name}</p>
                                                    <p className="text-[10px] text-muted">{demo.product.brand} • {demo.product.category}</p>
                                                </div>
                                            </div>
                                            {demo.product.isAlcohol && (
                                                <span className="text-[8px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-medium">18+</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Variants Grid */}
                                    <div className="p-2 grid grid-cols-3 gap-1.5">
                                        {demo.variants.map((variant, vIdx) => (
                                            <button
                                                key={vIdx}
                                                onClick={() => applyDemoCreative(demo, vIdx)}
                                                className="aspect-square rounded-lg overflow-hidden relative group hover:ring-2 hover:ring-purple-500 transition-all"
                                                style={{ backgroundColor: variant.backgroundColor }}
                                                title={variant.headline}
                                            >
                                                {/* AI Badge */}
                                                <div className="absolute top-1 right-1 z-10">
                                                    <span className="text-[6px] bg-purple-500/80 text-white px-1 py-0.5 rounded-full font-medium">
                                                        AI
                                                    </span>
                                                </div>

                                                {/* Preview Content */}
                                                <div className="absolute inset-0 flex flex-col items-center justify-center p-1.5 text-center">
                                                    <p
                                                        className="text-[8px] font-bold leading-tight truncate w-full"
                                                        style={{ color: variant.headlineColor }}
                                                    >
                                                        {variant.headline}
                                                    </p>

                                                    {/* Price Indicator */}
                                                    <div
                                                        className="mt-1 px-1 py-0.5 rounded text-[7px] font-semibold"
                                                        style={{
                                                            backgroundColor: variant.priceType === 'clubcard' ? '#003d7a' :
                                                                variant.priceType === 'new' ? '#e51c23' : '#ffffff',
                                                            color: variant.priceType === 'white' ? '#003d7a' : '#ffffff',
                                                        }}
                                                    >
                                                        {variant.priceType === 'new' && 'NEW'}
                                                        {variant.priceType === 'white' && variant.price}
                                                        {variant.priceType === 'clubcard' && variant.price}
                                                    </div>
                                                </div>

                                                {/* Hover Overlay */}
                                                <div className="absolute inset-0 bg-purple-500/0 group-hover:bg-purple-500/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                    <span className="text-white text-xs font-medium">Apply</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Stats */}
                                    <div className="px-3 py-2 bg-[var(--surface-overlay)] flex items-center justify-between text-[9px] text-muted">
                                        <span>⚡ {demo.generationTime}s gen</span>
                                        <span>📐 {demo.variants.length} variants</span>
                                        <span className="text-green-400">✓ Compliant</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Tip */}
                        <div className="p-2 rounded-lg bg-[var(--surface-overlay)] border border-[var(--border-subtle)]">
                            <p className="text-[10px] text-muted text-center">
                                💡 All creatives include proper tags, value tiles, and compliance elements
                            </p>
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
                    { id: 'gallery', icon: Icons.gallery, label: 'AI Gallery' },
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
                            activeTab === 'gallery' ? 'AI Creative Gallery' : 'AI Copy'
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
