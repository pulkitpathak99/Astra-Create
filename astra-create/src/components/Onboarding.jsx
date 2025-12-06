import { useState } from 'react';
import useStore, { FORMAT_PRESETS } from '../store/useStore';

const ONBOARDING_STEPS = [
  {
    title: 'Welcome to AstraCreate',
    subtitle: 'AI-Powered Retail Media Creative Builder',
    icon: '✦',
    content: 'Create stunning, compliant advertising creatives in minutes. Our AI helps you every step of the way.',
    visual: 'welcome',
  },
  {
    title: 'Upload Your Assets',
    subtitle: 'Packshots, backgrounds, logos',
    icon: '📷',
    content: 'Import your product images and brand assets. The AI can suggest optimal compositions based on what you upload.',
    visual: 'upload',
  },
  {
    title: 'Add Copy with AI',
    subtitle: 'Smart, compliant messaging',
    icon: '✍️',
    content: 'Generate headlines and taglines that are automatically checked for compliance. No more guessing what\'s allowed.',
    visual: 'copy',
  },
  {
    title: 'Real-Time Compliance',
    subtitle: 'Guardrails that guide, not block',
    icon: '✅',
    content: 'Our AI understands retail media guidelines and helps you stay compliant. Issues are explained with suggestions to fix.',
    visual: 'compliance',
  },
  {
    title: 'Export Everywhere',
    subtitle: 'One click, all formats',
    icon: '🚀',
    content: 'Generate campaign-ready creative sets for Instagram, Facebook, and more. All optimized and under 500KB.',
    visual: 'export',
  },
];

export function Onboarding({ onClose }) {
  const [step, setStep] = useState(0);
  const { setCurrentFormat } = useStore();
  const [selectedFormat, setSelectedFormat] = useState('instagram-feed');

  const handleNext = () => {
    if (step < ONBOARDING_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      setCurrentFormat(selectedFormat);
      onClose();
    }
  };

  const handleSkip = () => {
    setCurrentFormat(selectedFormat);
    onClose();
  };

  const currentStep = ONBOARDING_STEPS[step];
  const isLastStep = step === ONBOARDING_STEPS.length - 1;

  // Visual illustrations for each step
  const renderVisual = () => {
    switch (currentStep.visual) {
      case 'welcome':
        return (
          <div className="relative w-48 h-48 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-blue-600/30 rounded-2xl animate-pulse" />
            <div className="absolute inset-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center">
              <span className="text-6xl">✦</span>
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
              AI
            </div>
          </div>
        );
      case 'upload':
        return (
          <div className="flex justify-center gap-4">
            {['📷', '🖼️', '🏷️'].map((emoji, i) => (
              <div
                key={i}
                className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center text-2xl border border-white/20"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {emoji}
              </div>
            ))}
          </div>
        );
      case 'copy':
        return (
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-purple-400">✨</span>
              <span className="text-xs text-white/50">AI Generated</span>
            </div>
            <p className="text-white font-bold text-lg">Fresh Deals Daily</p>
            <p className="text-white/60 text-sm">Quality you can trust</p>
          </div>
        );
      case 'compliance':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-green-500/20 rounded-lg">
              <span>✅</span>
              <span className="text-sm text-green-300">Text compliant</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-green-500/20 rounded-lg">
              <span>✅</span>
              <span className="text-sm text-green-300">Pricing in Value Tile</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-yellow-500/20 rounded-lg">
              <span>⚠️</span>
              <span className="text-sm text-yellow-300">Consider safe zones</span>
            </div>
          </div>
        );
      case 'export':
        return (
          <div className="grid grid-cols-2 gap-2">
            {['IG Feed', 'IG Story', 'FB Feed', 'FB Story'].map((fmt, i) => (
              <div key={i} className="p-2 bg-white/5 rounded-lg text-center border border-white/10">
                <span className="text-xs text-white/60">{fmt}</span>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-white/10">
        {/* Visual Area */}
        <div className="h-56 bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-gray-900 flex items-center justify-center p-6">
          {renderVisual()}
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">{currentStep.title}</h2>
            <p className="text-sm text-purple-300">{currentStep.subtitle}</p>
            <p className="text-white/60 mt-4 text-sm leading-relaxed">{currentStep.content}</p>
          </div>

          {/* Format selector on last step */}
          {isLastStep && (
            <div className="mb-6">
              <p className="text-xs text-white/50 text-center mb-3">Start with:</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(FORMAT_PRESETS).slice(0, 4).map(([key, fmt]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedFormat(key)}
                    className={`p-3 rounded-xl border text-left transition-all ${selectedFormat === key
                        ? 'bg-purple-500/20 border-purple-500 text-white'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                      }`}
                  >
                    <div className="text-sm font-medium">{fmt.name}</div>
                    <div className="text-xs text-white/40">{fmt.ratio}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {ONBOARDING_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-2 rounded-full transition-all ${i === step ? 'bg-purple-500 w-8' : 'bg-white/20 w-2 hover:bg-white/30'
                  }`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 px-4 py-3 text-white/60 hover:text-white transition-colors rounded-xl hover:bg-white/5"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-purple-500/20"
            >
              {isLastStep ? 'Get Started →' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Onboarding;
