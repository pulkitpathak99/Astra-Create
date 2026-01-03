/**
 * Regex Detector
 * Fast, deterministic first-pass text pattern matching.
 * Runs before semantic NLI to catch obvious violations quickly.
 */

/**
 * Check text against a list of regex patterns
 * @param {string} text - Text to check
 * @param {string[]} patterns - Array of regex pattern strings
 * @returns {{ matched: boolean, matches: string[] }}
 */
export const matchPatterns = (text, patterns) => {
  if (!text || !patterns || patterns.length === 0) {
    return { matched: false, matches: [] };
  }

  const lowerText = text.toLowerCase();
  const matches = [];

  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern, 'gi');
      const found = lowerText.match(regex);
      if (found) {
        matches.push(...found);
      }
    } catch (e) {
      // Fallback to simple includes for invalid regex
      if (lowerText.includes(pattern.toLowerCase())) {
        matches.push(pattern);
      }
    }
  }

  return {
    matched: matches.length > 0,
    matches: [...new Set(matches)] // Deduplicate
  };
};

/**
 * Extract all text from canvas objects
 * @param {fabric.Canvas} canvas 
 * @returns {Array<{ objectId: string, text: string, object: any }>}
 */
export const extractTextFromCanvas = (canvas) => {
  if (!canvas) return [];

  return canvas.getObjects()
    .filter(obj => obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox')
    .map(obj => ({
      objectId: obj.id || obj._id || `text-${Math.random().toString(36).substr(2, 9)}`,
      text: obj.text || '',
      object: obj,
      isValueTile: obj.isValueTile || false,
      isTag: obj.isTag || false,
      isDrinkaware: obj.isDrinkaware || false,
      isHeadline: obj.customName?.toLowerCase().includes('headline') || obj.fontSize >= 48,
      isSubhead: obj.customName?.toLowerCase().includes('subhead') || false
    }));
};

/**
 * Run regex detection for a specific rule against all text elements
 * @param {object} rule - Rule from schema with regex_patterns in params
 * @param {fabric.Canvas} canvas
 * @returns {{ passed: boolean, violations: Array }}
 */
export const detectRegexViolations = (rule, canvas) => {
  const textElements = extractTextFromCanvas(canvas);
  const violations = [];
  const patterns = rule.params?.regex_patterns || [];

  for (const element of textElements) {
    // Skip value tiles for price rules
    if (rule.skip_for_value_tiles && element.isValueTile) {
      continue;
    }

    // Skip system elements
    if (element.isDrinkaware || element.isTag) {
      continue;
    }

    const result = matchPatterns(element.text, patterns);
    
    if (result.matched) {
      violations.push({
        ruleId: rule.id,
        ruleName: rule.name,
        type: rule.type,
        category: rule.category,
        objectId: element.objectId,
        text: element.text,
        matchedTerms: result.matches,
        explanation: rule.explanation,
        plainEnglish: rule.plain_english,
        severity: rule.severity
      });
    }
  }

  return {
    passed: violations.length === 0,
    violations
  };
};

/**
 * Check headline length (35 chars max)
 * @param {fabric.Canvas} canvas
 * @returns {{ passed: boolean, violations: Array }}
 */
export const checkHeadlineLength = (canvas) => {
  const textElements = extractTextFromCanvas(canvas);
  const violations = [];
  const MAX_LENGTH = 35;

  for (const element of textElements) {
    if (element.isHeadline && element.text.length > MAX_LENGTH) {
      violations.push({
        ruleId: 'HEADLINE_LENGTH',
        ruleName: 'Headline Too Long',
        type: 'hard_fail',
        category: 'copy',
        objectId: element.objectId,
        text: element.text,
        currentLength: element.text.length,
        maxLength: MAX_LENGTH,
        explanation: `Headline is ${element.text.length} characters (max ${MAX_LENGTH})`,
        plainEnglish: `Your headline is too long. Keep it under ${MAX_LENGTH} characters for better readability.`,
        severity: 'block_export'
      });
    }
  }

  return { passed: violations.length === 0, violations };
};

/**
 * Check subhead word count (20 words max)
 * @param {fabric.Canvas} canvas
 * @returns {{ passed: boolean, violations: Array }}
 */
export const checkSubheadWords = (canvas) => {
  const textElements = extractTextFromCanvas(canvas);
  const violations = [];
  const MAX_WORDS = 20;

  for (const element of textElements) {
    if (element.isSubhead) {
      const wordCount = element.text.trim().split(/\s+/).filter(w => w.length > 0).length;
      if (wordCount > MAX_WORDS) {
        violations.push({
          ruleId: 'SUBHEAD_WORDS',
          ruleName: 'Subhead Too Long',
          type: 'hard_fail',
          category: 'copy',
          objectId: element.objectId,
          text: element.text,
          currentWords: wordCount,
          maxWords: MAX_WORDS,
          explanation: `Subhead is ${wordCount} words (max ${MAX_WORDS})`,
          plainEnglish: `Your subhead is too long. Keep it under ${MAX_WORDS} words.`,
          severity: 'block_export'
        });
      }
    }
  }

  return { passed: violations.length === 0, violations };
};

export default {
  matchPatterns,
  extractTextFromCanvas,
  detectRegexViolations,
  checkHeadlineLength,
  checkSubheadWords
};
