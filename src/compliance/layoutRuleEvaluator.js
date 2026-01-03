/**
 * Layout Rule Evaluator
 * Deterministic layout checks for canvas elements - no AI/vision logic.
 * 
 * Input:
 * - canvasElements: Array of elements with bounding boxes { id, type, x, y, width, height, ...metadata }
 * - activeFormat: Creative format { width, height, ratio? }
 * - rules: Array of layout rules with detection_method = "layout"
 * 
 * Output:
 * - Array of { ruleId, status: 'pass' | 'fail', message }
 */

import { getRulesByDetectionMethod } from './ruleSchema';

/**
 * Main evaluator function
 * @param {Array} canvasElements - Elements with bounding boxes
 * @param {Object} activeFormat - { width, height, ratio? }
 * @param {Array} rules - Layout rules to evaluate (optional, defaults to all layout rules)
 * @param {Object} context - Additional context { backgroundColor, isAlcoholProduct }
 * @returns {Array} Results array: [{ ruleId, status, message }]
 */
export function evaluateLayoutRules(canvasElements, activeFormat, rules = null, context = {}) {
    const layoutRules = rules || getRulesByDetectionMethod('layout');
    const results = [];

    for (const rule of layoutRules) {
        // Skip rules that don't apply to current format
        if (rule.applies_to_formats && !rule.applies_to_formats.includes(activeFormat.formatId)) {
            results.push({
                ruleId: rule.id,
                status: 'pass',
                message: 'Rule does not apply to this format'
            });
            continue;
        }

        // Skip rules based on context conditions
        if (rule.applies_when) {
            let applies = true;
            for (const [key, value] of Object.entries(rule.applies_when)) {
                if (context[key] !== value) {
                    applies = false;
                    break;
                }
            }
            if (!applies) {
                results.push({
                    ruleId: rule.id,
                    status: 'pass',
                    message: 'Rule conditions not met'
                });
                continue;
            }
        }

        // Route to appropriate check function
        let result;
        switch (rule.id) {
            case 'FORMAT_001':
                result = checkSafeZones(canvasElements, activeFormat, rule);
                break;
            case 'DESIGN_001':
                result = checkValueTileOverlap(canvasElements, rule);
                break;
            case 'TAG_001':
                result = checkTagOverlap(canvasElements, rule);
                break;
            case 'ACC_001':
                result = checkMinFontSize(canvasElements, activeFormat, rule);
                break;
            case 'ACC_002':
                result = checkTextContrast(canvasElements, context.backgroundColor, rule);
                break;
            case 'PACK_001':
                result = checkPackshotCount(canvasElements, rule);
                break;
            case 'ALC_001':
                result = checkDrinkawarePresence(canvasElements, context.isAlcoholProduct, rule);
                break;
            default:
                result = { ruleId: rule.id, status: 'pass', message: 'No specific check implemented' };
        }

        results.push(result);
    }

    return results;
}

/**
 * Get bounding box for an element
 */
function getBoundingBox(element) {
    return {
        left: element.x || element.left || 0,
        top: element.y || element.top || 0,
        width: element.width || 0,
        height: element.height || 0,
        right: (element.x || element.left || 0) + (element.width || 0),
        bottom: (element.y || element.top || 0) + (element.height || 0)
    };
}

/**
 * Check if two bounding boxes overlap
 */
function boxesOverlap(box1, box2) {
    return !(
        box1.right <= box2.left ||
        box1.left >= box2.right ||
        box1.bottom <= box2.top ||
        box1.top >= box2.bottom
    );
}

// ============================================
// CHECK FUNCTIONS
// ============================================

/**
 * FORMAT_001: Safe Zone Enforcement
 * Ensures text, logos, and interactive elements stay out of top/bottom exclusion zones
 * for 9:16 formats (Instagram/Facebook Stories)
 */
function checkSafeZones(elements, format, rule) {
    // Only applies to 9:16 formats
    if (format.ratio !== '9:16') {
        return {
            ruleId: rule.id,
            status: 'pass',
            message: 'Safe zone check not required for this format ratio'
        };
    }

    const safeZoneTop = rule.params?.safe_zone_top_px || 200;
    const safeZoneBottom = rule.params?.safe_zone_bottom_px || 250;
    const excludedTypes = ['valueTile', 'drinkaware', 'tag', 'background', 'safeZone'];

    const violations = [];
    const canvasHeight = format.height;

    for (const element of elements) {
        // Skip excluded element types
        if (excludedTypes.includes(element.type) || element.isValueTile || element.isDrinkaware || element.isTag || element.isBackground || element.isSafeZone) {
            continue;
        }

        // Only check text, logos, and interactive elements
        const isCheckable = ['text', 'i-text', 'textbox'].includes(element.type) || element.isLogo;
        if (!isCheckable) continue;

        const box = getBoundingBox(element);

        const inTopZone = box.top < safeZoneTop;
        const inBottomZone = box.bottom > (canvasHeight - safeZoneBottom);

        if (inTopZone) {
            violations.push(`Element "${element.id || 'unknown'}" is in top safe zone (top ${safeZoneTop}px)`);
        }
        if (inBottomZone) {
            violations.push(`Element "${element.id || 'unknown'}" is in bottom safe zone (bottom ${safeZoneBottom}px)`);
        }
    }

    if (violations.length > 0) {
        return {
            ruleId: rule.id,
            status: 'fail',
            message: violations.join('; ')
        };
    }

    return {
        ruleId: rule.id,
        status: 'pass',
        message: 'All elements are outside safe zones'
    };
}

/**
 * DESIGN_001: Value Tile Overlap Check
 * Ensures value tiles don't overlap each other or other content
 */
function checkValueTileOverlap(elements, rule) {
    const valueTiles = elements.filter(el => el.isValueTile || el.type === 'valueTile');
    const otherElements = elements.filter(el =>
        !el.isValueTile &&
        el.type !== 'valueTile' &&
        !el.isBackground &&
        !el.isSafeZone
    );

    const violations = [];

    // Check value tiles overlapping each other
    for (let i = 0; i < valueTiles.length; i++) {
        for (let j = i + 1; j < valueTiles.length; j++) {
            const box1 = getBoundingBox(valueTiles[i]);
            const box2 = getBoundingBox(valueTiles[j]);

            if (boxesOverlap(box1, box2)) {
                violations.push(`Value tiles "${valueTiles[i].id || i}" and "${valueTiles[j].id || j}" are overlapping`);
            }
        }
    }

    // Check other elements overlapping value tiles
    for (const tile of valueTiles) {
        const tileBox = getBoundingBox(tile);

        for (const element of otherElements) {
            const elementBox = getBoundingBox(element);

            if (boxesOverlap(tileBox, elementBox)) {
                violations.push(`Element "${element.id || 'unknown'}" overlaps value tile "${tile.id || 'tile'}"`);
            }
        }
    }

    // Check fixed position enforcement
    if (rule.params?.fixed_position === true) {
        for (const tile of valueTiles) {
            if (tile.hasMoved || tile.positionChanged) {
                violations.push(`Value tile "${tile.id || 'unknown'}" has been moved from fixed position`);
            }
        }
    }

    if (violations.length > 0) {
        return {
            ruleId: rule.id,
            status: 'fail',
            message: violations.join('; ')
        };
    }

    return {
        ruleId: rule.id,
        status: 'pass',
        message: 'Value tiles have no overlaps and are properly positioned'
    };
}

/**
 * TAG_001: Tag Overlap Check
 * Ensures Tesco tags don't overlap other elements
 */
function checkTagOverlap(elements, rule) {
    const tags = elements.filter(el => el.isTag || el.type === 'tag');
    const otherElements = elements.filter(el =>
        !el.isTag &&
        el.type !== 'tag' &&
        !el.isBackground &&
        !el.isSafeZone
    );

    const violations = [];

    // Check tags overlapping each other
    for (let i = 0; i < tags.length; i++) {
        for (let j = i + 1; j < tags.length; j++) {
            const box1 = getBoundingBox(tags[i]);
            const box2 = getBoundingBox(tags[j]);

            if (boxesOverlap(box1, box2)) {
                violations.push(`Tags "${tags[i].id || i}" and "${tags[j].id || j}" are overlapping`);
            }
        }
    }

    // Check other elements overlapping tags
    for (const tag of tags) {
        const tagBox = getBoundingBox(tag);

        for (const element of otherElements) {
            // Skip elements that are allowed to be near tags
            if (element.isValueTile) continue;

            const elementBox = getBoundingBox(element);

            if (boxesOverlap(tagBox, elementBox)) {
                violations.push(`Element "${element.id || 'unknown'}" overlaps tag "${tag.id || 'tag'}"`);
            }
        }
    }

    if (violations.length > 0) {
        return {
            ruleId: rule.id,
            status: 'fail',
            message: violations.join('; ')
        };
    }

    return {
        ruleId: rule.id,
        status: 'pass',
        message: 'Tags have no obstructions'
    };
}

/**
 * ACC_001: Minimum Font Size Check
 * Ensures all text meets minimum accessibility requirements
 */
function checkMinFontSize(elements, format, rule) {
    const smallFormatThreshold = rule.params?.small_format_threshold_height || 200;
    const isSmallFormat = format.height < smallFormatThreshold;

    const minSize = isSmallFormat
        ? (rule.params?.checkout_single_density_px || 10)
        : (rule.params?.brand_social_min_px || 20);

    const textElements = elements.filter(el =>
        ['text', 'i-text', 'textbox'].includes(el.type) &&
        !el.isValueTile &&
        !el.isDrinkaware &&
        !el.isTag
    );

    const violations = [];

    for (const element of textElements) {
        const fontSize = element.fontSize || 16;
        const scaleY = element.scaleY || 1;
        const effectiveSize = fontSize * scaleY;

        if (effectiveSize < minSize) {
            violations.push(
                `Text "${element.id || element.text?.substring(0, 20) || 'unknown'}" has font size ${Math.round(effectiveSize)}px (minimum ${minSize}px)`
            );
        }
    }

    if (violations.length > 0) {
        return {
            ruleId: rule.id,
            status: 'fail',
            message: violations.join('; ')
        };
    }

    return {
        ruleId: rule.id,
        status: 'pass',
        message: `All text meets minimum font size (${minSize}px)`
    };
}

/**
 * ACC_002: Text Contrast Check
 * Ensures text meets WCAG AA contrast requirements
 */
function checkTextContrast(elements, backgroundColor, rule) {
    // Skip if no background color provided
    if (!backgroundColor) {
        return {
            ruleId: rule.id,
            status: 'pass',
            message: 'Contrast check skipped (no background color provided)'
        };
    }

    const normalRatio = rule.params?.contrast_ratio_normal || 4.5;
    const largeRatio = rule.params?.contrast_ratio_large || 3.0;
    const largeThreshold = rule.params?.large_text_threshold_px || 24;

    const textElements = elements.filter(el =>
        ['text', 'i-text', 'textbox'].includes(el.type) &&
        !el.isValueTile &&
        !el.isDrinkaware &&
        !el.isTag
    );

    const violations = [];

    for (const element of textElements) {
        const textColor = element.fill || element.color || '#000000';
        const fontSize = (element.fontSize || 16) * (element.scaleY || 1);

        const contrast = calculateContrastRatio(textColor, backgroundColor);
        const requiredRatio = fontSize >= largeThreshold ? largeRatio : normalRatio;

        if (contrast < requiredRatio) {
            violations.push(
                `Text "${element.id || 'unknown'}" has contrast ratio ${contrast.toFixed(1)}:1 (minimum ${requiredRatio}:1)`
            );
        }
    }

    if (violations.length > 0) {
        return {
            ruleId: rule.id,
            status: 'fail',
            message: violations.join('; ')
        };
    }

    return {
        ruleId: rule.id,
        status: 'pass',
        message: 'All text meets contrast requirements'
    };
}

/**
 * PACK_001: Packshot Count Check
 * Ensures correct number of packshots and lead product designation
 */
function checkPackshotCount(elements, rule) {
    const packshots = elements.filter(el => el.isPackshot);
    const maxCount = rule.params?.max_packshots || 3;
    const leadRequired = rule.params?.lead_required !== false;

    const violations = [];

    if (packshots.length > maxCount) {
        violations.push(`${packshots.length} packshots present (maximum allowed: ${maxCount})`);
    }

    if (leadRequired && packshots.length > 0) {
        const hasLead = packshots.some(p => p.isLeadPackshot);
        if (!hasLead) {
            violations.push('No lead packshot designated');
        }
    }

    if (violations.length > 0) {
        return {
            ruleId: rule.id,
            status: 'fail',
            message: violations.join('; ')
        };
    }

    return {
        ruleId: rule.id,
        status: 'pass',
        message: `Packshot count valid (${packshots.length}/${maxCount})`
    };
}

/**
 * ALC_001: Drinkaware Presence Check (layout portion)
 * Ensures Drinkaware lockup is present for alcohol products
 */
function checkDrinkawarePresence(elements, isAlcoholProduct, rule) {
    // Only applies to alcohol products
    if (!isAlcoholProduct) {
        return {
            ruleId: rule.id,
            status: 'pass',
            message: 'Not an alcohol product'
        };
    }

    const drinkawareElements = elements.filter(el => el.isDrinkaware);
    const minHeight = rule.params?.min_height_px?.default || 20;

    if (drinkawareElements.length === 0) {
        return {
            ruleId: rule.id,
            status: 'fail',
            message: 'Drinkaware lockup required for alcohol products'
        };
    }

    const violations = [];

    for (const element of drinkawareElements) {
        const height = (element.height || 0) * (element.scaleY || 1);
        if (height < minHeight) {
            violations.push(`Drinkaware lockup height ${Math.round(height)}px is below minimum ${minHeight}px`);
        }
    }

    if (violations.length > 0) {
        return {
            ruleId: rule.id,
            status: 'fail',
            message: violations.join('; ')
        };
    }

    return {
        ruleId: rule.id,
        status: 'pass',
        message: 'Drinkaware lockup present and meets size requirements'
    };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate contrast ratio between two colors
 * Based on WCAG 2.0 formula
 */
function calculateContrastRatio(foreground, background) {
    const getLuminance = (hexColor) => {
        // Handle hex colors
        let hex = hexColor.replace('#', '');
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }

        const r = parseInt(hex.substr(0, 2), 16) / 255;
        const g = parseInt(hex.substr(2, 2), 16) / 255;
        const b = parseInt(hex.substr(4, 2), 16) / 255;

        const toLinear = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

        return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    };

    try {
        const l1 = getLuminance(foreground);
        const l2 = getLuminance(background);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
    } catch {
        return 21; // Return max contrast on error (safe default)
    }
}

/**
 * Quick evaluation - runs only the core layout checks
 * @param {Array} canvasElements 
 * @param {Object} activeFormat 
 * @returns {Object} Summary result { passed, failCount, results }
 */
export function evaluateLayoutRulesQuick(canvasElements, activeFormat, context = {}) {
    const results = evaluateLayoutRules(canvasElements, activeFormat, null, context);
    const failures = results.filter(r => r.status === 'fail');

    return {
        passed: failures.length === 0,
        failCount: failures.length,
        passCount: results.length - failures.length,
        results
    };
}

export default {
    evaluateLayoutRules,
    evaluateLayoutRulesQuick
};
