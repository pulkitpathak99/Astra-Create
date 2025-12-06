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
    backgroundColor,
  } = useStore();

  // ============================================
  // COPY RULES (Appendix B - Hard Fail)
  // ============================================

  // Check text for prohibited terms (T&Cs, competitions, sustainability, charity, money-back, claims)
  const checkProhibitedTerms = useCallback((text, objectId) => {
    const lowerText = text.toLowerCase();
    const found = COMPLIANCE_RULES.prohibitedTerms.filter(term =>
      lowerText.includes(term.toLowerCase())
    );

    if (found.length > 0) {
      addComplianceError({
        id: `prohibited-${objectId}`,
        type: 'copy',
        severity: 'error',
        title: 'Prohibited Content',
        message: `Contains: "${found.slice(0, 3).join('", "')}"${found.length > 3 ? ` (+${found.length - 3} more)` : ''}`,
        suggestion: 'Remove these terms - not allowed on self-serve media.',
        rule: 'Appendix B: Copy Rules (Hard Fail)',
        objectId,
      });
      return false;
    }
    removeComplianceIssue(`prohibited-${objectId}`);
    return true;
  }, [addComplianceError, removeComplianceIssue]);

  // Check for claims (asterisks, survey claims)
  const checkClaims = useCallback((text, objectId) => {
    const hasClaimIndicator = COMPLIANCE_RULES.claimsPatterns.some(p => p.test(text));

    if (hasClaimIndicator) {
      addComplianceError({
        id: `claims-${objectId}`,
        type: 'copy',
        severity: 'error',
        title: 'Claims Detected',
        message: 'Text contains claim indicators (asterisk, survey reference)',
        suggestion: 'Remove claims - cannot be verified on self-serve.',
        rule: 'Appendix B: Claims (Hard Fail)',
        objectId,
      });
      return false;
    }
    removeComplianceIssue(`claims-${objectId}`);
    return true;
  }, [addComplianceError, removeComplianceIssue]);

  // Check for price text outside value tiles
  const checkPriceText = useCallback((text, objectId, isValueTile = false) => {
    if (isValueTile) return true;

    const hasPrice = COMPLIANCE_RULES.pricePatterns.some(p => p.test(text));

    if (hasPrice) {
      addComplianceError({
        id: `price-${objectId}`,
        type: 'copy',
        severity: 'error',
        title: 'Price Outside Value Tile',
        message: 'Prices must only appear in Value Tile components',
        suggestion: 'Use a Value Tile from the sidebar for pricing.',
        rule: 'Appendix B: Price Callouts (Hard Fail)',
        objectId,
      });
      return false;
    }
    removeComplianceIssue(`price-${objectId}`);
    return true;
  }, [addComplianceError, removeComplianceIssue]);

  // Check Tesco tag text validity
  const checkTagText = useCallback((text, objectId, hasClubcardTile = false) => {
    if (!text) return true;
    
    const normalizedText = text.trim();
    const isValidTag = COMPLIANCE_RULES.validTags.some(tag => 
      normalizedText.toLowerCase().includes(tag.toLowerCase())
    );
    
    // If Clubcard tile is present, tag must include specific text
    if (hasClubcardTile) {
      const hasClubcardText = /clubcard.*required.*ends\s*\d{1,2}\/\d{1,2}/i.test(normalizedText);
      if (!hasClubcardText) {
        addComplianceError({
          id: `tag-clubcard-${objectId}`,
          type: 'design',
          severity: 'error',
          title: 'Invalid Clubcard Tag',
          message: 'Clubcard Price requires tag with "Ends DD/MM"',
          suggestion: 'Add end date to tag: "Clubcard/app required. Ends DD/MM"',
          rule: 'Appendix B: Tesco Tags (Hard Fail)',
          objectId,
        });
        return false;
      }
    }
    
    removeComplianceIssue(`tag-clubcard-${objectId}`);
    return true;
  }, [addComplianceError, removeComplianceIssue]);

  // ============================================
  // ACCESSIBILITY RULES (Appendix B - Hard Fail)
  // ============================================

  // Check font size
  const checkFontSize = useCallback((fontSize, objectId, isSystemElement = false, formatType = 'standard') => {
    if (isSystemElement) {
      removeComplianceIssue(`fontsize-${objectId}`);
      return true;
    }

    const minSize = COMPLIANCE_RULES.minFontSize[formatType] || COMPLIANCE_RULES.minFontSize.standard;
    
    if (fontSize < minSize) {
      addComplianceError({
        id: `fontsize-${objectId}`,
        type: 'accessibility',
        severity: 'error',
        title: 'Font Size Too Small',
        message: `${fontSize}px is below minimum ${minSize}px`,
        suggestion: `Increase to at least ${minSize}px for accessibility compliance.`,
        rule: 'Appendix B: Minimum Font Size (Hard Fail)',
        objectId,
      });
      return false;
    }
    removeComplianceIssue(`fontsize-${objectId}`);
    return true;
  }, [addComplianceError, removeComplianceIssue]);

  // Check contrast (WCAG AA)
  const checkContrast = useCallback((textColor, bgColor, objectId, fontSize = 16, isSystemElement = false) => {
    if (isSystemElement) {
      removeComplianceIssue(`contrast-${objectId}`);
      return true;
    }

    const effectiveBg = bgColor || backgroundColor;
    const contrast = tinycolor.readability(textColor, effectiveBg);
    
    // Large text (24px+) has lower contrast requirement
    const isLargeText = fontSize >= COMPLIANCE_RULES.contrastRequirements.largeTextThreshold;
    const requiredContrast = isLargeText 
      ? COMPLIANCE_RULES.contrastRequirements.largeText 
      : COMPLIANCE_RULES.contrastRequirements.normalText;
    
    if (contrast < requiredContrast) {
      addComplianceError({
        id: `contrast-${objectId}`,
        type: 'accessibility',
        severity: 'error',
        title: 'Insufficient Contrast',
        message: `Ratio ${contrast.toFixed(1)}:1 (need ${requiredContrast}:1 for ${isLargeText ? 'large' : 'normal'} text)`,
        suggestion: 'Increase contrast for WCAG AA compliance.',
        rule: 'Appendix B: Contrast (Hard Fail)',
        objectId,
      });
      return false;
    }
    removeComplianceIssue(`contrast-${objectId}`);
    return true;
  }, [addComplianceError, removeComplianceIssue, backgroundColor]);

  // ============================================
  // FORMAT RULES (Appendix B - Hard Fail)
  // ============================================

  // Check safe zone (9:16 formats)
  const checkSafeZone = useCallback((object) => {
    const format = FORMAT_PRESETS[currentFormat];
    if (!format || format.ratio !== '9:16') return true;

    // Skip system elements and value tiles (they're positioned intentionally)
    if (object.isValueTile || object.isDrinkaware || object.isTag || object.isBackground) return true;

    const objectId = object.id || object._id || 'obj';
    const safeZone = COMPLIANCE_RULES.safeZones.story;

    const objTop = object.top || 0;
    const objHeight = (object.height || 0) * (object.scaleY || 1);
    const objBottom = objTop + objHeight;

    const inTopZone = objTop < safeZone.top;
    const inBottomZone = objBottom > (format.height - safeZone.bottom);

    // Only check text, logos, and value tiles per spec
    const isCheckableElement = object.type === 'i-text' || object.type === 'text' || object.isLogo || object.isValueTile;
    
    if ((inTopZone || inBottomZone) && isCheckableElement) {
      addComplianceError({
        id: `safezone-${objectId}`,
        type: 'format',
        severity: 'error',
        title: 'Safe Zone Violation',
        message: `Element in ${inTopZone ? 'top 200px' : 'bottom 250px'} safe zone`,
        suggestion: 'Move element out of safe zone - will be obscured by social UI.',
        rule: 'Appendix B: Social Safe Zone (Hard Fail)',
        objectId,
      });
      return false;
    }
    removeComplianceIssue(`safezone-${objectId}`);
    return true;
  }, [currentFormat, addComplianceError, removeComplianceIssue]);

  // ============================================
  // ALCOHOL RULES (Appendix B - Hard Fail)
  // ============================================

  // Check Drinkaware requirements
  const checkDrinkaware = useCallback(() => {
    if (!isAlcoholProduct) {
      removeComplianceIssue('drinkaware');
      removeComplianceIssue('drinkaware-height');
      removeComplianceIssue('drinkaware-color');
      return true;
    }

    if (!canvas) return false;

    const drinkawareObjects = canvas.getObjects().filter(o => o.isDrinkaware);
    
    if (drinkawareObjects.length === 0) {
      addComplianceError({
        id: 'drinkaware',
        type: 'alcohol',
        severity: 'error',
        title: 'Drinkaware Required',
        message: 'Alcohol products must include Drinkaware lockup',
        suggestion: 'Add Drinkaware from sidebar (mandatory for alcohol).',
        rule: 'Appendix B: Alcohol (Hard Fail)',
      });
      return false;
    }
    
    // Check Drinkaware height (min 20px, or 12px for SAYS)
    const drinkawareText = drinkawareObjects.find(o => o.type === 'i-text' || o.type === 'text');
    if (drinkawareText) {
      const minHeight = COMPLIANCE_RULES.drinkawareRules.minHeight;
      const fontSize = drinkawareText.fontSize || 14;
      
      if (fontSize < minHeight) {
        addComplianceError({
          id: 'drinkaware-height',
          type: 'alcohol',
          severity: 'error',
          title: 'Drinkaware Too Small',
          message: `Drinkaware text ${fontSize}px is below minimum ${minHeight}px`,
          suggestion: `Increase Drinkaware to at least ${minHeight}px.`,
          rule: 'Appendix B: Drinkaware Height (Hard Fail)',
        });
        return false;
      }
      
      // Check color (must be black or white only)
      const color = (drinkawareText.fill || '').toLowerCase();
      const isValidColor = COMPLIANCE_RULES.drinkawareRules.allowedColors.some(c => 
        color === c.toLowerCase() || color === c
      );
      
      if (!isValidColor && color !== '#000000' && color !== '#ffffff') {
        addComplianceWarning({
          id: 'drinkaware-color',
          type: 'alcohol',
          severity: 'warning',
          title: 'Drinkaware Color',
          message: 'Drinkaware should be all-black or all-white',
          suggestion: 'Change Drinkaware color to #000000 or #ffffff.',
          rule: 'Appendix B: Drinkaware Color',
        });
      }
    }
    
    removeComplianceIssue('drinkaware');
    removeComplianceIssue('drinkaware-height');
    return true;
  }, [isAlcoholProduct, canvas, addComplianceError, addComplianceWarning, removeComplianceIssue]);

  // ============================================
  // DESIGN RULES (Appendix B - Hard Fail)
  // ============================================

  // Check for content overlapping value tiles
  const checkValueTileOverlap = useCallback(() => {
    if (!canvas) return true;
    
    const valueTiles = canvas.getObjects().filter(o => o.isValueTile);
    const otherObjects = canvas.getObjects().filter(o => 
      !o.isValueTile && !o.isSafeZone && !o.isBackground && o.selectable !== false
    );
    
    let hasOverlap = false;
    
    valueTiles.forEach(tile => {
      const tileRect = tile.getBoundingRect();
      
      otherObjects.forEach(obj => {
        const objRect = obj.getBoundingRect();
        
        // Check for intersection
        const intersects = !(
          objRect.left > tileRect.left + tileRect.width ||
          objRect.left + objRect.width < tileRect.left ||
          objRect.top > tileRect.top + tileRect.height ||
          objRect.top + objRect.height < tileRect.top
        );
        
        if (intersects) {
          hasOverlap = true;
          addComplianceError({
            id: `overlap-${obj.id || 'obj'}`,
            type: 'design',
            severity: 'error',
            title: 'Value Tile Overlap',
            message: 'Content cannot overlay Value Tile',
            suggestion: 'Move element away from Value Tile.',
            rule: 'Appendix B: Value Tile (Hard Fail)',
            objectId: obj.id,
          });
        }
      });
    });
    
    if (!hasOverlap) {
      removeComplianceIssue('overlap-');
    }
    
    return !hasOverlap;
  }, [canvas, addComplianceError, removeComplianceIssue]);

  // ============================================
  // PACKSHOT RULES (Appendix B)
  // ============================================

  // Check packshot requirements
  const checkPackshots = useCallback(() => {
    if (!canvas) return true;
    
    const packshots = canvas.getObjects().filter(o => o.isPackshot);
    
    // Check max count
    if (packshots.length > COMPLIANCE_RULES.packshotRules.maxCount) {
      addComplianceError({
        id: 'packshot-count',
        type: 'packshot',
        severity: 'error',
        title: 'Too Many Packshots',
        message: `Maximum ${COMPLIANCE_RULES.packshotRules.maxCount} packshots allowed`,
        suggestion: 'Remove extra packshots.',
        rule: 'Appendix A: Packshot',
      });
      return false;
    }
    
    // Check lead packshot required
    if (packshots.length === 0) {
      addComplianceWarning({
        id: 'packshot-required',
        type: 'packshot',
        severity: 'warning',
        title: 'Packshot Missing',
        message: 'Lead packshot is required',
        suggestion: 'Upload a product packshot from the sidebar.',
        rule: 'Appendix A: Packshot',
      });
    } else {
      removeComplianceIssue('packshot-required');
    }
    
    removeComplianceIssue('packshot-count');
    return true;
  }, [canvas, addComplianceError, addComplianceWarning, removeComplianceIssue]);

  // ============================================
  // REQUIRED ELEMENTS (Appendix A)
  // ============================================

  const checkRequiredElements = useCallback(() => {
    if (!canvas) return { errors: 0 };
    
    let errors = 0;
    const objects = canvas.getObjects();
    
    // Check for headline (required)
    const hasHeadline = objects.some(o => 
      (o.type === 'i-text' || o.type === 'text') && 
      o.fontSize >= 48 && 
      !o.isValueTile && !o.isDrinkaware && !o.isTag
    );
    
    if (!hasHeadline) {
      addComplianceWarning({
        id: 'headline-required',
        type: 'mandatory',
        severity: 'warning',
        title: 'Headline Missing',
        message: 'A headline is required on all banners',
        suggestion: 'Add a headline from the Text section.',
        rule: 'Appendix A: Headline',
      });
      errors++;
    } else {
      removeComplianceIssue('headline-required');
    }

    return { errors };
  }, [canvas, addComplianceWarning, removeComplianceIssue]);

  // ============================================
  // MEDIA RULES (Appendix B - Warning)
  // ============================================

  // Check for people in images (would need AI detection in production)
  const checkPeopleInImages = useCallback(() => {
    // This would integrate with AI vision API in production
    // For now, just check if any image is marked as containing people
    if (!canvas) return true;
    
    const images = canvas.getObjects().filter(o => o.type === 'image' && o.containsPeople);
    
    if (images.length > 0) {
      addComplianceWarning({
        id: 'people-confirm',
        type: 'media',
        severity: 'warning',
        title: 'People Detected',
        message: 'Confirm that people are integral to campaign',
        suggestion: 'Verify you have rights to use images of people.',
        rule: 'Appendix B: Photography of People',
      });
      return false;
    }
    
    removeComplianceIssue('people-confirm');
    return true;
  }, [canvas, addComplianceWarning, removeComplianceIssue]);

  // ============================================
  // FULL COMPLIANCE CHECK
  // ============================================

  const runFullCompliance = useCallback(() => {
    if (!canvas) return { errors: 0, warnings: 0 };

    clearCompliance();
    let errors = 0, warnings = 0;

    // Check for Clubcard tile presence (affects tag validation)
    const hasClubcardTile = canvas.getObjects().some(o => o.valueTileType === 'clubcard');

    canvas.getObjects().forEach((obj, idx) => {
      if (obj.isBackground || obj.isSafeZone) return;

      const objectId = obj.id || `obj-${idx}`;
      const isSystemElement = obj.isValueTile || obj.isDrinkaware;

      // Text element checks
      if (obj.type === 'i-text' || obj.type === 'text') {
        const text = obj.text || '';
        
        if (!isSystemElement) {
          // Copy rules (Hard Fail)
          if (!checkProhibitedTerms(text, objectId)) errors++;
          if (!checkClaims(text, objectId)) errors++;
          if (!checkPriceText(text, objectId, obj.isValueTile)) errors++;
          
          // Accessibility rules (Hard Fail)
          if (!checkFontSize(obj.fontSize || 16, objectId, isSystemElement)) errors++;
          if (!checkContrast(obj.fill || '#000', null, objectId, obj.fontSize || 16, isSystemElement)) errors++;
        }
        
        // Tag validation
        if (obj.isTag) {
          if (!checkTagText(text, objectId, hasClubcardTile)) errors++;
        }
        
        // Safe zone (Hard Fail)
        if (!checkSafeZone(obj)) errors++;
      }

      // Logo safe zone check
      if (obj.isLogo && !checkSafeZone(obj)) errors++;
      
      // Image checks
      if (obj.type === 'image' && !obj.isBackground) {
        if (!checkPeopleInImages()) warnings++;
      }
    });

    // Global checks
    if (!checkDrinkaware()) errors++;
    if (!checkValueTileOverlap()) errors++;
    if (!checkPackshots()) warnings++;
    
    const required = checkRequiredElements();
    warnings += required.errors;

    return { errors, warnings };
  }, [
    canvas, clearCompliance, 
    checkProhibitedTerms, checkClaims, checkPriceText, checkTagText,
    checkFontSize, checkContrast, checkSafeZone, 
    checkDrinkaware, checkValueTileOverlap, checkPackshots,
    checkRequiredElements, checkPeopleInImages
  ]);

  return {
    checkProhibitedTerms,
    checkClaims,
    checkPriceText,
    checkTagText,
    checkFontSize,
    checkContrast,
    checkSafeZone,
    checkDrinkaware,
    checkValueTileOverlap,
    checkPackshots,
    checkRequiredElements,
    checkPeopleInImages,
    runFullCompliance,
  };
};

export default useCompliance;
