/**
 * AIWebcamOverlay.tsx
 *
 * Small picture-in-picture webcam feed rendered inside the Stage panel
 * when AI vision is active during Scratch simulation.
 * Shows the current prediction label and confidence.
 */
import { useEffect, useRef } from 'react';
import { useAIStore } from '../../stores/ai.store';
import { aiEngine } from '../../lib/ai-engine';
import { Brain, Camera } from 'lucide-react';

export function AIWebcamOverlay() {
  const { isPredicting, currentPrediction, confidences, isWebcamActive } = useAIStore();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isWebcamActive && videoRef.current) {
      videoRef.current.srcObject = aiEngine.stream;
    } else if (!isWebcamActive && videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [isWebcamActive]);

  if (!isWebcamActive) return null;

  const topEntries = Object.entries(confidences)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className="absolute top-2 right-2 z-30 w-[160px] rounded-lg bg-black/80 backdrop-blur-sm border border-white/10 overflow-hidden shadow-lg flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-[#FF6F61]/20 border-b border-white/10 shrink-0">
        <Camera size={10} className="text-[#FF6F61]" />
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#FF6F61]">
          Camera Feed
        </span>
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      {/* Video Feed */}
      <div className="w-full bg-black relative shrink-0 aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform -scale-x-100"
        />
      </div>

      {/* Prediction (Only if Custom AI Vision is ON) */}
      {isPredicting && (
        <div className="p-2 space-y-1 shrink-0 border-t border-white/10">
          {currentPrediction ? (
            <>
              <div className="text-white text-xs font-bold truncate flex items-center gap-1">
                <Brain size={10} className="text-[#FF6F61]" />
                {currentPrediction}
              </div>
              {topEntries.map(([label, conf]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${conf}%`,
                        backgroundColor:
                          label === currentPrediction ? '#FF6F61' : 'rgba(255,255,255,0.25)',
                      }}
                    />
                  </div>
                  <span className="text-[8px] text-white/50 font-mono w-6 text-right">{conf}%</span>
                </div>
              ))}
            </>
          ) : (
            <div className="text-white/40 text-[9px] text-center py-1">Analyzing...</div>
          )}
        </div>
      )}
    </div>
  );
}
