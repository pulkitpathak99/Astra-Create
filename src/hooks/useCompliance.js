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
    calculateComplianceScore,
  } = useStore();

  // ============================================
  // COPY RULES (Appendix B - Hard Fail)
  // ============================================

  // Check text for prohibited terms
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
        message: `Contains: "${found.slice(0, 3).join('", "')}"`,
        suggestion: 'Remove these terms - not allowed on self-serve media.',
        plainEnglish: `The word${found.length > 1 ? 's' : ''} "${found.slice(0, 2).join('", "')}" cannot be used in Tesco ads. Try alternatives like "Zero Sugar" instead of "free" or "Great Value" instead of price claims.`,
        rule: 'Appendix B: Copy Rules',
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
        rule: 'Appendix B: Claims',
        objectId,
      });
      return false;
    }
    removeComplianceIssue(`claims-${objectId}`);
    return true;
  }, [addComplianceError, removeComplianceIssue]);

  // Price validation - Prices only allowed in Value Tiles
  const checkPriceText = useCallback((text, objectId, isValueTile) => {
    // If it's already marked as a value tile (via prop), it's valid
    if (isValueTile) {
      removeComplianceIssue(`price-outside-tile-${objectId}`);
      return true;
    }

    // Check if object is a value tile by ID lookup (in case prop wasn't passed)
    const obj = canvas?.getObjects().find(o => (o.id === objectId || o._id === objectId));
    if (obj && obj.isValueTile) {
       removeComplianceIssue(`price-outside-tile-${objectId}`);
       return true;
    }

    const pricePattern = /£\d+|\d+p|£\d+\.\d{2}/;
    if (pricePattern.test(text)) {
      addComplianceError({
        id: `price-outside-tile-${objectId}`,
        type: 'copy',
        severity: 'error',
        title: 'Price Outside Value Tile',
        message: 'Prices must only appear in Value Tile components',
        suggestion: 'Remove price from text and use a Value Tile.',
        rule: 'Appendix A: Value Tiles',
        objectId,
      });
      return false;
    }
    removeComplianceIssue(`price-outside-tile-${objectId}`);
    return true;
  }, [canvas, addComplianceError, removeComplianceIssue]);

  // ============================================
  // HEADLINE/SUBHEAD RULES (Appendix A)
  // ============================================

  // Check headline character limit (35 max)
  const checkHeadlineLength = useCallback((text, objectId, isHeadline = false) => {
    if (!isHeadline) return true;

    const maxLength = COMPLIANCE_RULES.headlineRules.maxLength;
    if (text.length > maxLength) {
      addComplianceError({
        id: `headline-length-${objectId}`,
        type: 'copy',
        severity: 'error',
        title: 'Headline Too Long',
        message: `${text.length} chars (max ${maxLength})`,
        suggestion: `Shorten to ${maxLength} characters or less.`,
        rule: 'Appendix A: Headline',
        objectId,
      });
      return false;
    }
    removeComplianceIssue(`headline-length-${objectId}`);
    return true;
  }, [addComplianceError, removeComplianceIssue]);

  // Check subhead word count (20 max)
  const checkSubheadWords = useCallback((text, objectId, isSubhead = false) => {
    if (!isSubhead) return true;

    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const maxWords = COMPLIANCE_RULES.subheadRules.maxWords;

    if (wordCount > maxWords) {
      addComplianceError({
        id: `subhead-words-${objectId}`,
        type: 'copy',
        severity: 'error',
        title: 'Subhead Too Long',
        message: `${wordCount} words (max ${maxWords})`,
        suggestion: `Reduce to ${maxWords} words or less.`,
        rule: 'Appendix A: Subhead',
        objectId,
      });
      return false;
    }
    removeComplianceIssue(`subhead-words-${objectId}`);
    return true;
  }, [addComplianceError, removeComplianceIssue]);

  // ============================================
  // TAG RULES (Appendix A & B)
  // ============================================

  // Check tag text validity
  const checkTagText = useCallback((text, objectId) => {
    const validTags = Object.values(COMPLIANCE_RULES.validTags);
    const isValidTag = validTags.some(tag =>
      text.toLowerCase().includes(tag.toLowerCase())
    );

    // Also check for Clubcard format if has Clubcard text
    if (text.toLowerCase().includes('clubcard')) {
      const hasProperFormat = COMPLIANCE_RULES.clubcardTagPattern.test(text);
      if (!hasProperFormat) {
        addComplianceWarning({
          id: `tag-clubcard-${objectId}`,
          type: 'design',
          severity: 'warning',
          title: 'Clubcard Tag Format',
          message: 'Clubcard tags should include end date',
          suggestion: 'Use format: "Clubcard/app required. Ends DD/MM"',
          rule: 'Appendix A: DD/MM',
          objectId,
        });
        return false;
      }
    }

    if (!isValidTag && !text.toLowerCase().includes('clubcard')) {
      addComplianceWarning({
        id: `tag-invalid-${objectId}`,
        type: 'design',
        severity: 'warning',
        title: 'Non-Standard Tag',
        message: 'Tag text should use standard Tesco format',
        suggestion: 'Use: "Only at Tesco", "Available at Tesco", or stock warning.',
        rule: 'Appendix B: Tesco Tags',
        objectId,
      });
      return false;
    }

    removeComplianceIssue(`tag-invalid-${objectId}`);
    removeComplianceIssue(`tag-clubcard-${objectId}`);
    return true;
  }, [addComplianceWarning, removeComplianceIssue]);

  // ============================================
  // VALUE TILE RULES (Appendix A & B)
  // ============================================

  // Check for overlapping with value tiles
  const checkValueTileOverlap = useCallback((object, valueTiles) => {
    if (object.isValueTile) return true; // Don't check tile against itself

    const objectId = object.id || object._id || 'obj';

    for (const tile of valueTiles) {
      if (isOverlapping(object, tile)) {
        addComplianceError({
          id: `tile-overlap-${objectId}`,
          type: 'design',
          severity: 'error',
          title: 'Value Tile Overlap',
          message: 'Content cannot overlap value tile',
          suggestion: 'Move element away from the value tile.',
          rule: 'Appendix B: Value Tile',
          objectId,
        });
        return false;
      }
    }

    removeComplianceIssue(`tile-overlap-${objectId}`);
    return true;
  }, [addComplianceError, removeComplianceIssue]);

  // Helper: Check if two objects overlap
  const isOverlapping = (obj1, obj2) => {
    const b1 = obj1.getBoundingRect ? obj1.getBoundingRect() : getRect(obj1);
    const b2 = obj2.getBoundingRect ? obj2.getBoundingRect() : getRect(obj2);

    return !(b1.left > b2.left + b2.width ||
      b1.left + b1.width < b2.left ||
      b1.top > b2.top + b2.height ||
      b1.top + b1.height < b2.top);
  };

  const getRect = (obj) => ({
    left: obj.left || 0,
    top: obj.top || 0,
    width: (obj.width || 0) * (obj.scaleX || 1),
    height: (obj.height || 0) * (obj.scaleY || 1),
  });

  // ============================================
  // ACCESSIBILITY RULES (Appendix B - Hard Fail)
  // ============================================

  // Check font size
  const checkFontSize = useCallback((fontSize, objectId, isSmallText = false) => {
    const format = FORMAT_PRESETS[currentFormat];
    const isSmallFormat = format && format.height < 200;
    
    // Relaxed minimum for small banners (e.g. 728x90)
    const minSize = isSmallFormat ? 10 : (COMPLIANCE_RULES.minFontSize.standard || 20);

    if (fontSize < minSize) {
      addComplianceError({
        id: `font-size-${objectId}`,
        type: 'accessibility',
        severity: 'error',
        title: 'Font Size Too Small',
        message: `${Math.round(fontSize)}px is below minimum ${minSize}px`,
        suggestion: `Increase font size to at least ${minSize}px.`,
        rule: 'Appendix B: Legibility',
        objectId,
      });
      return false;
    }
    removeComplianceIssue(`font-size-${objectId}`);
    return true;
  }, [currentFormat, addComplianceError, removeComplianceIssue]);

  // Check contrast (WCAG AA)
  const checkContrast = useCallback((textColor, bgColor, objectId, fontSize = 16, isSystemElement = false) => {
    if (isSystemElement) {
      removeComplianceIssue(`contrast-${objectId}`);
      return true;
    }

    const effectiveBg = bgColor || backgroundColor;
    const contrast = tinycolor.readability(textColor, effectiveBg);

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
        message: `Ratio ${contrast.toFixed(1)}:1 (need ${requiredContrast}:1)`,
        suggestion: 'Increase contrast for WCAG AA compliance.',
        rule: 'Appendix B: Contrast',
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

  // Check safe zone (9:16 formats only)
  const checkSafeZone = useCallback((object) => {
    const format = FORMAT_PRESETS[currentFormat];
    if (!format || format.ratio !== '9:16') return true;

    // Skip ALL system elements
    if (object.isValueTile || object.isDrinkaware || object.isTag || object.isBackground) return true;

    const objectId = object.id || object._id || 'obj';
    const safeZone = COMPLIANCE_RULES.safeZones.story;

    const objTop = object.top || 0;
    const objHeight = (object.height || 0) * (object.scaleY || 1);
    const objBottom = objTop + objHeight;

    const inTopZone = objTop < safeZone.top;
    const inBottomZone = objBottom > (format.height - safeZone.bottom);

    const isCheckableElement = object.type === 'i-text' || object.type === 'text' || object.isLogo;

    if ((inTopZone || inBottomZone) && isCheckableElement) {
      addComplianceError({
        id: `safezone-${objectId}`,
        type: 'format',
        severity: 'error',
        title: 'Safe Zone Violation',
        message: `Element in ${inTopZone ? 'top' : 'bottom'} ${inTopZone ? safeZone.top : safeZone.bottom}px zone`,
        suggestion: 'Move element out of safe zone for 9:16 formats.',
        rule: 'Appendix B: Safe Zone',
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

  const checkDrinkaware = useCallback(() => {
    if (!isAlcoholProduct) {
      removeComplianceIssue('drinkaware');
      removeComplianceIssue('drinkaware-height');
      removeComplianceIssue('drinkaware-color');
      return true;
    }

    if (!canvas) return true;

    const drinkawareObjects = canvas.getObjects().filter(o => o.isDrinkaware);

    if (drinkawareObjects.length === 0) {
      addComplianceError({
        id: 'drinkaware',
        type: 'alcohol',
        severity: 'error',
        title: 'Drinkaware Required',
        message: 'Alcohol products must include Drinkaware lockup',
        suggestion: 'Add Drinkaware from sidebar.',
        rule: 'Appendix B: Alcohol',
      });
      return false;
    }

    // Check Drinkaware height (min 20px)
    const minHeight = COMPLIANCE_RULES.drinkawareRules.minHeight;
    const hasValidHeight = drinkawareObjects.some(obj => {
      const height = (obj.height || 0) * (obj.scaleY || 1);
      return height >= minHeight;
    });

    if (!hasValidHeight) {
      addComplianceError({
        id: 'drinkaware-height',
        type: 'alcohol',
        severity: 'error',
        title: 'Drinkaware Too Small',
        message: `Must be at least ${minHeight}px in height`,
        suggestion: 'Increase Drinkaware lockup size.',
        rule: 'Appendix B: Drinkaware',
      });
      return false;
    }

    removeComplianceIssue('drinkaware');
    removeComplianceIssue('drinkaware-height');
    return true;
  }, [isAlcoholProduct, canvas, addComplianceError, removeComplianceIssue]);

  // ============================================
  // CLUBCARD TAG VALIDATION
  // ============================================

  const checkClubcardTag = useCallback(() => {
    if (!canvas) return true;

    const hasClubcardTile = canvas.getObjects().some(o => o.valueTileType === 'clubcard');
    const tags = canvas.getObjects().filter(o => o.isTag);

    if (!hasClubcardTile || tags.length === 0) {
      removeComplianceIssue('clubcard-tag');
      return true;
    }

    const hasValidClubcardTag = tags.some(tag => {
      const text = tag.text || '';
      return COMPLIANCE_RULES.clubcardTagPattern.test(text);
    });

    if (!hasValidClubcardTag) {
      addComplianceWarning({
        id: 'clubcard-tag',
        type: 'design',
        severity: 'warning',
        title: 'Clubcard Tag Required',
        message: 'Clubcard price requires tag with end date',
        suggestion: 'Add tag: "Clubcard/app required. Ends DD/MM"',
        rule: 'Appendix A: Clubcard Tags',
      });
      return false;
    }

    removeComplianceIssue('clubcard-tag');
    return true;
  }, [canvas, addComplianceWarning, removeComplianceIssue]);

  // ============================================
  // PACKSHOT RULES (Appendix A & B)
  // ============================================

  const checkPackshots = useCallback(() => {
    if (!canvas) return true;

    const packshots = canvas.getObjects().filter(o => o.isPackshot);
    const maxCount = COMPLIANCE_RULES.packshotRules.maxCount;

    // Check max packshot count
    if (packshots.length > maxCount) {
      addComplianceError({
        id: 'packshots-max',
        type: 'design',
        severity: 'error',
        title: 'Too Many Packshots',
        message: `${packshots.length} packshots (max ${maxCount})`,
        suggestion: `Remove ${packshots.length - maxCount} packshot(s).`,
        rule: 'Appendix A: Packshot',
      });
      return false;
    }

    // Check for lead packshot
    if (packshots.length > 0) {
      const hasLead = packshots.some(p => p.isLeadPackshot);
      if (!hasLead) {
        addComplianceWarning({
          id: 'packshot-lead',
          type: 'design',
          severity: 'warning',
          title: 'No Lead Packshot',
          message: 'Consider marking a primary product',
          suggestion: 'Set one packshot as lead product.',
          rule: 'Appendix A: Lead Product',
        });
      } else {
        removeComplianceIssue('packshot-lead');
      }
    }

    removeComplianceIssue('packshots-max');
    return true;
  }, [canvas, addComplianceError, addComplianceWarning, removeComplianceIssue]);

  // ============================================
  // CTA RULES (Appendix B)
  // ============================================

  // CTA position validation - No CTA elements allowed
  const checkCTAPosition = useCallback(() => {
    if (!canvas) return true;

    const ctaObjects = canvas.getObjects().filter(o =>
      o.isCTA || o.customName?.toLowerCase().includes('cta') ||
      (o.text && o.text.toLowerCase().includes('shop now'))
    );

    if (ctaObjects.length > 0) {
      addComplianceError({
        id: 'cta-not-allowed',
        type: 'design',
        severity: 'error',
        title: 'CTA Not Allowed',
        message: 'Self-serve creatives cannot include CTA buttons',
        suggestion: 'Remove CTA buttons - Tesco applies CTA at serve time.',
        plainEnglish: 'Tesco automatically adds "Shop Now" buttons to ads. You don\'t need to add them yourself.',
        rule: 'Appendix B: CTA Rules',
      });
      return false;
    }

    removeComplianceIssue('cta-not-allowed');
    return true;
  }, [canvas, addComplianceError, removeComplianceIssue]);

  // ============================================
  // PACKSHOT-TO-CTA GAP VALIDATION (Appendix B)
  // ============================================

  const checkPackshotCTAGap = useCallback(() => {
    if (!canvas) return true;

    const packshots = canvas.getObjects().filter(o => o.isPackshot);
    const format = FORMAT_PRESETS[currentFormat];
    if (!format || packshots.length === 0) return true;

    // CTA is typically at bottom center - check gap from bottom edge
    const minGap = COMPLIANCE_RULES.packshotRules.safeZone.doubleDensity; // 24px
    let hasError = false;

    packshots.forEach((packshot, idx) => {
      const objectId = packshot.id || `packshot-${idx}`;
      const rect = packshot.getBoundingRect ? packshot.getBoundingRect() : getRect(packshot);
      const bottomEdge = rect.top + rect.height;
      const gap = format.height - bottomEdge;

      if (gap < minGap) {
        addComplianceWarning({
          id: `packshot-cta-gap-${objectId}`,
          type: 'design',
          severity: 'warning',
          title: 'Packshot Too Close to Bottom',
          message: `${Math.round(gap)}px gap (min ${minGap}px for CTA placement)`,
          suggestion: `Move packshot up by ${Math.ceil(minGap - gap)}px for CTA visibility.`,
          plainEnglish: `Your product image is too close to the bottom. Tesco adds buttons there, so leave at least ${minGap}px space.`,
          rule: 'Appendix B: Packshot Safe Zone',
          objectId,
        });
        hasError = true;
      } else {
        removeComplianceIssue(`packshot-cta-gap-${objectId}`);
      }
    });

    return !hasError;
  }, [canvas, currentFormat, addComplianceWarning, removeComplianceIssue]);

  // ============================================
  // VALUE TILE SIZE VALIDATION (Appendix A)
  // ============================================

  const checkValueTileSize = useCallback(() => {
    if (!canvas) return true;

    const valueTiles = canvas.getObjects().filter(o => o.isValueTile && o.type === 'rect');
    const sizes = COMPLIANCE_RULES.valueTileRules.sizes;
    const format = FORMAT_PRESETS[currentFormat];
    const config = format?.config || { valueTileScale: 1.0 };
    const scale = config.valueTileScale;

    let hasError = false;

    valueTiles.forEach((tile, idx) => {
      const objectId = tile.id || `tile-${idx}`;
      const tileType = tile.valueTileType || 'clubcard';
      const expectedSize = sizes[tileType];

      if (!expectedSize) return;

      const width = tile.width * (tile.scaleX || 1);
      const height = tile.height * (tile.scaleY || 1);

      // Calculate expected size based on format scale
      const expectedWidth = expectedSize.width * scale;
      const expectedHeight = expectedSize.height * scale;

      // Allow 10% tolerance
      const widthOk = Math.abs(width - expectedWidth) / expectedWidth <= 0.1;
      const heightOk = Math.abs(height - expectedHeight) / expectedHeight <= 0.1;

      if (!widthOk || !heightOk) {
        addComplianceWarning({
          id: `tile-size-${objectId}`,
          type: 'design',
          severity: 'warning',
          title: 'Value Tile Size Issue',
          message: `${Math.round(width)}×${Math.round(height)}px (expected ~${Math.round(expectedWidth)}×${Math.round(expectedHeight)}px)`,
          suggestion: 'Value tiles should use standard sizes for consistency.',
          plainEnglish: `This price tile is ${widthOk ? '' : 'not the right width'}${!widthOk && !heightOk ? ' and ' : ''}${heightOk ? '' : 'not the right height'}. Use the preset tiles from the sidebar.`,
          rule: 'Appendix A: Value Tile Sizes',
          objectId,
        });
        hasError = true;
      } else {
        removeComplianceIssue(`tile-size-${objectId}`);
      }
    });

    return !hasError;
  }, [canvas, currentFormat, addComplianceWarning, removeComplianceIssue]);

  // ============================================
  // VALUE TILE POSITION - Must be in lower third
  // ============================================

  const checkValueTilePosition = useCallback(() => {
    if (!canvas) return true;

    const valueTiles = canvas.getObjects().filter(o => o.isValueTile && o.type === 'rect');
    const format = FORMAT_PRESETS[currentFormat];
    if (!format) return true;

    // Check layout config
    const config = format.config || {};
    const isHorizontal = config.layout === 'horizontal';

    // Value tiles should typically be in lower 40% of canvas
    // For horizontal layouts, allow them anywhere (or at least lower 10% to catch extreme top placements)
    const allowedTop = isHorizontal ? format.height * 0.1 : format.height * 0.6;
    let hasError = false;

    valueTiles.forEach((tile, idx) => {
      const objectId = tile.id || `tile-${idx}`;
      const rect = tile.getBoundingRect ? tile.getBoundingRect() : getRect(tile);

      if (rect.top < allowedTop) {
        addComplianceWarning({
          id: `tile-position-${objectId}`,
          type: 'design',
          severity: 'warning',
          title: 'Value Tile Position',
          message: 'Value tile is positioned too high on canvas',
          suggestion: 'Move value tile to lower portion of the creative.',
          plainEnglish: 'Price tiles work best when placed lower in the design, near the product image. Consider moving it down.',
          rule: 'Appendix A: Value Tile Placement',
          objectId,
        });
        hasError = true;
      } else {
        removeComplianceIssue(`tile-position-${objectId}`);
      }
    });

    return !hasError;
  }, [canvas, currentFormat, addComplianceWarning, removeComplianceIssue]);

  // ============================================
  // REQUIRED ELEMENTS (Warnings only)
  // ============================================

  const checkRequiredElements = useCallback(() => {
    if (!canvas) return { warnings: 0 };

    let warnings = 0;
    const objects = canvas.getObjects();
    const format = FORMAT_PRESETS[currentFormat];
    const isSmallFormat = format && format.height < 200;

    // Check for headline
    // Detect by explicit name OR size threshold (scaled for small formats)
    const hasHeadline = objects.some(o => {
      const isText = o.type === 'i-text' || o.type === 'text';
      if (!isText) return false;
      
      const isExplicitHeadline = o.customName && o.customName.toLowerCase().includes('headline');
      const sizeThreshold = isSmallFormat ? 20 : 48;
      const isBigEnough = o.fontSize >= sizeThreshold;
      
      return (isExplicitHeadline || isBigEnough) && !o.isValueTile && !o.isDrinkaware && !o.isTag;
    });

    if (!hasHeadline) {
      addComplianceWarning({
        id: 'headline-required',
        type: 'tip',
        severity: 'warning',
        title: 'Add Headline',
        message: 'Headlines appear on all banners',
        suggestion: 'Add a headline from the Text section.',
        rule: 'Appendix A: Required Elements',
      });
      warnings++;
    } else {
      removeComplianceIssue('headline-required');
    }

    // Check for packshot
    const hasPackshot = objects.some(o => 
      o.isPackshot || 
      (o.customName && o.customName.toLowerCase().includes('packshot')) ||
      (o.customName && o.customName.toLowerCase().includes('product'))
    );
    
    if (!hasPackshot) {
      addComplianceWarning({
        id: 'packshot-required',
        type: 'tip',
        severity: 'warning',
        title: 'Add Packshot',
        message: 'Lead product is required',
        suggestion: 'Upload a packshot from the sidebar.',
        rule: 'Appendix A: Required Elements',
      });
      warnings++;
    } else {
      removeComplianceIssue('packshot-required');
    }

    return { warnings };
  }, [canvas, currentFormat, addComplianceWarning, removeComplianceIssue]);

  // ============================================
  // TAG REQUIREMENT CHECK
  // ============================================

  const checkTagRequired = useCallback(() => {
    if (!canvas) return true;

    const objects = canvas.getObjects();
    const hasTag = objects.some(o => o.isTag);
    const hasValueTile = objects.some(o => o.isValueTile);
    const hasPackshot = objects.some(o => o.isPackshot);

    // If creative has value tiles (price, promotion, or new), tag is required
    if (hasValueTile && !hasTag) {
      addComplianceWarning({
        id: 'tag-required-valuetile',
        type: 'design',
        severity: 'warning',
        title: 'Tag Required',
        message: 'Creatives with value tiles must include a Tesco tag',
        suggestion: 'Add a tag: "Only at Tesco" or "Available at Tesco"',
        plainEnglish: 'Since you have a price or promotion tile, you need to add a Tesco tag to show where customers can find this offer.',
        rule: 'Appendix A: Tag Rules',
      });
      return false;
    }

    // If creative links to Tesco (has packshot = product for sale), tag is recommended
    if (hasPackshot && !hasTag && !hasValueTile) {
      addComplianceWarning({
        id: 'tag-recommended',
        type: 'tip',
        severity: 'warning',
        title: 'Consider Adding Tag',
        message: 'Tesco-linked creatives should include a tag',
        suggestion: 'Add: "Only at Tesco" (exclusive) or "Available at Tesco"',
        rule: 'Appendix A: Tag Rules',
      });
      // This is just a tip, not a hard requirement
    } else {
      removeComplianceIssue('tag-recommended');
    }

    if (hasTag || !hasValueTile) {
      removeComplianceIssue('tag-required-valuetile');
    }

    return true;
  }, [canvas, addComplianceWarning, removeComplianceIssue]);

  // ============================================
  // FULL COMPLIANCE CHECK
  // ============================================

  const runFullCompliance = useCallback(() => {
    if (!canvas) return { errors: 0, warnings: 0 };

    clearCompliance();
    let errors = 0, warnings = 0;

    const objects = canvas.getObjects();
    const valueTiles = objects.filter(o => o.isValueTile);
    const tags = objects.filter(o => o.isTag);

    objects.forEach((obj, idx) => {
      if (obj.isBackground || obj.isSafeZone) return;

      const objectId = obj.id || `obj-${idx}`;
      const isSystemElement = obj.isValueTile || obj.isDrinkaware || obj.isTag;

      // Text element checks
      if ((obj.type === 'i-text' || obj.type === 'text') && !isSystemElement) {
        const text = obj.text || '';
        const fontSize = obj.fontSize || 16;
        const isHeadline = fontSize >= 48;
        const isSubhead = fontSize >= 24 && fontSize < 48;

        // Copy rules
        if (!checkProhibitedTerms(text, objectId)) errors++;
        if (!checkClaims(text, objectId)) errors++;
        if (!checkPriceText(text, objectId, false)) errors++;

        // Length rules
        if (!checkHeadlineLength(text, objectId, isHeadline)) errors++;
        if (!checkSubheadWords(text, objectId, isSubhead)) errors++;

        // Accessibility
        if (!checkFontSize(fontSize, objectId, false)) errors++;
        if (!checkContrast(obj.fill || '#000', null, objectId, fontSize, false)) errors++;

        // Safe zone
        if (!checkSafeZone(obj)) errors++;

        // Value tile overlap
        if (!checkValueTileOverlap(obj, valueTiles)) errors++;
      }

      // Tag validation
      if (obj.isTag) {
        const text = obj.text || '';
        checkTagText(text, objectId);
      }

      // Logo safe zone
      if (obj.isLogo && !checkSafeZone(obj)) errors++;

      // Packshot overlap with value tiles
      if (obj.isPackshot && !checkValueTileOverlap(obj, valueTiles)) errors++;
    });

    // Global checks
    if (!checkDrinkaware()) errors++;
    if (!checkClubcardTag()) warnings++;
    if (!checkPackshots()) errors++;

    // New compliance checks (CTA, value tile, packshot gap)
    if (!checkCTAPosition()) errors++;
    if (!checkPackshotCTAGap()) warnings++;
    if (!checkValueTileSize()) warnings++;
    if (!checkValueTilePosition()) warnings++;
    if (!checkTagRequired()) warnings++;

    const required = checkRequiredElements();
    warnings += required.warnings;

    // Calculate score after all checks
    calculateComplianceScore();

    return { errors, warnings };
  }, [
    canvas, clearCompliance, calculateComplianceScore,
    checkProhibitedTerms, checkClaims, checkPriceText,
    checkHeadlineLength, checkSubheadWords,
    checkFontSize, checkContrast, checkSafeZone,
    checkValueTileOverlap, checkTagText,
    checkDrinkaware, checkClubcardTag, checkPackshots,
    checkRequiredElements, checkCTAPosition, checkPackshotCTAGap,
    checkValueTileSize, checkValueTilePosition, checkTagRequired
  ]);

  return {
    checkProhibitedTerms,
    checkClaims,
    checkPriceText,
    checkHeadlineLength,
    checkSubheadWords,
    checkTagText,
    checkValueTileOverlap,
    checkFontSize,
    checkContrast,
    checkSafeZone,
    checkDrinkaware,
    checkClubcardTag,
    checkPackshots,
    checkRequiredElements,
    checkCTAPosition,
    checkPackshotCTAGap,
    checkValueTileSize,
    checkValueTilePosition,
    checkTagRequired,
    runFullCompliance,
  };
};

export default useCompliance;

