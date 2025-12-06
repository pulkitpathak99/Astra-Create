// Gemini AI Service for AstraCreate
// Using Gemini 2.0 Flash for creative assistance

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Get API key from environment variable (Vite exposes VITE_ prefixed vars)
const ENV_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Fallback to localStorage for manual entry
export const getApiKey = () => ENV_API_KEY || localStorage.getItem('gemini_api_key');
export const setApiKey = (key) => localStorage.setItem('gemini_api_key', key);
export const hasApiKey = () => !!getApiKey();

// System prompts for different use cases
const SYSTEM_PROMPTS = {
  creativeAssistant: `You are an expert retail media creative assistant for Tesco. You help advertisers create compelling, compliant advertising copy.

Key Guidelines:
- Keep messaging clear, concise, and action-oriented
- Emphasize value propositions and product benefits
- Never use prohibited terms: "money back", "guarantee", "best ever", "winner", "free", "sustainable", "eco-friendly", "competition", "prize", "survey", "#1", "number one"
- All pricing must be in separate Value Tiles, never in headlines
- Maintain professional, friendly tone aligned with Tesco brand voice
- For alcohol products, always consider Drinkaware requirements

Always respond with JSON format as specified in the user prompt.`,

  complianceChecker: `You are a retail media compliance expert for Tesco. Analyze creative content for guideline violations.

Your role:
- Identify potential compliance issues
- Explain WHY something is problematic (not just that it is)
- Suggest compliant alternatives
- Distinguish between hard fails (must fix) and soft recommendations
- Consider context and intent, not just keywords

Be helpful and constructive, not punitive. The goal is to help advertisers succeed.

Always respond with JSON format as specified in the user prompt.`,

  layoutAdvisor: `You are a visual design expert specializing in retail media creatives. You advise on layout, composition, and visual hierarchy.

Principles:
- Clean, uncluttered designs perform better
- Important elements (product, value proposition) should be prominent
- Maintain breathing room around text for readability
- Consider safe zones for social media formats
- Value tiles should be visible but not overwhelming
- Product images should be the hero when applicable

Always respond with JSON format as specified in the user prompt.`,
};

// Generic Gemini API call
async function callGemini(prompt, systemPrompt = SYSTEM_PROMPTS.creativeAssistant) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key not configured. Please add your API key in settings.');
  }

  const response = await fetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${prompt}` }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to call Gemini API');
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Try to parse JSON from the response
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/```\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    return JSON.parse(text);
  } catch {
    // Return raw text if not JSON
    return { rawText: text };
  }
}

// Generate creative copy suggestions
export async function generateCopySuggestions({ productName, productCategory, tone = 'friendly', format = 'square' }) {
  const prompt = `Generate 3 creative copy suggestions for a retail media advertisement.

Product: ${productName}
Category: ${productCategory || 'General'}
Tone: ${tone}
Format: ${format}

Return JSON in this exact format:
{
  "suggestions": [
    {
      "headline": "Main headline text (max 5 words)",
      "subheadline": "Supporting text (max 10 words)",
      "callToAction": "CTA text (2-3 words)",
      "confidence": 0.0-1.0
    }
  ]
}`;

  return callGemini(prompt, SYSTEM_PROMPTS.creativeAssistant);
}

// AI-powered compliance check
export async function checkComplianceAI(creativeContent) {
  const prompt = `Analyze this retail media creative content for compliance issues.

Creative Content:
${JSON.stringify(creativeContent, null, 2)}

Check for:
1. Prohibited terms and claims
2. Pricing placement issues
3. Accessibility concerns (contrast, font size)
4. Brand guideline alignment
5. Legal/regulatory considerations

Return JSON in this exact format:
{
  "overallStatus": "compliant" | "needs_review" | "non_compliant",
  "confidenceScore": 0.0-1.0,
  "issues": [
    {
      "severity": "error" | "warning" | "suggestion",
      "category": "text" | "layout" | "legal" | "accessibility",
      "element": "Which element has the issue",
      "problem": "What the problem is",
      "explanation": "Why this matters for retail media",
      "suggestion": "How to fix it"
    }
  ],
  "strengths": ["List of things done well"]
}`;

  return callGemini(prompt, SYSTEM_PROMPTS.complianceChecker);
}

// Get layout recommendations
export async function getLayoutSuggestions({ assets, format, productCategory }) {
  const prompt = `Recommend optimal layout for a retail media creative.

Available Assets:
${JSON.stringify(assets, null, 2)}

Format: ${format}
Product Category: ${productCategory || 'General'}

Consider visual hierarchy, balance, and platform best practices.

Return JSON in this exact format:
{
  "recommendation": {
    "productPlacement": { "position": "center|left|right", "scale": "small|medium|large|hero" },
    "textPlacement": { "position": "top|bottom|overlay", "alignment": "left|center|right" },
    "valueTilePlacement": { "position": "bottom-left|bottom-right|top-right", "prominence": "subtle|standard|prominent" },
    "backgroundSuggestion": "solid|gradient|image",
    "overallStyle": "clean|bold|minimal|dynamic"
  },
  "reasoning": "Brief explanation of why this layout works"
}`;

  return callGemini(prompt, SYSTEM_PROMPTS.layoutAdvisor);
}

// Fix non-compliant text
export async function fixComplianceIssue(originalText, issue) {
  const prompt = `Rewrite this advertising text to fix the compliance issue while maintaining the message intent.

Original Text: "${originalText}"
Issue: ${issue}

Return JSON in this exact format:
{
  "fixedText": "The compliant version",
  "explanation": "What was changed and why"
}`;

  return callGemini(prompt, SYSTEM_PROMPTS.creativeAssistant);
}

// Generate campaign variations
export async function generateCampaignVariations({ masterCreative, targetFormats }) {
  const prompt = `Suggest how to adapt this master creative for different social media formats.

Master Creative:
${JSON.stringify(masterCreative, null, 2)}

Target Formats: ${targetFormats.join(', ')}

For each format, suggest adjustments to optimize the creative.

Return JSON in this exact format:
{
  "variations": [
    {
      "format": "format name",
      "adjustments": {
        "layout": "description of layout changes",
        "textScaling": "how text should be scaled",
        "elementPriority": "what to emphasize/de-emphasize",
        "safeZoneConsiderations": "any safe zone adjustments"
      }
    }
  ]
}`;

  return callGemini(prompt, SYSTEM_PROMPTS.layoutAdvisor);
}

export default {
  hasApiKey,
  getApiKey,
  setApiKey,
  generateCopySuggestions,
  checkComplianceAI,
  getLayoutSuggestions,
  fixComplianceIssue,
  generateCampaignVariations,
};
