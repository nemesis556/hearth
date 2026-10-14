import React, { useState } from 'react';
import {
  Layers,
  Activity,
  Camera,
  Eye,
  Sliders,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { CameraPresetType } from './CardioCanvas3D';

interface BottomControlDockProps {
  showFullBody: boolean;
  setShowFullBody: (val: boolean) => void;
  showSystemicVessels: boolean;
  setShowSystemicVessels: (val: boolean) => void;
  showHeartMuscle: boolean;
  setShowHeartMuscle: (val: boolean) => void;
  showCoronaries: boolean;
  setShowCoronaries: (val: boolean) => void;
  showPlaque: boolean;
  setShowPlaque: (val: boolean) => void;
  showFlowParticles: boolean;
  setShowFlowParticles: (val: boolean) => void;
  showIschemiaHeatmap: boolean;
  setShowIschemiaHeatmap: (val: boolean) => void;
  heartRate: number;
  setHeartRate: (val: number) => void;
  cameraPreset: CameraPresetType;
  setCameraPreset: (preset: CameraPresetType) => void;
  activeVessel: string | null;
  onSelectVessel: (vessel: 'LMCA' | 'LAD' | 'LCx' | 'RCA' | null) => void;
}

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  showFullBody,
  setShowFullBody,
  showSystemicVessels,
  setShowSystemicVessels,
  showHeartMuscle,
  setShowHeartMuscle,
  showCoronaries,
  setShowCoronaries,
  showPlaque,
  setShowPlaque,
  showFlowParticles,
  setShowFlowParticles,
  showIschemiaHeatmap,
  setShowIschemiaHeatmap,
  heartRate,
  setHeartRate,
  cameraPreset,
  setCameraPreset,
  activeVessel,
  onSelectVessel,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'camera' | 'layers' | 'hemodynamics' | 'vessels'>('camera');

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-3xl px-4 pointer-events-none transition-transform duration-300">
      {/* Drawer Toggle Handle */}
      <div className="flex justify-center mb-1 pointer-events-auto">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium tracking-wide uppercase rounded-full bg-slate-900/95 border border-slate-700/80 text-slate-300 hover:text-white shadow-xl backdrop-blur-md transition"
        >
          {isCollapsed ? (
            <>
              <ChevronUp size={13} className="text-sky-400" />
              <span>Show 3D View Controls</span>
            </>
          ) : (
            <>
              <ChevronDown size={13} className="text-slate-400" />
              <span>Hide Controls</span>
            </>
          )}
        </button>
      </div>

      {/* Main Glassmorphic Dock */}
      {!isCollapsed && (
        <div className="pointer-events-auto rounded-xl border border-slate-700/70 bg-slate-900/95 p-2.5 shadow-2xl backdrop-blur-xl">
          {/* Top Tab Bar */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('camera')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  activeTab === 'camera'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Camera size={13} />
                <span>3D Angles</span>
              </button>

              <button
                onClick={() => setActiveTab('layers')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  activeTab === 'layers'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers size={13} />
                <span>Anatomy Layers</span>
              </button>

              <button
                onClick={() => setActiveTab('hemodynamics')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  activeTab === 'hemodynamics'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity size={13} />
                <span>Rhythm ({heartRate} BPM)</span>
              </button>

              <button
                onClick={() => setActiveTab('vessels')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  activeTab === 'vessels'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders size={13} />
                <span>Coronary Arteries</span>
              </button>
            </div>

            <button
              onClick={() => {
                setCameraPreset('fullbody');
                setShowFullBody(true);
                setShowSystemicVessels(true);
                setShowHeartMuscle(true);
                setShowCoronaries(true);
                setShowPlaque(true);
                setShowFlowParticles(true);
                setShowIschemiaHeatmap(true);
                onSelectVessel(null);
              }}
              title="Reset View"
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded hover:bg-slate-800 transition"
            >
              <RotateCcw size={11} />
              <span>Reset</span>
            </button>
          </div>

          {/* Tab 1: Camera Presets */}
          {activeTab === 'camera' && (
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'fullbody', label: 'Full Human Body' },
                { id: 'thorax', label: 'Thorax & Ribs' },
                { id: 'cardiac', label: 'Heart & Great Vessels' },
                { id: 'lad', label: 'LAD ("Widowmaker")' },
                { id: 'rca', label: 'RCA (Right Coronary)' },
                { id: 'lcx', label: 'LCx (Circumflex)' },
                { id: 'posterior', label: 'Posterior View' },
              ].map((view) => (
                <button
                  key={view.id}
                  onClick={() => setCameraPreset(view.id as any)}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition ${
                    cameraPreset === view.id
                      ? 'bg-sky-600 text-white shadow-sm font-semibold'
                      : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 border border-slate-700/40'
                  }`}
                >
                  {view.label}
                </button>
              ))}
            </div>
          )}

          {/* Tab 2: Layers */}
          {activeTab === 'layers' && (
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: 'Full Body', state: showFullBody, setter: setShowFullBody },
                { label: 'Systemic Arteries', state: showSystemicVessels, setter: setShowSystemicVessels },
                { label: 'Myocardium', state: showHeartMuscle, setter: setShowHeartMuscle },
                { label: 'Coronary Tree', state: showCoronaries, setter: setShowCoronaries },
                { label: 'Atheroma Plaque', state: showPlaque, setter: setShowPlaque },
                { label: 'Flow Stream', state: showFlowParticles, setter: setShowFlowParticles },
                { label: 'Ischemia Heatmap', state: showIschemiaHeatmap, setter: setShowIschemiaHeatmap },
              ].map((layer, idx) => (
                <button
                  key={idx}
                  onClick={() => layer.setter(!layer.state)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition border ${
                    layer.state
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-medium'
                      : 'bg-slate-800/40 text-slate-500 border-slate-800 line-through'
                  }`}
                >
                  <Eye size={11} className={layer.state ? 'text-emerald-400' : 'text-slate-600'} />
                  <span>{layer.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Tab 3: Rhythm / Heart Rate */}
          {activeTab === 'hemodynamics' && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-300 whitespace-nowrap">
                Tempo: <strong className="text-rose-400">{heartRate} BPM</strong>
              </span>
              <input
                type="range"
                min="45"
                max="160"
                value={heartRate}
                onChange={(e) => setHeartRate(Number(e.target.value))}
                className="flex-1 accent-rose-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
              <div className="flex items-center gap-1">
                {[60, 75, 120].map((bpm) => (
                  <button
                    key={bpm}
                    onClick={() => setHeartRate(bpm)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60"
                  >
                    {bpm} BPM
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Vessel Focus */}
          {activeTab === 'vessels' && (
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'LMCA', label: 'LMCA (Left Main)' },
                { id: 'LAD', label: 'LAD (Widowmaker)' },
                { id: 'LCx', label: 'LCx (Circumflex)' },
                { id: 'RCA', label: 'RCA (Right Coronary)' },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    if (activeVessel === v.id) {
                      onSelectVessel(null);
                    } else {
                      onSelectVessel(v.id as any);
                      if (v.id === 'LAD') setCameraPreset('lad');
                      else if (v.id === 'RCA') setCameraPreset('rca');
                      else if (v.id === 'LCx') setCameraPreset('lcx');
                    }
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition border ${
                    activeVessel === v.id
                      ? 'bg-amber-500/30 text-amber-300 border-amber-500 font-bold'
                      : 'bg-slate-800 text-slate-300 border-slate-700/60 hover:bg-slate-700'
                  }`}
                >
                  {v.label}
                </button>
              ))}
              {activeVessel && (
                <button
                  onClick={() => onSelectVessel(null)}
                  className="text-[10px] text-slate-400 hover:text-white underline ml-1"
                >
                  Clear Selection
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
