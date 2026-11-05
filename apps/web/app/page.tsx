"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { IngestModal } from '@/components/workbench/IngestModal';
import TechText from '@/components/TechText/TechText';
import CircularText from '@/components/CircularText/CircularText';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1';

export default function RelayDashboard() {
  const [handovers, setHandovers] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true);
      try {
        const [handoverRes, healthRes] = await Promise.all([
          fetch(`${API_BASE}/handovers`).catch(() => fetch('/api/v1/handovers')),
          fetch(`${API_BASE}/health`).catch(() => fetch('/api/v1/health'))
        ]);

        if (handoverRes && handoverRes.ok) {
          const hData = await handoverRes.json();
          setHandovers(hData.handovers || []);
        }
        if (healthRes && healthRes.ok) {
          const hlData = await healthRes.json();
          setHealth(hlData);
        }
      } catch (e) {
        console.warn("Using offline dashboard fallback");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const defaultHandoverId = handovers[0]?.id || "f5c22997-cbf6-4b89-a5f1-331e3d30628e";

  return (
    <div className="min-h-screen bg-[#0C0D0E] text-[#ECEDEE] font-sans selection:bg-[#FACC15]/20 flex flex-col">
      {/* Precision Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-[#26292B] bg-[#151718] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-[#4ADE80] rounded-full animate-pulse" />
          <h1 className="font-mono font-bold tracking-wider text-xs uppercase text-[#ECEDEE]">
            RELAY <span className="text-[#8B8D98] font-normal">/ INSTITUTIONAL TRUTH INFRASTRUCTURE</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] font-mono text-[#8B8D98] bg-[#0C0D0E] border border-[#26292B] px-2.5 py-1 rounded-sm">
            <span>STORAGE:</span>
            <span className="text-[#4ADE80]">
              {health?.storage === 'sqlite-persistent' ? 'SQLITE PERSISTENT' : 'READY'}
            </span>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#4ADE80] hover:bg-[#3ec46f] text-black px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all"
          >
            + Ingest Custom Data
          </button>

          <Link
            href={`/handover/${defaultHandoverId}`}
            className="bg-[#ECEDEE] text-[#0C0D0E] px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-[#B0B2B5] transition-all"
          >
            Open Primary Dossier
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-8 space-y-10">
        {/* Banner Section */}
        <section className="space-y-4 border-b border-[#26292B] pb-8">
          {/* TechText Interactive Hero Display */}
          <div className="w-full h-48 md:h-56 relative overflow-hidden bg-[#151718]/40 border border-[#26292B] rounded-sm flex items-center justify-center">
            <TechText
              text="RELAY"
              fontWeight={800}
              fontSize={140}
              letterSpacing={-0.03}
              color="#ECEDEE"
              accentColor="#4ADE80"
              reveal="letter"
              dashLength={4}
              dashGap={2}
              specks={18}
              intro="none"
              introDuration={2}
              clickKick
              draggable
              sweep
              guides={false}
              className="w-full h-full"
            />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-1">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[#8B8D98] uppercase tracking-[0.25em]">
                  THE IMMUTABLE RECORD OF TRUTH
                </span>
                <Badge variant="success">PRODUCTION GRADE</Badge>
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight text-[#ECEDEE]">
                Enterprise Knowledge Handover & Contradiction Reconciliation
              </h2>
              <p className="text-sm text-[#8B8D98] leading-relaxed">
                Relay extracts and reconciles project state from scattered communication trails (GitHub PRs, Slack incident dumps, Linear tickets) into an immutable, role-governed Transition Dossier with cryptographic SHA-256 provenance.
              </p>
            </div>

            {/* CircularText Institutional Provenance Seal */}
            <div className="shrink-0 flex items-center justify-center p-2 bg-[#151718]/60 border border-[#26292B] rounded-sm">
              <CircularText
                text="RELAY*PROVENANCE*VERIFIED*AUDIT*TRAIL*"
                onHover="speedUp"
                direction="clockwise"
                spinDuration={18}
                size={140}
                fontSize={11}
                fontWeight={700}
                draggable
                hoverTilt={20}
                ring
                ringColor="#26292B"
                color="#4ADE80"
                className="font-mono text-[#4ADE80]"
              >
                <div className="flex flex-col items-center justify-center text-center select-none pointer-events-none">
                  <div className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse mb-1" />
                  <span className="text-[9px] font-mono font-bold tracking-widest text-[#ECEDEE]">MERKLE</span>
                  <span className="text-[7px] font-mono text-[#8B8D98]">SEAL</span>
                </div>
              </CircularText>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 border border-[#26292B] bg-[#151718] rounded-sm space-y-2">
            <div className="text-[10px] font-mono uppercase text-[#FACC15]">01 / Temporal Contradiction Detection</div>
            <h3 className="text-sm font-bold text-[#ECEDEE]">Pairwise Assertion Matrix</h3>
            <p className="text-xs text-[#8B8D98] leading-relaxed">
              Surfaces architectural rollback collisions (e.g., Dragonfly PR vs Slack rollback) for human arbitration rather than silent hallucinatory blending.
            </p>
          </div>

          <div className="p-5 border border-[#26292B] bg-[#151718] rounded-sm space-y-2">
            <div className="text-[10px] font-mono uppercase text-[#4ADE80]">02 / Role-Based Projections (ABAC)</div>
            <h3 className="text-sm font-bold text-[#ECEDEE]">Restricted Access Boundaries</h3>
            <p className="text-xs text-[#8B8D98] leading-relaxed">
              Dynamically scopes claims across Executive Lead, Direct Successor, and Contributor roles to eliminate institutional credential and architecture leakage.
            </p>
          </div>

          <div className="p-5 border border-[#26292B] bg-[#151718] rounded-sm space-y-2">
            <div className="text-[10px] font-mono uppercase text-[#60A5FA]">03 / Cryptographic Attestation</div>
            <h3 className="text-sm font-bold text-[#ECEDEE]">SHA-256 Manifest Freeze</h3>
            <p className="text-xs text-[#8B8D98] leading-relaxed">
              Calculates a canonical digest across verified claims, freezing the transition dossier into an unalterable compliance audit record.
            </p>
          </div>
        </section>

        {/* Active Transition Dossiers Table */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-mono uppercase tracking-widest text-[#8B8D98]">
              Active Transition Dossiers ({handovers.length || 1})
            </h3>

            <button
              onClick={() => setIsModalOpen(true)}
              className="text-[10px] font-mono bg-[#1E2022] hover:bg-[#26292B] border border-[#323539] text-[#ECEDEE] px-3 py-1 rounded-sm transition-colors"
            >
              + Ingest & Synthesize New Handover
            </button>
          </div>

          <div className="border border-[#26292B] bg-[#151718] rounded-sm divide-y divide-[#26292B]">
            {handovers.map((h, idx) => (
              <div key={h.id} className="p-5 flex items-center justify-between hover:bg-[#191B1D] transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#8B8D98]">
                      DOSSIER #{h.id.substring(0, 16)}
                    </span>
                    <Badge variant={h.status === 'FROZEN' ? 'info' : 'warning'}>{h.status}</Badge>
                  </div>
                  <h4 className="text-sm font-semibold text-[#ECEDEE]">{h.title}</h4>
                  <p className="text-xs text-[#8B8D98]">
                    Departing User: <code className="text-[#ECEDEE]">@{h.departing_user_id}</code> • Created: {new Date(h.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/handover/${h.id}`}
                    className="bg-[#26292B] hover:bg-[#323539] text-[#ECEDEE] px-3 py-1.5 text-xs font-mono rounded-sm transition-colors"
                  >
                    Inspect Dossier →
                  </Link>
                  <Link
                    href={`/handover/${h.id}/runway`}
                    className="border border-[#26292B] hover:bg-[#1E2022] text-[#8B8D98] hover:text-[#ECEDEE] px-3 py-1.5 text-xs font-mono rounded-sm transition-colors"
                  >
                    Runway
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <IngestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
