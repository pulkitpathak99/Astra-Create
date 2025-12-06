import { create } from 'zustand';

// Social Media Format Presets
export const FORMAT_PRESETS = {
    'instagram-feed': { width: 1080, height: 1080, name: 'Instagram Feed', ratio: '1:1' },
    'instagram-story': { width: 1080, height: 1920, name: 'Instagram Story', ratio: '9:16' },
    'facebook-feed': { width: 1200, height: 628, name: 'Facebook Feed', ratio: '1.91:1' },
    'facebook-story': { width: 1080, height: 1920, name: 'Facebook Story', ratio: '9:16' },
};

// Template Library
export const TEMPLATE_LIBRARY = [
    {
        id: 'promo-sale',
        name: 'Big Sale Banner',
        category: 'Promotion',
        thumbnail: 'sale',
        format: 'instagram-feed',
        elements: [
            { type: 'rect', props: { fill: '#e51c23', width: 1080, height: 1080 } },
            { type: 'text', props: { text: 'BIG SALE', fontSize: 120, fill: '#ffffff', top: 300, left: 540, originX: 'center', fontWeight: 'bold' } },
            { type: 'text', props: { text: 'Up to 50% OFF', fontSize: 60, fill: '#ffd700', top: 450, left: 540, originX: 'center' } },
            { type: 'valueTile', props: { type: 'clubcard', top: 600, left: 440 } },
        ]
    },
    {
        id: 'new-product',
        name: 'New Product Launch',
        category: 'Launch',
        thumbnail: 'new',
        format: 'instagram-feed',
        elements: [
            { type: 'rect', props: { fill: '#003d7a', width: 1080, height: 1080 } },
            { type: 'text', props: { text: 'NEW', fontSize: 80, fill: '#ffffff', top: 150, left: 540, originX: 'center', fontWeight: 'bold' } },
            { type: 'rect', props: { fill: '#ffffff', width: 600, height: 400, top: 340, left: 240, rx: 10 } },
            { type: 'text', props: { text: 'Product Name', fontSize: 40, fill: '#003d7a', top: 800, left: 540, originX: 'center' } },
        ]
    },
    {
        id: 'everyday-value',
        name: 'Everyday Low Price',
        category: 'Value',
        thumbnail: 'value',
        format: 'instagram-feed',
        elements: [
            { type: 'rect', props: { fill: '#ffffff', width: 1080, height: 1080 } },
            { type: 'text', props: { text: 'LOW EVERYDAY PRICE', fontSize: 50, fill: '#003d7a', top: 100, left: 540, originX: 'center', fontWeight: 'bold' } },
            { type: 'rect', props: { fill: '#f5f5f5', width: 500, height: 400, top: 300, left: 290, rx: 10 } },
            { type: 'valueTile', props: { type: 'low-price', top: 750, left: 390 } },
        ]
    },
    {
        id: 'story-promo',
        name: 'Story Promotion',
        category: 'Story',
        thumbnail: 'story',
        format: 'instagram-story',
        elements: [
            { type: 'rect', props: { fill: 'linear-gradient(180deg, #e51c23 0%, #b71c1c 100%)', width: 1080, height: 1920 } },
            { type: 'text', props: { text: 'SWIPE UP', fontSize: 60, fill: '#ffffff', top: 1600, left: 540, originX: 'center' } },
            { type: 'text', props: { text: 'Limited Time\nOffer', fontSize: 80, fill: '#ffffff', top: 800, left: 540, originX: 'center', textAlign: 'center' } },
        ]
    },
    {
        id: 'clubcard-exclusive',
        name: 'Clubcard Exclusive',
        category: 'Clubcard',
        thumbnail: 'clubcard',
        format: 'instagram-feed',
        elements: [
            { type: 'rect', props: { fill: '#003d7a', width: 1080, height: 1080 } },
            { type: 'text', props: { text: 'CLUBCARD', fontSize: 80, fill: '#ffffff', top: 150, left: 540, originX: 'center', fontWeight: 'bold' } },
            { type: 'text', props: { text: 'EXCLUSIVE', fontSize: 60, fill: '#ffd700', top: 250, left: 540, originX: 'center' } },
            { type: 'valueTile', props: { type: 'clubcard', top: 850, left: 400 } },
        ]
    },
    {
        id: 'facebook-banner',
        name: 'Facebook Banner',
        category: 'Facebook',
        thumbnail: 'facebook',
        format: 'facebook-feed',
        elements: [
            { type: 'rect', props: { fill: '#003d7a', width: 1200, height: 628 } },
            { type: 'text', props: { text: 'Shop Now', fontSize: 60, fill: '#ffffff', top: 250, left: 900, originX: 'center', fontWeight: 'bold' } },
            { type: 'rect', props: { fill: '#ffffff', width: 350, height: 400, top: 114, left: 80, rx: 10 } },
        ]
    },
];

// Compliance Rules from Appendix B
export const COMPLIANCE_RULES = {
    prohibitedTerms: [
        'money back', 'money-back', 'guarantee', 'guaranteed',
        'best ever', 'winner', 'winning', 'win', 'free',
        'sustainable', 'sustainability', 'eco-friendly', 'green',
        'competition', 'prize', 'survey', '#1', 'number one'
    ],
    minFontSize: { standard: 20, checkout: 10 },
    safeZones: {
        story: { top: 200, bottom: 250 },
    },
    valueTileRules: {
        pricesOnlyInTiles: true,
        noManualPriceTyping: true,
    },
    alcoholRules: {
        drinkawareRequired: true,
        minHeight: 20,
        minHeightSays: 12,
    },
    logoPlacement: {
        tescoLogoRequired: false,
        minClearSpace: 20,
    },
};

export const useStore = create((set, get) => ({
    // Canvas instance
    canvas: null,
    setCanvas: (canvas) => set({ canvas }),

    // Current format preset
    currentFormat: 'instagram-feed',
    setCurrentFormat: (formatKey) => {
        const format = FORMAT_PRESETS[formatKey];
        if (format) {
            set({ currentFormat: formatKey });
            const canvas = get().canvas;
            if (canvas) {
                // Will be handled by canvas component
            }
        }
    },

    // Selected object
    selectedObject: null,
    setSelectedObject: (obj) => set({ selectedObject: obj }),

    // Layers management
    layers: [],
    updateLayers: () => {
        const canvas = get().canvas;
        if (canvas) {
            const objects = canvas.getObjects().filter(o => !o.isSafeZone && !o.isBackground);
            set({
                layers: objects.map((obj, i) => ({
                    id: obj.id || `layer-${i}`,
                    name: obj.customName || obj.type || 'Layer',
                    type: obj.type,
                    visible: obj.visible !== false,
                    locked: obj.lockMovementX && obj.lockMovementY,
                    object: obj,
                }))
            });
        }
    },

    // Background
    backgroundColor: '#ffffff',
    setBackgroundColor: (color) => set({ backgroundColor: color }),
    backgroundImage: null,
    setBackgroundImage: (img) => set({ backgroundImage: img }),

    // Saved color palette
    savedColors: ['#003d7a', '#e51c23', '#ffffff', '#ffd700', '#00a650', '#000000', '#f5f5f5', '#ff9800'],
    addSavedColor: (color) => set(state => ({
        savedColors: [...new Set([color, ...state.savedColors])].slice(0, 12)
    })),

    // Product settings
    isAlcoholProduct: false,
    setIsAlcoholProduct: (val) => set({ isAlcoholProduct: val }),
    productCategory: 'general',
    setProductCategory: (cat) => set({ productCategory: cat }),

    // Compliance tracking
    complianceErrors: [],
    complianceWarnings: [],
    addComplianceError: (error) => set(state => ({
        complianceErrors: [...state.complianceErrors.filter(e => e.id !== error.id), error]
    })),
    addComplianceWarning: (warning) => set(state => ({
        complianceWarnings: [...state.complianceWarnings.filter(w => w.id !== warning.id), warning]
    })),
    removeComplianceIssue: (id) => set(state => ({
        complianceErrors: state.complianceErrors.filter(e => e.id !== id),
        complianceWarnings: state.complianceWarnings.filter(w => w.id !== id),
    })),
    clearCompliance: () => set({ complianceErrors: [], complianceWarnings: [] }),
    isCompliant: () => get().complianceErrors.length === 0,

    // History for undo/redo
    history: [],
    historyIndex: -1,
    maxHistory: 30,

    saveToHistory: () => {
        const canvas = get().canvas;
        if (!canvas) return;
        const json = JSON.stringify(canvas.toJSON(['id', 'customName', 'isValueTile', 'isDrinkaware', 'isSafeZone', 'isBackground', 'isLogo']));
        set(state => {
            const newHistory = [...state.history.slice(0, state.historyIndex + 1), json].slice(-state.maxHistory);
            return { history: newHistory, historyIndex: newHistory.length - 1 };
        });
    },

    undo: () => {
        const { canvas, history, historyIndex } = get();
        if (!canvas || historyIndex <= 0) return;
        const newIndex = historyIndex - 1;
        canvas.loadFromJSON(JSON.parse(history[newIndex]), () => {
            canvas.renderAll();
            set({ historyIndex: newIndex });
            get().updateLayers();
        });
    },

    redo: () => {
        const { canvas, history, historyIndex } = get();
        if (!canvas || historyIndex >= history.length - 1) return;
        const newIndex = historyIndex + 1;
        canvas.loadFromJSON(JSON.parse(history[newIndex]), () => {
            canvas.renderAll();
            set({ historyIndex: newIndex });
            get().updateLayers();
        });
    },

    // Onboarding
    showOnboarding: true,
    setShowOnboarding: (val) => set({ showOnboarding: val }),

    // Active panel
    activePanel: 'assets', // 'assets', 'templates', 'layers', 'compliance'
    setActivePanel: (panel) => set({ activePanel: panel }),
}));

export default useStore;
