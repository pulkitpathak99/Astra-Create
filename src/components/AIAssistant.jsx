import { useState, useCallback } from 'react';
import { IText } from 'fabric';
import useStore, { FORMAT_PRESETS } from '../store/useStore';
import geminiService from '../services/geminiService';

export function AIAssistant() {
  const { 
    canvas, saveToHistory, updateLayers, currentFormat,
    complianceErrors, complianceWarnings 
  } = useStore();
  
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [productName, setProductName] = useState('');
  const [tone, setTone] = useState('friendly');
  const [error, setError] = useState(null);

  const hasApiKey = geminiService.hasApiKey();

  // Generate copy suggestions
  const handleGenerateCopy = useCallback(async () => {
    if (!productName.trim()) {
      setError('Enter a product name');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await geminiService.generateCopySuggestions({
        productName,
        tone,
        format: currentFormat,
      });
      
      if (result.suggestions) {
        setSuggestions(result.suggestions);
      } else if (result.rawText) {
        setError('Got response but could not parse suggestions');
      } else {
        setError('No suggestions generated');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [productName, tone, currentFormat]);

  // Apply suggestion to canvas
  const applySuggestion = useCallback((suggestion) => {
    if (!canvas) return;
    
    const format = FORMAT_PRESETS[currentFormat];
    
    // Add headline
    const headline = new IText(suggestion.headline, {
      left: format.width / 2,
      top: format.height * 0.35,
      originX: 'center',
      originY: 'center',
      fontFamily: 'Inter, sans-serif',
      fontSize: 72,
      fontWeight: 'bold',
      fill: '#000000',
      textAlign: 'center',
      customName: 'AI Headline',
    });
    
    // Add subheadline if exists
    if (suggestion.subheadline) {
      const subheadline = new IText(suggestion.subheadline, {
        left: format.width / 2,
        top: format.height * 0.48,
        originX: 'center',
        originY: 'center',
        fontFamily: 'Inter, sans-serif',
        fontSize: 40,
        fill: '#333333',
        textAlign: 'center',
        customName: 'AI Subheadline',
      });
      canvas.add(subheadline);
    }
    
    canvas.add(headline);
    canvas.renderAll();
    saveToHistory();
    updateLayers();
    setSuggestions([]);
  }, [canvas, currentFormat, saveToHistory, updateLayers]);

  // Quick auto-arrange
  const handleAutoArrange = useCallback(() => {
    if (!canvas) return;
    
    const format = FORMAT_PRESETS[currentFormat];
    const objects = canvas.getObjects().filter(o => !o.isSafeZone && !o.isBackground);
    
    // Simple center arrangement
    let yOffset = format.height * 0.25;
    const spacing = format.height * 0.12;
    
    objects.forEach((obj, i) => {
      obj.set({
        left: format.width / 2,
        originX: 'center',
        top: yOffset,
        originY: 'center',
      });
      yOffset += spacing + (obj.height || 50) * (obj.scaleY || 1) * 0.5;
    });
    
    canvas.renderAll();
    saveToHistory();
  }, [canvas, currentFormat, saveToHistory]);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full shadow-lg flex items-center justify-center text-xl hover:scale-110 transition-transform z-50"
        title="AI Assistant"
      >
        ✨
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 w-80 bg-gray-900 rounded-xl shadow-2xl border border-white/10 overflow-hidden z-50">
      {/* Header */}
      <div className="p-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <span className="font-medium text-white text-sm">AI Assistant</span>
          {hasApiKey && <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>}
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white text-sm"
        >
          ✕
        </button>
      </div>

      {/* API Key Input (if needed) */}
      {!hasApiKey && (
        <div className="p-3 bg-yellow-500/10 border-b border-yellow-500/20">
          <p className="text-[11px] text-yellow-300 mb-2">Enter Gemini API key to enable</p>
          <input
            type="password"
            placeholder="API key"
            className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-xs text-white"
            onBlur={(e) => {
              if (e.target.value) {
                geminiService.setApiKey(e.target.value);
                window.location.reload();
              }
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="p-3 space-y-3 max-h-72 overflow-y-auto">
        {error && (
          <div className="p-2 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Product Input */}
        <div>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Product name (e.g., Coca-Cola Zero)"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30"
          />
        </div>

        {/* Tone selector */}
        <div className="flex gap-1.5">
          {['friendly', 'bold', 'minimal'].map(t => (
            <button
              key={t}
              onClick={() => setTone(t)}
              className={`flex-1 py-1.5 text-xs rounded capitalize ${
                tone === t 
                  ? 'bg-purple-500/30 border border-purple-500/50 text-white' 
                  : 'bg-white/5 border border-white/10 text-white/50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerateCopy}
          disabled={loading || !hasApiKey}
          className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-all"
        >
          {loading ? '⏳ Generating...' : '✨ Generate Copy'}
        </button>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] text-white/40">Click to add:</p>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => applySuggestion(s)}
                className="w-full text-left p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
              >
                <p className="font-semibold text-white text-sm">{s.headline}</p>
                {s.subheadline && (
                  <p className="text-xs text-white/60 mt-0.5">{s.subheadline}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-2 border-t border-white/10 flex gap-2">
        <button 
          onClick={handleAutoArrange}
          className="flex-1 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-white/70 rounded transition-colors"
          title="Center and arrange all elements"
        >
          📐 Auto-arrange
        </button>
        <button 
          onClick={() => {
            if (canvas) {
              const activeObj = canvas.getActiveObject();
              if (activeObj) {
                const format = FORMAT_PRESETS[currentFormat];
                activeObj.set({
                  left: format.width / 2,
                  top: format.height / 2,
                  originX: 'center',
                  originY: 'center',
                });
                canvas.renderAll();
                saveToHistory();
              }
            }
          }}
          className="flex-1 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-white/70 rounded transition-colors"
          title="Center selected element"
        >
          ⊙ Center
        </button>
      </div>
    </div>
  );
}

export default AIAssistant;
