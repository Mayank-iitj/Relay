"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1';

export default function RunwayPage() {
  const params = useParams();
  const rawId = params?.id as string;
  const handoverId = rawId || "f5c22997-cbf6-4b89-a5f1-331e3d30628e";

  const [tasks, setTasks] = useState<any[]>([
    { id: 'task-1', phase: 'DAYS_1_7', title: 'IAM & AWS Console Access', action: 'GRANT_OWNERSHIP', target: 'AWS Production us-east-1 Console', is_completed: true },
    { id: 'task-2', phase: 'DAYS_1_7', title: 'Local Dev & VPC Tunneling Runbook', action: 'RUNBOOK_VERIFY', target: 'Local Dev Environment & Bastion', is_completed: true },
    { id: 'task-3', phase: 'DAYS_8_14', title: 'Redis Eviction Monitoring Setup', action: 'RUNBOOK_VERIFY', target: 'Datadog Alert Monitors & PagerDuty', is_completed: false },
    { id: 'task-4', phase: 'DAYS_8_14', title: 'Terraform State & KMS Key Policy Audit', action: 'RUNBOOK_VERIFY', target: 'Terraform Cloud State Files', is_completed: false },
    { id: 'task-5', phase: 'DAYS_15_30', title: 'Core Banking API Architecture Roadmap Hand-off', action: 'MIGRATION_TAKEOVER', target: 'Executive Architecture Board', is_completed: false },
    { id: 'task-6', phase: 'DAYS_15_30', title: 'Departing Lead Credentials Deprovisioning', action: 'REVOKE_ACCESS', target: 'Okta SSO, GitHub Org, AWS Admin', is_completed: false },
  ]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      setLoading(true);
      try {
        let res = await fetch(`${API_BASE}/handovers/${handoverId}/runway`);
        if (!res.ok) res = await fetch(`/api/v1/handovers/${handoverId}/runway`);
        if (res.ok) {
          const json = await res.json();
          if (json.tasks && json.tasks.length > 0) {
            setTasks(json.tasks);
          }
        }
      } catch (e) {
        console.warn("Using offline runway tasks");
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, [handoverId]);

  const toggleTask = async (taskId: string) => {
    // Optimistic UI update
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? { ...t, is_completed: !t.is_completed, completed: !t.is_completed }
          : t
      )
    );

    try {
      await fetch(`${API_BASE}/handovers/${handoverId}/runway/${taskId}/toggle`, {
        method: 'POST'
      });
    } catch (e) {
      console.warn("Offline runway toggle fallback");
    }
  };

  const completedCount = tasks.filter(t => t.is_completed || t.completed).length;
  const progressPercent = Math.round((completedCount / (tasks.length || 1)) * 100);

  const phases = [
    { key: 'DAYS_1_7', label: 'Days 1 - 7: Critical Access & Runtime Verification' },
    { key: 'DAYS_8_14', label: 'Days 8 - 14: Infrastructure & Failure Domain Deep Dive' },
    { key: 'DAYS_15_30', label: 'Days 15 - 30: Autonomous Ownership & Access Deprovisioning' },
  ];

  return (
    <div className="min-h-screen bg-[#0C0D0E] text-[#ECEDEE] font-sans selection:bg-[#FACC15]/20 flex flex-col">
      {/* Top Header */}
      <header className="flex items-center justify-between px-5 py-2.5 border-b border-[#26292B] bg-[#151718] z-10 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-[#4ADE80] rounded-full animate-pulse" />
            <Link href="/" className="font-mono font-bold tracking-tight text-xs uppercase hover:text-white transition-colors">
              RELAY <span className="text-[#8B8D98] font-normal ml-1">/ RUNWAY</span>
            </Link>
          </div>

          <nav className="flex items-center gap-1 border-l border-[#26292B] pl-4">
            <Link
              href={`/handover/${handoverId}`}
              className="text-[11px] font-mono px-3 py-1 text-[#8B8D98] hover:text-[#ECEDEE] hover:bg-[#1E2022] rounded-sm transition-colors"
            >
              Workbench
            </Link>
            <Link
              href={`/handover/${handoverId}/review`}
              className="text-[11px] font-mono px-3 py-1 text-[#8B8D98] hover:text-[#ECEDEE] hover:bg-[#1E2022] rounded-sm transition-colors"
            >
              Review
            </Link>
            <Link
              href={`/handover/${handoverId}/runway`}
              className="text-[11px] font-mono px-3 py-1 bg-[#26292B] text-[#ECEDEE] rounded-sm"
            >
              Runway (30-Day)
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-[#8B8D98]">PROGRESS:</span>
          <span className="text-xs font-mono font-bold text-[#4ADE80]">{progressPercent}%</span>
        </div>
      </header>

      <div className="flex-1 max-w-4xl w-full mx-auto p-8 space-y-8">
        <header className="border-b border-[#26292B] pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-xs font-mono uppercase tracking-[0.3em] text-[#8B8D98] mb-1">
              Transition Runway
            </h1>
            <h2 className="text-2xl font-bold tracking-tight">
              30-Day Actionable Ownership Transfer Queue
            </h2>
          </div>
          <div className="text-right font-mono">
            <span className="text-xs text-[#8B8D98]">Tasks Completed:</span>
            <div className="text-sm font-bold text-[#ECEDEE]">
              {completedCount} / {tasks.length}
            </div>
          </div>
        </header>

        {/* Progress Bar */}
        <div className="w-full bg-[#151718] border border-[#26292B] h-2 rounded-full overflow-hidden">
          <div
            className="bg-[#4ADE80] h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Phases */}
        <div className="space-y-8">
          {phases.map(phase => {
            const phaseTasks = tasks.filter(t => t.phase === phase.key);
            return (
              <section key={phase.key} className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-[#8B8D98] font-semibold">
                    {phase.label}
                  </h3>
                  <span className="text-[10px] font-mono text-[#8B8D98]">
                    {phaseTasks.filter(t => t.is_completed || t.completed).length} / {phaseTasks.length} Completed
                  </span>
                </div>

                <div className="space-y-2">
                  {phaseTasks.map(task => {
                    const done = task.is_completed || task.completed;
                    return (
                      <div
                        key={task.id}
                        onClick={() => toggleTask(task.id)}
                        className={`p-4 border rounded-sm cursor-pointer transition-all flex items-center justify-between ${
                          done
                            ? 'border-[#26292B] bg-[#0C0D0E]/60 opacity-60'
                            : 'border-[#26292B] bg-[#151718] hover:border-[#404245]'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-5 h-5 border rounded-sm flex items-center justify-center transition-colors ${
                              done
                                ? 'bg-[#4ADE80] border-[#4ADE80] text-black font-bold text-xs'
                                : 'border-[#8B8D98] bg-[#0C0D0E]'
                            }`}
                          >
                            {done && '✓'}
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${done ? 'line-through text-[#8B8D98]' : 'text-[#ECEDEE]'}`}>
                              {task.title}
                            </p>
                            <p className="text-[10px] font-mono text-[#8B8D98] uppercase mt-0.5">
                              {task.action || task.action_type} → <span className="text-[#ECEDEE] font-normal">{task.target || task.target_entity}</span>
                            </p>
                          </div>
                        </div>

                        <Badge variant={done ? 'success' : 'neutral'}>
                          {done ? 'COMPLETED' : 'PENDING'}
                        </Badge>
                      </div>
                    );
                  })}

                  {phaseTasks.length === 0 && (
                    <div className="p-3 border border-[#26292B] text-xs font-mono text-[#8B8D98]">
                      No tasks defined for this phase.
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
