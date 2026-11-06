"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api/v1';

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IngestModal: React.FC<IngestModalProps> = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState('Payment Gateway & Settlement Migration');
  const [author, setAuthor] = useState('alex.lead');
  const [mode, setMode] = useState<'custom' | 'scenario' | 'github'>('custom');
  const [cloneUrl, setCloneUrl] = useState('https://github.com/Mayank-iitj/Relay.git');
  const [gitBranch, setGitBranch] = useState('main');
  const [gitToken, setGitToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chunks, setChunks] = useState([
    {
      source_type: 'GITHUB_PR',
      source_url: 'https://github.com/org/payments/pull/402',
      author_handle: 'alex.lead',
      timestamp: '2026-10-12T14:00:00Z',
      content: 'Migrated primary event bus to Kafka cluster in us-west-2. Decommissioned legacy RabbitMQ brokers.'
    },
    {
      source_type: 'SLACK_THREAD',
      source_url: 'https://org.slack.com/archives/incident-war-room/p987654',
      author_handle: 'alex.lead',
      timestamp: '2026-10-15T09:30:00Z',
      content: 'Critical incident: Kafka partition rebalance storm causing checkout timeouts. Aborted rollout and rolling back to RabbitMQ immediately.'
    }
  ]);

  const addChunk = () => {
    setChunks([
      ...chunks,
      {
        source_type: 'GITHUB_PR',
        source_url: 'https://github.com/org/service/pull/1',
        author_handle: author,
        timestamp: new Date().toISOString(),
        content: ''
      }
    ]);
  };

  const updateChunk = (index: number, field: string, val: string) => {
    const updated = [...chunks];
    (updated[index] as any)[field] = val;
    setChunks(updated);
  };

  const removeChunk = (index: number) => {
    if (chunks.length <= 1) return;
    setChunks(chunks.filter((_, i) => i !== index));
  };

  const handleApplyPreset = (preset: 'kafka' | 'auth0' | 'dragonfly') => {
    if (preset === 'kafka') {
      setTitle('Event Streaming Infrastructure Handover');
      setAuthor('infra.lead');
      setChunks([
        {
          source_type: 'GITHUB_PR',
          source_url: 'https://github.com/org/infra/pull/501',
          author_handle: 'infra.lead',
          timestamp: '2026-10-01T10:00:00Z',
          content: 'Migrated message streaming from RabbitMQ to Apache Kafka cluster. Verified throughput in staging.'
        },
        {
          source_type: 'SLACK_THREAD',
          source_url: 'https://org.slack.com/archives/infra/p1698000',
          author_handle: 'infra.lead',
          timestamp: '2026-10-04T16:20:00Z',
          content: 'Heads up team: Kafka consumer group lag spikes during load testing. Aborting cutover and rolling back to RabbitMQ.'
        }
      ]);
    } else if (preset === 'auth0') {
      setTitle('Identity & Session Authentication Handover');
      setAuthor('security.lead');
      setChunks([
        {
          source_type: 'GITHUB_PR',
          source_url: 'https://github.com/org/auth/pull/210',
          author_handle: 'security.lead',
          timestamp: '2026-10-08T11:00:00Z',
          content: 'Replaced legacy Cognito user pool with Auth0 universal login. Secret encryption keys stored in AWS KMS.'
        },
        {
          source_type: 'LINEAR_ISSUE',
          source_url: 'https://linear.app/org/issue/SEC-89',
          author_handle: 'security.lead',
          timestamp: '2026-10-11T13:40:00Z',
          content: 'Auth0 token renewal rate limit reached in VPC. Reverted session validation to Cognito until enterprise tier upgrade.'
        }
      ]);
    } else if (preset === 'dragonfly') {
      setTitle('Core Banking API & Session Architecture Handover');
      setAuthor('schen');
      setChunks([
        {
          source_type: 'GITHUB_PR',
          source_url: 'https://github.com/org/core-api/pull/1082',
          author_handle: 'schen',
          timestamp: '2026-10-18T14:22:00Z',
          content: 'Refactored session caching. Replaced Redis cluster with local Dragonfly instance due to memory overhead in VPC. Verified in staging.'
        },
        {
          source_type: 'SLACK_THREAD',
          source_url: 'https://org.slack.com/archives/C021/p1697640000',
          author_handle: 'schen',
          timestamp: '2026-10-21T09:15:00Z',
          content: 'Heads up: Dragonfly memory leak bug observed during staging load test. Rolling back to Redis until v1.2 patch lands. Do not use Dragonfly for now.'
        }
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (mode === 'github') {
      if (!cloneUrl.trim()) {
        setError('Please provide a valid GitHub or Git Clone URL.');
        setSubmitting(false);
        return;
      }

      try {
        let res = await fetch(`${API_BASE}/handovers/import-github`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clone_url: cloneUrl.trim(),
            branch: gitBranch.trim() || 'main',
            token: gitToken.trim() || undefined,
            title: title.trim() || undefined,
            departing_user_id: author.trim() || undefined,
            max_commits: 20
          })
        });

        if (!res.ok) {
          res = await fetch(`/api/v1/handovers/import-github`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clone_url: cloneUrl.trim(),
              branch: gitBranch.trim() || 'main',
              token: gitToken.trim() || undefined,
              title: title.trim() || undefined,
              departing_user_id: author.trim() || undefined,
              max_commits: 20
            })
          });
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `HTTP Error: ${res.status}`);
        }
        const json = await res.json();
        window.location.href = `/handover/${json.handover_id}`;
      } catch (err: any) {
        setError(err.message || 'Failed to import repository.');
        setSubmitting(false);
      }
      return;
    }

    const validChunks = chunks.filter(c => c.content.trim().length > 0);
    if (validChunks.length === 0) {
      setError('Please provide at least one source chunk with content.');
      setSubmitting(false);
      return;
    }

    try {
      let res = await fetch(`${API_BASE}/handovers/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: '11111111-2222-3333-4444-555555555555',
          departing_user_id: author,
          title: title,
          sources: validChunks
        })
      });

      if (!res.ok) {
        res = await fetch(`/api/v1/handovers/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspace_id: '11111111-2222-3333-4444-555555555555',
            departing_user_id: author,
            title: title,
            sources: validChunks
          })
        });
      }

      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const json = await res.json();
      window.location.href = `/handover/${json.handover_id}`;
    } catch (err: any) {
      setError(err.message || 'Failed to generate dossier. Make sure FastAPI is running.');
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-3xl bg-[#0C0D0E] border border-[#26292B] rounded-sm p-6 text-[#ECEDEE] shadow-2xl space-y-6 my-8"
      >
        <div className="flex justify-between items-start border-b border-[#26292B] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-[#4ADE80] font-bold uppercase tracking-widest">
                REAL-TIME DATA SYNTHESIS
              </span>
              <Badge variant="success">NON-MOCK</Badge>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[#ECEDEE] mt-1">
              Ingest & Synthesize New Handover Dossier
            </h2>
            <p className="text-xs text-[#8B8D98] mt-1">
              Paste arbitrary Git commits, Slack incident discussions, or Linear tickets. Relay will extract decisions, evaluate security classifications, and detect temporal contradictions.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#8B8D98] hover:text-[#ECEDEE] font-mono text-sm px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2 border-b border-[#26292B] pb-3">
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={`text-xs font-mono px-3 py-1.5 rounded-sm transition-colors ${
              mode === 'custom'
                ? 'bg-[#26292B] text-[#4ADE80] font-bold border border-[#4ADE80]/30'
                : 'text-[#8B8D98] hover:text-[#ECEDEE]'
            }`}
          >
            Custom Threads & Dumps
          </button>
          <button
            type="button"
            onClick={() => setMode('scenario')}
            className={`text-xs font-mono px-3 py-1.5 rounded-sm transition-colors ${
              mode === 'scenario'
                ? 'bg-[#26292B] text-[#4ADE80] font-bold border border-[#4ADE80]/30'
                : 'text-[#8B8D98] hover:text-[#ECEDEE]'
            }`}
          >
            Pre-loaded Scenarios
          </button>
          <button
            type="button"
            onClick={() => setMode('github')}
            className={`text-xs font-mono px-3 py-1.5 rounded-sm transition-colors flex items-center gap-1.5 ${
              mode === 'github'
                ? 'bg-[#26292B] text-[#FACC15] font-bold border border-[#FACC15]/30'
                : 'text-[#FACC15]/80 hover:text-[#FACC15]'
            }`}
          >
            <span>🐙</span>
            <span>Git Clone URL (No OAuth)</span>
          </button>
        </div>

        {mode === 'github' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#8B8D98] block">
                Quick Repository Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCloneUrl('https://github.com/Mayank-iitj/Relay.git');
                    setGitBranch('main');
                    setTitle('Relay Core Infrastructure Handover');
                  }}
                  className="text-[10px] font-mono px-2.5 py-1 bg-[#151718] border border-[#26292B] hover:border-[#FACC15] text-[#ECEDEE] rounded-sm transition-colors"
                >
                  Relay Core (Self)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCloneUrl('https://github.com/fastapi/fastapi.git');
                    setGitBranch('master');
                    setTitle('FastAPI Framework Handover');
                  }}
                  className="text-[10px] font-mono px-2.5 py-1 bg-[#151718] border border-[#26292B] hover:border-[#FACC15] text-[#ECEDEE] rounded-sm transition-colors"
                >
                  FastAPI / Python
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCloneUrl('https://github.com/vercel/next.js.git');
                    setGitBranch('canary');
                    setTitle('Next.js App Engine Handover');
                  }}
                  className="text-[10px] font-mono px-2.5 py-1 bg-[#151718] border border-[#26292B] hover:border-[#FACC15] text-[#ECEDEE] rounded-sm transition-colors"
                >
                  Next.js / Vercel
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B8D98]">
                Git / GitHub Clone URL <span className="text-[#FACC15]">*</span>
              </label>
              <input
                type="text"
                required
                value={cloneUrl}
                onChange={(e) => setCloneUrl(e.target.value)}
                placeholder="https://github.com/owner/repository.git"
                className="w-full bg-[#151718] border border-[#26292B] focus:border-[#FACC15] outline-none px-3 py-2 text-xs font-mono text-[#ECEDEE] rounded-sm"
              />
              <span className="text-[10px] text-[#8B8D98] block">
                Works with any public HTTPS or SSH clone URL without credentials or OAuth.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B8D98]">
                  Branch / Ref
                </label>
                <input
                  type="text"
                  value={gitBranch}
                  onChange={(e) => setGitBranch(e.target.value)}
                  placeholder="main"
                  className="w-full bg-[#151718] border border-[#26292B] focus:border-[#FACC15] outline-none px-3 py-1.5 text-xs font-mono text-[#ECEDEE] rounded-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B8D98]">
                  Personal Access Token (PAT) <span className="text-[#8B8D98]">(Optional)</span>
                </label>
                <input
                  type="password"
                  value={gitToken}
                  onChange={(e) => setGitToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="w-full bg-[#151718] border border-[#26292B] focus:border-[#FACC15] outline-none px-3 py-1.5 text-xs font-mono text-[#ECEDEE] rounded-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B8D98]">
                  Handover Title <span className="text-[#8B8D98]">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Auto-derived from repository"
                  className="w-full bg-[#151718] border border-[#26292B] focus:border-[#FACC15] outline-none px-3 py-1.5 text-xs text-[#ECEDEE] rounded-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B8D98]">
                  Departing Lead Handle <span className="text-[#8B8D98]">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Auto-detected from commits"
                  className="w-full bg-[#151718] border border-[#26292B] focus:border-[#FACC15] outline-none px-3 py-1.5 text-xs font-mono text-[#ECEDEE] rounded-sm"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-[#450A0A]/40 border border-[#EF4444]/40 rounded-sm text-xs font-mono text-[#FCA5A5]">
                {error}
              </div>
            )}

            <div className="flex justify-end items-center gap-3 pt-4 border-t border-[#26292B]">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="text-xs font-mono text-[#8B8D98] hover:text-[#ECEDEE] px-3 py-1.5 rounded-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#FACC15] hover:bg-[#EAB308] text-[#0C0D0E] font-mono font-bold text-xs uppercase px-4 py-2 rounded-sm transition-colors flex items-center gap-2"
              >
                {submitting ? 'Synthesizing...' : '🐙 Clone & Import Repository →'}
              </button>
            </div>
          </form>
        ) : (
        <div>
        {/* Quick Presets */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8B8D98]">
            Quick Pre-loaded Scenarios:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleApplyPreset('kafka')}
              className="text-[10px] font-mono px-2.5 py-1 bg-[#151718] border border-[#26292B] hover:border-[#4ADE80] hover:text-[#4ADE80] rounded-sm transition-colors"
            >
              Kafka vs RabbitMQ Collision
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('auth0')}
              className="text-[10px] font-mono px-2.5 py-1 bg-[#151718] border border-[#26292B] hover:border-[#4ADE80] hover:text-[#4ADE80] rounded-sm transition-colors"
            >
              Auth0 Rate Limit Revert
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('dragonfly')}
              className="text-[10px] font-mono px-2.5 py-1 bg-[#151718] border border-[#26292B] hover:border-[#4ADE80] hover:text-[#4ADE80] rounded-sm transition-colors"
            >
              Dragonfly Memory Leak Rollback
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B8D98]">
                Handover Dossier Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#151718] border border-[#26292B] focus:border-[#ECEDEE] outline-none px-3 py-1.5 text-xs text-[#ECEDEE] rounded-sm font-sans"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B8D98]">
                Departing Lead Handle
              </label>
              <input
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full bg-[#151718] border border-[#26292B] focus:border-[#ECEDEE] outline-none px-3 py-1.5 text-xs text-[#ECEDEE] rounded-sm font-mono"
              />
            </div>
          </div>

          {/* Chunks List */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#8B8D98]">
                Source Evidence Trails ({chunks.length})
              </span>
              <button
                type="button"
                onClick={addChunk}
                className="text-[10px] font-mono text-[#4ADE80] hover:underline"
              >
                + Add Another Evidence Trail
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {chunks.map((chunk, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-[#151718] border border-[#26292B] rounded-sm space-y-2.5 relative group"
                >
                  <div className="flex justify-between items-center text-[10px] font-mono text-[#8B8D98]">
                    <div className="flex items-center gap-2">
                      <span>TRAIL #{idx + 1}</span>
                      <select
                        value={chunk.source_type}
                        onChange={(e) => updateChunk(idx, 'source_type', e.target.value)}
                        className="bg-[#0C0D0E] border border-[#26292B] text-[#ECEDEE] px-2 py-0.5 rounded-sm outline-none cursor-pointer"
                      >
                        <option value="GITHUB_PR">GITHUB_PR</option>
                        <option value="SLACK_THREAD">SLACK_THREAD</option>
                        <option value="LINEAR_ISSUE">LINEAR_ISSUE</option>
                        <option value="INCIDENT_POSTMORTEM">INCIDENT_POSTMORTEM</option>
                      </select>
                    </div>

                    {chunks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeChunk(idx)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <textarea
                    required
                    rows={2}
                    placeholder="Enter verbatim communication text, PR body, or incident log..."
                    value={chunk.content}
                    onChange={(e) => updateChunk(idx, 'content', e.target.value)}
                    className="w-full bg-[#0C0D0E] border border-[#26292B] focus:border-[#404245] outline-none p-2 text-xs text-[#ECEDEE] rounded-sm font-mono leading-relaxed resize-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800 text-red-400 text-xs font-mono rounded-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-[#26292B]">
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] font-mono px-4 py-2 border border-[#26292B] text-[#8B8D98] hover:text-[#ECEDEE] rounded-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="text-[11px] font-mono font-bold uppercase tracking-wider bg-[#ECEDEE] text-[#0C0D0E] px-5 py-2 rounded-sm hover:bg-[#B0B2B5] transition-all disabled:opacity-50"
            >
              {submitting ? 'Synthesizing Pipeline...' : 'Synthesize Transition Dossier →'}
            </button>
          </div>
        </form>
        </div>
        )}
      </motion.div>
    </div>
  );
};
