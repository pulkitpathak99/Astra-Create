/**
 * Compliance Engine
 * Schema-driven evaluation pipeline that orchestrates all detectors.
 * 
 * Evaluation Order:
 * 1. Deterministic (layout, font size, overlap) - fast, reliable
 * 2. Regex (prohibited terms) - fast, deterministic
 * 3. Semantic NLI (paraphrases) - async, fallback
 * 4. Vision (logos, people) - async, expensive
 * 
 * Results are aggregated into:
 * - errors: hard_fail violations that block export
 * - warnings: issues requiring user confirmation
 * - score: 0-100 compliance score
 */

import RULE_SCHEMA, { getRulesByDetectionMethod } from './ruleSchema';
import regexDetector from './detectors/regexDetector';
import layoutDetector from './detectors/layoutDetector';
import semanticDetector from './detectors/semanticDetector';
import visionDetector from './detectors/visionDetector';
import { FORMAT_PRESETS, CREATIVE_PROFILES } from '../store/useStore';

export class ComplianceEngine {
    constructor() {
        this.lastEvaluation = null;
        this.isEvaluating = false;
        this.enableSemanticNLI = true; // Can be disabled for performance
        this.enableVision = true;
    }

    /**
     * Run full compliance evaluation
     * @param {fabric.Canvas} canvas
     * @param {object} context - { currentFormat, backgroundColor, isAlcoholProduct, isLEPMode, etc. }
     * @returns {Promise<ComplianceResult>}
     */
    async evaluateAll(canvas, context = {}) {
        if (this.isEvaluating) {
            console.warn('Compliance evaluation already in progress');
            return this.lastEvaluation;
        }

        this.isEvaluating = true;
        const startTime = Date.now();

        const result = {
            errors: [],
            warnings: [],
            score: 100,
            canExport: true,
            evaluatedAt: new Date().toISOString(),
            timeTakenMs: 0
        };

        try {
            const format = FORMAT_PRESETS[context.currentFormat] || FORMAT_PRESETS['instagram-feed'];

            // ============================================
            // PHASE 0: Creative Profile Validation
            // ============================================
            if (context.creativeProfile && context.creativeProfile !== 'STANDARD') {
                await this.runProfileValidation(canvas, context, result);
            }

            // ============================================
            // PHASE 1: Deterministic Checks (Layout)
            // ============================================
            await this.runLayoutChecks(canvas, format, context, result);

            // ============================================
            // PHASE 2: Regex Checks (Text)
            // ============================================
            await this.runRegexChecks(canvas, result);

            // ============================================
            // PHASE 3: Semantic NLI (Async, Fallback)
            // ============================================
            if (this.enableSemanticNLI) {
                await this.runSemanticChecks(canvas, result);
            }

            // ============================================
            // PHASE 4: Vision Checks (Async, Expensive)
            // ============================================
            if (this.enableVision) {
                await this.runVisionChecks(canvas, context, result);
            }

            // ============================================
            // Calculate Final Score
            // ============================================
            result.score = this.calculateScore(result.errors, result.warnings);
            result.canExport = result.errors.filter(e => e.type === 'hard_fail').length === 0;
            result.timeTakenMs = Date.now() - startTime;

            this.lastEvaluation = result;
            return result;

        } catch (error) {
            console.error('Compliance evaluation failed:', error);
            result.errors.push({
                ruleId: 'ENGINE_ERROR',
                ruleName: 'Evaluation Error',
                type: 'hard_fail',
                explanation: error.message,
                severity: 'block_export'
            });
            result.canExport = false;
            return result;
        } finally {
            this.isEvaluating = false;
        }
    }

    /**
     * Validate creative profile constraints (post-hoc safety net)
     */
    async runProfileValidation(canvas, context, result) {
        const profile = CREATIVE_PROFILES[context.creativeProfile];
        if (!profile) return;

        const violations = [];

        // Check background color constraint
        if (profile.constraints.background.locked) {
            const expectedBg = profile.constraints.background.value;
            const actualBg = canvas.backgroundColor || context.backgroundColor;
            
            // Normalize color comparison (case-insensitive)
            if (actualBg && actualBg.toLowerCase() !== expectedBg.toLowerCase()) {
                violations.push({
                    ruleId: 'PROFILE_BG',
                    ruleName: `${profile.name} Profile - Background`,
                    type: 'hard_fail',
                    explanation: `${profile.name} profile requires background color ${expectedBg}, but found ${actualBg}`,
                    severity: 'block_export',
                    detectionMethod: 'profile',
                    profileId: profile.id
                });
            }
        }

        // Check value tile types
        const valueTiles = canvas.getObjects().filter(o => o.isValueTile);
        for (const tile of valueTiles) {
            const tileType = tile.valueTileType;
            if (tileType && !profile.constraints.valueTiles.allowed.includes(tileType)) {
                violations.push({
                    ruleId: 'PROFILE_TILE',
                    ruleName: `${profile.name} Profile - Value Tile`,
                    type: 'hard_fail',
                    explanation: `${profile.name} profile does not allow "${tileType}" value tiles. Allowed: ${profile.constraints.valueTiles.allowed.join(', ')}`,
                    severity: 'block_export',
                    detectionMethod: 'profile',
                    profileId: profile.id,
                    objectId: tile.customName || 'Value Tile'
                });
            }
        }

        // Check required tag for LEP
        if (profile.autoTag && profile.id === 'LOW_EVERYDAY_PRICE') {
            const hasRequiredTag = canvas.getObjects().some(o => 
                o.isTag && o.text && o.text.includes('Selected stores')
            );
            if (!hasRequiredTag) {
                violations.push({
                    ruleId: 'PROFILE_TAG',
                    ruleName: `${profile.name} Profile - Required Tag`,
                    type: 'hard_fail',
                    explanation: `${profile.name} profile requires the tag: "${profile.autoTag}"`,
                    severity: 'block_export',
                    detectionMethod: 'profile',
                    profileId: profile.id
                });
            }
        }

        // Check text color constraint (warning, not hard fail)
        if (profile.constraints.textColor.locked) {
            const expectedColor = profile.constraints.textColor.value;
            const textObjects = canvas.getObjects().filter(o => 
                (o.type === 'i-text' || o.type === 'text') && !o.isTag && !o.isValueTile
            );
            
            for (const textObj of textObjects) {
                if (textObj.fill && textObj.fill.toLowerCase() !== expectedColor.toLowerCase()) {
                    violations.push({
                        ruleId: 'PROFILE_COLOR',
                        ruleName: `${profile.name} Profile - Text Color`,
                        type: 'warning',
                        explanation: `${profile.name} profile expects text color ${expectedColor}, but "${textObj.text?.substring(0, 20)}..." uses ${textObj.fill}`,
                        severity: 'warn_user',
                        detectionMethod: 'profile',
                        profileId: profile.id,
                        objectId: textObj.customName || textObj.text?.substring(0, 20)
                    });
                }
            }
        }

        this.addViolations(violations, result);
    }

    /**
     * Run layout-based checks (deterministic)
     */
    async runLayoutChecks(canvas, format, context, result) {
        const layoutRules = getRulesByDetectionMethod('layout');

        for (const rule of layoutRules) {
            // Skip rules that don't apply to current context
            if (!this.ruleApplies(rule, context)) continue;

            let checkResult;

            switch (rule.id) {
                case 'FORMAT_001':
                    checkResult = layoutDetector.checkSafeZones(canvas, format, rule);
                    break;
                case 'ACC_001':
                    checkResult = layoutDetector.checkFontSizes(canvas, format, rule);
                    break;
                case 'ACC_002':
                    checkResult = layoutDetector.checkContrast(canvas, context.backgroundColor, rule);
                    break;
                case 'DESIGN_001':
                    checkResult = layoutDetector.checkValueTileOverlap(canvas, rule);
                    break;
                case 'PACK_001':
                    checkResult = layoutDetector.checkPackshots(canvas, rule);
                    break;
                case 'ALC_001':
                    checkResult = layoutDetector.checkDrinkawareLayout(canvas, context.isAlcoholProduct, rule);
                    break;
                default:
                    continue;
            }

            if (checkResult && !checkResult.passed) {
                this.addViolations(checkResult.violations, result);
            }
        }

        // Additional layout checks not tied to specific rules
        const headlineCheck = regexDetector.checkHeadlineLength(canvas);
        if (!headlineCheck.passed) {
            this.addViolations(headlineCheck.violations, result);
        }

        const subheadCheck = regexDetector.checkSubheadWords(canvas);
        if (!subheadCheck.passed) {
            this.addViolations(subheadCheck.violations, result);
        }
    }

    /**
     * Run regex-based text checks
     */
    async runRegexChecks(canvas, result) {
        const regexRules = getRulesByDetectionMethod('regex');

        for (const rule of regexRules) {
            const checkResult = regexDetector.detectRegexViolations(rule, canvas);
            if (!checkResult.passed) {
                this.addViolations(checkResult.violations, result);
            }
        }
    }

    /**
     * Run semantic NLI checks (async fallback)
     */
    async runSemanticChecks(canvas, result) {
        const nliRules = getRulesByDetectionMethod('semantic_nli');
        const textElements = regexDetector.extractTextFromCanvas(canvas);

        // Get object IDs already violated by regex
        const regexViolatedIds = new Set(
            result.errors
                .filter(e => e.detectionMethod !== 'semantic_nli')
                .map(e => e.objectId)
        );

        for (const rule of nliRules) {
            // Only check elements not already caught by regex
            const existingViolations = result.errors.filter(e => e.ruleId === rule.id);

            try {
                const checkResult = await semanticDetector.detectSemanticViolations(
                    rule,
                    textElements,
                    existingViolations
                );

                if (!checkResult.passed) {
                    this.addViolations(checkResult.violations, result);
                }
            } catch (error) {
                console.warn(`Semantic check for ${rule.id} failed:`, error.message);
                // Don't block on semantic failures
            }
        }
    }

    /**
     * Run vision-based checks (async)
     */
    async runVisionChecks(canvas, context, result) {
        const visionRules = getRulesByDetectionMethod('vision');

        for (const rule of visionRules) {
            if (!this.ruleApplies(rule, context)) continue;

            try {
                const checkResult = await visionDetector.detectVisionViolations(rule, {
                    canvas,
                    isAlcoholProduct: context.isAlcoholProduct,
                    backgroundImageUrl: context.backgroundImageUrl,
                    canvasDataUrl: context.canvasDataUrl,
                    peopleConfirmed: context.peopleConfirmed
                });

                if (!checkResult.passed) {
                    this.addViolations(checkResult.violations, result);
                }
            } catch (error) {
                console.warn(`Vision check for ${rule.id} failed:`, error.message);
                // Don't block on vision failures
            }
        }
    }

    /**
     * Check if a rule applies to current context
     */
    ruleApplies(rule, context) {
        // Check format restrictions
        if (rule.applies_to_formats) {
            if (!rule.applies_to_formats.includes(context.currentFormat)) {
                return false;
            }
        }

        // Check conditional application
        if (rule.applies_when) {
            for (const [key, value] of Object.entries(rule.applies_when)) {
                if (context[key] !== value) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Add violations to result
     */
    addViolations(violations, result) {
        for (const v of violations) {
            if (v.type === 'hard_fail') {
                // Deduplicate
                if (!result.errors.some(e => e.ruleId === v.ruleId && e.objectId === v.objectId)) {
                    result.errors.push(v);
                }
            } else {
                if (!result.warnings.some(w => w.ruleId === v.ruleId && w.objectId === v.objectId)) {
                    result.warnings.push(v);
                }
            }
        }
    }

    /**
     * Calculate compliance score (0-100)
     */
    calculateScore(errors, warnings) {
        const errorPenalty = 15;
        const warningPenalty = 5;

        const errorCount = errors.filter(e => e.type === 'hard_fail').length;
        const warningCount = warnings.length;

        const score = Math.max(0, 100 - (errorCount * errorPenalty) - (warningCount * warningPenalty));
        return score;
    }

    /**
     * Run quick validation (layout + regex only, skips AI)
     * Use for real-time feedback during editing
     */
    async evaluateQuick(canvas, context = {}) {
        const savedNLI = this.enableSemanticNLI;
        const savedVision = this.enableVision;

        this.enableSemanticNLI = false;
        this.enableVision = false;

        try {
            return await this.evaluateAll(canvas, context);
        } finally {
            this.enableSemanticNLI = savedNLI;
            this.enableVision = savedVision;
        }
    }

    /**
     * Run full validation including AI (use before export)
     */
    async evaluateFull(canvas, context = {}) {
        this.enableSemanticNLI = true;
        this.enableVision = true;
        return await this.evaluateAll(canvas, context);
    }

    /**
     * Get last evaluation result
     */
    getLastResult() {
        return this.lastEvaluation;
    }
}

// Singleton instance
export const complianceEngine = new ComplianceEngine();

export default complianceEngine;
