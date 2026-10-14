export type BiologicalSex = 'male' | 'female';
export type RaceCategory = 'white' | 'african_american' | 'hispanic' | 'asian_other';

export interface PatientProfile {
  id: string;
  name: string;
  age: number;
  gender: BiologicalSex;
  race: RaceCategory;
  systolicBp: number;
  diastolicBp: number;
  onHypertensionTreatment: boolean;
  totalCholesterol: number; // mg/dL
  hdl: number; // mg/dL
  ldl: number; // mg/dL
  triglycerides: number; // mg/dL
  diabetes: boolean;
  smoker: boolean;
  hba1c: number; // %
  fastingGlucose: number; // mg/dL
  bmi: number;
  restingHeartRate: number; // bpm
  familyHistoryCAD: boolean;
  cacScore: number; // Agatston units
  hsCrp: number; // mg/L
  lipoproteinA: number; // nmol/L
  apoB: number; // mg/dL
}

export type RiskCategory = 'low' | 'borderline' | 'intermediate' | 'high';

export interface RiskCalculation {
  tenYearRisk: number; // e.g. 18.4%
  riskCategory: RiskCategory;
  lifetimeRisk: number; // e.g. 45%
  heartAge: number; // e.g. 64 years
  optimal10YearRisk: number; // risk if all factors optimal e.g. 2.1%
  riskDiff: number; // relative elevation
}

export type PlaqueType = 'none' | 'soft_lipid' | 'fibrous' | 'calcified' | 'mixed_vulnerable';
export type VulnerabilityLevel = 'stable' | 'intermediate' | 'vulnerable';

export interface VesselMetrics {
  id: 'LMCA' | 'LAD' | 'LCx' | 'RCA';
  name: string;
  anatomicalLocation: string;
  stenosis: number; // 0 - 100%
  plaqueType: PlaqueType;
  vulnerability: VulnerabilityLevel;
  estimatedFFR: number; // 0.60 - 1.0 (≤0.80 hemodynamically significant)
  flowVelocityCmS: number; // cm/s
  myocardialTerritory: string;
  ischemiaSeverity: 'normal' | 'mild' | 'moderate' | 'severe';
  guidelineAction: string;
}

export interface MultiVesselAssessment {
  LMCA: VesselMetrics;
  LAD: VesselMetrics;
  LCx: VesselMetrics;
  RCA: VesselMetrics;
  globalIschemiaScore: number; // 0 - 100
  syntaxScoreEstimate: number;
}

export interface WhatIfInterventions {
  highIntensityStatin: boolean;
  addEzetimibe: boolean;
  addPCSK9i: boolean;
  targetSbp120: boolean;
  quitSmoking: boolean;
  addSGLT2i: boolean;
}
