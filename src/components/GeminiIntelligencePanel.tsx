import React, { useState } from 'react';
import { PatientProfile, RiskCalculation, MultiVesselAssessment } from '../types/cardiac';
import {
  Brain,
  Search,
  Sparkles,
  Loader2,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Send,
} from 'lucide-react';

interface GeminiIntelligencePanelProps {
  patient: PatientProfile;
  risk: RiskCalculation;
  assessment: MultiVesselAssessment;
  selectedVessel: string | null;
}

export const GeminiIntelligencePanel: React.FC<GeminiIntelligencePanelProps> = ({
  patient,
  risk,
  assessment,
  selectedVessel,
}) => {
  const [activeTab, setActiveTab] = useState<'deep_thinking' | 'search_grounding' | 'quick_insights'>('deep_thinking');

  // Deep Reasoning state (gemini-4-argon with ThinkingLevel.HIGH)
  const [deepReport, setDeepReport] = useState<string | null>(null);
  const [isLoadingDeep, setIsLoadingDeep] = useState(false);
  const [deepError, setDeepError] = useState<string | null>(null);

  // Search Grounding state (gemini-3.8-flash with googleSearch)
  const [searchQuery, setSearchQuery] = useState('2024 ACC/AHA guideline coronary calcium score statin therapy');
  const [searchAnswer, setSearchAnswer] = useState<string | null>(null);
  const [groundingSources, setGroundingSources] = useState<any[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Quick Insights state (gemini-3.1-flash-lite)
  const [quickResult, setQuickResult] = useState<any | null>(null);
  const [isLoadingQuick, setIsLoadingQuick] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  // Trigger Deep Clinical Reasoning with gemini-4-argon (ThinkingLevel.HIGH)
  const runDeepReasoning = async (focusVesselOverride?: string) => {
    setIsLoadingDeep(true);
    setDeepError(null);
    try {
      const res = await fetch('/api/ai/deep-reasoning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient,
          riskScore: risk,
          cadProbabilities: {
            lad: assessment.LAD.stenosis,
            lcx: assessment.LCx.stenosis,
            rca: assessment.RCA.stenosis,
            lmca: assessment.LMCA.stenosis,
          },
          vesselDetails: assessment,
          focusVessel: focusVesselOverride || selectedVessel,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete clinical reasoning');
      setDeepReport(data.report);
    } catch (err: any) {
      setDeepError(err.message || 'Error executing high-thinking reasoning');
    } finally {
      setIsLoadingDeep(false);
    }
  };

  // Trigger Search Grounding with gemini-3.8-flash (googleSearch)
  const runSearchGrounding = async (queryToRun?: string) => {
    const q = queryToRun || searchQuery;
    setIsLoadingSearch(true);
    setSearchError(null);
    try {
      const res = await fetch('/api/ai/search-grounded', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          clinicalContext: `Patient Age ${patient.age}, ${patient.gender}, 10-Yr ASCVD ${risk.tenYearRisk}%, CAC ${patient.cacScore}, LAD Stenosis ${assessment.LAD.stenosis}%, LDL ${patient.ldl} mg/dL, Lp(a) ${patient.lipoproteinA} nmol/L.`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to run search grounding');
      setSearchAnswer(data.answer);
      setGroundingSources(data.groundingChunks || []);
    } catch (err: any) {
      setSearchError(err.message || 'Error querying search grounding');
    } finally {
      setIsLoadingSearch(false);
    }
  };

  // Trigger Quick Insights with gemini-3.1-flash-lite
  const runQuickInsights = async () => {
    setIsLoadingQuick(true);
    setQuickError(null);
    try {
      const res = await fetch('/api/ai/quick-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient,
          riskScore: risk,
          cadProbabilities: {
            lad: assessment.LAD.stenosis,
            lcx: assessment.LCx.stenosis,
            rca: assessment.RCA.stenosis,
            lmca: assessment.LMCA.stenosis,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate quick insights');
      setQuickResult(data.result);
    } catch (err: any) {
      setQuickError(err.message || 'Error generating quick insights');
    } finally {
      setIsLoadingQuick(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 text-slate-200 overflow-hidden">
      {/* Intelligence Header */}
      <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="text-purple-400" size={16} />
          <div>
            <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
              <span>Cardio Clinical Intelligence</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-950 text-purple-300 border border-purple-500/40">
                Gemini Models
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-sans">
              Thinking, Search Grounding & Fast Insights
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900 text-xs font-medium">
        <button
          onClick={() => setActiveTab('deep_thinking')}
          className={`flex-1 py-2 px-2.5 flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === 'deep_thinking'
              ? 'border-purple-500 text-purple-400 bg-purple-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Brain size={12} />
          <span>High Thinking (Argon)</span>
        </button>

        <button
          onClick={() => setActiveTab('search_grounding')}
          className={`flex-1 py-2 px-2.5 flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === 'search_grounding'
              ? 'border-sky-500 text-sky-400 bg-sky-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search size={12} />
          <span>Search Grounding</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('quick_insights');
            if (!quickResult && !isLoadingQuick) runQuickInsights();
          }}
          className={`flex-1 py-2 px-2.5 flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === 'quick_insights'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles size={12} />
          <span>Fast Insights</span>
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: High Thinking Deep Clinical Reasoning (gemini-4-argon with ThinkingLevel.HIGH) */}
        {activeTab === 'deep_thinking' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs">
              <div className="flex items-center justify-between font-semibold text-purple-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <Brain size={14} />
                  <span>High-Thinking Cardiometabolic Deliberation</span>
                </span>
                <span className="text-[10px] font-mono text-purple-400">gemini-4-argon (ThinkingLevel.HIGH)</span>
              </div>
              <p className="text-slate-300 font-sans text-[11px] leading-relaxed">
                Executes multi-step clinical differential reasoning evaluating plaque morphology, microcalcifications, FFR ischemia territories, and Revascularization vs Medical Therapy criteria (ISCHEMIA/COURAGE).
              </p>

              {selectedVessel && (
                <div className="mt-2 text-[11px] text-amber-300 font-mono">
                  Current 3D Target Selected: <strong>{selectedVessel} ({assessment[selectedVessel as 'LAD' | 'LMCA' | 'LCx' | 'RCA']?.name})</strong>
                </div>
              )}

              <button
                onClick={() => runDeepReasoning()}
                disabled={isLoadingDeep}
                className="mt-3 w-full py-2 px-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
              >
                {isLoadingDeep ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Executing High-Thinking Clinical Deliberation...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Run Deep Clinical Consultation</span>
                  </>
                )}
              </button>
            </div>

            {deepError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold">Reasoning Encountered an Issue:</div>
                  <div className="text-[11px] text-rose-200/90 mt-0.5">{deepError}</div>
                </div>
              </div>
            )}

            {deepReport && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 space-y-3 font-sans leading-relaxed">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-semibold text-purple-400 font-mono text-[11px]">
                    Consultant Cardiology Assessment Report
                  </span>
                  <span className="text-[10px] text-slate-500">ACC/AHA/ESC Synthesis</span>
                </div>
                <div className="whitespace-pre-line text-slate-300 font-sans text-xs">
                  {deepReport}
                </div>
              </div>
            )}

            {!deepReport && !isLoadingDeep && (
              <div className="text-center py-6 text-slate-500 text-xs">
                Click &quot;Run Deep Clinical Consultation&quot; to synthesize multi-vessel CAD risk and personalized intervention roadmap.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Search Grounding (gemini-3.8-flash with googleSearch) */}
        {activeTab === 'search_grounding' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-500/30 text-xs">
              <div className="flex items-center justify-between font-semibold text-sky-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <Search size={14} />
                  <span>Google Search Grounded Guidelines</span>
                </span>
                <span className="text-[10px] font-mono text-sky-400">gemini-3.8-flash (Search Tool)</span>
              </div>
              <p className="text-slate-300 font-sans text-[11px]">
                Grounds inquiries in up-to-date peer-reviewed literature, ACC/AHA guidelines, and recent clinical trials (CLEAR Outcomes, SELECT, REDUCE-IT).
              </p>

              {/* Preset Query Chips */}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {[
                  '2024 ACC/AHA coronary calcium score indications',
                  'PCSK9 inhibitor indications in high CAC',
                  'ISCHEMIA trial revascularization vs OMT',
                  'ApoB and Lp(a) risk-enhancing thresholds',
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setSearchQuery(q);
                      runSearchGrounding(q);
                    }}
                    className="text-[10px] font-mono px-2 py-1 rounded bg-slate-800 text-sky-300 hover:bg-slate-700 border border-slate-700/60 transition truncate max-w-full"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Search Input */}
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ask any cardiovascular guideline or trial query..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') runSearchGrounding();
                  }}
                />
                <button
                  onClick={() => runSearchGrounding()}
                  disabled={isLoadingSearch}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs flex items-center gap-1 transition disabled:opacity-50"
                >
                  {isLoadingSearch ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                </button>
              </div>
            </div>

            {searchError && (
              <div className="p-3 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
                {searchError}
              </div>
            )}

            {searchAnswer && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 space-y-3">
                <div className="font-semibold text-sky-400 font-mono text-[11px] border-b border-slate-800 pb-1.5">
                  Search-Grounded Synthesis
                </div>
                <div className="whitespace-pre-line font-sans text-xs text-slate-300 leading-relaxed">
                  {searchAnswer}
                </div>

                {groundingSources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-800">
                    <div className="text-[10px] font-mono uppercase text-slate-400 mb-1.5">
                      Grounding Citations & Sources:
                    </div>
                    <div className="space-y-1">
                      {groundingSources.slice(0, 4).map((source, idx) => (
                        <div key={idx} className="text-[10px] text-sky-400/90 truncate flex items-center gap-1">
                          <ExternalLink size={10} />
                          <span>{source.web?.title || source.web?.uri || 'Grounded Web Source'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Quick Insights (gemini-3.1-flash-lite) */}
        {activeTab === 'quick_insights' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-400 font-mono flex items-center gap-1.5">
                <Sparkles size={13} />
                <span>Rapid Clinical Snapshot</span>
              </span>
              <button
                onClick={runQuickInsights}
                disabled={isLoadingQuick}
                className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
              >
                {isLoadingQuick ? <Loader2 size={10} className="animate-spin" /> : null}
                <span>Refresh Insights</span>
              </button>
            </div>

            {quickError && (
              <div className="p-3 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
                {quickError}
              </div>
            )}

            {quickResult && (
              <div className="space-y-3 text-xs">
                {/* Urgency Badge */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 font-mono text-[11px]">Clinical Urgency:</span>
                  <span className="font-bold font-mono text-rose-400 uppercase">
                    {quickResult.urgencyLevel}
                  </span>
                </div>

                {/* Primary Risk Drivers */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="text-[11px] font-mono text-amber-400 font-semibold">
                    Primary Atherogenic Drivers:
                  </div>
                  <ul className="space-y-1 text-slate-300 font-sans">
                    {quickResult.keyDrivers?.map((driver: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{driver}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Immediate Clinical Targets */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-[11px] font-mono text-emerald-400 font-semibold">
                    Target Therapeutic Goals:
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono text-[11px]">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <div className="text-slate-500 text-[10px]">LDL Goal:</div>
                      <div className="text-emerald-400 font-bold">{quickResult.targetGoals?.ldlTarget}</div>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <div className="text-slate-500 text-[10px]">BP Goal:</div>
                      <div className="text-emerald-400 font-bold">{quickResult.targetGoals?.bpTarget}</div>
                    </div>
                  </div>
                </div>

                {/* Recommended Actions */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="text-[11px] font-mono text-sky-400 font-semibold">
                    Immediate Actionable Steps:
                  </div>
                  <ul className="space-y-1 text-slate-300 font-sans">
                    {quickResult.immediateActions?.map((act: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 size={13} className="text-sky-400 shrink-0 mt-0.5" />
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
