import { useCallback } from 'react';
import tinycolor from 'tinycolor2';
import useStore, { COMPLIANCE_RULES, FORMAT_PRESETS } from '../store/useStore';

export const useCompliance = () => {
    const {
        addComplianceError,
        addComplianceWarning,
        removeComplianceIssue,
        clearCompliance,
        isAlcoholProduct,
        currentFormat,
        canvas,
        backgroundColor } = useStore();

    // Check text for prohibited terms
    const checkProhibitedTerms = useCallback((text, objectId) => {
        const lowerText = text.toLowerCase();
        const found = COMPLIANCE_RULES.prohibitedTerms.filter(term =>
            lowerText.includes(term.toLowerCase())
        );

        if (found.length > 0) {
            addComplianceError({
                id: `prohibited-${objectId}`,
                type: 'text',
                severity: 'error',
                title: 'Prohibited Terms',
                message: `Contains: "${found.join('", "')}"`,
                suggestion: 'Remove these terms - they violate Tesco self-serve guidelines.',
                rule: 'Appendix B: Hard Fail Terms',
                objectId,
            });
            return false;
        }
        removeComplianceIssue(`prohibited-${objectId}`);
        return true;
    }, [addComplianceError, removeComplianceIssue]);

    // Check for price text outside value tiles
    const checkPriceText = useCallback((text, objectId, isValueTile = false) => {
        if (isValueTile) return true;

        const pricePatterns = [/£\d+(\.\d{2})?/, /\d+p\b/i, /\d+%\s*(off|discount)/i];
        const hasPrice = pricePatterns.some(p => p.test(text));

        if (hasPrice) {
            addComplianceError({
                id: `price-${objectId}`,
                type: 'text',
                severity: 'error',
                title: 'Price Outside Value Tile',
                message: 'Prices must only appear in Value Tile components',
                suggestion: 'Move pricing to a Value Tile or remove from text.',
                rule: 'Appendix B: Pricing Rules',
                objectId,
            });
            return false;
        }
        removeComplianceIssue(`price-${objectId}`);
        return true;
    }, [addComplianceError, removeComplianceIssue]);

    // Check font size
    const checkFontSize = useCallback((fontSize, objectId) => {
        const minSize = COMPLIANCE_RULES.minFontSize.standard;
        if (fontSize < minSize) {
            addComplianceWarning({
                id: `fontsize-${objectId}`,
                type: 'text',
                severity: 'warning',
                title: 'Small Font Size',
                message: `Font size ${fontSize}px is below minimum ${minSize}px`,
                suggestion: `Increase to at least ${minSize}px for readability.`,
                rule: 'Appendix B: Typography',
                objectId,
            });
            return false;
        }
        removeComplianceIssue(`fontsize-${objectId}`);
        return true;
    }, [addComplianceWarning, removeComplianceIssue]);

    // Check contrast (WCAG AA)
    const checkContrast = useCallback((textColor, bgColor, objectId) => {
        const contrast = tinycolor.readability(textColor, bgColor || backgroundColor);
        if (contrast < 4.5) {
            addComplianceWarning({
                id: `contrast-${objectId}`,
                type: 'text',
                severity: 'warning',
                title: 'Low Contrast',
                message: `Contrast ratio ${contrast.toFixed(1)}:1 (need 4.5:1)`,
                suggestion: 'Increase contrast for accessibility compliance.',
                rule: 'WCAG AA Standard',
                objectId,
            });
            return false;
        }
        removeComplianceIssue(`contrast-${objectId}`);
        return true;
    }, [addComplianceWarning, removeComplianceIssue, backgroundColor]);

    // Check safe zone breach (for story formats)
    const checkSafeZone = useCallback((object) => {
        const format = FORMAT_PRESETS[currentFormat];
        if (!format || format.ratio !== '9:16') return true;

        const objectId = object.id || object._id || 'obj';
        const safeZone = COMPLIANCE_RULES.safeZones.story;

        const objTop = object.top || 0;
        const objHeight = (object.height || 0) * (object.scaleY || 1);
        const objBottom = objTop + objHeight;

        const inTopZone = objTop < safeZone.top;
        const inBottomZone = objBottom > (format.height - safeZone.bottom);

        if ((inTopZone || inBottomZone) && (object.type === 'i-text' || object.type === 'text' || object.isLogo)) {
            addComplianceWarning({
                id: `safezone-${objectId}`,
                type: 'position',
                severity: 'warning',
                title: 'Safe Zone Overlap',
                message: `Element in ${inTopZone ? 'top' : 'bottom'} safe zone`,
                suggestion: 'Move away from edges - may be obscured by Instagram UI.',
                rule: 'Social Safe Zone Guidelines',
                objectId,
            });
            return false;
        }
        removeComplianceIssue(`safezone-${objectId}`);
        return true;
    }, [currentFormat, addComplianceWarning, removeComplianceIssue]);

    // Check Drinkaware requirement
    const checkDrinkaware = useCallback(() => {
        if (!isAlcoholProduct) {
            removeComplianceIssue('drinkaware');
            return true;
        }

        if (!canvas) return false;

        const hasDrinkaware = canvas.getObjects().some(o => o.isDrinkaware);
        if (!hasDrinkaware) {
            addComplianceError({
                id: 'drinkaware',
                type: 'mandatory',
                severity: 'error',
                title: 'Drinkaware Required',
                message: 'Alcohol products must include Drinkaware lockup',
                suggestion: 'Add Drinkaware from Elements panel.',
                rule: 'Appendix B: Alcohol Content',
            });
            return false;
        }
        removeComplianceIssue('drinkaware');
        return true;
    }, [isAlcoholProduct, canvas, addComplianceError, removeComplianceIssue]);

    // Run full compliance check
    const runFullCompliance = useCallback(() => {
        if (!canvas) return { errors: 0, warnings: 0 };

        clearCompliance();
        let errors = 0, warnings = 0;

        canvas.getObjects().forEach((obj, idx) => {
            const objectId = obj.id || `obj-${idx}`;

            if (obj.type === 'i-text' || obj.type === 'text') {
                const text = obj.text || '';
                if (!checkProhibitedTerms(text, objectId)) errors++;
                if (!checkPriceText(text, objectId, obj.isValueTile)) errors++;
                if (!checkFontSize(obj.fontSize || 16, objectId)) warnings++;
                if (!checkContrast(obj.fill || '#000', backgroundColor, objectId)) warnings++;
                if (!checkSafeZone(obj)) warnings++;
            }

            if (obj.isLogo && !checkSafeZone(obj)) warnings++;
        });

        if (!checkDrinkaware()) errors++;

        return { errors, warnings };
    }, [canvas, clearCompliance, checkProhibitedTerms, checkPriceText, checkFontSize, checkContrast, checkSafeZone, checkDrinkaware, backgroundColor]);

    return {
        checkProhibitedTerms,
        checkPriceText,
        checkFontSize,
        checkContrast,
        checkSafeZone,
        checkDrinkaware,
        runFullCompliance,
    };
};

export default useCompliance;
