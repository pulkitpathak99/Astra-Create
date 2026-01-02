import React, { useEffect } from 'react';
import useStore from '../store/useStore';
import { useCompliance } from '../hooks/useCompliance';

/**
 * ComplianceScore - Gamified compliance indicator (0-100)
 * Shows a visual score with color coding and friendly labels
 */
export function ComplianceScore({ compact = false }) {
    const { complianceScore, complianceErrors, complianceWarnings, calculateComplianceScore } = useStore();
    const { runFullCompliance } = useCompliance();

    // Recalculate score when errors/warnings change
    useEffect(() => {
        calculateComplianceScore();
    }, [complianceErrors.length, complianceWarnings.length, calculateComplianceScore]);

    // Determine color and label based on score
    const getScoreColor = (score) => {
        if (score >= 80) return { bg: 'from-green-500 to-emerald-500', text: 'text-green-400', ring: 'ring-green-500/30' };
        if (score >= 50) return { bg: 'from-yellow-500 to-amber-500', text: 'text-yellow-400', ring: 'ring-yellow-500/30' };
        return { bg: 'from-red-500 to-rose-500', text: 'text-red-400', ring: 'ring-red-500/30' };
    };

    const getScoreLabel = (score) => {
        if (score >= 90) return { label: 'Excellent!', emoji: '🎉' };
        if (score >= 80) return { label: 'Compliant', emoji: '✅' };
        if (score >= 60) return { label: 'Almost There', emoji: '⚡' };
        if (score >= 40) return { label: 'Needs Work', emoji: '⚠️' };
        return { label: 'Critical Issues', emoji: '🚨' };
    };

    const colors = getScoreColor(complianceScore);
    const { label, emoji } = getScoreLabel(complianceScore);

    // Compact mode for toolbar
    if (compact) {
        return (
            <div 
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--surface-overlay)] ring-1 ${colors.ring} cursor-pointer hover:bg-[var(--surface-elevated)] transition-all`}
                onClick={() => runFullCompliance()}
                title={`Compliance Score: ${complianceScore}/100 - ${label}`}
            >
                <div className={`w-5 h-5 rounded-full bg-gradient-to-r ${colors.bg} flex items-center justify-center`}>
                    <span className="text-[10px] font-bold text-white">{complianceScore}</span>
                </div>
                <span className={`text-xs font-medium ${colors.text}`}>{emoji}</span>
            </div>
        );
    }

    // Full display mode
    return (
        <div className="p-4 rounded-xl bg-[var(--surface-overlay)] border border-[var(--border-subtle)]">
            {/* Score Circle */}
            <div className="flex items-center gap-4 mb-4">
                <div className={`relative w-16 h-16 rounded-full ring-4 ${colors.ring} bg-gradient-to-br ${colors.bg} flex items-center justify-center shadow-lg`}>
                    <span className="text-2xl font-bold text-white">{complianceScore}</span>
                    {/* Progress ring (decorative) */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle
                            cx="50" cy="50" r="45"
                            fill="none"
                            stroke="rgba(255,255,255,0.2)"
                            strokeWidth="6"
                        />
                        <circle
                            cx="50" cy="50" r="45"
                            fill="none"
                            stroke="rgba(255,255,255,0.8)"
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={`${complianceScore * 2.83} 283`}
                            className="transition-all duration-500"
                        />
                    </svg>
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">{emoji}</span>
                        <span className={`font-bold text-lg ${colors.text}`}>{label}</span>
                    </div>
                    <p className="text-xs text-muted mt-1">
                        {complianceErrors.length === 0 && complianceWarnings.length === 0 
                            ? 'Your creative meets all guidelines'
                            : `${complianceErrors.length} error${complianceErrors.length !== 1 ? 's' : ''}, ${complianceWarnings.length} warning${complianceWarnings.length !== 1 ? 's' : ''}`
                        }
                    </p>
                </div>
            </div>

            {/* Quick Actions */}
            <button
                onClick={() => runFullCompliance()}
                className="w-full py-2 rounded-lg bg-[var(--surface-dark)] hover:bg-[var(--surface-elevated)] border border-[var(--border-default)] text-sm font-medium transition-all flex items-center justify-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Re-check Compliance
            </button>

            {/* Score Breakdown */}
            {(complianceErrors.length > 0 || complianceWarnings.length > 0) && (
                <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                    <p className="text-xs text-muted mb-2">Score breakdown:</p>
                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                            <span className="text-secondary">Base score</span>
                            <span className="text-primary">100</span>
                        </div>
                        {complianceErrors.length > 0 && (
                            <div className="flex justify-between text-red-400">
                                <span>{complianceErrors.length} errors × -15</span>
                                <span>-{complianceErrors.length * 15}</span>
                            </div>
                        )}
                        {complianceWarnings.length > 0 && (
                            <div className="flex justify-between text-yellow-400">
                                <span>{complianceWarnings.length} warnings × -5</span>
                                <span>-{complianceWarnings.length * 5}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold border-t border-[var(--border-subtle)] pt-1 mt-1">
                            <span className={colors.text}>Final Score</span>
                            <span className={colors.text}>{complianceScore}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ComplianceScore;
