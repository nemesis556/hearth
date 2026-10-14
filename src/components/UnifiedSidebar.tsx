import React, { useState } from 'react';
import {
  PatientProfile,
  RiskCalculation,
  MultiVesselAssessment,
  WhatIfInterventions,
  BiologicalSex,
  RaceCategory,
} from '../types/cardiac';
import { CLINICAL_PERSONAS, simulateInterventions } from '../utils/ascvdCalculator';
import {
  User,
  Activity,
  HeartPulse,
  TrendingDown,
  Brain,
  FlaskConical,
  Gauge,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  Loader2,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertCircle,
  Zap,
  Droplet,
  Send,
  BadgeCheck,
} from 'lucide-react';

export type SidebarSection = 'vitals' | 'cad_risk' | 'simulator' | 'gemini_ai' | 'bioscience';

interface UnifiedSidebarProps {
  patient: PatientProfile;
  onChangePatient: (updated: PatientProfile) => void;
  risk: RiskCalculation;
  assessment: MultiVesselAssessment;
  interventions: WhatIfInterventions;
  onChangeInterventions: (updated: WhatIfInterventions) => void;
  activeVessel: string | null;
  onSelectVessel: (vesselId: 'LMCA' | 'LAD' | 'LCx' | 'RCA' | null) => void;
  currentSection: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
  onFocusVesselIn3D?: (vesselId: 'LMCA' | 'LAD' | 'LCx' | 'RCA') => void;
}

export const UnifiedSidebar: React.FC<UnifiedSidebarProps> = ({
  patient,
  onChangePatient,
  risk,
  assessment,
  interventions,
  onChangeInterventions,
  activeVessel,
  onSelectVessel,
  currentSection,
  onSectionChange,
  onFocusVesselIn3D,
}) => {
  const [isEditingLabs, setIsEditingLabs] = useState(false);

  // Gemini state
  const [deepReport, setDeepReport] = useState<string | null>(null);
  const [isLoadingDeep, setIsLoadingDeep] = useState(false);
  const [deepError, setDeepError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('2024 ACC/AHA coronary calcium score statin therapy');
  const [searchAnswer, setSearchAnswer] = useState<string | null>(null);
  const [groundingSources, setGroundingSources] = useState<any[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Bioscience state
  const [scienceQuery, setScienceQuery] = useState('PCSK9 inhibitor evolocumab cardiovascular outcomes');
  const [scienceSource, setScienceSource] = useState<'europepmc' | 'pubmed' | 'clinicaltrials'>('europepmc');
  const [scienceResults, setScienceResults] = useState<any[]>([]);
  const [isLoadingScience, setIsLoadingScience] = useState(false);

  // Simulation diff
  const simResults = simulateInterventions(patient, interventions);
  const hasActiveInterventions = Object.values(interventions).some(Boolean);

  const loadPersona = (id: string) => {
    const found = CLINICAL_PERSONAS.find((p) => p.id === id);
    if (found) {
      onChangePatient(JSON.parse(JSON.stringify(found)));
      onChangeInterventions({
        highIntensityStatin: false,
        addEzetimibe: false,
        addPCSK9i: false,
        targetSbp120: false,
        quitSmoking: false,
        addSGLT2i: false,
      });
    }
  };

  const updateField = <K extends keyof PatientProfile>(field: K, value: PatientProfile[K]) => {
    onChangePatient({
      ...patient,
      [field]: value,
    });
  };

  // Run Gemini 4 High Thinking Deliberation
  const runDeepReasoning = async () => {
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
          focusVessel: activeVessel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed clinical deliberation');
      setDeepReport(data.report);
    } catch (err: any) {
      setDeepError(err.message || 'Error executing clinical reasoning');
    } finally {
      setIsLoadingDeep(false);
    }
  };

  // Run Search Grounding with Gemini 3.8 Flash
  const runSearchGrounding = async (q?: string) => {
    const query = q || searchQuery;
    setIsLoadingSearch(true);
    setSearchError(null);
    try {
      const res = await fetch('/api/ai/search-grounded', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          clinicalContext: `Patient Age ${patient.age}, ${patient.gender}, 10-Yr ASCVD ${risk.tenYearRisk}%, CAC ${patient.cacScore}, LAD Stenosis ${assessment.LAD.stenosis}%, LDL ${patient.ldl} mg/dL, Lp(a) ${patient.lipoproteinA} nmol/L.`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed search grounding');
      setSearchAnswer(data.answer);
      setGroundingSources(data.groundingChunks || []);
    } catch (err: any) {
      setSearchError(err.message || 'Error querying search grounding');
    } finally {
      setIsLoadingSearch(false);
    }
  };

  // Run Science Query
  const fetchScience = async (q: string, s: string) => {
    setIsLoadingScience(true);
    try {
      const res = await fetch(`/api/science/literature?term=${encodeURIComponent(q)}&source=${s}`);
      const data = await res.json();
      if (s === 'clinicaltrials') {
        setScienceResults(
          (data.studies || []).map((st: any) => ({
            id: st.protocolSection?.identificationModule?.nctId,
            title: st.protocolSection?.identificationModule?.briefTitle,
            sponsor: st.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name,
            phase: st.protocolSection?.designModule?.phases?.[0] || 'TRIAL',
            status: st.protocolSection?.statusModule?.overallStatus,
            url: `https://clinicaltrials.gov/study/${st.protocolSection?.identificationModule?.nctId}`,
            provenance: 'ClinicalTrials.gov',
          }))
        );
      } else {
        const list = data.resultList?.result || [];
        setScienceResults(
          list.map((r: any) => ({
            id: r.pmid ? `PMID:${r.pmid}` : r.id,
            title: r.title,
            authors: r.authorString,
            source: r.journalTitle,
            pubdate: r.pubYear,
            url: r.pmid ? `https://europepmc.org/article/MED/${r.pmid}` : `https://doi.org/${r.doi}`,
            provenance: 'Europe PMC / PubMed',
          }))
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingScience(false);
    }
  };

  const SECTIONS = [
    { id: 'vitals', label: 'Patient & Vitals', icon: User },
    { id: 'cad_risk', label: 'CAD & 10-Yr Risk', icon: Gauge },
    { id: 'simulator', label: 'What-If Treatments', icon: TrendingDown },
    { id: 'gemini_ai', label: 'Gemini AI Consult', icon: Brain },
    { id: 'bioscience', label: 'Evidence & Trials', icon: FlaskConical },
  ] as const;

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-200 select-none overflow-hidden">
      {/* Top Section Nav Tabs */}
      <div className="grid grid-cols-5 border-b border-slate-800 bg-slate-950/90 text-xs font-mono">
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isActive = currentSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => onSectionChange(sec.id)}
              title={sec.label}
              className={`py-2.5 flex flex-col items-center justify-center gap-1 border-b-2 transition ${
                isActive
                  ? 'border-sky-500 text-sky-400 bg-slate-900/60 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
              }`}
            >
              <Icon size={15} />
              <span className="text-[10px] truncate max-w-[64px] hidden sm:block">
                {sec.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* SECTION 1: PATIENT & VITALS */}
        {currentSection === 'vitals' && (
          <div className="space-y-4 text-xs">
            {/* Persona Quick Chips */}
            <div>
              <div className="text-[11px] font-mono uppercase text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Select Clinical Persona:</span>
                <span className="text-sky-400 font-sans text-[10px]">1-Click Demo</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {CLINICAL_PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => loadPersona(p.id)}
                    className={`p-2 rounded-lg border text-left font-mono transition text-xs truncate ${
                      patient.id === p.id
                        ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="truncate font-semibold">{p.name.split('(')[0]}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {p.gender === 'male' ? 'M' : 'F'}{p.age} • CAC {p.cacScore}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Key Clinical Vitals Summary Cards */}
            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400">Blood Pressure</div>
                <div className="text-sm font-bold text-rose-400 mt-0.5">
                  {patient.systolicBp}/{patient.diastolicBp}
                </div>
                <div className="text-[9px] text-slate-500">mmHg</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400">LDL-C</div>
                <div className="text-sm font-bold text-amber-400 mt-0.5">
                  {patient.ldl}
                </div>
                <div className="text-[9px] text-slate-500">mg/dL</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400">CAC Score</div>
                <div className="text-sm font-bold text-purple-400 mt-0.5">
                  {patient.cacScore}
                </div>
                <div className="text-[9px] text-slate-500">Agatston</div>
              </div>
            </div>

            {/* Additional Biomarkers row */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">hs-CRP Inflammation:</span>
                <span className={patient.hsCrp >= 2.0 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                  {patient.hsCrp} mg/L
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Lipoprotein(a):</span>
                <span className={patient.lipoproteinA >= 125 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                  {patient.lipoproteinA} nmol/L
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Apolipoprotein B (ApoB):</span>
                <span className={patient.apoB >= 130 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                  {patient.apoB} mg/dL
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Smoking / Diabetes:</span>
                <span className="text-slate-200 font-sans">
                  {patient.smoker ? 'Smoker' : 'Non-Smoker'} • {patient.diabetes ? 'T2DM (+)' : 'No Diabetes'}
                </span>
              </div>
            </div>

            {/* Collapsible Lab Customizer */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
              <button
                onClick={() => setIsEditingLabs(!isEditingLabs)}
                className="w-full p-2.5 flex items-center justify-between text-xs font-mono text-slate-300 hover:bg-slate-800/40 transition"
              >
                <span>Edit Patient Physiological Labs</span>
                {isEditingLabs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {isEditingLabs && (
                <div className="p-3 border-t border-slate-800 space-y-3 font-mono text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 text-[10px] block mb-0.5">Age</label>
                      <input
                        type="number"
                        value={patient.age}
                        onChange={(e) => updateField('age', Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-[10px] block mb-0.5">Sex</label>
                      <select
                        value={patient.gender}
                        onChange={(e) => updateField('gender', e.target.value as BiologicalSex)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 text-[10px] block mb-0.5">Systolic BP</label>
                      <input
                        type="number"
                        value={patient.systolicBp}
                        onChange={(e) => updateField('systolicBp', Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-[10px] block mb-0.5">Total Chol (mg/dL)</label>
                      <input
                        type="number"
                        value={patient.totalCholesterol}
                        onChange={(e) => updateField('totalCholesterol', Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 text-[10px] block mb-0.5">HDL-C (mg/dL)</label>
                      <input
                        type="number"
                        value={patient.hdl}
                        onChange={(e) => updateField('hdl', Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-[10px] block mb-0.5">LDL-C (mg/dL)</label>
                      <input
                        type="number"
                        value={patient.ldl}
                        onChange={(e) => updateField('ldl', Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 text-[10px] block mb-0.5 flex justify-between">
                      <span>CAC Agatston Score</span>
                      <span className="text-purple-400 font-bold">{patient.cacScore}</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      step="10"
                      value={patient.cacScore}
                      onChange={(e) => updateField('cacScore', Number(e.target.value))}
                      className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={patient.diabetes}
                        onChange={(e) => updateField('diabetes', e.target.checked)}
                        className="rounded text-rose-500"
                      />
                      <span className="text-[11px]">Diabetes</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={patient.smoker}
                        onChange={(e) => updateField('smoker', e.target.checked)}
                        className="rounded text-rose-500"
                      />
                      <span className="text-[11px]">Smoker</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 2: CAD & 10-YR RISK */}
        {currentSection === 'cad_risk' && (
          <div className="space-y-4">
            {/* Primary ASCVD Score Banner */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-400 uppercase">10-Year Hard ASCVD</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold uppercase border ${
                    risk.riskCategory === 'high'
                      ? 'bg-rose-950 text-rose-300 border-rose-500/40'
                      : risk.riskCategory === 'intermediate'
                      ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {risk.riskCategory} Risk
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
                    {risk.tenYearRisk}%
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                    First Myocardial Infarction or Stroke (PCE)
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold font-mono text-rose-400">
                    {risk.heartAge} yrs
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans">
                    Estimated Vascular Age
                  </div>
                </div>
              </div>

              <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    risk.riskCategory === 'high'
                      ? 'bg-rose-500'
                      : risk.riskCategory === 'intermediate'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(risk.tenYearRisk * 2.5, 100)}%` }}
                />
              </div>
            </div>

            {/* Per-Vessel Coronary Mapping */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
                <span>Coronary Artery Mapping:</span>
                <span className="text-[10px] text-sky-400">Click to focus in 3D</span>
              </div>

              {[assessment.LAD, assessment.RCA, assessment.LCx, assessment.LMCA].map((v) => {
                const isSelected = activeVessel === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => {
                      onSelectVessel(v.id);
                      onFocusVesselIn3D?.(v.id);
                    }}
                    className={`p-3 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/90 border-sky-400 shadow-md ring-1 ring-sky-400/30'
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-mono text-xs font-bold text-slate-100 flex items-center gap-1.5">
                          <span>{v.id}</span>
                          <span className="text-slate-400 font-sans font-normal truncate">{v.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{v.myocardialTerritory.split(',')[0]}</div>
                      </div>
                      <div className="text-right font-mono">
                        <div className={`text-sm font-bold ${v.stenosis >= 70 ? 'text-rose-400' : v.stenosis >= 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {v.stenosis}%
                        </div>
                        <div className="text-[9px] text-slate-500 uppercase">Stenosis</div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] font-mono border-t border-slate-800/60 pt-1.5">
                      <span className="text-slate-400">Est. FFR: <strong className={v.estimatedFFR <= 0.8 ? 'text-rose-400' : 'text-slate-200'}>{v.estimatedFFR}</strong></span>
                      <span className="text-amber-300 font-sans capitalize">{v.plaqueType.replace('_', ' ')}</span>
                      <span className="text-sky-400 font-sans">{isSelected ? '✓ In 3D' : 'Inspect'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 3: WHAT-IF TREATMENT SIMULATOR */}
        {currentSection === 'simulator' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1 text-xs">
                <Sparkles size={13} />
                <span>Simulated Risk Reduction</span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans">
                Activate medical interventions to see immediate projected drop in 10-year risk and vascular age.
              </p>

              {hasActiveInterventions && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-center font-mono">
                  <div className="p-2 rounded bg-slate-900 border border-emerald-500/40">
                    <div className="text-[10px] text-slate-400">Absolute Drop</div>
                    <div className="text-base font-bold text-emerald-400">
                      -{simResults.absoluteRiskReduction}%
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-emerald-500/40">
                    <div className="text-[10px] text-slate-400">Relative Drop</div>
                    <div className="text-base font-bold text-emerald-400">
                      -{simResults.relativeRiskReduction}%
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {[
                { id: 'highIntensityStatin', label: 'High-Intensity Statin', detail: 'Atorvastatin 80mg (-50% LDL, anti-inflammatory)', active: interventions.highIntensityStatin },
                { id: 'addEzetimibe', label: 'Add Ezetimibe 10mg', detail: 'Cholesterol absorption inhibitor (extra -18% LDL)', active: interventions.addEzetimibe },
                { id: 'addPCSK9i', label: 'Add PCSK9 Inhibitor (Evolocumab)', detail: 'Monoclonal antibody (-60% LDL, -30% Lp(a))', active: interventions.addPCSK9i },
                { id: 'targetSbp120', label: 'Target SBP 120 mmHg', detail: 'Intensive blood pressure reduction', active: interventions.targetSbp120 },
                { id: 'quitSmoking', label: 'Smoking Cessation', detail: 'Eliminates vascular endothelial oxidative stress', active: interventions.quitSmoking },
                { id: 'addSGLT2i', label: 'Cardioprotective SGLT2i / GLP-1 RA', detail: 'Weight loss & glycemic stabilization', active: interventions.addSGLT2i },
              ].map((item) => (
                <label
                  key={item.id}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                    item.active
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-slate-100'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.active}
                    onChange={(e) =>
                      onChangeInterventions({
                        ...interventions,
                        [item.id]: e.target.checked,
                      })
                    }
                    className="mt-0.5 rounded text-emerald-500 focus:ring-0"
                  />
                  <div>
                    <div className="font-semibold text-xs text-slate-200">{item.label}</div>
                    <div className="text-[10px] text-slate-400 font-sans mt-0.5">{item.detail}</div>
                  </div>
                </label>
              ))}
            </div>

            {hasActiveInterventions && (
              <button
                onClick={() =>
                  onChangeInterventions({
                    highIntensityStatin: false,
                    addEzetimibe: false,
                    addPCSK9i: false,
                    targetSbp120: false,
                    quitSmoking: false,
                    addSGLT2i: false,
                  })
                }
                className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-mono transition"
              >
                Clear All Simulated Interventions
              </button>
            )}
          </div>
        )}

        {/* SECTION 4: GEMINI AI CLINICAL INTELLIGENCE */}
        {currentSection === 'gemini_ai' && (
          <div className="space-y-4">
            {/* Deep Reasoning Button */}
            <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-purple-300 font-mono flex items-center gap-1.5">
                  <Brain size={14} />
                  <span>High-Thinking Deliberation</span>
                </span>
                <span className="text-[10px] text-purple-400 font-mono">gemini-4-argon</span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                Consults senior cardiologist reasoning on revascularization (PCI vs CABG vs OMT), plaque vulnerability, and FFR ischemia.
              </p>

              <button
                onClick={runDeepReasoning}
                disabled={isLoadingDeep}
                className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
              >
                {isLoadingDeep ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Executing High-Thinking Deliberation...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>Run Deep Clinical Consultation</span>
                  </>
                )}
              </button>
            </div>

            {deepError && (
              <div className="p-2.5 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
                {deepError}
              </div>
            )}

            {deepReport && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 space-y-2">
                <div className="font-bold text-purple-400 font-mono text-[11px] border-b border-slate-800 pb-1">
                  Cardiology Consult Report
                </div>
                <div className="whitespace-pre-line font-sans text-[11px] text-slate-300 leading-relaxed">
                  {deepReport}
                </div>
              </div>
            )}

            {/* Google Search Grounding with Gemini 3.8 Flash */}
            <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-sky-300 font-mono flex items-center gap-1.5">
                  <Search size={14} />
                  <span>Grounded Guidelines Search</span>
                </span>
                <span className="text-[10px] text-sky-400 font-mono">gemini-3.8-flash</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ask any guideline query..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') runSearchGrounding();
                  }}
                />
                <button
                  onClick={() => runSearchGrounding()}
                  disabled={isLoadingSearch}
                  className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs flex items-center gap-1 transition"
                >
                  {isLoadingSearch ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                </button>
              </div>

              {searchAnswer && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-sans text-slate-300 leading-relaxed space-y-2">
                  <div className="font-semibold text-sky-400 font-mono">Grounded Guideline Response:</div>
                  <div className="whitespace-pre-line">{searchAnswer}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 5: BIOSCIENCE EVIDENCE & TRIALS */}
        {currentSection === 'bioscience' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-teal-950/30 border border-teal-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-teal-300 font-mono flex items-center gap-1.5">
                  <FlaskConical size={14} />
                  <span>Biomedical Literature & Trials</span>
                </span>
                <span className="text-[10px] text-teal-400 font-mono">Science Skill</span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans">
                Queries PubMed, Europe PMC, and ClinicalTrials.gov for peer-reviewed evidence.
              </p>

              {/* Source tabs */}
              <div className="flex gap-1.5 pt-1">
                {(['europepmc', 'clinicaltrials', 'pubmed'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setScienceSource(s);
                      fetchScience(scienceQuery, s);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition ${
                      scienceSource === s
                        ? 'bg-teal-600 text-white font-semibold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s === 'europepmc' ? 'Europe PMC' : s === 'clinicaltrials' ? 'ClinicalTrials.gov' : 'PubMed'}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={scienceQuery}
                  onChange={(e) => setScienceQuery(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') fetchScience(scienceQuery, scienceSource);
                  }}
                />
                <button
                  onClick={() => fetchScience(scienceQuery, scienceSource)}
                  disabled={isLoadingScience}
                  className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs flex items-center gap-1"
                >
                  {isLoadingScience ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-2.5">
              {scienceResults.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-teal-950 text-teal-300 border border-teal-500/30">
                      [{item.provenance}]
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">{item.id}</span>
                  </div>
                  <div className="font-semibold text-slate-200 text-xs leading-snug">{item.title}</div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px] font-mono text-slate-400">
                    <span>{item.source || item.phase}</span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-teal-400 hover:underline"
                    >
                      <span>Authoritative Record</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
