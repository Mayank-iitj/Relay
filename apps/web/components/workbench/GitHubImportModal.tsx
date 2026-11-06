"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import SpecularButton from '@/components/SpecularButton/SpecularButton';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api/v1';

interface GitHubImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubImportModal: React.FC<GitHubImportModalProps> = ({ isOpen, onClose }) => {
  const [cloneUrl, setCloneUrl] = useState('https://github.com/Mayank-iitj/Relay.git');
  const [branch, setBranch] = useState('main');
  const [token, setToken] = useState('');
  const [title, setTitle] = useState('');
  const [departingUser, setDepartingUser] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<string>('');

  const handlePreset = (url: string, branchName: string, defaultTitle: string) => {
    setCloneUrl(url);
    setBranch(branchName);
    setTitle(defaultTitle);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloneUrl.trim()) {
      setError('Please provide a valid GitHub or Git Clone URL.');
      return;
    }

    setLoading(true);
    setError(null);
    setStage('Connecting to repository & inspecting commit history...');

    try {
      setTimeout(() => setStage('Analyzing temporal architecture & detecting contradictions...'), 1200);
      setTimeout(() => setStage('Generating cryptographic claims & runway tasks...'), 2400);

      const res = await fetch(`${API_BASE}/handovers/import-github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clone_url: cloneUrl.trim(),
          branch: branch.trim() || 'main',
          token: token.trim() || undefined,
          title: title.trim() || undefined,
          departing_user_id: departingUser.trim() || undefined,
          max_commits: 20
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Failed to import repository (HTTP ${res.status})`);
      }

      const json = await res.json();
      setStage('Import complete! Redirecting to dossier...');
      setTimeout(() => {
        window.location.href = `/handover/${json.handover_id}`;
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Failed to import repository. Please verify the URL.');
      setLoading(false);
      setStage('');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-xl bg-[#151718] border border-[#26292B] rounded-sm shadow-2xl p-6 space-y-6 text-[#ECEDEE] font-sans"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-[#26292B] pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base">🐙</span>
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-[#ECEDEE]">
                  Import Repository via Clone URL
                </h3>
                <Badge variant="success">NO OAUTH NEEDED</Badge>
              </div>
              <p className="text-xs text-[#8B8D98]">
                Inspects git commit history, reconstructs architectural decisions, surfaces temporal rollbacks, and synthesizes an immutable transition dossier.
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-[#8B8D98] hover:text-[#ECEDEE] text-sm font-mono transition-colors"
            >
              [ESC]
            </button>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8B8D98]">
              Quick Demo Presets
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handlePreset('https://github.com/Mayank-iitj/Relay.git', 'main', 'Relay Core Infrastructure Handover')}
                className="text-[10px] font-mono px-2.5 py-1 bg-[#1A1C1E] border border-[#26292B] text-[#ECEDEE] hover:border-[#4ADE80] transition-colors rounded-sm"
              >
                Relay Core (Self)
              </button>
              <button
                type="button"
                onClick={() => handlePreset('https://github.com/fastapi/fastapi.git', 'master', 'FastAPI Framework Handover')}
                className="text-[10px] font-mono px-2.5 py-1 bg-[#1A1C1E] border border-[#26292B] text-[#ECEDEE] hover:border-[#4ADE80] transition-colors rounded-sm"
              >
                FastAPI / Python
              </button>
              <button
                type="button"
                onClick={() => handlePreset('https://github.com/vercel/next.js.git', 'canary', 'Next.js App Engine Handover')}
                className="text-[10px] font-mono px-2.5 py-1 bg-[#1A1C1E] border border-[#26292B] text-[#ECEDEE] hover:border-[#4ADE80] transition-colors rounded-sm"
              >
                Next.js / Vercel
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B8D98] block">
                Git / GitHub Clone URL <span className="text-[#4ADE80]">*</span>
              </label>
              <input
                type="text"
                value={cloneUrl}
                onChange={(e) => setCloneUrl(e.target.value)}
                placeholder="https://github.com/owner/repository.git"
                disabled={loading}
                required
                className="w-full bg-[#0C0D0E] border border-[#26292B] px-3 py-2 text-xs font-mono text-[#ECEDEE] focus:border-[#4ADE80] outline-none rounded-sm transition-colors"
              />
              <span className="text-[10px] text-[#8B8D98]">
                Accepts HTTPS or SSH clone URLs. Public repos require zero credentials.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B8D98] block">
                  Branch / Ref
                </label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  disabled={loading}
                  className="w-full bg-[#0C0D0E] border border-[#26292B] px-3 py-1.5 text-xs font-mono text-[#ECEDEE] focus:border-[#4ADE80] outline-none rounded-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B8D98] block">
                  Personal Access Token (PAT) <span className="text-[#8B8D98]">(Optional)</span>
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  disabled={loading}
                  className="w-full bg-[#0C0D0E] border border-[#26292B] px-3 py-1.5 text-xs font-mono text-[#ECEDEE] focus:border-[#4ADE80] outline-none rounded-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B8D98] block">
                  Custom Dossier Title <span className="text-[#8B8D98]">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Auto-derived from repository"
                  disabled={loading}
                  className="w-full bg-[#0C0D0E] border border-[#26292B] px-3 py-1.5 text-xs font-mono text-[#ECEDEE] focus:border-[#4ADE80] outline-none rounded-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B8D98] block">
                  Departing Lead Handle <span className="text-[#8B8D98]">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={departingUser}
                  onChange={(e) => setDepartingUser(e.target.value)}
                  placeholder="Auto-detected from commits"
                  disabled={loading}
                  className="w-full bg-[#0C0D0E] border border-[#26292B] px-3 py-1.5 text-xs font-mono text-[#ECEDEE] focus:border-[#4ADE80] outline-none rounded-sm"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-[#450A0A]/40 border border-[#EF4444]/40 rounded-sm text-xs font-mono text-[#FCA5A5]">
                {error}
              </div>
            )}

            {stage && (
              <div className="p-3 bg-[#0C0D0E] border border-[#26292B] rounded-sm flex items-center gap-2.5 text-xs font-mono text-[#4ADE80]">
                <div className="w-2 h-2 rounded-full bg-[#4ADE80] animate-ping shrink-0" />
                <span>{stage}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#26292B]">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-3.5 py-1.5 text-xs font-mono text-[#8B8D98] hover:text-[#ECEDEE] transition-colors"
              >
                Cancel
              </button>

              <SpecularButton
                size="sm"
                radius={4}
                tint="#4ADE80"
                tintOpacity={0.16}
                textColor="#4ADE80"
                lineColor="#4ADE80"
                baseColor="#26292B"
                intensity={1.2}
                idleIntensity={0.35}
                thickness={1.3}
                glow={1}
                followMouse
                proximity={200}
                onClick={handleSubmit as any}
                className="font-mono text-xs uppercase font-bold tracking-wider px-4 py-1.5"
              >
                {loading ? 'Synthesizing...' : '🐙 Clone & Synthesize Dossier →'}
              </SpecularButton>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

