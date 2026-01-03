/**
 * Semantic Detector
 * Uses HuggingFace BART-MNLI for Natural Language Inference.
 * Catches paraphrased violations that regex misses.
 * 
 * Example: "conditions apply" → matches COPY_001 (T&C prohibition)
 */

import { HfInference } from '@huggingface/inference';

// Initialize HuggingFace client
let hfClient = null;

const getHfClient = () => {
    if (!hfClient) {
        // Try to get API key from env, fallback to free tier (slower)
        const apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY || '';
        hfClient = new HfInference(apiKey || undefined);
    }
    return hfClient;
};

/**
 * Check if text entails a given hypothesis using NLI
 * @param {string} text - The text to analyze (premise)
 * @param {string} hypothesis - The claim to check (e.g., "This text mentions terms and conditions")
 * @param {number} threshold - Confidence threshold (0-1)
 * @returns {Promise<{ entails: boolean, confidence: number, label: string }>}
 */
export const checkEntailment = async (text, hypothesis, threshold = 0.7) => {
    if (!text || !hypothesis) {
        return { entails: false, confidence: 0, label: 'neutral' };
    }

    try {
        const hf = getHfClient();

        // Use BART-MNLI for zero-shot classification
        const result = await hf.zeroShotClassification({
            model: 'facebook/bart-large-mnli',
            inputs: text,
            parameters: {
                candidate_labels: [hypothesis, `NOT: ${hypothesis}`],
                multi_label: false
            }
        });

        // Find the positive label score
        const positiveIndex = result.labels.indexOf(hypothesis);
        const confidence = positiveIndex >= 0 ? result.scores[positiveIndex] : 0;

        return {
            entails: confidence >= threshold,
            confidence: confidence,
            label: confidence >= threshold ? 'entailment' : 'neutral'
        };
    } catch (error) {
        console.warn('Semantic NLI check failed:', error.message);
        // Fallback: don't block on API errors
        return { entails: false, confidence: 0, label: 'error' };
    }
};

/**
 * Run semantic detection for rules with semantic_hypothesis
 * Only runs if regex didn't already catch the violation (fallback)
 * @param {object} rule - Rule with params.semantic_hypothesis
 * @param {Array} textElements - Text elements from canvas
 * @param {Array} existingViolations - Violations already found by regex
 * @returns {Promise<{ passed: boolean, violations: Array }>}
 */
export const detectSemanticViolations = async (rule, textElements, existingViolations = []) => {
    const hypothesis = rule.params?.semantic_hypothesis;
    if (!hypothesis) {
        return { passed: true, violations: [] };
    }

    const violations = [];
    const alreadyViolatedObjIds = new Set(existingViolations.map(v => v.objectId));

    // Only check elements that weren't already caught by regex
    const elementsToCheck = textElements.filter(e =>
        !alreadyViolatedObjIds.has(e.objectId) &&
        !e.isValueTile &&
        !e.isDrinkaware &&
        !e.isTag &&
        e.text.length > 3 // Skip very short text
    );

    // Run NLI checks in parallel (with limit to avoid rate limiting)
    const BATCH_SIZE = 5;
    for (let i = 0; i < elementsToCheck.length; i += BATCH_SIZE) {
        const batch = elementsToCheck.slice(i, i + BATCH_SIZE);

        const results = await Promise.all(
            batch.map(async (element) => {
                const result = await checkEntailment(element.text, hypothesis, 0.75);
                return { element, result };
            })
        );

        for (const { element, result } of results) {
            if (result.entails) {
                violations.push({
                    ruleId: rule.id,
                    ruleName: rule.name,
                    type: rule.type,
                    category: rule.category,
                    objectId: element.objectId,
                    text: element.text,
                    confidence: result.confidence,
                    detectionMethod: 'semantic_nli',
                    explanation: rule.explanation,
                    plainEnglish: rule.plain_english,
                    severity: rule.severity
                });
            }
        }
    }

    return {
        passed: violations.length === 0,
        violations
    };
};

/**
 * Check if text contains paraphrased prohibited content
 * Used as a final safety net after regex
 * @param {string} text 
 * @param {string[]} hypotheses - Array of semantic hypotheses to check
 * @returns {Promise<{ hasViolation: boolean, matchedHypotheses: string[] }>}
 */
export const checkMultipleHypotheses = async (text, hypotheses) => {
    const matched = [];

    for (const hypothesis of hypotheses) {
        const result = await checkEntailment(text, hypothesis, 0.8);
        if (result.entails) {
            matched.push(hypothesis);
        }
    }

    return {
        hasViolation: matched.length > 0,
        matchedHypotheses: matched
    };
};

export default {
    checkEntailment,
    detectSemanticViolations,
    checkMultipleHypotheses
};
