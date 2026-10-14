import React from 'react';
import { RiskCalculation, MultiVesselAssessment, VesselMetrics } from '../types/cardiac';
import {
  ShieldAlert,
  Heart,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  TrendingDown,
  ChevronRight,
  Gauge,
  CheckCircle,
} from 'lucide-react';

interface RiskAnalysisResultsProps {
  risk: RiskCalculation;
  assessment: MultiVesselAssessment;
  activeVessel: string | null;
  onSelectVessel: (vesselId: 'LMCA' | 'LAD' | 'LCx' | 'RCA') => void;
  onRequestDeepReasoningForVessel?: (vesselId: 'LMCA' | 'LAD' | 'LCx' | 'RCA') => void;
}

export const RiskAnalysisResults: React.FC<RiskAnalysisResultsProps> = ({
  risk,
  assessment,
  activeVessel,
  onSelectVessel,
  onRequestDeepReasoningForVessel,
}) => {
  const vessels: VesselMetrics[] = [
    assessment.LAD,
    assessment.RCA,
    assessment.LCx,
    assessment.LMCA,
  ];

  const getRiskColor = (cat: string) => {
    switch (cat) {
      case 'high':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'intermediate':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'borderline':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      default:
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    }
  };

  const getPlaqueBadge = (type: VesselMetrics['plaqueType']) => {
    switch (type) {
      case 'mixed_vulnerable':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-500/40">Mixed Vulnerable</span>;
      case 'calcified':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-200 border border-slate-600">Calcified (Dense)</span>;
      case 'soft_lipid':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-500/40">Soft Lipid-Rich</span>;
      case 'fibrous':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-950 text-sky-300 border border-sky-500/40">Fibrous Stable</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 text-slate-400">Minimal Plaque</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 text-slate-200 overflow-hidden">
      {/* Risk Summary Header */}
      <div className="p-4 bg-slate-950/70 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-slate-400">
            <Gauge size={14} className="text-sky-400" />
            <span>ACC/AHA ASCVD Risk</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono uppercase font-semibold border ${getRiskColor(risk.riskCategory)}`}>
            {risk.riskCategory} Risk
          </span>
        </div>

        {/* Primary 10-Year Score Metric */}
        <div className="flex items-baseline justify-between mt-1">
          <div>
            <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
              {risk.tenYearRisk}%
            </div>
            <div className="text-[11px] text-slate-400 font-sans mt-0.5">
              10-Year Primary Hard ASCVD Risk (PCE)
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold font-mono text-rose-400">
              {risk.heartAge} yrs
            </div>
            <div className="text-[10px] text-slate-400 font-sans">
              Estimated Heart Age
            </div>
          </div>
        </div>

        {/* Progress Bar for Risk */}
        <div className="mt-3 relative h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              risk.riskCategory === 'high'
                ? 'bg-rose-500'
                : risk.riskCategory === 'intermediate'
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(risk.tenYearRisk * 2.5, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
          <span>0%</span>
          <span>5% Low</span>
          <span>7.5% Borderline</span>
          <span>20% High</span>
          <span>40%+</span>
        </div>
      </div>

      {/* Per-Vessel Coronary Risk Cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Coronary Artery Mapping:
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            SYNTAX Est: <strong className="text-slate-200">{assessment.syntaxScoreEstimate}</strong>
          </span>
        </div>

        {vessels.map((v) => {
          const isSelected = activeVessel === v.id;
          const isIschemic = v.estimatedFFR <= 0.80 || v.stenosis >= 70;

          return (
            <div
              key={v.id}
              onClick={() => onSelectVessel(v.id)}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                isSelected
                  ? 'bg-slate-800/90 border-sky-400 shadow-md ring-1 ring-sky-400/30'
                  : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              {/* Card Title & Stenosis */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-100 font-mono">{v.id}</span>
                    <span className="text-xs text-slate-300 font-sans truncate">{v.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                    {v.anatomicalLocation}
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-base font-extrabold font-mono ${
                    v.stenosis >= 70 ? 'text-rose-400' : v.stenosis >= 50 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {v.stenosis}%
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono uppercase">Stenosis</div>
                </div>
              </div>

              {/* Stenosis Bar */}
              <div className="mt-2.5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    v.stenosis >= 70
                      ? 'bg-rose-500'
                      : v.stenosis >= 50
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${v.stenosis}%` }}
                />
              </div>

              {/* Biomarkers / Hemodynamics Breakdown */}
              <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px] font-mono border-t border-slate-800/80 pt-2">
                <div>
                  <span className="text-slate-400 text-[10px]">Est. FFR: </span>
                  <span className={`font-semibold ${v.estimatedFFR <= 0.8 ? 'text-rose-400' : 'text-slate-200'}`}>
                    {v.estimatedFFR} {v.estimatedFFR <= 0.8 && '(!)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Flow Velocity: </span>
                  <span className="text-slate-300">{v.flowVelocityCmS} cm/s</span>
                </div>
              </div>

              {/* Plaque Type & Territory */}
              <div className="mt-2 flex items-center justify-between">
                <div>{getPlaqueBadge(v.plaqueType)}</div>
                <div className="text-[10px] text-slate-400 text-right truncate max-w-[150px]">
                  {v.myocardialTerritory.split(',')[0]}
                </div>
              </div>

              {/* Guideline recommendation snippet */}
              <div className="mt-2 p-1.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-sans leading-tight">
                {v.guidelineAction}
              </div>

              {/* Action Buttons */}
              <div className="mt-2 flex items-center justify-between pt-1">
                <span className="text-[10px] text-sky-400 font-mono">
                  {isSelected ? '✓ 3D Focused' : 'Click to inspect in 3D'}
                </span>
                {onRequestDeepReasoningForVessel && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestDeepReasoningForVessel(v.id);
                    }}
                    className="text-[10px] font-mono text-purple-400 hover:text-purple-300 flex items-center gap-0.5"
                  >
                    <span>High-Thinking Consult</span>
                    <ChevronRight size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
