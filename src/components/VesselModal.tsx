import React from 'react';
import { VesselMetrics } from '../types/cardiac';
import {
  X,
  Activity,
  AlertTriangle,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface VesselModalProps {
  vessel: VesselMetrics | null;
  onClose: () => void;
  onLaunchHighThinking: (vesselId: 'LMCA' | 'LAD' | 'LCx' | 'RCA') => void;
}

export const VesselModal: React.FC<VesselModalProps> = ({
  vessel,
  onClose,
  onLaunchHighThinking,
}) => {
  if (!vessel) return null;

  const isCritical = vessel.stenosis >= 70 || vessel.estimatedFFR <= 0.8;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-slate-200 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-500/40 font-bold">
                {vessel.id}
              </span>
              <h3 className="text-base font-bold text-white">{vessel.name}</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-sans">{vessel.anatomicalLocation}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Anatomical Lumen Cross-Section Diagram */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-6">
          <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
            {/* Outer Vessel Wall */}
            <div className="w-28 h-28 rounded-full border-4 border-rose-800/80 bg-rose-950/40 relative overflow-hidden flex items-center justify-center">
              {/* Atheroma Plaque Layer */}
              <div
                className="absolute inset-2 rounded-full border-4"
                style={{
                  borderColor:
                    vessel.plaqueType === 'calcified'
                      ? '#cbd5e1'
                      : vessel.plaqueType === 'mixed_vulnerable'
                      ? '#e11d48'
                      : '#f59e0b',
                  backgroundColor:
                    vessel.plaqueType === 'calcified'
                      ? 'rgba(203, 213, 225, 0.4)'
                      : vessel.plaqueType === 'mixed_vulnerable'
                      ? 'rgba(225, 29, 72, 0.4)'
                      : 'rgba(245, 158, 11, 0.35)',
                }}
              />
              {/* Residual Patent Lumen (Scaled by stenosis) */}
              <div
                className="rounded-full bg-rose-600 shadow-inner flex items-center justify-center text-[10px] font-mono text-white font-bold transition-all"
                style={{
                  width: `${Math.max(18, 90 - vessel.stenosis * 0.75)}%`,
                  height: `${Math.max(18, 90 - vessel.stenosis * 0.75)}%`,
                }}
              >
                {100 - vessel.stenosis}%
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Lumen Stenosis:</span>
              <span className={`font-bold ${isCritical ? 'text-rose-400' : 'text-slate-100'}`}>
                {vessel.stenosis}% Area Reduction
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Estimated FFR:</span>
              <span className={`font-bold ${vessel.estimatedFFR <= 0.8 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {vessel.estimatedFFR} {vessel.estimatedFFR <= 0.8 ? '(Ischemia ≤0.80)' : '(Preserved)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Orifice Flow Velocity:</span>
              <span className="text-slate-200">{vessel.flowVelocityCmS} cm/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Plaque Morphology:</span>
              <span className="text-amber-300 font-sans capitalize">{vessel.plaqueType.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        {/* Territory & Severity */}
        <div className="grid grid-cols-2 gap-3 text-xs font-sans">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1">
              Perfusion Territory:
            </span>
            <div className="font-semibold text-slate-200">{vessel.myocardialTerritory}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1">
              Ischemia Classification:
            </span>
            <div className={`font-semibold capitalize ${isCritical ? 'text-rose-400' : 'text-emerald-400'}`}>
              {vessel.ischemiaSeverity} Ischemic Burden
            </div>
          </div>
        </div>

        {/* Clinical Guideline Action */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-semibold flex items-center gap-1.5">
            <ShieldCheck size={13} />
            <span>Recommended Clinical Pathway</span>
          </div>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            {vessel.guidelineAction}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            Close Inspector
          </button>

          <button
            onClick={() => {
              onLaunchHighThinking(vessel.id);
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition"
          >
            <Sparkles size={13} />
            <span>Consult Gemini 4 High-Thinking on {vessel.id}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
