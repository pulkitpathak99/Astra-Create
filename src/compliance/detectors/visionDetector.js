/**
 * Vision Detector
 * Uses AI Orchestrator for multimodal detection with fallback chains.
 * Handles: Drinkaware logo, people detection, packshot analysis.
 */

// Use AI Orchestrator for provider routing
import aiOrchestrator from '../../services/aiOrchestrator';
import geminiService from '../../services/geminiService';

/**
 * MEDIA_001: Detect people in an image
 * Uses orchestrator fallback chain: MediaPipe → DETR → Gemini
 * @param {string} imageDataUrl - Base64 image data URL
 * @returns {Promise<{ detected: boolean, confidence: number, details: object }>}
 */
export const detectPeople = async (imageDataUrl) => {
  if (!imageDataUrl) {
    return { detected: false, confidence: 0, details: {} };
  }

  try {
    // Use orchestrator with automatic fallback chain
    const result = await aiOrchestrator.detectPeople(imageDataUrl);
    
    return {
      detected: result.detected || false,
      confidence: result.confidence || 0,
      details: {
        count: result.count || 0,
        provider: result.provider || 'unknown',
        faces: result.faces || [],
      }
    };
  } catch (error) {
    console.warn('People detection failed:', error.message);
    return { detected: false, confidence: 0, details: { error: error.message } };
  }
};

/**
 * ALC_001 (vision part): Verify Drinkaware logo presence and compliance
 * @param {string} imageDataUrl - Canvas snapshot as data URL
 * @returns {Promise<{ valid: boolean, issues: string[] }>}
 */
export const verifyDrinkawareLogo = async (imageDataUrl) => {
  if (!imageDataUrl || !geminiService.hasApiKey()) {
    return { valid: false, issues: ['Vision API not available'] };
  }

  try {
    const prompt = `Analyze this retail media creative image for Drinkaware compliance:

1. Is the Drinkaware logo (text "drinkaware.co.uk") visible?
2. Is it legible and not obscured by other elements?
3. Is it in a contrasting color (black or white against the background)?
4. Estimate its approximate height in pixels relative to the image.

Respond in JSON format:
{
  "logoVisible": boolean,
  "isLegible": boolean,
  "hasContrast": boolean,
  "estimatedHeightPercent": number (0-100),
  "issues": string[]
}`;

    const base64 = imageDataUrl.split(',')[1];
    const mimeType = imageDataUrl.split(':')[1].split(';')[0];
    
    const response = await geminiService.callGeminiVision(prompt, base64, mimeType);
    
    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        valid: result.logoVisible && result.isLegible && result.hasContrast,
        logoVisible: result.logoVisible,
        isLegible: result.isLegible,
        hasContrast: result.hasContrast,
        heightPercent: result.estimatedHeightPercent,
        issues: result.issues || []
      };
    }

    return { valid: false, issues: ['Could not parse vision response'] };
  } catch (error) {
    console.warn('Drinkaware verification failed:', error.message);
    return { valid: false, issues: [error.message] };
  }
};

/**
 * PACK_001 (vision part): Analyze packshots in the creative
 * @param {string} imageDataUrl - Canvas snapshot
 * @returns {Promise<{ count: number, hasLead: boolean, details: object }>}
 */
export const analyzePackshots = async (imageDataUrl) => {
  if (!imageDataUrl || !geminiService.hasApiKey()) {
    return { count: 0, hasLead: false, details: {} };
  }

  try {
    const prompt = `Analyze this retail media creative for product packshots:

1. How many distinct product images/packshots are visible?
2. Is there a clearly prominent/lead product (largest or most central)?
3. Are all products clearly visible and not cropped?

Respond in JSON format:
{
  "packshotCount": number,
  "hasLeadProduct": boolean,
  "leadProductDescription": string,
  "allProductsVisible": boolean,
  "issues": string[]
}`;

    const base64 = imageDataUrl.split(',')[1];
    const mimeType = imageDataUrl.split(':')[1].split(';')[0];
    
    const response = await geminiService.callGeminiVision(prompt, base64, mimeType);
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        count: result.packshotCount || 0,
        hasLead: result.hasLeadProduct || false,
        details: {
          leadDescription: result.leadProductDescription,
          allVisible: result.allProductsVisible,
          issues: result.issues || []
        }
      };
    }

    return { count: 0, hasLead: false, details: {} };
  } catch (error) {
    console.warn('Packshot analysis failed:', error.message);
    return { count: 0, hasLead: false, details: { error: error.message } };
  }
};

/**
 * Run vision detection for a rule
 * @param {object} rule - Rule from schema with vision_signals
 * @param {object} context - { canvas, isAlcoholProduct, backgroundImageUrl, ... }
 * @returns {Promise<{ passed: boolean, violations: Array }>}
 */
export const detectVisionViolations = async (rule, context) => {
  const violations = [];

  switch (rule.id) {
    case 'ALC_001': {
      if (!context.isAlcoholProduct) {
        return { passed: true, violations: [] };
      }
      
      // Get canvas snapshot for vision analysis
      if (context.canvasDataUrl) {
        const result = await verifyDrinkawareLogo(context.canvasDataUrl);
        if (!result.valid) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name + ' (Vision Check)',
            type: rule.type,
            category: rule.category,
            detectionMethod: 'vision',
            issues: result.issues,
            explanation: 'Vision analysis found Drinkaware compliance issues',
            plainEnglish: result.issues.join('. ') || 'Drinkaware logo may not be compliant.',
            severity: rule.severity
          });
        }
      }
      break;
    }

    case 'MEDIA_001': {
      if (context.backgroundImageUrl) {
        const result = await detectPeople(context.backgroundImageUrl);
        if (result.detected && !context.peopleConfirmed) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            type: rule.type,
            category: rule.category,
            detectionMethod: 'vision',
            confidence: result.confidence,
            details: result.details,
            explanation: rule.explanation,
            plainEnglish: rule.plain_english,
            severity: 'user_confirmation',
            requiresConfirmation: true
          });
        }
      }
      break;
    }

    case 'PACK_001': {
      // Vision-based packshot verification (supplements layout detection)
      if (context.canvasDataUrl) {
        const result = await analyzePackshots(context.canvasDataUrl);
        // Only add vision-based warnings if they contradict layout detection
        if (result.details.issues?.length > 0) {
          violations.push({
            ruleId: rule.id + '_VISION',
            ruleName: 'Packshot Visibility Issue',
            type: 'warning',
            category: rule.category,
            detectionMethod: 'vision',
            details: result.details,
            explanation: result.details.issues.join('. '),
            plainEnglish: 'Some products may not be clearly visible.',
            severity: 'user_confirmation'
          });
        }
      }
      break;
    }
  }

  return {
    passed: violations.filter(v => v.type === 'hard_fail').length === 0,
    violations
  };
};

export default {
  detectPeople,
  verifyDrinkawareLogo,
  analyzePackshots,
  detectVisionViolations
};
