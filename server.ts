import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Shared Google GenAI client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to check API key
function checkApiKey(res: express.Response): boolean {
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    res.status(503).json({
      error: 'GEMINI_API_KEY is not configured. Please configure your key in Settings > Secrets.',
    });
    return false;
  }
  return true;
}

// 1. Quick Insights API (using gemini-3.1-flash-lite for ultra-fast response)
app.post('/api/ai/quick-insights', async (req, res) => {
  if (!checkApiKey(res)) return;
  try {
    const { patient, riskScore, cadProbabilities } = req.body;
    const prompt = `You are a clinical cardiovascular risk specialist.
Patient Profile:
- Age: ${patient.age}, Sex: ${patient.gender}, Smoker: ${patient.smoker ? 'Yes' : 'No'}
- Blood Pressure: ${patient.systolicBp}/${patient.diastolicBp} mmHg (Treated: ${patient.onHypertensionTreatment ? 'Yes' : 'No'})
- Lipids: Total Chol ${patient.totalCholesterol} mg/dL, HDL ${patient.hdl} mg/dL, LDL ${patient.ldl} mg/dL, Triglycerides ${patient.triglycerides} mg/dL
- Diabetes: ${patient.diabetes ? 'Yes' : 'No'}, HbA1c: ${patient.hba1c}%
- Coronary Artery Calcium (CAC) Agatston Score: ${patient.cacScore}
- Biomarkers: hs-CRP ${patient.hsCrp} mg/L, Lp(a) ${patient.lipoproteinA} nmol/L, ApoB ${patient.apoB} mg/dL
- Calculated 10-Year ASCVD Risk: ${riskScore.tenYearRisk}% (${riskScore.riskCategory})
- Predicted Coronary Artery Disease: LAD ${cadProbabilities.lad}%, LCx ${cadProbabilities.lcx}%, RCA ${cadProbabilities.rca}%, LMCA ${cadProbabilities.lmca}%

Provide a concise, high-impact clinical summary in JSON format:
{
  "keyDrivers": ["bullet 1", "bullet 2", "bullet 3"],
  "immediateActions": ["action 1", "action 2"],
  "targetGoals": { "ldlTarget": "<55 or <70 mg/dL", "bpTarget": "<130/80 mmHg", "lifestyle": "short recommendation" },
  "urgencyLevel": "Routine | Moderate | High | Emergent"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    res.json({ result: JSON.parse(response.text || '{}') });
  } catch (err: any) {
    console.error('Quick insights error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate quick insights' });
  }
});

// 2. High Thinking Deep Clinical Reasoning (using gemini-4-argon with ThinkingLevel.HIGH)
app.post('/api/ai/deep-reasoning', async (req, res) => {
  if (!checkApiKey(res)) return;
  try {
    const { patient, riskScore, cadProbabilities, vesselDetails, focusVessel } = req.body;

    const prompt = `You are a Senior Academic Cardiologist and Interventional Cardiology Consultant evaluating a complex cardiovascular patient.
Perform an exhaustive clinical reasoning evaluation covering:
1. Plaque Vulnerability & Coronary Morphology: Pathophysiology of high-risk plaque (fibroatheroma, necrotic core, microcalcifications) across LAD, LCx, RCA, LMCA based on lipid/inflammatory markers (hs-CRP ${patient.hsCrp}, Lp(a) ${patient.lipoproteinA}, CAC ${patient.cacScore}).
2. Hemodynamic & Ischemia Implications: Fractional Flow Reserve (FFR) estimation and myocardial perfusion territory risk for anterior wall (LAD), lateral/posterior wall (LCx), and inferior wall/RV (RCA).
3. Revascularization vs Optimal Medical Therapy (OMT): Synthesize guidelines from ISCHEMIA trial, COURAGE, and ACC/AHA/ESC guidelines (Syntax score consideration, PCI with Drug-Eluting Stents vs CABG vs intensive lipid-lowering with High-Intensity Statin + Ezetimibe + PCSK9 inhibitor).
4. Personalized Cardiometabolic Prescription & Monitoring Plan.

Patient Data:
- Demographics: Age ${patient.age}, ${patient.gender}, BMI ${patient.bmi || 27.5}
- Hemodynamics: BP ${patient.systolicBp}/${patient.diastolicBp} mmHg, Resting HR ${patient.restingHeartRate} bpm
- Lipid Panel: Total ${patient.totalCholesterol}, HDL ${patient.hdl}, LDL ${patient.ldl}, Triglycerides ${patient.triglycerides}, ApoB ${patient.apoB} mg/dL, Lp(a) ${patient.lipoproteinA} nmol/L
- Inflammatory & Glycemic: hs-CRP ${patient.hsCrp} mg/L, HbA1c ${patient.hba1c}%, Fasting Glucose ${patient.fastingGlucose} mg/dL
- Calcium Score: CAC ${patient.cacScore} Agatston units
- Calculated ASCVD 10-Year Risk: ${riskScore.tenYearRisk}% (${riskScore.riskCategory}), Heart Age: ${riskScore.heartAge} years vs Chronological ${patient.age} years
- Predicted Stenosis: LAD: ${vesselDetails?.LAD?.stenosis || 65}%, LCx: ${vesselDetails?.LCx?.stenosis || 35}%, RCA: ${vesselDetails?.RCA?.stenosis || 50}%, LMCA: ${vesselDetails?.LMCA?.stenosis || 15}%
${focusVessel ? `Patient specifically selected vessel for deep drill-down: ${focusVessel}` : ''}

Provide your structured clinical reasoning report in markdown format with clear clinical sections:
- Executive Clinical Impression & Pathophysiologic Phenotype
- Multi-Vessel Coronary Risk & Myocardial Ischemia Analysis
- High-Risk Plaque & Biomarker Interpretation (Lp(a), ApoB, hs-CRP, CAC)
- Revascularization Strategy vs Optimal Medical Therapy (PCI vs CABG vs OMT)
- Targeted Pharmacotherapy & Guideline-Directed Intervention Timeline`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-argon',
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        },
      },
    });

    res.json({ report: response.text });
  } catch (err: any) {
    console.error('Deep reasoning error with gemini-4-argon:', err);
    // Fallback gracefully to gemini-3.8-flash with thinking if argon is restricted or encounters quota
    try {
      console.log('Attempting fallback with gemini-3.8-flash (thinking enabled)...');
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: req.body.prompt || 'Provide cardiovascular risk clinical assessment and recommendations.',
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
        },
      });
      res.json({ report: fallbackResponse.text, fallback: true });
    } catch (fallbackErr: any) {
      res.status(500).json({ error: err.message || 'Failed deep clinical reasoning' });
    }
  }
});

// 3. Search Grounding API (using gemini-3.8-flash with googleSearch tool for real-time guidelines & clinical trial data)
app.post('/api/ai/search-grounded', async (req, res) => {
  if (!checkApiKey(res)) return;
  try {
    const { query, clinicalContext } = req.body;
    const prompt = `Search for the most current clinical guidelines, landmark cardiovascular trials, and pharmacological consensus (ACC/AHA, ESC, National Lipid Association) regarding:
"${query}"

Clinical Context of current patient:
${clinicalContext || 'Patient with multi-vessel coronary artery disease, elevated CAC score, dyslipidemia, and metabolic risk factors.'}

Please synthesize:
1. Current guideline recommendations (with Class of Recommendation and Level of Evidence if applicable)
2. Relevant landmark clinical trials (e.g., ISCHEMIA, FOURIER, ODYSSEY OUTCOMES, CLEAR Outcomes, SELECT trial, REDUCE-IT)
3. Specific therapeutic implications and clinical pearls
4. Direct source citations from peer-reviewed cardiology literature.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    // Extract search grounding metadata if present
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSearchQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];

    res.json({
      answer: response.text,
      groundingChunks,
      webSearchQueries,
    });
  } catch (err: any) {
    console.error('Search grounding error:', err);
    res.status(500).json({ error: err.message || 'Failed to search guidelines' });
  }
});

// 4. Bioscience Literature & Clinical Trials Proxy (PubMed / Europe PMC / ClinicalTrials.gov)
app.get('/api/science/literature', async (req, res) => {
  try {
    const term = String(req.query.term || 'coronary artery disease risk prediction');
    const source = String(req.query.source || 'europepmc');

    if (source === 'clinicaltrials') {
      const url = `https://clinicaltrials.gov/api/v2/studies?query.cond=${encodeURIComponent(term)}&filter.overallStatus=RECRUITING,ACTIVE_NOT_RECRUITING,COMPLETED&pageSize=6`;
      const ctRes = await fetch(url);
      if (!ctRes.ok) throw new Error(`ClinicalTrials API HTTP ${ctRes.status}`);
      const data = await ctRes.json();
      return res.json(data);
    }

    if (source === 'pubmed') {
      // Step 1: ESearch
      const esearchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(term)}&retmode=json&retmax=6&sort=pub_date`;
      const esearchRes = await fetch(esearchUrl);
      const esearchData = await esearchRes.json();
      const idList = esearchData.esearchresult?.idlist || [];

      if (idList.length === 0) {
        return res.json({ studies: [] });
      }

      // Step 2: ESummary
      const esummaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${idList.join(',')}&retmode=json`;
      const esummaryRes = await fetch(esummaryUrl);
      const esummaryData = await esummaryRes.json();
      return res.json(esummaryData);
    }

    // Default: Europe PMC
    const epmcUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(term)}&format=json&pageSize=8&resultType=lite`;
    const epmcRes = await fetch(epmcUrl);
    if (!epmcRes.ok) throw new Error(`Europe PMC HTTP ${epmcRes.status}`);
    const data = await epmcRes.json();
    res.json(data);
  } catch (err: any) {
    console.error('Literature fetch error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch literature' });
  }
});

// Set up Vite middlewares in development or serve static assets in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Cardio3D Server running on http://localhost:${PORT}`);
  });
}

startServer();
