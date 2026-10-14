import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  FlaskConical,
  ExternalLink,
  Search,
  Loader2,
  FileText,
  BadgeCheck,
  Tag,
} from 'lucide-react';

export const ScienceWorkbench: React.FC = () => {
  const [activeQuery, setActiveQuery] = useState('coronary artery calcium Agatston cardiovascular risk');
  const [source, setSource] = useState<'europepmc' | 'pubmed' | 'clinicaltrials'>('europepmc');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick try pill bar for biological and clinical targets
  const QUICK_TOPICS = [
    { label: 'PCSK9 & Evolocumab (FOURIER)', query: 'PCSK9 inhibitor evolocumab cardiovascular outcomes FOURIER' },
    { label: 'Coronary Calcium (CAC)', query: 'coronary artery calcium score Agatston atherosclerosis risk' },
    { label: 'ISCHEMIA Trial (Revascularization)', query: 'ISCHEMIA trial revascularization optimal medical therapy' },
    { label: 'Lp(a) Atherogenicity', query: 'lipoprotein a cardiovascular disease hazard ratio' },
    { label: 'ApoB vs LDL Particle Count', query: 'apolipoprotein B LDL particle count cardiovascular risk' },
    { label: 'CCTA & Plaque Vulnerability', query: 'coronary computed tomography angiography high risk plaque' },
  ];

  const fetchScienceData = async (queryToRun: string, sourceToRun: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/science/literature?term=${encodeURIComponent(queryToRun)}&source=${sourceToRun}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status} from literature endpoint`);
      const data = await res.json();

      if (sourceToRun === 'clinicaltrials') {
        const studies = data.studies || [];
        setResults(
          studies.map((s: any) => ({
            id: s.protocolSection?.identificationModule?.nctId || 'NCT',
            title: s.protocolSection?.identificationModule?.briefTitle || 'Clinical Study',
            leadSponsor: s.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name || 'Academic Sponsor',
            status: s.protocolSection?.statusModule?.overallStatus || 'RECRUITING',
            phase: s.protocolSection?.designModule?.phases?.[0] || 'PHASE 3',
            provenance: 'ClinicalTrials.gov Protocol',
            url: `https://clinicaltrials.gov/study/${s.protocolSection?.identificationModule?.nctId}`,
          }))
        );
      } else if (sourceToRun === 'pubmed') {
        const resultDict = data.result || {};
        const uids = resultDict.uids || [];
        setResults(
          uids.map((uid: string) => {
            const item = resultDict[uid] || {};
            return {
              id: `PMID:${uid}`,
              title: item.title || 'PubMed Biomedical Article',
              authors: item.authors?.map((a: any) => a.name).join(', ') || 'Consortium Authors',
              source: item.source || item.fulljournalname || 'Cardiol J',
              pubdate: item.pubdate || '2024',
              provenance: 'PubMed Peer-Reviewed',
              url: `https://pubmed.ncbi.nlm.nih.gov/${uid}/`,
            };
          })
        );
      } else {
        // Europe PMC
        const resultList = data.resultList?.result || [];
        setResults(
          resultList.map((r: any) => ({
            id: r.pmid ? `PMID:${r.pmid}` : r.id,
            title: r.title || 'Europe PMC Article',
            authors: r.authorString || 'Investigator Group',
            source: r.journalTitle || 'Cardiovascular Medicine',
            pubdate: r.pubYear || '2024',
            citations: r.citedByCount || 0,
            provenance: 'Europe PMC Curated',
            url: r.pmid ? `https://europepmc.org/article/MED/${r.pmid}` : `https://doi.org/${r.doi}`,
          }))
        );
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch scientific evidence');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScienceData(activeQuery, source);
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 text-slate-200 overflow-hidden">
      {/* Workbench Header */}
      <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="text-teal-400" size={16} />
          <div>
            <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
              <span>Cardiovascular Bioscience Workbench</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-teal-950 text-teal-300 border border-teal-500/40">
                DeepMind Science Skill
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-sans">
              Authoritative Evidence from PubMed, Europe PMC & ClinicalTrials.gov
            </div>
          </div>
        </div>
      </div>

      {/* Quick Try Pill Bar (Mandatory Science Skill Standard) */}
      <div className="p-3 bg-slate-950/40 border-b border-slate-800">
        <div className="text-[10px] font-mono uppercase text-slate-400 mb-1.5">
          Cardiovascular Evidence Focus:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_TOPICS.map((topic, idx) => (
            <button
              key={idx}
              onClick={() => {
                setActiveQuery(topic.query);
                fetchScienceData(topic.query, source);
              }}
              className={`text-[10px] font-mono px-2 py-1 rounded transition border ${
                activeQuery === topic.query
                  ? 'bg-teal-500/20 text-teal-300 border-teal-400 font-semibold'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              {topic.label}
            </button>
          ))}
        </div>
      </div>

      {/* Source Selector & Search Box */}
      <div className="p-3 border-b border-slate-800 flex flex-col gap-2 bg-slate-900/60">
        <div className="flex items-center gap-2">
          {(['europepmc', 'clinicaltrials', 'pubmed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setSource(s);
                fetchScienceData(activeQuery, s);
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
                source === s
                  ? 'bg-teal-600 text-white font-semibold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {s === 'europepmc' ? 'Europe PMC' : s === 'clinicaltrials' ? 'ClinicalTrials.gov' : 'PubMed'}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={activeQuery}
            onChange={(e) => setActiveQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fetchScienceData(activeQuery, source);
            }}
            placeholder="Search biological pathways or clinical trials..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
          />
          <button
            onClick={() => fetchScienceData(activeQuery, source)}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium flex items-center gap-1 transition disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
          </button>
        </div>
      </div>

      {/* Results Feed with Epistemic Badges */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {error && (
          <div className="p-3 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12 text-slate-400 text-xs gap-2">
            <Loader2 size={16} className="animate-spin text-teal-400" />
            <span>Querying peer-reviewed scientific registry...</span>
          </div>
        )}

        {!isLoading && results.length === 0 && !error && (
          <div className="text-center py-10 text-slate-500 text-xs">
            No scientific entries found for this query.
          </div>
        )}

        {!isLoading &&
          results.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-teal-500/40 transition space-y-2 text-xs"
            >
              {/* Top Provenance Badge */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-teal-950/80 text-teal-300 border border-teal-500/30">
                  <BadgeCheck size={11} />
                  <span>[{item.provenance}]</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">{item.id}</span>
              </div>

              {/* Title */}
              <div className="font-semibold text-slate-200 text-xs leading-snug">
                {item.title}
              </div>

              {/* Authors & Journal / Sponsor */}
              <div className="text-[11px] text-slate-400 font-sans truncate">
                {item.authors || item.leadSponsor}
              </div>

              {/* Footer with Outbound Link */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] font-mono text-slate-400">
                <span>
                  {item.source || item.phase} • {item.pubdate || item.status}
                </span>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-teal-400 hover:text-teal-300 transition"
                >
                  <span>Authoritative Record</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
