import { PatientProfile, RiskCalculation, MultiVesselAssessment, VesselMetrics, WhatIfInterventions } from '../types/cardiac';

/**
 * Validated 2013/2018 ACC/AHA Pooled Cohort Equations (PCE)
 * 10-year risk of first atherosclerotic cardiovascular disease (ASCVD) event
 */
export function calculateAscvdRisk(patient: PatientProfile): RiskCalculation {
  const age = Math.min(Math.max(patient.age, 40), 79);
  const lnAge = Math.log(age);
  const lnTotChol = Math.log(patient.totalCholesterol);
  const lnHdl = Math.log(patient.hdl);
  const lnSbp = Math.log(patient.systolicBp);
  const smoker = patient.smoker ? 1 : 0;
  const diabetes = patient.diabetes ? 1 : 0;
  const treatedBp = patient.onHypertensionTreatment;

  let indSum = 0;
  let meanSum = 0;
  let s10 = 0.9;

  const isAfAm = patient.race === 'african_american';

  if (patient.gender === 'female') {
    if (isAfAm) {
      indSum =
        17.114 * lnAge +
        0.940 * lnTotChol +
        -18.920 * lnHdl +
        4.475 * (lnAge * lnHdl) +
        (treatedBp ? 29.291 * lnSbp - 6.432 * (lnAge * lnSbp) : 27.820 * lnSbp - 6.087 * (lnAge * lnSbp)) +
        0.691 * smoker +
        0.874 * diabetes;
      meanSum = 86.61;
      s10 = 0.9533;
    } else {
      indSum =
        -29.799 * lnAge +
        4.884 * Math.pow(lnAge, 2) +
        13.540 * lnTotChol +
        -3.114 * (lnAge * lnTotChol) +
        -13.578 * lnHdl +
        3.149 * (lnAge * lnHdl) +
        (treatedBp ? 2.019 * lnSbp : 1.957 * lnSbp) +
        7.574 * smoker -
        1.665 * (lnAge * smoker) +
        0.661 * diabetes;
      meanSum = -29.18;
      s10 = 0.9665;
    }
  } else {
    // Male
    if (isAfAm) {
      indSum =
        2.469 * lnAge +
        0.302 * lnTotChol +
        -0.307 * lnHdl +
        (treatedBp ? 1.916 * lnSbp : 1.809 * lnSbp) +
        0.549 * smoker +
        0.645 * diabetes;
      meanSum = 19.54;
      s10 = 0.8954;
    } else {
      indSum =
        12.344 * lnAge +
        11.853 * lnTotChol +
        -2.664 * (lnAge * lnTotChol) +
        -7.990 * lnHdl +
        1.769 * (lnAge * lnHdl) +
        (treatedBp ? 1.797 * lnSbp : 1.764 * lnSbp) +
        7.837 * smoker -
        1.795 * (lnAge * smoker) +
        0.658 * diabetes;
      meanSum = 61.18;
      s10 = 0.9144;
    }
  }

  const rawExponent = indSum - meanSum;
  let tenYearRisk = (1 - Math.pow(s10, Math.exp(rawExponent))) * 100;

  // Incorporate Risk-Enhancing Biomarkers (AHA/ACC 2018 guidelines):
  // 1. Coronary Artery Calcium (Agatston CAC)
  if (patient.cacScore > 0) {
    if (patient.cacScore >= 400) {
      tenYearRisk *= 2.2; // severe subclinical atherosclerosis
    } else if (patient.cacScore >= 100) {
      tenYearRisk *= 1.6;
    } else if (patient.cacScore < 100) {
      tenYearRisk *= 1.15;
    }
  } else if (patient.cacScore === 0 && !patient.diabetes && !patient.smoker && patient.ldl < 190) {
    // 'Power of Zero' CAC score down-titration
    tenYearRisk *= 0.55;
  }

  // 2. hs-CRP (systemic inflammation)
  if (patient.hsCrp >= 3.0) {
    tenYearRisk *= 1.25;
  } else if (patient.hsCrp >= 2.0) {
    tenYearRisk *= 1.12;
  }

  // 3. Lipoprotein(a) and ApoB
  if (patient.lipoproteinA >= 125) {
    tenYearRisk *= 1.35; // Genetic Lp(a) risk multiplier
  }
  if (patient.apoB >= 130) {
    tenYearRisk *= 1.2;
  }

  // Clamp risk
  tenYearRisk = Math.min(Math.max(tenYearRisk, 0.5), 85.0);

  // Risk category classification
  let riskCategory: 'low' | 'borderline' | 'intermediate' | 'high' = 'low';
  if (tenYearRisk < 5.0) {
    riskCategory = 'low';
  } else if (tenYearRisk < 7.5) {
    riskCategory = 'borderline';
  } else if (tenYearRisk < 20.0) {
    riskCategory = 'intermediate';
  } else {
    riskCategory = 'high';
  }

  // Calculate Heart Age (Vascular Age)
  const baselineAge = patient.age;
  const ageShift = (tenYearRisk - 4.5) * 1.2;
  const heartAge = Math.min(Math.max(Math.round(baselineAge + ageShift), baselineAge - 4), 92);

  // Lifetime risk estimation
  let lifetimeRisk = patient.gender === 'male' ? 36 : 28;
  if (patient.diabetes || patient.smoker || patient.systolicBp >= 160 || patient.totalCholesterol >= 240) {
    lifetimeRisk += 24;
  }
  if (patient.cacScore >= 100) lifetimeRisk += 15;
  lifetimeRisk = Math.min(lifetimeRisk, 75);

  // Optimal 10-year risk for someone same age/sex with optimal biomarkers
  const optimal10YearRisk = Math.max(1.2, Number((tenYearRisk * 0.18).toFixed(1)));

  return {
    tenYearRisk: Number(tenYearRisk.toFixed(1)),
    riskCategory,
    lifetimeRisk,
    heartAge,
    optimal10YearRisk,
    riskDiff: Number((tenYearRisk - optimal10YearRisk).toFixed(1)),
  };
}

/**
 * Predict per-vessel coronary artery disease (CAD) anatomical stenosis,
 * plaque morphology, and hemodynamic FFR (Fractional Flow Reserve).
 */
export function predictCoronaryTree(
  patient: PatientProfile,
  risk: RiskCalculation
): MultiVesselAssessment {
  const cac = patient.cacScore;
  const isHighLdl = patient.ldl > 160;
  const isHighLpa = patient.lipoproteinA > 100;
  const isSmoker = patient.smoker;
  const isDiabetic = patient.diabetes;
  const inflammation = patient.hsCrp > 3.0;

  // Base coronary atherosclerosis burden factor (0 - 1)
  const baseAthero = Math.min(
    (risk.tenYearRisk / 40) * 0.5 +
    (cac / 500) * 0.35 +
    (patient.age > 60 ? 0.15 : 0.05),
    1.0
  );

  // 1. LAD (Left Anterior Descending - "Widowmaker")
  // High sensitivity to shear stress, bifurcation points, LDL & smoking
  let ladStenosis = Math.round(
    baseAthero * 65 +
    (isSmoker ? 12 : 0) +
    (isHighLdl ? 10 : 0) +
    (cac >= 100 ? 15 : 0) +
    (isHighLpa ? 8 : 0)
  );
  ladStenosis = Math.min(Math.max(ladStenosis, 5), 95);

  // 2. RCA (Right Coronary Artery)
  // Prone to diffuse fibrocalcific lesions and inferior territory ischemia
  let rcaStenosis = Math.round(
    baseAthero * 55 +
    (cac >= 200 ? 20 : 0) +
    (patient.systolicBp > 150 ? 10 : 0) +
    (isDiabetic ? 10 : 0)
  );
  rcaStenosis = Math.min(Math.max(rcaStenosis, 5), 90);

  // 3. LCx (Left Circumflex Artery)
  let lcxStenosis = Math.round(
    baseAthero * 45 +
    (isDiabetic ? 12 : 0) +
    (cac >= 300 ? 15 : 0)
  );
  lcxStenosis = Math.min(Math.max(lcxStenosis, 5), 85);

  // 4. LMCA (Left Main Coronary Artery)
  // Typically protected until advanced multi-vessel disease
  let lmcaStenosis = 0;
  if (baseAthero > 0.6 || cac > 400) {
    lmcaStenosis = Math.round(15 + (cac / 40) + (risk.tenYearRisk * 0.4));
  } else {
    lmcaStenosis = Math.round(baseAthero * 12);
  }
  lmcaStenosis = Math.min(Math.max(lmcaStenosis, 0), 65);

  // Plaque morphology calculation
  function getPlaqueType(stenosis: number): VesselMetrics['plaqueType'] {
    if (stenosis < 20) return 'none';
    if (cac > 300) return 'calcified';
    if (inflammation || isHighLpa || isSmoker) return 'mixed_vulnerable';
    if (isHighLdl) return 'soft_lipid';
    return 'fibrous';
  }

  function getVulnerability(type: VesselMetrics['plaqueType']): VesselMetrics['vulnerability'] {
    if (type === 'mixed_vulnerable' || type === 'soft_lipid') return 'vulnerable';
    if (type === 'fibrous') return 'intermediate';
    return 'stable';
  }

  // Fractional Flow Reserve (FFR) estimation:
  // Normal is 1.0. Clinically ischemic threshold is ≤ 0.80
  function estimateFfr(stenosis: number): number {
    if (stenosis < 40) return 0.95;
    if (stenosis < 50) return 0.88;
    if (stenosis < 70) return Number((0.85 - (stenosis - 50) * 0.005).toFixed(2));
    if (stenosis < 80) return Number((0.75 - (stenosis - 70) * 0.008).toFixed(2));
    return Number((0.65 - (stenosis - 80) * 0.006).toFixed(2));
  }

  // Velocity (cm/s) inside stenotic orifice increases due to continuity equation
  function calcVelocity(stenosis: number): number {
    const baseVelocity = 35; // cm/s resting coronary flow
    if (stenosis < 30) return baseVelocity;
    const areaReduction = 1 - Math.pow((100 - stenosis) / 100, 2);
    return Math.min(Math.round(baseVelocity / (1 - areaReduction * 0.75)), 140);
  }

  function getGuidelineAction(stenosis: number, ffr: number, name: string): string {
    if (name === 'LMCA' && stenosis >= 50) {
      return 'URGENT: Left Main CAD ≥50%. Coronary Angiography indicated. Evaluate CABG vs PCI.';
    }
    if (stenosis >= 75 || ffr <= 0.75) {
      return 'Hemodynamically significant ischemia. Consider coronary angiography & PCI with DES vs OMT.';
    }
    if (stenosis >= 50) {
      return 'Moderate lesion. Stress imaging / CCTA / physiological FFR indicated. High-intensity statin + ASA.';
    }
    return 'Non-obstructive plaque. Aggressive lifestyle modification + lipid lowering to prevent progression.';
  }

  const ladFfr = estimateFfr(ladStenosis);
  const rcaFfr = estimateFfr(rcaStenosis);
  const lcxFfr = estimateFfr(lcxStenosis);
  const lmcaFfr = estimateFfr(lmcaStenosis);

  const ladPlaque = getPlaqueType(ladStenosis);
  const rcaPlaque = getPlaqueType(rcaStenosis);
  const lcxPlaque = getPlaqueType(lcxStenosis);
  const lmcaPlaque = getPlaqueType(lmcaStenosis);

  const LMCA: VesselMetrics = {
    id: 'LMCA',
    name: 'Left Main Coronary Artery',
    anatomicalLocation: 'Ostium to Bifurcation (Base of Aortic Root)',
    stenosis: lmcaStenosis,
    plaqueType: lmcaPlaque,
    vulnerability: getVulnerability(lmcaPlaque),
    estimatedFFR: lmcaFfr,
    flowVelocityCmS: calcVelocity(lmcaStenosis),
    myocardialTerritory: 'Global Anterior & Lateral LV Perfusion',
    ischemiaSeverity: lmcaStenosis >= 50 ? 'severe' : lmcaStenosis >= 30 ? 'moderate' : 'normal',
    guidelineAction: getGuidelineAction(lmcaStenosis, lmcaFfr, 'LMCA'),
  };

  const LAD: VesselMetrics = {
    id: 'LAD',
    name: 'Left Anterior Descending',
    anatomicalLocation: 'Anterior Interventricular Sulcus',
    stenosis: ladStenosis,
    plaqueType: ladPlaque,
    vulnerability: getVulnerability(ladPlaque),
    estimatedFFR: ladFfr,
    flowVelocityCmS: calcVelocity(ladStenosis),
    myocardialTerritory: 'Anterior Wall, Apex, & Anterior 2/3 of Septum',
    ischemiaSeverity: ladStenosis >= 70 ? 'severe' : ladStenosis >= 50 ? 'moderate' : ladStenosis >= 30 ? 'mild' : 'normal',
    guidelineAction: getGuidelineAction(ladStenosis, ladFfr, 'LAD'),
  };

  const LCx: VesselMetrics = {
    id: 'LCx',
    name: 'Left Circumflex Artery',
    anatomicalLocation: 'Left Atrioventricular Groove',
    stenosis: lcxStenosis,
    plaqueType: lcxPlaque,
    vulnerability: getVulnerability(lcxPlaque),
    estimatedFFR: lcxFfr,
    flowVelocityCmS: calcVelocity(lcxStenosis),
    myocardialTerritory: 'Lateral & Posterolateral LV Free Wall',
    ischemiaSeverity: lcxStenosis >= 70 ? 'severe' : lcxStenosis >= 50 ? 'moderate' : lcxStenosis >= 30 ? 'mild' : 'normal',
    guidelineAction: getGuidelineAction(lcxStenosis, lcxFfr, 'LCx'),
  };

  const RCA: VesselMetrics = {
    id: 'RCA',
    name: 'Right Coronary Artery',
    anatomicalLocation: 'Right Atrioventricular Sulcus to Crux',
    stenosis: rcaStenosis,
    plaqueType: rcaPlaque,
    vulnerability: getVulnerability(rcaPlaque),
    estimatedFFR: rcaFfr,
    flowVelocityCmS: calcVelocity(rcaStenosis),
    myocardialTerritory: 'Inferior LV Wall, Right Ventricle, & SA/AV Nodes',
    ischemiaSeverity: rcaStenosis >= 70 ? 'severe' : rcaStenosis >= 50 ? 'moderate' : rcaStenosis >= 30 ? 'mild' : 'normal',
    guidelineAction: getGuidelineAction(rcaStenosis, rcaFfr, 'RCA'),
  };

  // Global myocardial ischemia score
  const globalIschemiaScore = Math.min(
    Math.round(
      (ladStenosis * 0.45) + (rcaStenosis * 0.25) + (lcxStenosis * 0.20) + (lmcaStenosis * 0.5)
    ),
    100
  );

  // Approximate SYNTAX score based on vessel count, bifurcation, calcification
  let syntax = 0;
  if (lmcaStenosis >= 50) syntax += 16;
  if (ladStenosis >= 50) syntax += 8 + (ladStenosis >= 75 ? 4 : 0);
  if (rcaStenosis >= 50) syntax += 5 + (rcaStenosis >= 75 ? 3 : 0);
  if (lcxStenosis >= 50) syntax += 4 + (lcxStenosis >= 75 ? 2 : 0);
  if (cac > 400) syntax += 4;

  return {
    LMCA,
    LAD,
    LCx,
    RCA,
    globalIschemiaScore,
    syntaxScoreEstimate: syntax,
  };
}

/**
 * Simulate "What-If" Interventions to observe dynamic risk reduction
 */
export function simulateInterventions(
  originalPatient: PatientProfile,
  interventions: WhatIfInterventions
): {
  simulatedPatient: PatientProfile;
  originalRisk: RiskCalculation;
  simulatedRisk: RiskCalculation;
  absoluteRiskReduction: number;
  relativeRiskReduction: number;
} {
  const simulated: PatientProfile = JSON.parse(JSON.stringify(originalPatient));

  // 1. High-Intensity Statin (Atorvastatin 80mg or Rosuvastatin 40mg) -> 50% LDL reduction
  if (interventions.highIntensityStatin) {
    simulated.ldl = Math.round(simulated.ldl * 0.5);
    simulated.totalCholesterol = Math.round(simulated.totalCholesterol - originalPatient.ldl * 0.5);
    simulated.hsCrp = Math.max(0.5, Number((simulated.hsCrp * 0.65).toFixed(1))); // anti-inflammatory pleiotropic effect
    simulated.apoB = Math.round(simulated.apoB * 0.55);
  }

  // 2. Add Ezetimibe 10mg -> additional 15-20% LDL reduction
  if (interventions.addEzetimibe) {
    simulated.ldl = Math.round(simulated.ldl * 0.82);
    simulated.totalCholesterol = Math.round(simulated.totalCholesterol - simulated.ldl * 0.18);
    simulated.apoB = Math.round(simulated.apoB * 0.85);
  }

  // 3. Add PCSK9 Monoclonal Antibody (Evolocumab / Alirocumab) -> 60% LDL & 30% Lp(a) reduction
  if (interventions.addPCSK9i) {
    simulated.ldl = Math.max(25, Math.round(simulated.ldl * 0.4));
    simulated.lipoproteinA = Math.round(simulated.lipoproteinA * 0.7);
    simulated.apoB = Math.round(simulated.apoB * 0.45);
  }

  // 4. Optimize SBP to 120 mmHg
  if (interventions.targetSbp120) {
    simulated.systolicBp = 120;
    simulated.diastolicBp = 78;
    simulated.onHypertensionTreatment = true;
  }

  // 5. Quit Smoking
  if (interventions.quitSmoking) {
    simulated.smoker = false;
  }

  // 6. SGLT2 Inhibitor / GLP-1 RA (reduces HbA1c, weight, and cardiorenal events)
  if (interventions.addSGLT2i) {
    simulated.hba1c = Math.max(5.6, Number((simulated.hba1c - 0.9).toFixed(1)));
    simulated.bmi = Math.max(22, Number((simulated.bmi - 2.5).toFixed(1)));
    simulated.systolicBp = Math.max(115, simulated.systolicBp - 4);
  }

  const originalRisk = calculateAscvdRisk(originalPatient);
  const simulatedRisk = calculateAscvdRisk(simulated);

  const arr = Number((originalRisk.tenYearRisk - simulatedRisk.tenYearRisk).toFixed(1));
  const rrr = originalRisk.tenYearRisk > 0 ? Number(((arr / originalRisk.tenYearRisk) * 100).toFixed(1)) : 0;

  return {
    simulatedPatient: simulated,
    originalRisk,
    simulatedRisk,
    absoluteRiskReduction: Math.max(0, arr),
    relativeRiskReduction: Math.max(0, rrr),
  };
}

/**
 * Pre-configured Clinical Personas for rapid interactive demonstration
 */
export const CLINICAL_PERSONAS: PatientProfile[] = [
  {
    id: 'marcus-vance',
    name: 'Marcus Vance (High Risk, Severe CAC & Smoking)',
    age: 58,
    gender: 'male',
    race: 'white',
    systolicBp: 154,
    diastolicBp: 92,
    onHypertensionTreatment: true,
    totalCholesterol: 238,
    hdl: 38,
    ldl: 162,
    triglycerides: 190,
    diabetes: true,
    smoker: true,
    hba1c: 7.8,
    fastingGlucose: 142,
    bmi: 29.8,
    restingHeartRate: 82,
    familyHistoryCAD: true,
    cacScore: 420,
    hsCrp: 4.2,
    lipoproteinA: 145,
    apoB: 135,
  },
  {
    id: 'elena-rostova',
    name: 'Elena Rostova (Borderline/Intermediate, Post-Menopausal)',
    age: 54,
    gender: 'female',
    race: 'white',
    systolicBp: 138,
    diastolicBp: 86,
    onHypertensionTreatment: false,
    totalCholesterol: 215,
    hdl: 48,
    ldl: 138,
    triglycerides: 145,
    diabetes: false,
    smoker: false,
    hba1c: 5.7,
    fastingGlucose: 98,
    bmi: 26.2,
    restingHeartRate: 72,
    familyHistoryCAD: true,
    cacScore: 45,
    hsCrp: 2.3,
    lipoproteinA: 55,
    apoB: 98,
  },
  {
    id: 'david-chen',
    name: 'David Chen (Familial Hypercholesterolemia, Extreme LDL)',
    age: 44,
    gender: 'male',
    race: 'asian_other',
    systolicBp: 130,
    diastolicBp: 82,
    onHypertensionTreatment: false,
    totalCholesterol: 310,
    hdl: 42,
    ldl: 238,
    triglycerides: 150,
    diabetes: false,
    smoker: false,
    hba1c: 5.4,
    fastingGlucose: 92,
    bmi: 24.5,
    restingHeartRate: 68,
    familyHistoryCAD: true,
    cacScore: 88,
    hsCrp: 1.8,
    lipoproteinA: 180,
    apoB: 168,
  },
  {
    id: 'sarah-jenkins',
    name: 'Sarah Jenkins (Low-Risk Primary Prevention, CAC 0)',
    age: 62,
    gender: 'female',
    race: 'white',
    systolicBp: 118,
    diastolicBp: 74,
    onHypertensionTreatment: false,
    totalCholesterol: 185,
    hdl: 64,
    ldl: 96,
    triglycerides: 110,
    diabetes: false,
    smoker: false,
    hba1c: 5.2,
    fastingGlucose: 88,
    bmi: 23.0,
    restingHeartRate: 64,
    familyHistoryCAD: false,
    cacScore: 0,
    hsCrp: 0.8,
    lipoproteinA: 18,
    apoB: 72,
  },
];
