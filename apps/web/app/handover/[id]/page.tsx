import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '../ui/badge';

const API_BASE = 'http://localhost:8000/api/v1';

export default function HandoverWorkbench() {
  const [data, setData] = useState(null);
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const [role, setRole] = useState('ROLE_DIRECT_SUCCESSOR');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mock ID for the demo
  const handoverId = "f5c22997-cbf6-4b89-a5f1-331e3d30628e";

  useEffect(() => {
    async function fetchHandover() {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/handovers/${handoverId}?role=${role}`);
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchHandover();
  }, [role]);

  if (loading) return (
    <div className="h-screen bg-[#0C0D0E] flex items-center justify-center font-mono text-[#8B8D98] text-xs uppercase tracking-widest animate-pulse">
      Synchronizing Transition Dossier...
    </div>
  );

  if (error) return (
    <div className="h-screen bg-[#0C0D0E] flex items-center justify-center font-mono text-red-500 text-xs uppercase tracking-widest">
      Error: {error} | Please ensure the FastAPI backend is running at :8000
    </div>
  );

  const selectedClaim = data?.claims.find(c => c.id === selectedClaimId);

  return (
    <div className="flex flex-col h-screen bg-[#0C0D0E] text-[#ECEDEE] font-sans selection:bg-[#D4AF37]/30 overflow-hidden">
      {/* Header: Precision-Engineered */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-[#26292B] bg-[#151718] z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#4ADE80] rounded-full animate-pulse" />
            <span className="font-mono font-bold tracking-tighter text-xs uppercase">
              Relay <span className="text-[#8B8D98] font-normal ml-2 opacity-60">/ {data?.title || 'Handover'}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#0C0D0E] border border-[#26292B] rounded-sm px-1">
            <select
              value={role}
              onChange={(e) => { setRole(e.target.value); setSelectedClaimId(null); }}
              className="bg-transparent text-[10px] font-mono px-2 py-1 outline-none cursor-pointer text-[#8B8D98] hover:text-[#ECEDEE] transition-colors"
            >
              <option value="ROLE_EXECUTIVE_LEAD">Executive Lead</option>
              <option value="ROLE_DIRECT_SUCCESSOR">Direct Successor</option>
              <option value="ROLE_CONTRIBUTOR_TEAM">Contributor Team</option>
            </select>
          </div>
          <button className="bg-[#ECEDEE] text-[#0C0D0E] px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-[#B0B2B5] transition-all active:scale-95">
            Freeze Dossier
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Left Pane: The Claims Ledger */}
        <div className="w-1/2 border-r border-[#26292B] overflow-y-auto p-4 space-y-6 custom-scrollbar">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8B8D98]">Dossier Claims</h2>
            <div className="flex gap-1">
              {['All', 'Decisions', 'Conflicts'].map(f => (
                <button key={f} className="text-[9px] px-2 py-0.5 border border-[#26292B] text-[#8B8D98] rounded-sm hover:bg-[#151718] transition-all">{f}</button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {data?.conflicts.map(conflict => (
              <motion.div
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                key={conflict.id}
                className="p-3 border border-[#6E4F00] bg-[#382800]/10 rounded-sm space-y-3 relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-[#FACC15]" />
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-mono text-[#FACC15] font-bold">⚠️ CONFLICT #{conflict.id}</span>
                  <Badge variant="warning">OPEN</Badge>
                </div>
                <p className="text-xs text-[#ECEDEE] leading-relaxed font-medium">{conflict.description}</p>
                <button className="text-[10px] font-bold uppercase tracking-tighter bg-[#6E4F00] text-white px-2 py-1 rounded-sm hover:bg-[#8A6B00] transition-colors">
                  Arbitrate
                </button>
              </motion.div>
            ))}

            <AnimatePresence mode="popLayout">
              {data?.claims.map((claim) => (
                <motion.div
                  layout
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  key={claim.id}
                  onClick={() => setSelectedClaimId(claim.id)}
                  className={`p-3 border cursor-pointer transition-all rounded-sm space-y-3 ${
                    selectedClaimId === claim.id ? 'border-[#ECEDEE] bg-[#151718]' : 'border-[#26292B] bg-[#0C0D0E] hover:border-[#404245]'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-[#8B8D98]">CLAIM #{claim.id}</span>
                    <span className="text-[10px] font-mono text-[#8B8D98] opacity-60">CONF: {Math.round(claim.confidence_score * 100)}%</span>
                  </div>
                  <h3 className="text-sm font-semibold tracking-tight">{claim.title}</h3>
                  <p className="text-xs text-[#8B8D98] leading-relaxed line-clamp-2">{claim.description}</p>
                  <div className="flex justify-between items-center pt-1">
                    <Badge variant={claim.human_status === 'VERIFIED' ? 'success' : 'neutral'}>{claim.human_status}</Badge>
                    <span className="text-[9px] font-mono text-[#8B8D98] uppercase tracking-widest opacity-50">{claim.security_classification}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Pane: The Forensic Ledger */}
        <div className="w-1/2 bg-[#0C0D0E] overflow-y-auto p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            {selectedClaim ? (
              <motion.div
                key={selectedClaim.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="border-b border-[#26292B] pb-2 mb-6">
                  <h2 className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#8B8D98]">Evidence Audit Trace</h2>
                </div>
                <div className="space-y-6">
                  {selectedClaim.citations?.map((cite, idx) => (
                    <div key={idx} className="group relative p-5 border border-[#26292B] bg-[#151718] rounded-sm transition-all hover:border-[#404245]">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-[#8B8D98] bg-[#0C0D0E] px-1.5 py-0.5 border border-[#26292B] rounded-sm">
                            [{idx+1}] {cite.source || 'SOURCE'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-[#8B8D98] opacity-40 group-hover:opacity-100 transition-opacity cursor-help">
                          SHA-256: {cite.hash || 'pending...'}
                        </span>
                      </div>
                      <div className="relative p-4 bg-[#0C0D0E] border-l-2 border-[#ECEDEE] italic text-sm font-mono text-[#ECEDEE] leading-relaxed">
                        "{cite.quote}"
                      </div>
                      <div className="flex justify-between items-center mt-4 text-[10px] font-mono text-[#8B8D98]">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-[#8B8D98] rounded-full" />
                          {cite.author || '@unknown'}
                        </span>
                        <span className="opacity-60">{cite.time || 'timestamp missing'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[#8B8D98] opacity-40 space-y-4">
                <div className="w-16 h-16 border border-[#26292B] rounded-full flex items-center justify-center text-2xl">🔍</div>
                <p className="text-xs font-mono uppercase tracking-[0.2em]">Audit Evidence Pending Selection</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #26292B; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #404245; }
      `}</style>
    </div>
  );
}
