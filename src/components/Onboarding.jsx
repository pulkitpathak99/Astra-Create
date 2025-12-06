import React, { useState } from 'react';
import useStore, { FORMAT_PRESETS } from '../store/useStore';

export function Onboarding({ onClose }) {
  const [step, setStep] = useState(0);
  const { setCurrentFormat } = useStore();

  const steps = [
    {
      title: 'Welcome to AstraCreate',
      subtitle: 'AI-powered creative builder for Tesco campaigns',
      content: (
        <div className="space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <span className="text-white text-4xl font-bold">A</span>
          </div>
          <p className="text-secondary text-center">
            Create compliant, on-brand social media creatives in minutes.
            Built-in compliance checks ensure your content meets all Tesco guidelines.
          </p>
        </div>
      ),
    },
    {
      title: 'Choose Your Format',
      subtitle: 'Select the platform you\'re designing for',
      content: (
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(FORMAT_PRESETS).map(([key, format]) => (
            <button
              key={key}
              onClick={() => setCurrentFormat(key)}
              className="card text-left hover:border-[var(--accent-primary)] transition-all"
            >
              <div
                className="w-full aspect-video mb-2 rounded bg-[var(--surface-dark)] flex items-center justify-center"
                style={{
                  aspectRatio: format.ratio === '1:1' ? '1' : format.ratio === '9:16' ? '9/16' : '1.91',
                  maxHeight: '60px',
                }}
              >
                <span className="text-[10px] text-muted">{format.ratio}</span>
              </div>
              <p className="text-xs font-medium text-primary">{format.name}</p>
              <p className="text-[10px] text-muted">{format.width} × {format.height}</p>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: 'Quick Tips',
      subtitle: 'Get started faster',
      content: (
        <div className="space-y-3">
          {[
            { icon: '📷', title: 'Upload Packshots', desc: 'Max 3 product images' },
            { icon: '🏷️', title: 'Add Value Tiles', desc: 'NEW, White, or Clubcard' },
            { icon: '✍️', title: 'Add Text', desc: 'Headline and subheading required' },
            { icon: '✅', title: 'Check Compliance', desc: 'Real-time Appendix B validation' },
            { icon: '📦', title: 'Export All', desc: 'Multi-format campaign export' },
          ].map((tip, i) => (
            <div key={i} className="card flex items-center gap-3">
              <span className="text-xl">{tip.icon}</span>
              <div>
                <p className="text-xs font-medium text-primary">{tip.title}</p>
                <p className="text-[10px] text-muted">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const currentStep = steps[step];

  return (
    <div className="modal-overlay">
      <div className="modal max-w-md">
        <div className="modal-header text-center">
          <h2 className="text-xl font-bold text-primary">{currentStep.title}</h2>
          <p className="text-sm text-secondary mt-1">{currentStep.subtitle}</p>
        </div>

        <div className="modal-body">
          {currentStep.content}
        </div>

        <div className="modal-footer">
          {/* Progress dots */}
          <div className="flex gap-1.5 flex-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-[var(--accent-primary)]' : 'w-1.5 bg-[var(--surface-overlay)]'
                  }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="btn btn-ghost">
                Back
              </button>
            )}
            {step < steps.length - 1 ? (
              <button onClick={() => setStep(step + 1)} className="btn btn-primary">
                Next
              </button>
            ) : (
              <button onClick={onClose} className="btn btn-tesco">
                Get Started
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Onboarding;
