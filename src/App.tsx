/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  PatientProfile,
  WhatIfInterventions,
  VesselMetrics,
} from './types/cardiac';
import {
  calculateAscvdRisk,
  predictCoronaryTree,
  simulateInterventions,
  CLINICAL_PERSONAS,
} from './utils/ascvdCalculator';
import { CardioCanvas3D, CameraPresetType } from './components/CardioCanvas3D';
import { BottomControlDock } from './components/BottomControlDock';
import { UnifiedSidebar, SidebarSection } from './components/UnifiedSidebar';
import { VesselModal } from './components/VesselModal';
import {
  Heart,
  PanelLeftClose,
  PanelLeftOpen,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function App() {
  // 1. Initial Patient Profile
  const [patient, setPatient] = useState<PatientProfile>(
    JSON.parse(JSON.stringify(CLINICAL_PERSONAS[0]))
  );

  // 2. What-If Interventions state
  const [interventions, setInterventions] = useState<WhatIfInterventions>({
    highIntensityStatin: false,
    addEzetimibe: false,
    addPCSK9i: false,
    targetSbp120: false,
    quitSmoking: false,
    addSGLT2i: false,
  });

  // 3. Single Unified Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentSection, setCurrentSection] = useState<SidebarSection>('cad_risk');

  // 4. 3D Anatomical Canvas Controls
  const [showFullBody, setShowFullBody] = useState(true);
  const [showSystemicVessels, setShowSystemicVessels] = useState(true);
  const [showHeartMuscle, setShowHeartMuscle] = useState(true);
  const [showCoronaries, setShowCoronaries] = useState(true);
  const [showPlaque, setShowPlaque] = useState(true);
  const [showFlowParticles, setShowFlowParticles] = useState(true);
  const [showIschemiaHeatmap, setShowIschemiaHeatmap] = useState(true);
  const [heartRate, setHeartRate] = useState(patient.restingHeartRate || 75);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetType>('thorax');
  const [activeVessel, setActiveVessel] = useState<'LMCA' | 'LAD' | 'LCx' | 'RCA' | null>(null);

  // Modal inspection state
  const [inspectedVessel, setInspectedVessel] = useState<VesselMetrics | null>(null);

  // 5. Active Profile (apply What-If interventions dynamically)
  const { simulatedPatient, originalRisk, simulatedRisk } = useMemo(() => {
    return simulateInterventions(patient, interventions);
  }, [patient, interventions]);

  // Compute Coronary Tree predictions based on active simulated patient
  const assessment = useMemo(() => {
    return predictCoronaryTree(simulatedPatient, simulatedRisk);
  }, [simulatedPatient, simulatedRisk]);

  React.useEffect(() => {
    setHeartRate(patient.restingHeartRate || 75);
  }, [patient.restingHeartRate]);

  // Vessel selection handler
  const handleSelectVessel = (vesselId: 'LMCA' | 'LAD' | 'LCx' | 'RCA' | null) => {
    setActiveVessel(vesselId);
    if (vesselId && assessment[vesselId]) {
      setInspectedVessel(assessment[vesselId]);
    } else {
      setInspectedVessel(null);
    }
  };

  const handleFocusVesselIn3D = (vesselId: 'LMCA' | 'LAD' | 'LCx' | 'RCA') => {
    if (vesselId === 'LAD') setCameraPreset('lad');
    else if (vesselId === 'RCA') setCameraPreset('rca');
    else if (vesselId === 'LCx') setCameraPreset('lcx');
    else setCameraPreset('cardiac');
  };

  const handleLaunchHighThinking = (vesselId: 'LMCA' | 'LAD' | 'LCx' | 'RCA') => {
    setActiveVessel(vesselId);
    setCurrentSection('gemini_ai');
    setIsSidebarOpen(true);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Application Bar */}
      <header className="h-12 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          {/* Sidebar Toggle Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition border border-slate-800"
            title={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          >
            {isSidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
          </button>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400">
              <Heart size={16} className="fill-rose-500/30" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-white">Cardio3D</span>
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-mono bg-sky-950 text-sky-400 border border-sky-500/30">
                Full Body 3D & CAD Risk
              </span>
            </div>
          </div>
        </div>

        {/* Center: Clinical Status Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-mono">
          <span className="text-slate-400">Patient:</span>
          <span className="text-sky-300 font-semibold">{patient.name.split('(')[0]}</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300">Age {patient.age}</span>
          <span className="text-slate-600">•</span>
          <span className={simulatedRisk.riskCategory === 'high' ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold'}>
            ASCVD {simulatedRisk.tenYearRisk}% ({simulatedRisk.riskCategory})
          </span>
        </div>

        {/* Right Section Shortcuts */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          {(
            [
              { id: 'cad_risk', label: 'CAD Risk' },
              { id: 'simulator', label: 'What-If' },
              { id: 'gemini_ai', label: 'Gemini AI' },
              { id: 'bioscience', label: 'Evidence' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setCurrentSection(tab.id);
                setIsSidebarOpen(true);
              }}
              className={`px-2.5 py-1 rounded-md transition ${
                currentSection === tab.id && isSidebarOpen
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Unified, Simplified Sidebar with 5 Organized Sections */}
        {isSidebarOpen && (
          <aside className="w-84 sm:w-92 md:w-96 h-full shrink-0 z-20 transition-all duration-300 border-r border-slate-800">
            <UnifiedSidebar
              patient={patient}
              onChangePatient={setPatient}
              risk={simulatedRisk}
              assessment={assessment}
              interventions={interventions}
              onChangeInterventions={setInterventions}
              activeVessel={activeVessel}
              onSelectVessel={handleSelectVessel}
              currentSection={currentSection}
              onSectionChange={setCurrentSection}
              onFocusVesselIn3D={handleFocusVesselIn3D}
            />
          </aside>
        )}

        {/* 3D Anatomical Scene: 100% Uncluttered, Center Stage */}
        <main className="flex-1 h-full relative overflow-hidden bg-slate-950">
          <CardioCanvas3D
            assessment={assessment}
            heartRate={heartRate}
            activeVessel={activeVessel}
            onSelectVessel={handleSelectVessel}
            showFullBody={showFullBody}
            showSystemicVessels={showSystemicVessels}
            showHeartMuscle={showHeartMuscle}
            showCoronaries={showCoronaries}
            showPlaque={showPlaque}
            showFlowParticles={showFlowParticles}
            showIschemiaHeatmap={showIschemiaHeatmap}
            cameraPreset={cameraPreset}
            onCameraChange={setCameraPreset}
          />

          {/* Collapsible Ergonomic Bottom Control Dock */}
          <BottomControlDock
            showFullBody={showFullBody}
            setShowFullBody={setShowFullBody}
            showSystemicVessels={showSystemicVessels}
            setShowSystemicVessels={setShowSystemicVessels}
            showHeartMuscle={showHeartMuscle}
            setShowHeartMuscle={setShowHeartMuscle}
            showCoronaries={showCoronaries}
            setShowCoronaries={setShowCoronaries}
            showPlaque={showPlaque}
            setShowPlaque={setShowPlaque}
            showFlowParticles={showFlowParticles}
            setShowFlowParticles={setShowFlowParticles}
            showIschemiaHeatmap={showIschemiaHeatmap}
            setShowIschemiaHeatmap={setShowIschemiaHeatmap}
            heartRate={heartRate}
            setHeartRate={setHeartRate}
            cameraPreset={cameraPreset}
            setCameraPreset={setCameraPreset}
            activeVessel={activeVessel}
            onSelectVessel={handleSelectVessel}
          />
        </main>
      </div>

      {/* Inspect Vessel Modal (Lumen Cross-Section & Clinical Pathway) */}
      <VesselModal
        vessel={inspectedVessel}
        onClose={() => setInspectedVessel(null)}
        onLaunchHighThinking={handleLaunchHighThinking}
      />
    </div>
  );
}
