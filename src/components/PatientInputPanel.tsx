import React, { useState } from 'react';
import {
  PatientProfile,
  WhatIfInterventions,
  BiologicalSex,
  RaceCategory,
} from '../types/cardiac';
import { CLINICAL_PERSONAS, simulateInterventions } from '../utils/ascvdCalculator';
import {
  User,
  HeartPulse,
  Droplet,
  Flame,
  Zap,
  CheckCircle2,
  TrendingDown,
  Info,
  Sparkles,
} from 'lucide-react';

interface PatientInputPanelProps {
  patient: PatientProfile;
  onChangePatient: (updated: PatientProfile) => void;
  interventions: WhatIfInterventions;
  onChangeInterventions: (updated: WhatIfInterventions) => void;
}

export const PatientInputPanel: React.FC<PatientInputPanelProps> = ({
  patient,
  onChangePatient,
  interventions,
  onChangeInterventions,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'whatif'>('profile');

  // Simulation diff
  const simResults = simulateInterventions(patient, interventions);
  const hasActiveInterventions = Object.values(interventions).some(Boolean);

  const updateField = <K extends keyof PatientProfile>(field: K, value: PatientProfile[K]) => {
    onChangePatient({
      ...patient,
      [field]: value,
    });
  };

  const loadPersona = (id: string) => {
    const found = CLINICAL_PERSONAS.find((p) => p.id === id);
    if (found) {
      onChangePatient(JSON.parse(JSON.stringify(found)));
      // Reset interventions
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

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-200 overflow-hidden">
      {/* Top Pre-Loaded Persona Bar */}
      <div className="p-3 bg-slate-950/60 border-b border-slate-800">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Clinical Personas:
          </span>
          <span className="text-[10px] text-sky-400 font-medium">1-Click Test Cases</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {CLINICAL_PERSONAS.map((p) => {
            const isSelected = patient.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => loadPersona(p.id)}
                className={`text-left px-2.5 py-1.5 rounded-lg border text-xs font-mono transition truncate ${
                  isSelected
                    ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-semibold shadow-sm'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="truncate">{p.name.split('(')[0]}</div>
                <div className="text-[10px] text-slate-400 truncate">
                  {p.gender === 'male' ? 'M' : 'F'}{p.age} • CAC {p.cacScore}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/90 text-xs font-medium">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-2 border-b-2 transition ${
            activeTab === 'profile'
              ? 'border-sky-500 text-sky-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <User size={13} />
          <span>Patient Factors</span>
        </button>
        <button
          onClick={() => setActiveTab('whatif')}
          className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-2 border-b-2 transition relative ${
            activeTab === 'whatif'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingDown size={13} />
          <span>What-If Simulator</span>
          {hasActiveInterventions && (
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </button>
      </div>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-mono">
        {activeTab === 'profile' ? (
          <>
            {/* Demographics */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <User size={12} className="text-sky-400" />
                <span>Demographics & Baseline</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 text-[10px] block mb-0.5">Age (Years)</label>
                  <input
                    type="number"
                    min="40"
                    max="79"
                    value={patient.age}
                    onChange={(e) => updateField('age', Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[10px] block mb-0.5">Biological Sex</label>
                  <select
                    value={patient.gender}
                    onChange={(e) => updateField('gender', e.target.value as BiologicalSex)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 text-[10px] block mb-0.5">Race/Ethnicity</label>
                  <select
                    value={patient.race}
                    onChange={(e) => updateField('race', e.target.value as RaceCategory)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-100 focus:outline-none focus:border-sky-500 text-[11px]"
                  >
                    <option value="white">White / Non-Hispanic</option>
                    <option value="african_american">African American</option>
                    <option value="hispanic">Hispanic</option>
                    <option value="asian_other">Asian / Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-[10px] block mb-0.5">BMI (kg/m²)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={patient.bmi}
                    onChange={(e) => updateField('bmi', Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            {/* Hemodynamics */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <HeartPulse size={12} className="text-rose-400" />
                <span>Hemodynamics & Blood Pressure</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-400 text-[10px] block mb-0.5">Systolic (mmHg)</label>
                  <input
                    type="number"
                    value={patient.systolicBp}
                    onChange={(e) => updateField('systolicBp', Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-100 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[10px] block mb-0.5">Diastolic (mmHg)</label>
                  <input
                    type="number"
                    value={patient.diastolicBp}
                    onChange={(e) => updateField('diastolicBp', Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-100 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[10px] block mb-0.5">Resting HR</label>
                  <input
                    type="number"
                    value={patient.restingHeartRate}
                    onChange={(e) => updateField('restingHeartRate', Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-100 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer mt-1 text-slate-300">
                <input
                  type="checkbox"
                  checked={patient.onHypertensionTreatment}
                  onChange={(e) => updateField('onHypertensionTreatment', e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0"
                />
                <span className="text-[11px]">Treated for Hypertension</span>
              </label>
            </div>

            {/* Lipid Panel */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between font-sans">
                <div className="flex items-center gap-1.5">
                  <Droplet size={12} className="text-amber-400" />
                  <span>Lipid Profile (mg/dL)</span>
                </div>
                <span className="text-[9px] text-slate-500">Fast lipid panel</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 text-[10px] block mb-0.5">Total Cholesterol</label>
                  <input
                    type="number"
                    value={patient.totalCholesterol}
                    onChange={(e) => updateField('totalCholesterol', Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[10px] block mb-0.5">HDL-C (Protective)</label>
                  <input
                    type="number"
                    value={patient.hdl}
                    onChange={(e) => updateField('hdl', Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 text-[10px] block mb-0.5">LDL-C (Atherogenic)</label>
                  <input
                    type="number"
                    value={patient.ldl}
                    onChange={(e) => updateField('ldl', Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[10px] block mb-0.5">Triglycerides</label>
                  <input
                    type="number"
                    value={patient.triglycerides}
                    onChange={(e) => updateField('triglycerides', Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Metabolic & Lifestyle */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <Flame size={12} className="text-rose-500" />
                <span>Metabolic & Behavioral</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded bg-slate-800/60 border border-slate-800">
                  <input
                    type="checkbox"
                    checked={patient.diabetes}
                    onChange={(e) => updateField('diabetes', e.target.checked)}
                    className="rounded text-rose-500"
                  />
                  <span className="text-[11px]">Type 2 Diabetes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded bg-slate-800/60 border border-slate-800">
                  <input
                    type="checkbox"
                    checked={patient.smoker}
                    onChange={(e) => updateField('smoker', e.target.checked)}
                    className="rounded text-rose-500"
                  />
                  <span className="text-[11px]">Current Smoker</span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 text-[10px] block mb-0.5">HbA1c (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={patient.hba1c}
                    onChange={(e) => updateField('hba1c', Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[10px] block mb-0.5">Fasting Glucose (mg/dL)</label>
                  <input
                    type="number"
                    value={patient.fastingGlucose}
                    onChange={(e) => updateField('fastingGlucose', Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Advanced Biomarkers & CAC */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between font-sans">
                <div className="flex items-center gap-1.5">
                  <Zap size={12} className="text-purple-400" />
                  <span>Advanced Biomarkers & Imaging</span>
                </div>
                <span className="text-[9px] text-purple-300">ACC/AHA Enhancers</span>
              </div>
              <div>
                <label className="text-slate-400 text-[10px] block mb-0.5 flex justify-between">
                  <span>Coronary Artery Calcium (CAC) Agatston</span>
                  <span className={patient.cacScore >= 400 ? 'text-rose-400 font-bold' : patient.cacScore >= 100 ? 'text-amber-400' : 'text-slate-300'}>
                    {patient.cacScore} AU
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="5"
                  value={patient.cacScore}
                  onChange={(e) => updateField('cacScore', Number(e.target.value))}
                  className="w-full accent-purple-500 h-1.5 bg-slate-700 rounded cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="text-slate-400 text-[9px] block mb-0.5">hs-CRP (mg/L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={patient.hsCrp}
                    onChange={(e) => updateField('hsCrp', Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100 text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[9px] block mb-0.5">Lp(a) (nmol/L)</label>
                  <input
                    type="number"
                    value={patient.lipoproteinA}
                    onChange={(e) => updateField('lipoproteinA', Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100 text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[9px] block mb-0.5">ApoB (mg/dL)</label>
                  <input
                    type="number"
                    value={patient.apoB}
                    onChange={(e) => updateField('apoB', Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100 text-[11px]"
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          /* What-If Live Intervention Simulator Tab */
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1 text-xs">
                <Sparkles size={13} />
                <span>Simulated Risk Reduction</span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans">
                Activate evidence-based pharmacologic and lifestyle interventions to observe instantaneous 3D coronary and 10-year ASCVD risk trajectory changes.
              </p>

              {hasActiveInterventions && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 rounded bg-slate-900/90 border border-emerald-500/40">
                    <div className="text-[10px] text-slate-400">Absolute Risk Drop</div>
                    <div className="text-base font-bold text-emerald-400 font-mono">
                      -{simResults.absoluteRiskReduction}%
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-900/90 border border-emerald-500/40">
                    <div className="text-[10px] text-slate-400">Relative Risk Drop</div>
                    <div className="text-base font-bold text-emerald-400 font-mono">
                      -{simResults.relativeRiskReduction}%
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              {[
                {
                  id: 'highIntensityStatin',
                  label: 'High-Intensity Statin',
                  detail: 'Atorvastatin 80mg or Rosuvastatin 40mg (-50% LDL, anti-inflammatory)',
                  active: interventions.highIntensityStatin,
                },
                {
                  id: 'addEzetimibe',
                  label: 'Add Ezetimibe 10mg',
                  detail: 'Cholesterol absorption inhibitor (additional -18% LDL)',
                  active: interventions.addEzetimibe,
                },
                {
                  id: 'addPCSK9i',
                  label: 'Add PCSK9 Inhibitor (Evolocumab / Alirocumab)',
                  detail: 'Monoclonal antibody (-60% LDL, -30% Lp(a) reduction)',
                  active: interventions.addPCSK9i,
                },
                {
                  id: 'targetSbp120',
                  label: 'Intensive BP Control (Target SBP 120 mmHg)',
                  detail: 'SPRINT trial protocol: Dual antihypertensive regimen',
                  active: interventions.targetSbp120,
                },
                {
                  id: 'quitSmoking',
                  label: 'Complete Smoking Cessation',
                  detail: 'Eliminates endothelial oxidant stress and thrombotic cascade',
                  active: interventions.quitSmoking,
                },
                {
                  id: 'addSGLT2i',
                  label: 'Cardioprotective SGLT2i / GLP-1 RA',
                  detail: 'Weight reduction, glycemic stability, and renal hemodynamic protection',
                  active: interventions.addSGLT2i,
                },
              ].map((item) => (
                <label
                  key={item.id}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                    item.active
                      ? 'bg-emerald-950/40 border-emerald-500/60 text-slate-100 shadow-sm'
                      : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700'
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
                  <div className="flex-1">
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
                className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition"
              >
                Clear All Simulated Interventions
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
