/**
 * Layout Detector
 * Deterministic geometry checks - no AI needed.
 * Handles: safe zones, font sizes, contrast, overlaps, positions.
 */

import tinycolor from 'tinycolor2';

/**
 * Get bounding rectangle for a Fabric object
 */
const getRect = (obj) => {
    if (obj.getBoundingRect) {
        return obj.getBoundingRect();
    }
    return {
        left: obj.left || 0,
        top: obj.top || 0,
        width: (obj.width || 0) * (obj.scaleX || 1),
        height: (obj.height || 0) * (obj.scaleY || 1)
    };
};

/**
 * Check if two objects overlap
 */
const isOverlapping = (obj1, obj2) => {
    const b1 = getRect(obj1);
    const b2 = getRect(obj2);

    return !(
        b1.left > b2.left + b2.width ||
        b1.left + b1.width < b2.left ||
        b1.top > b2.top + b2.height ||
        b1.top + b1.height < b2.top
    );
};

/**
 * FORMAT_001: Check safe zone enforcement for 9:16 formats
 */
export const checkSafeZones = (canvas, formatConfig, rule) => {
    if (!canvas || !formatConfig) return { passed: true, violations: [] };

    // Only applies to 9:16 formats
    if (formatConfig.ratio !== '9:16') {
        return { passed: true, violations: [] };
    }

    const violations = [];
    const safeZoneTop = rule.params?.safe_zone_top_px || 200;
    const safeZoneBottom = rule.params?.safe_zone_bottom_px || 250;
    const excludedTypes = rule.params?.excluded_element_types || [];

    const objects = canvas.getObjects().filter(obj => {
        // Skip system elements
        if (obj.isValueTile || obj.isDrinkaware || obj.isTag || obj.isBackground || obj.isSafeZone) {
            return false;
        }
        return true;
    });

    for (const obj of objects) {
        // Only check text and logos for safe zone violations
        const isCheckable = obj.type === 'i-text' || obj.type === 'text' || obj.isLogo;
        if (!isCheckable) continue;

        const rect = getRect(obj);
        const objBottom = rect.top + rect.height;
        const canvasBottom = formatConfig.height;

        const inTopZone = rect.top < safeZoneTop;
        const inBottomZone = objBottom > (canvasBottom - safeZoneBottom);

        if (inTopZone || inBottomZone) {
            violations.push({
                ruleId: rule.id,
                ruleName: rule.name,
                type: rule.type,
                category: rule.category,
                objectId: obj.id || obj._id || 'unknown',
                zone: inTopZone ? 'top' : 'bottom',
                pixels: inTopZone ? safeZoneTop : safeZoneBottom,
                explanation: rule.explanation,
                plainEnglish: rule.plain_english,
                severity: rule.severity
            });
        }
    }

    return { passed: violations.length === 0, violations };
};

/**
 * ACC_001: Check minimum font sizes
 */
export const checkFontSizes = (canvas, formatConfig, rule) => {
    if (!canvas) return { passed: true, violations: [] };

    const violations = [];
    const isSmallFormat = formatConfig && formatConfig.height < (rule.params?.small_format_threshold_height || 200);
    const minSize = isSmallFormat
        ? (rule.params?.checkout_single_density_px || 10)
        : (rule.params?.brand_social_min_px || 20);

    const textObjects = canvas.getObjects().filter(obj =>
        obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox'
    );

    for (const obj of textObjects) {
        // Skip system elements
        if (obj.isValueTile || obj.isDrinkaware || obj.isTag) continue;

        const fontSize = obj.fontSize || 16;
        const scaledSize = fontSize * (obj.scaleY || 1);

        if (scaledSize < minSize) {
            violations.push({
                ruleId: rule.id,
                ruleName: rule.name,
                type: rule.type,
                category: rule.category,
                objectId: obj.id || obj._id || 'unknown',
                currentSize: Math.round(scaledSize),
                minSize: minSize,
                explanation: `Font size ${Math.round(scaledSize)}px is below minimum ${minSize}px`,
                plainEnglish: rule.plain_english,
                severity: rule.severity
            });
        }
    }

    return { passed: violations.length === 0, violations };
};

/**
 * ACC_002: Check text contrast (WCAG AA)
 */
export const checkContrast = (canvas, backgroundColor, rule) => {
    if (!canvas) return { passed: true, violations: [] };

    const violations = [];
    const normalRatio = rule.params?.contrast_ratio_normal || 4.5;
    const largeRatio = rule.params?.contrast_ratio_large || 3.0;
    const largeThreshold = rule.params?.large_text_threshold_px || 24;

    const textObjects = canvas.getObjects().filter(obj =>
        obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox'
    );

    for (const obj of textObjects) {
        // Skip system elements
        if (obj.isValueTile || obj.isDrinkaware || obj.isTag) continue;

        const textColor = obj.fill || '#000000';
        const bgColor = backgroundColor || '#ffffff';
        const fontSize = (obj.fontSize || 16) * (obj.scaleY || 1);

        const contrast = tinycolor.readability(textColor, bgColor);
        const requiredRatio = fontSize >= largeThreshold ? largeRatio : normalRatio;

        if (contrast < requiredRatio) {
            violations.push({
                ruleId: rule.id,
                ruleName: rule.name,
                type: rule.type,
                category: rule.category,
                objectId: obj.id || obj._id || 'unknown',
                currentRatio: contrast.toFixed(2),
                requiredRatio: requiredRatio,
                textColor: textColor,
                bgColor: bgColor,
                explanation: `Contrast ratio ${contrast.toFixed(1)}:1 (need ${requiredRatio}:1)`,
                plainEnglish: rule.plain_english,
                severity: rule.severity
            });
        }
    }

    return { passed: violations.length === 0, violations };
};

/**
 * DESIGN_001: Check value tile overlap
 */
export const checkValueTileOverlap = (canvas, rule) => {
    if (!canvas) return { passed: true, violations: [] };

    const violations = [];
    const valueTiles = canvas.getObjects().filter(obj => obj.isValueTile);
    const otherObjects = canvas.getObjects().filter(obj =>
        !obj.isValueTile && !obj.isBackground && !obj.isSafeZone
    );

    // Check if value tiles overlap each other
    // Only check rect objects (backgrounds), and skip same tile type (rect+text are same tile)
    const tileRects = valueTiles.filter(obj => obj.type === 'rect');

    for (let i = 0; i < tileRects.length; i++) {
        for (let j = i + 1; j < tileRects.length; j++) {
            // Skip if same tile type (shouldn't have two of same type, but just in case)
            if (tileRects[i].valueTileType === tileRects[j].valueTileType) continue;

            if (isOverlapping(tileRects[i], tileRects[j])) {
                violations.push({
                    ruleId: rule.id,
                    ruleName: 'Value Tiles Overlapping',
                    type: rule.type,
                    category: rule.category,
                    objectId: tileRects[i].valueTileType || `tile-${i}`,
                    overlapsWithId: tileRects[j].valueTileType || `tile-${j}`,
                    explanation: 'Value tiles cannot overlap each other',
                    plainEnglish: 'Your price tiles are overlapping. Please move them apart.',
                    severity: rule.severity
                });
            }
        }
    }

    // Check if other objects overlap value tiles (rect backgrounds only)
    // Exclude text elements that are part of the same tile
    for (const tile of tileRects) {
        for (const obj of otherObjects) {
            // Skip if this is the text of the same value tile
            if (obj.isValueTile && obj.valueTileType === tile.valueTileType) continue;
            // Skip tags that are positioned at bottom (they're designed to be separate)
            if (obj.isTag || obj.isLEPTag) continue;
            
            if (isOverlapping(obj, tile)) {
                violations.push({
                    ruleId: rule.id,
                    ruleName: 'Content Overlapping Value Tile',
                    type: rule.type,
                    category: rule.category,
                    objectId: obj.customName || obj.id || obj._id || 'unknown',
                    overlapsWithId: tile.valueTileType || 'value-tile',
                    explanation: 'Content cannot overlap value tiles',
                    plainEnglish: 'An element is overlapping a price tile. Move it away.',
                    severity: rule.severity
                });
            }
        }
    }

    return { passed: violations.length === 0, violations };
};

/**
 * PACK_001: Check packshot count and lead product
 */
export const checkPackshots = (canvas, rule) => {
    if (!canvas) return { passed: true, violations: [] };

    const violations = [];
    const packshots = canvas.getObjects().filter(obj => obj.isPackshot);
    const maxCount = rule.params?.max_packshots || 3;
    const leadRequired = rule.params?.lead_required !== false;

    // Check max count
    if (packshots.length > maxCount) {
        violations.push({
            ruleId: rule.id,
            ruleName: 'Too Many Packshots',
            type: rule.type,
            category: rule.category,
            currentCount: packshots.length,
            maxCount: maxCount,
            explanation: `${packshots.length} packshots (max ${maxCount})`,
            plainEnglish: `You have too many product images. Remove ${packshots.length - maxCount} to continue.`,
            severity: rule.severity
        });
    }

    // Check for lead packshot (warning only)
    if (leadRequired && packshots.length > 0) {
        const hasLead = packshots.some(p => p.isLeadPackshot);
        if (!hasLead) {
            violations.push({
                ruleId: rule.id + '_LEAD',
                ruleName: 'No Lead Packshot',
                type: 'warning',
                category: rule.category,
                explanation: 'No lead product marked',
                plainEnglish: 'Consider marking one product as the main/lead product.',
                severity: 'user_confirmation'
            });
        }
    }

    return { passed: violations.filter(v => v.type === 'hard_fail').length === 0, violations };
};

/**
 * ALC_001 (layout part): Check Drinkaware presence and size
 */
export const checkDrinkawareLayout = (canvas, isAlcoholProduct, rule) => {
    if (!canvas || !isAlcoholProduct) return { passed: true, violations: [] };

    const violations = [];
    const drinkawareObjects = canvas.getObjects().filter(obj => obj.isDrinkaware);
    const minHeight = rule.params?.min_height_px?.default || 20;

    if (drinkawareObjects.length === 0) {
        violations.push({
            ruleId: rule.id,
            ruleName: 'Drinkaware Required',
            type: rule.type,
            category: rule.category,
            explanation: 'Alcohol products must include Drinkaware lockup',
            plainEnglish: 'Add the Drinkaware logo from the sidebar for alcohol products.',
            severity: rule.severity
        });
        return { passed: false, violations };
    }

    // Check height
    for (const obj of drinkawareObjects) {
        const height = (obj.height || 0) * (obj.scaleY || 1);
        if (height < minHeight) {
            violations.push({
                ruleId: rule.id + '_HEIGHT',
                ruleName: 'Drinkaware Too Small',
                type: rule.type,
                category: rule.category,
                objectId: obj.id || 'drinkaware',
                currentHeight: Math.round(height),
                minHeight: minHeight,
                explanation: `Drinkaware height ${Math.round(height)}px (min ${minHeight}px)`,
                plainEnglish: `The Drinkaware logo is too small. It must be at least ${minHeight}px tall.`,
                severity: rule.severity
            });
        }
    }

    return { passed: violations.length === 0, violations };
};

export default {
    checkSafeZones,
    checkFontSizes,
    checkContrast,
    checkValueTileOverlap,
    checkPackshots,
    checkDrinkawareLayout,
    getRect,
    isOverlapping
};
