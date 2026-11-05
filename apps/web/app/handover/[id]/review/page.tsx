import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function ReviewPage() {
  const [status, setStatus] = useState('UNDER_REVIEW');

  return (
    <div className="min-h-screen bg-[#0C0D0E] text-[#ECEDEE] p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex justify-between items-end border-b border-[#26292B] pb-4">
          <div>
            <h1 className="text-xs font-mono uppercase tracking-[0.3em] text-[#8B8D98] mb-2">Departing Lead Workbench</h1>
            <h2 className="text-2xl font-bold tracking-tight">Final Dossier Verification</h2>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-[#8B8D98]">Status: {status}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-[#8B8D98] opacity-60">Claims for Review</h3>
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 border border-[#26292B] bg-[#151718] rounded-sm space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-[#8B8D98]">CLAIM #00{i}</span>
                  <div className="flex gap-2">
                    <button className="text-[9px] px-2 py-0.5 border border-red-900 text-red-500 rounded-sm hover:bg-red-900/20">Reject</button>
                    <button className="text-[9px] px-2 py-0.5 border border-green-900 text-green-500 rounded-sm hover:bg-green-900/20">Verify</button>
                  </div>
                </div>
                <p className="text-sm font-medium">Sample technical claim about system architecture and ownership.</p>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <div className="p-4 border border-[#26292B] bg-[#151718] rounded-sm space-y-4">
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-[#8B8D98]">Sign-off Checklist</h3>
              <div className="space-y-2">
                {['All claims verified', 'Conflicts resolved', 'Runway defined'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs text-[#8B8D98]">
                    <input type="checkbox" className="accent-[#ECEDEE]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStatus('FROZEN')}
                className="w-full py-2 bg-[#ECEDEE] text-[#0C0D0E] text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-[#B0B2B5] transition-all"
              >
                Cryptographically Freeze
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
