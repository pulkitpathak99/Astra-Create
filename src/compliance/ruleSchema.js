/**
 * Compliance Rule Schema
 * Production-grade, machine-readable compliance rules derived from TRM Hackathon Appendix A & B.
 * 
 * Rule Types:
 * - hard_fail: Blocks export immediately
 * - warning: Requires user confirmation, export allowed
 * 
 * Detection Methods:
 * - regex: Pattern matching (fast, deterministic)
 * - semantic_nli: Natural Language Inference for paraphrases
 * - vision: Multimodal AI for logos, people, packshots
 * - layout: Deterministic geometry checks
 */

export const SCHEMA_VERSION = "1.0";

export const RULE_SCHEMA = {
    schema_version: SCHEMA_VERSION,
    rule_source: "TRM Hackathon Appendix A & B",
    rules: [
        // ============================================
        // ALCOHOL RULES
        // ============================================
        {
            id: "ALC_001",
            name: "Drinkaware Lockup Required",
            type: "hard_fail",
            category: "alcohol",
            detection_method: ["vision", "layout"],
            applies_when: { isAlcoholProduct: true },
            params: {
                required_text: "drinkaware.co.uk",
                min_height_px: {
                    default: 20,
                    says_override: 12
                },
                allowed_colors: ["#000000", "#FFFFFF"],
                contrast_required: true
            },
            vision_signals: [
                "logo_present:drinkaware",
                "logo_height_px",
                "logo_color",
                "background_contrast_ratio"
            ],
            explanation: "All alcohol creatives must include a compliant Drinkaware lockup with sufficient contrast and minimum size.",
            plain_english: "For alcohol products, you need to add the Drinkaware logo. It must be at least 20 pixels tall and in black or white.",
            severity: "block_export"
        },

        // ============================================
        // COPY RULES (Text Prohibitions)
        // ============================================
        {
            id: "COPY_001",
            name: "Terms & Conditions Prohibited",
            type: "hard_fail",
            category: "copy",
            detection_method: ["regex", "semantic_nli"],
            params: {
                regex_patterns: [
                    "terms and conditions",
                    "terms & conditions",
                    "\\bt&c\\b",
                    "\\bt&cs\\b",
                    "terms apply",
                    "conditions apply"
                ],
                semantic_hypothesis: "This text mentions terms and conditions or disclaimers."
            },
            explanation: "No T&Cs or claim-based disclaimers are allowed in self-serve creatives.",
            plain_english: "You can't include 'terms and conditions' or similar text. Tesco handles legal disclaimers separately.",
            severity: "block_export"
        },

        {
            id: "COPY_002",
            name: "Competition or Prize Copy Prohibited",
            type: "hard_fail",
            category: "copy",
            detection_method: ["regex", "semantic_nli"],
            params: {
                regex_patterns: [
                    "competition",
                    "\\bprize\\b",
                    "\\bwin\\b",
                    "winner",
                    "raffle",
                    "giveaway",
                    "lottery"
                ],
                semantic_hypothesis: "This text mentions a competition, prize, contest, or giveaway."
            },
            explanation: "Competitions or prize-based messaging is not supported in self-serve media.",
            plain_english: "Competitions, prizes, and giveaways aren't allowed in self-serve ads.",
            severity: "block_export"
        },

        {
            id: "COPY_003",
            name: "Sustainability Claims Prohibited",
            type: "hard_fail",
            category: "copy",
            detection_method: ["regex", "semantic_nli"],
            params: {
                regex_patterns: [
                    "\\beco\\b",
                    "eco-friendly",
                    "sustainable",
                    "sustainability",
                    "\\bgreen\\b",
                    "carbon neutral",
                    "carbon-neutral",
                    "organic",
                    "recyclable",
                    "biodegradable",
                    "zero waste",
                    "planet friendly",
                    "environmentally friendly"
                ],
                semantic_hypothesis: "This text makes environmental or sustainability claims."
            },
            explanation: "Unverifiable sustainability or environmental claims are not allowed.",
            plain_english: "Environmental claims like 'eco-friendly' or 'sustainable' need verification and aren't allowed in self-serve.",
            severity: "block_export"
        },

        {
            id: "COPY_004",
            name: "Charity or Partnership Claims Prohibited",
            type: "hard_fail",
            category: "copy",
            detection_method: ["regex", "semantic_nli"],
            params: {
                regex_patterns: [
                    "charity",
                    "charitable",
                    "\\bdonate\\b",
                    "donation",
                    "fundraising",
                    "partnered with",
                    "in partnership"
                ],
                semantic_hypothesis: "This text mentions charity, donations, or partnerships."
            },
            explanation: "Charity and partnership messaging is not allowed in self-serve creatives.",
            plain_english: "Charity partnerships need special approval and can't be used in self-serve ads.",
            severity: "block_export"
        },

        {
            id: "COPY_005",
            name: "Price Callouts Outside Value Tiles",
            type: "hard_fail",
            category: "copy",
            detection_method: ["regex", "layout"],
            skip_for_value_tiles: true,
            params: {
                regex_patterns: [
                    "£\\d+",
                    "\\d+p\\b",
                    "\\bsave\\b",
                    "\\bdiscount\\b",
                    "\\bdeal\\b",
                    "half price",
                    "reduced",
                    "bargain",
                    "clearance",
                    "sale price",
                    "price cut"
                ]
            },
            explanation: "Prices, discounts or deals may only appear inside approved value tiles.",
            plain_english: "Price information must be in a Value Tile (Clubcard, White, or New tile), not in regular text.",
            severity: "block_export"
        },

        {
            id: "COPY_006",
            name: "Unverifiable Claims Prohibited",
            type: "hard_fail",
            category: "copy",
            detection_method: ["regex", "semantic_nli"],
            params: {
                regex_patterns: [
                    "money back",
                    "money-back",
                    "\\bguarantee\\b",
                    "\\bguaranteed\\b",
                    "\\brefund\\b",
                    "best ever",
                    "#1",
                    "number one",
                    "number 1",
                    "award winning",
                    "award-winning",
                    "clinically proven",
                    "scientifically proven",
                    "doctor recommended",
                    "survey",
                    "research shows",
                    "studies show",
                    "\\bfree\\b",
                    "\\bgratis\\b"
                ],
                semantic_hypothesis: "This text makes unverifiable claims, guarantees, or scientific assertions."
            },
            explanation: "Claims that cannot be verified on self-serve media are not allowed.",
            plain_english: "Avoid claims like 'guaranteed', 'best ever', or 'clinically proven' - these need verification.",
            severity: "block_export"
        },

        // ============================================
        // DESIGN RULES
        // ============================================
        {
            id: "DESIGN_001",
            name: "Value Tile Validation",
            type: "hard_fail",
            category: "design",
            detection_method: ["layout"],
            params: {
                allowed_types: ["new", "white", "clubcard"],
                fixed_position: true,
                overlap_allowed: false,
                type_rules: {
                    new: { editable: false, text: "NEW" },
                    white: { editable_fields: ["price"], background: "#ffffff", text_color: "#003d7a" },
                    clubcard: { editable_fields: ["offerPrice", "regularPrice"], background: "#003d7a", text_color: "#ffffff" }
                }
            },
            explanation: "Only approved value tiles are allowed and must remain in predefined positions without overlap.",
            plain_english: "Value tiles can't overlap other elements and should stay in their designated positions.",
            severity: "block_export"
        },

        // ============================================
        // TAG RULES
        // ============================================
        {
            id: "TAG_001",
            name: "Tesco Tag Validation",
            type: "hard_fail",
            category: "design",
            detection_method: ["regex", "layout"],
            params: {
                allowed_texts: [
                    "Only at Tesco",
                    "Available at Tesco",
                    "Selected stores. While stocks last."
                ],
                clubcard_pattern: "clubcard.*ends\\s*\\d{1,2}\\/\\d{1,2}",
                clubcard_format: "Clubcard/app required. Ends DD/MM"
            },
            explanation: "Only approved Tesco tag text is allowed and must not be obstructed.",
            plain_english: "Use standard Tesco tags like 'Only at Tesco' or 'Available at Tesco'.",
            severity: "block_export"
        },

        // ============================================
        // FORMAT / SAFE ZONE RULES
        // ============================================
        {
            id: "FORMAT_001",
            name: "Social Safe Zone Enforcement",
            type: "hard_fail",
            category: "format",
            detection_method: ["layout"],
            applies_to_formats: ["instagram-story", "facebook-story"],
            params: {
                format_dimensions: { width: 1080, height: 1920 },
                safe_zone_top_px: 200,
                safe_zone_bottom_px: 250,
                excluded_element_types: ["valueT ile", "drinkaware", "tag", "background", "safeZone"]
            },
            explanation: "Text, logos and value tiles must not appear in restricted safe zones on Story formats (9:16).",
            plain_english: "Keep text and logos away from the top 200px and bottom 250px on Stories - platforms put UI there.",
            severity: "block_export"
        },

        // ============================================
        // MEDIA / PHOTOGRAPHY RULES  
        // ============================================
        {
            id: "MEDIA_001",
            name: "People Detected in Photography",
            type: "warning",
            category: "photography",
            detection_method: ["vision"],
            params: {
                action_required: "user_confirmation",
                confirmation_prompt: "People detected in image. Are they integral to the campaign?"
            },
            vision_signals: [
                "human_face_detected",
                "human_body_detected"
            ],
            explanation: "If people appear, user must confirm they are integral to the campaign.",
            plain_english: "We detected people in your image. Please confirm they're meant to be part of this ad.",
            severity: "user_confirmation"
        },

        // ============================================
        // ACCESSIBILITY RULES
        // ============================================
        {
            id: "ACC_001",
            name: "Minimum Font Size",
            type: "hard_fail",
            category: "accessibility",
            detection_method: ["layout"],
            params: {
                brand_social_min_px: 20,
                checkout_single_density_px: 10,
                says_min_px: 12,
                small_format_threshold_height: 200
            },
            explanation: "All text must meet minimum accessibility font size requirements.",
            plain_english: "Text must be at least 20px (or 10px on small banners) for readability.",
            severity: "block_export"
        },

        {
            id: "ACC_002",
            name: "Text Contrast (WCAG AA)",
            type: "hard_fail",
            category: "accessibility",
            detection_method: ["layout"],
            params: {
                contrast_ratio_normal: 4.5,
                contrast_ratio_large: 3.0,
                large_text_threshold_px: 24
            },
            explanation: "All text must meet WCAG AA contrast requirements.",
            plain_english: "Text needs enough contrast against the background to be readable (4.5:1 ratio).",
            severity: "block_export"
        },

        // ============================================
        // PACKSHOT RULES
        // ============================================
        {
            id: "PACK_001",
            name: "Packshot Count and Lead Product",
            type: "hard_fail",
            category: "design",
            detection_method: ["layout", "vision"],
            params: {
                max_packshots: 3,
                lead_required: true,
                min_gap_to_cta_px: 24
            },
            vision_signals: [
                "packshot_count",
                "lead_packshot_detected"
            ],
            explanation: "Maximum of 3 packshots allowed and one must be marked as lead.",
            plain_english: "You can have up to 3 product images, and one should be the main/lead product.",
            severity: "block_export"
        }
    ]
};

/**
 * Get rule by ID
 */
export const getRuleById = (id) => {
    return RULE_SCHEMA.rules.find(r => r.id === id);
};

/**
 * Get rules by category
 */
export const getRulesByCategory = (category) => {
    return RULE_SCHEMA.rules.filter(r => r.category === category);
};

/**
 * Get rules by detection method
 */
export const getRulesByDetectionMethod = (method) => {
    return RULE_SCHEMA.rules.filter(r => r.detection_method.includes(method));
};

/**
 * Get all hard fail rules
 */
export const getHardFailRules = () => {
    return RULE_SCHEMA.rules.filter(r => r.type === 'hard_fail');
};

/**
 * Get all warning rules
 */
export const getWarningRules = () => {
    return RULE_SCHEMA.rules.filter(r => r.type === 'warning');
};

export default RULE_SCHEMA;
