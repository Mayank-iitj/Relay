import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function RunwayPage() {
  const [tasks, setTasks] = useState([
    { id: 1, phase: 'DAYS_1_7', title: 'Access Provisioning', action: 'GRANT_OWNERSHIP', target: 'AWS Production Console', completed: false },
    { id: 2, phase: 'DAYS_1_7', title: 'Env Setup', action: 'RUNBOOK_VERIFY', target: 'Local Dev Environment', completed: true },
    { id: 3, phase: 'DAYS_8_14', title: 'Infrastructure Audit', action: 'RUNBOOK_VERIFY', target: 'Terraform State Files', completed: false },
    { id: 4, phase: 'DAYS_15_30', title: 'Stakeholder Hand-off', action: 'MIGRATION_TAKEOVER', target: 'Core API Roadmap', completed: false },
  ]);

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  return (
    <div className="min-h-screen bg-[#0C0D0E] text-[#ECEDEE] p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="border-b border-[#26292B] pb-4">
          <h1 className="text-xs font-mono uppercase tracking-[0.3em] text-[#8B8D98] mb-2">Transition Runway</h1>
          <h2 className="text-2xl font-bold tracking-tight">30-Day Ownership Transfer</h2>
        </header>

        {['DAYS_1_7', 'DAYS_8_14', 'DAYS_15_30'].map(phase => (
          <section key={phase} className="space-y-4">
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-[#8B8D98] opacity-60">{phase.replace('_', ' ')}</h3>
            <div className="space-y-2">
              {tasks.filter(t => t.phase === phase).map(task => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-4 border rounded-sm cursor-pointer transition-all flex items-center justify-between ${task.completed ? 'border-[#26292B] bg-[#0C0D0E] opacity-50' : 'border-[#26292B] bg-[#151718] hover:border-[#404245]'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-colors ${task.completed ? 'bg-[#4ADE80] border-[#4ADE80]' : 'border-[#8B8D98]'}`}>
                      {task.completed && <span className="text-black text-[10px]">✓</span>}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-[10px] font-mono text-[#8B8D98] uppercase">{task.action} → {task.target}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-[#8B8D98]">{task.completed ? 'COMPLETED' : 'PENDING'}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
