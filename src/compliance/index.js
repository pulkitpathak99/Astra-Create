/**
 * Compliance Module - Public API
 * Export all compliance components for use in the application.
 */

// Rule Schema
export {
    default as RULE_SCHEMA,
    SCHEMA_VERSION,
    getRuleById,
    getRulesByCategory,
    getRulesByDetectionMethod,
    getHardFailRules,
    getWarningRules
} from './ruleSchema';

// Compliance Engine
export {
    ComplianceEngine,
    complianceEngine as default
} from './complianceEngine';

// Detectors (for advanced usage)
export { default as regexDetector } from './detectors/regexDetector';
export { default as layoutDetector } from './detectors/layoutDetector';
export { default as semanticDetector } from './detectors/semanticDetector';
export { default as visionDetector } from './detectors/visionDetector';

// Layout Rule Evaluator (deterministic layout checks)
export {
    evaluateLayoutRules,
    evaluateLayoutRulesQuick
} from './layoutRuleEvaluator';

