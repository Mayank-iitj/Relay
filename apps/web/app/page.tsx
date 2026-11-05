"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { IngestModal } from '@/components/workbench/IngestModal';
import TechText from '@/components/TechText/TechText';
import CircularText from '@/components/CircularText/CircularText';
import CrystalizedBall from '@/components/CrystalizedBall/CrystalizedBall';
import DitherVeil from '@/components/DitherVeil/DitherVeil';
import SpecularButton from '@/components/SpecularButton/SpecularButton';
import MagicBento from '@/components/MagicBento/MagicBento';
import FlyingButton from '@/components/FlyingButton/FlyingButton';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1';

export default function RelayDashboard() {
  const [handovers, setHandovers] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeVisualizer, setActiveVisualizer] = useState<'plasma' | 'veil'>('plasma');

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

          <SpecularButton
            size="sm"
            radius={4}
            tint="#4ADE80"
            tintOpacity={0.12}
            textColor="#4ADE80"
            lineColor="#4ADE80"
            baseColor="#26292B"
            intensity={1.2}
            idleIntensity={0.35}
            shineSize={12}
            shineFade={30}
            thickness={1.3}
            glow={1}
            followMouse
            proximity={200}
            onClick={() => setIsModalOpen(true)}
            className="font-mono text-[10px] uppercase font-bold tracking-widest px-3 py-1"
          >
            + Ingest Custom Data
          </SpecularButton>

          <FlyingButton
            size="small"
            theme="dark"
            altitude={130}
            hoverTime={2.2}
            jets={2}
            thrustColor="#4ADE80"
            smokeColor="#4ADE80"
            buttonColor="#151718"
            textColor="#4ADE80"
            onClick={() => {
              window.location.href = `/handover/${defaultHandoverId}`;
            }}
          >
            Launch Flight ✈
          </FlyingButton>

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

        {/* Institutional Architecture Magic Bento */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-widest text-[#8B8D98]">
              Institutional Architecture & Governance Matrix
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-[#151718] border border-[#26292B] text-[#4ADE80] rounded-sm">
              INTERACTIVE BENTO
            </span>
          </div>

          <MagicBento
            columns={3}
            rowHeight={220}
            gap={14}
            radius={6}
            theme="dark"
            glowColor="#4ADE80"
            enableBorderGlow={true}
            enableSpotlight={true}
            spotlightRadius={300}
            enableStars={true}
            particleCount={20}
            enableTilt={true}
            enableMagnetism={true}
            clickEffect={true}
            items={[
              {
                label: "01 / TEMPORAL CONTRADICTION DETECTION",
                title: "Pairwise Assertion Matrix",
                description: "Surfaces architectural rollback collisions (e.g., Dragonfly PR vs Slack rollback) for human arbitration rather than silent hallucinatory blending.",
                visual: "analytics",
                colSpan: 1,
              },
              {
                label: "02 / ROLE-BASED PROJECTIONS (ABAC)",
                title: "Restricted Access Boundaries",
                description: "Dynamically scopes claims across Executive Lead, Direct Successor, and Contributor roles to eliminate institutional credential and architecture leakage.",
                visual: "security",
                colSpan: 1,
              },
              {
                label: "03 / CRYPTOGRAPHIC ATTESTATION",
                title: "SHA-256 Manifest Freeze",
                description: "Calculates a canonical digest across verified claims, freezing the transition dossier into an unalterable compliance audit record.",
                visual: "collaboration",
                colSpan: 1,
              },
              {
                label: "04 / FORENSIC STATE TOPOLOGY",
                title: "WebGL Shader Visualization",
                description: "Real-time canvas shader rendering of knowledge state topology, plasma density crackle, and dynamic claim error diffusion.",
                visual: "dashboard",
                colSpan: 1,
              },
              {
                label: "05 / AUTOMATED INGESTION PIPELINES",
                title: "Multi-Source Extraction",
                description: "Parses asynchronous communication threads, pull request reviews, and issue states with millisecond synchronization.",
                visual: "automation",
                colSpan: 1,
              },
              {
                label: "06 / MERKLE PROVENANCE AUDIT",
                title: "Tamper-Evident Sign-Off Trails",
                description: "Generates tamper-evident hash chains sealing executive handover declarations directly into local SQLite storage.",
                visual: "integration",
                colSpan: 1,
              }
            ]}
          />
        </section>

        {/* Interactive Engine Visualizers */}
        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-[#8B8D98]">
                Institutional Engine Visualizers
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-[#151718] border border-[#26292B] text-[#4ADE80] rounded-sm">
                WEBGL SHADERS
              </span>
            </div>

            <div className="flex items-center gap-1 bg-[#151718] border border-[#26292B] p-0.5 rounded-sm">
              <button
                onClick={() => setActiveVisualizer('plasma')}
                className={`text-[10px] font-mono px-3 py-1 rounded-sm uppercase tracking-wider transition-colors ${
                  activeVisualizer === 'plasma'
                    ? 'bg-[#26292B] text-[#4ADE80] font-bold'
                    : 'text-[#8B8D98] hover:text-[#ECEDEE]'
                }`}
              >
                Kernel Plasma Ball
              </button>
              <button
                onClick={() => setActiveVisualizer('veil')}
                className={`text-[10px] font-mono px-3 py-1 rounded-sm uppercase tracking-wider transition-colors ${
                  activeVisualizer === 'veil'
                    ? 'bg-[#26292B] text-[#4ADE80] font-bold'
                    : 'text-[#8B8D98] hover:text-[#ECEDEE]'
                }`}
              >
                Forensic Dither Veil
              </button>
            </div>
          </div>

          <div className="w-full h-72 md:h-80 relative overflow-hidden bg-[#151718]/40 border border-[#26292B] rounded-sm flex items-center justify-center">
            {activeVisualizer === 'plasma' ? (
              <CrystalizedBall
                preset="aurora"
                color="#4ADE80"
                size={0.7}
                crackle={0.75}
                fill={0.5}
                interactive
                hoverStrength={0.75}
              />
            ) : (
              <DitherVeil
                pattern="floyd"
                pixelSize={2}
                inkColor="#0C0D0E"
                paperColor="#4ADE80"
                revealRadius={180}
                softness={0.55}
                linger={1}
              />
            )}
          </div>
        </section>

        {/* Active Transition Dossiers Table */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-mono uppercase tracking-widest text-[#8B8D98]">
              Active Transition Dossiers ({handovers.length || 1})
            </h3>

            <SpecularButton
              size="sm"
              radius={4}
              tint="#ffffff"
              tintOpacity={0.04}
              textColor="#ECEDEE"
              lineColor="#4ADE80"
              baseColor="#323539"
              intensity={1}
              idleIntensity={0.25}
              shineSize={10}
              shineFade={28}
              thickness={1.2}
              glow={0.8}
              followMouse
              proximity={180}
              onClick={() => setIsModalOpen(true)}
              className="text-[10px] font-mono px-3 py-1"
            >
              + Ingest & Synthesize New Handover
            </SpecularButton>
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
                  <FlyingButton
                    size="small"
                    theme="dark"
                    altitude={120}
                    jets={2}
                    thrustColor="#4ADE80"
                    smokeColor="#4ADE80"
                    buttonColor="#26292B"
                    textColor="#ECEDEE"
                    onClick={() => {
                      window.location.href = `/handover/${h.id}`;
                    }}
                  >
                    Inspect Dossier ✈
                  </FlyingButton>
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
