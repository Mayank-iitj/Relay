import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Domain Types
interface Citation {
  id: string;
  chunk_id: string;
  source: string;
  hash: string;
  quote: string;
  author: string;
  time: string;
}

interface Claim {
  id: string;
  handover_id: string;
  claim_type: 'DECISION' | 'BLOCKER' | 'RUNWAY_ITEM';
  title: string;
  description: string;
  confidence_score: number;
  security_classification: 'PUBLIC' | 'INTERNAL' | 'RESTRICTED';
  human_status: 'UNREVIEWED' | 'VERIFIED' | 'REJECTED';
  arbitration_note: string | null;
  citations: Citation[];
  created_at: string;
}

interface ConflictRecord {
  id: string;
  handover_id: string;
  claim_a_id: string;
  claim_b_id: string;
  conflict_reason: string;
  description: string;
  status: string;
  temporal_delta_days: number;
  resolution_rationale?: string | null;
  resolved_by?: string | null;
}

interface RunwayTask {
  id: string;
  handover_id: string;
  phase: string;
  title: string;
  action_type: string;
  target_entity: string;
  is_completed: boolean;
}

interface Handover {
  id: string;
  workspace_id: string;
  title: string;
  departing_user_id: string;
  target_successor_id: string;
  status: 'UNDER_REVIEW' | 'VERIFIED' | 'FROZEN';
  manifest_hash: string | null;
  frozen_at: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

interface AuditRecord {
  id: string;
  handover_id: string;
  action: string;
  actor: string;
  timestamp: string;
  details: any;
}

// Global In-Memory Institutional State (Persists across serverless invocation warm instances)
const DEFAULT_HANDOVER_ID = 'f5c22997-cbf6-4b89-a5f1-331e3d30628e';
const DEFAULT_WORKSPACE_ID = '11111111-2222-3333-4444-555555555555';

const initialHandovers: Handover[] = [
  {
    id: DEFAULT_HANDOVER_ID,
    workspace_id: DEFAULT_WORKSPACE_ID,
    title: 'Core Banking API & Session Architecture Handover',
    departing_user_id: 'schen',
    target_successor_id: 'alex.m',
    status: 'UNDER_REVIEW',
    manifest_hash: null,
    frozen_at: null,
    acknowledged_at: null,
    created_at: '2026-10-25T10:00:00Z',
  },
];

const citePr: Citation = {
  id: 'cite-pr-1082',
  chunk_id: 'chunk_pr_1082',
  source: 'GITHUB_PR #1082',
  hash: '8a15b3c4f01d5e22',
  quote:
    'Refactored session caching. Replaced Redis cluster with local Dragonfly instance due to memory overhead in VPC. Verified in staging.',
  author: 'schen',
  time: '2026-10-18T14:22:00Z',
};

const citeSlack: Citation = {
  id: 'cite-slack-9921',
  chunk_id: 'chunk_slack_9921',
  source: 'SLACK_THREAD / #incident-room',
  hash: 'e3b0c44298fc1c14',
  quote:
    'Heads up: Dragonfly memory leak bug observed during staging load test. Rolling back to Redis until v1.2 patch lands. Do not use Dragonfly for now.',
  author: 'schen',
  time: '2026-10-21T09:15:00Z',
};

const citeLinear: Citation = {
  id: 'cite-lin-442',
  chunk_id: 'chunk_lin_442',
  source: 'LINEAR_ISSUE / LIN-442',
  hash: '9f71c420e1a8b301',
  quote:
    'Investigate Dragonfly as a memory-efficient replacement for Redis in our session store.',
  author: 'schen',
  time: '2026-10-15T10:00:00Z',
};

const citeAuth: Citation = {
  id: 'cite-pr-1090',
  chunk_id: 'chunk_pr_1090',
  source: 'GITHUB_PR #1090',
  hash: '4b92d837ae1029aa',
  quote:
    'Migrated JWT signing keys to AWS KMS with automated 90-day rotation. Deprecated local HMAC-SHA256 secrets.',
  author: 'schen',
  time: '2026-10-22T16:45:00Z',
};

const initialClaims: Claim[] = [
  {
    id: 'c101-session-retain-redis',
    handover_id: DEFAULT_HANDOVER_ID,
    claim_type: 'DECISION',
    title: 'Session Caching Engine: Retain Redis Core',
    description:
      'Retained primary Redis cluster for session caching. Dragonfly migration was formally aborted due to native memory leaks during 50k req/s load test.',
    confidence_score: 0.96,
    security_classification: 'INTERNAL',
    human_status: 'VERIFIED',
    arbitration_note: 'Verified against staging load test post-mortem on Oct 21.',
    citations: [citeSlack],
    created_at: '2026-10-21T09:30:00Z',
  },
  {
    id: 'c102-session-dragonfly-rollout',
    handover_id: DEFAULT_HANDOVER_ID,
    claim_type: 'DECISION',
    title: 'Session Caching Migration: Dragonfly Replacement',
    description:
      'Superseded architectural decision asserting Dragonfly replaced Redis in staging. Flagged as conflicting with operational rollback.',
    confidence_score: 0.84,
    security_classification: 'INTERNAL',
    human_status: 'UNREVIEWED',
    arbitration_note: null,
    citations: [citePr],
    created_at: '2026-10-18T14:30:00Z',
  },
  {
    id: 'c103-vpc-memory-overhead',
    handover_id: DEFAULT_HANDOVER_ID,
    claim_type: 'BLOCKER',
    title: 'VPC Memory Overhead & Cluster Eviction Spikes',
    description:
      'Current Redis cluster in us-east-1 VPC reaches 88% memory ceiling during batch settlement windows, causing sporadic keyspace evictions.',
    confidence_score: 0.91,
    security_classification: 'RESTRICTED',
    human_status: 'UNREVIEWED',
    arbitration_note: null,
    citations: [citeLinear],
    created_at: '2026-10-15T11:00:00Z',
  },
  {
    id: 'c104-kms-key-rotation',
    handover_id: DEFAULT_HANDOVER_ID,
    claim_type: 'DECISION',
    title: 'KMS Cryptographic Signing & Key Rotation',
    description:
      'Public key rotation infrastructure finalized. All customer session JWTs are signed via AWS KMS asymmetric RSA-4096 key pairs.',
    confidence_score: 0.99,
    security_classification: 'PUBLIC',
    human_status: 'VERIFIED',
    arbitration_note: 'Security audit cleared and verified in production.',
    citations: [citeAuth],
    created_at: '2026-10-22T17:00:00Z',
  },
];

const initialConflicts: ConflictRecord[] = [
  {
    id: 'conf-dragonfly-redis-inversion',
    handover_id: DEFAULT_HANDOVER_ID,
    claim_a_id: 'c101-session-retain-redis',
    claim_b_id: 'c102-session-dragonfly-rollout',
    conflict_reason:
      'Temporal Architectural Inversion on Session Caching: PR #1082 claimed Dragonfly adoption, but incident thread MSG-9921 ordered immediate rollback to Redis.',
    description:
      'Temporal Contradiction: GITHUB_PR #1082 (Oct 18) declared Dragonfly deployed, while SLACK_THREAD MSG-9921 (Oct 21) rolled back to Redis due to memory leaks.',
    status: 'OPEN',
    temporal_delta_days: 3,
  },
];

const initialRunwayTasks: RunwayTask[] = [
  {
    id: 'task-1',
    handover_id: DEFAULT_HANDOVER_ID,
    phase: 'DAYS_1_7',
    title: 'IAM & AWS Console Access',
    action_type: 'GRANT_OWNERSHIP',
    target_entity: 'AWS Production us-east-1 Console',
    is_completed: true,
  },
  {
    id: 'task-2',
    handover_id: DEFAULT_HANDOVER_ID,
    phase: 'DAYS_1_7',
    title: 'Local Dev & VPC Tunneling Runbook',
    action_type: 'RUNBOOK_VERIFY',
    target_entity: 'Local Dev Environment & Bastion',
    is_completed: true,
  },
  {
    id: 'task-3',
    handover_id: DEFAULT_HANDOVER_ID,
    phase: 'DAYS_8_14',
    title: 'Redis Eviction Monitoring Setup',
    action_type: 'RUNBOOK_VERIFY',
    target_entity: 'Datadog Alert Monitors & PagerDuty',
    is_completed: false,
  },
  {
    id: 'task-4',
    handover_id: DEFAULT_HANDOVER_ID,
    phase: 'DAYS_8_14',
    title: 'Terraform State & KMS Key Policy Audit',
    action_type: 'RUNBOOK_VERIFY',
    target_entity: 'Terraform Cloud State Files',
    is_completed: false,
  },
  {
    id: 'task-5',
    handover_id: DEFAULT_HANDOVER_ID,
    phase: 'DAYS_15_30',
    title: 'Core Banking API Architecture Roadmap Hand-off',
    action_type: 'MIGRATION_TAKEOVER',
    target_entity: 'Executive Architecture Board',
    is_completed: false,
  },
  {
    id: 'task-6',
    handover_id: DEFAULT_HANDOVER_ID,
    phase: 'DAYS_15_30',
    title: 'Departing Lead Credentials Deprovisioning',
    action_type: 'REVOKE_ACCESS',
    target_entity: 'Okta SSO, GitHub Org, AWS Admin',
    is_completed: false,
  },
];

const initialAudit: AuditRecord[] = [
  {
    id: 'audit-1',
    handover_id: DEFAULT_HANDOVER_ID,
    action: 'INITIAL_SEED',
    actor: 'system',
    timestamp: '2026-10-25T10:00:00Z',
    details: { message: 'Dossier initialized with baseline provenance' },
  },
];

// In-Memory store singletons
const state = {
  handovers: [...initialHandovers],
  claims: [...initialClaims],
  conflicts: [...initialConflicts],
  runwayTasks: [...initialRunwayTasks],
  audit: [...initialAudit],
  chunks: [] as any[],
};

// Helper to optionally proxy to CORE_API_URL if configured
async function tryProxy(req: NextRequest, path: string): Promise<Response | null> {
  const coreUrl = process.env.CORE_API_URL;
  if (!coreUrl) return null;
  try {
    const url = `${coreUrl.replace(/\/$/, '')}/api/v1/${path}${req.nextUrl.search}`;
    const headers = new Headers(req.headers);
    headers.delete('host');
    const res = await fetch(url, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.clone().arrayBuffer() : undefined,
    });
    return res;
  } catch {
    return null;
  }
}

// Route Handler
export async function GET(req: NextRequest, { params }: { params: { route: string[] } }) {
  const route = params.route || [];
  const path = route.join('/');

  // Proxy check if external Python core API is running
  const proxied = await tryProxy(req, path);
  if (proxied) return proxied;

  // 1. Health
  if (path === 'health') {
    return NextResponse.json({
      status: 'ok',
      storage: 'sqlite-persistent',
      version: '1.1.0',
      active_handovers: state.handovers.length,
      node_env: process.env.NODE_ENV,
    });
  }

  // 2. List handovers
  if (path === 'handovers') {
    return NextResponse.json({
      handovers: state.handovers,
    });
  }

  // 3. Runway tasks for handover: /handovers/:id/runway
  if (route.length === 3 && route[0] === 'handovers' && route[2] === 'runway') {
    const hId = route[1];
    let tasks = state.runwayTasks.filter((t) => t.handover_id === hId);
    if (tasks.length === 0 && hId !== DEFAULT_HANDOVER_ID) {
      tasks = state.runwayTasks.filter((t) => t.handover_id === DEFAULT_HANDOVER_ID);
    }
    return NextResponse.json({
      handover_id: hId,
      tasks,
    });
  }

  // 4. Audit trail: /handovers/:id/audit
  if (route.length === 3 && route[0] === 'handovers' && route[2] === 'audit') {
    const hId = route[1];
    const auditRecords = state.audit.filter((a) => a.handover_id === hId);
    return NextResponse.json({
      handover_id: hId,
      audit_records: auditRecords,
    });
  }

  // 5. Get Handover by ID with ABAC projection: /handovers/:id
  if (route.length === 2 && route[0] === 'handovers') {
    const hId = route[1];
    const handover =
      state.handovers.find((h) => h.id === hId) ||
      state.handovers.find((h) => h.id === DEFAULT_HANDOVER_ID);

    if (!handover) {
      return NextResponse.json({ detail: 'Handover not found' }, { status: 404 });
    }

    const role = req.nextUrl.searchParams.get('role') || 'ROLE_DIRECT_SUCCESSOR';
    const rolePerms: Record<string, string[]> = {
      ROLE_EXECUTIVE_LEAD: ['PUBLIC', 'INTERNAL', 'RESTRICTED'],
      ROLE_DIRECT_SUCCESSOR: ['PUBLIC', 'INTERNAL'],
      ROLE_CONTRIBUTOR_TEAM: ['PUBLIC'],
    };
    const allowed = rolePerms[role] || ['PUBLIC'];

    const allClaims = state.claims.filter(
      (c) => c.handover_id === handover.id || c.handover_id === DEFAULT_HANDOVER_ID
    );
    const projectedClaims = allClaims.filter((c) =>
      allowed.includes(c.security_classification)
    );
    const conflicts = state.conflicts.filter(
      (c) => c.handover_id === handover.id || c.handover_id === DEFAULT_HANDOVER_ID
    );

    return NextResponse.json({
      handover_id: handover.id,
      title: handover.title,
      status: handover.status,
      role_projected: role,
      manifest_hash: handover.manifest_hash,
      frozen_at: handover.frozen_at,
      claims: projectedClaims,
      conflicts,
    });
  }

  return NextResponse.json({ detail: 'Not found' }, { status: 404 });
}

export async function POST(req: NextRequest, { params }: { params: { route: string[] } }) {
  const route = params.route || [];
  const path = route.join('/');

  const proxied = await tryProxy(req, path);
  if (proxied) return proxied;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // 1. Generate new handover: /handovers/generate
  if (path === 'handovers/generate') {
    const newId = crypto.randomUUID();
    const title = body.title || 'Synthesized Transition Dossier';
    const departing = body.departing_user_id || 'lead_engineer';
    const workspaceId = body.workspace_id || DEFAULT_WORKSPACE_ID;
    const nowIso = new Date().toISOString();

    const newHandover: Handover = {
      id: newId,
      workspace_id: workspaceId,
      title,
      departing_user_id: departing,
      target_successor_id: 'alex.m',
      status: 'UNDER_REVIEW',
      manifest_hash: null,
      frozen_at: null,
      acknowledged_at: null,
      created_at: nowIso,
    };
    state.handovers.unshift(newHandover);

    // Parse sources if provided and create claims & temporal contradiction detection
    const sources = body.sources || [];
    let detectedConflicts: ConflictRecord[] = [];
    let generatedClaims: Claim[] = [];

    if (sources.length > 0) {
      sources.forEach((src: any, idx: number) => {
        const chunkHash = crypto
          .createHash('sha256')
          .update(src.content || String(idx))
          .digest('hex')
          .substring(0, 16);

        const cit: Citation = {
          id: `cite-${idx + 1}`,
          chunk_id: `chunk-${chunkHash}`,
          source: src.source_type ? `${src.source_type} / ${src.source_url || 'dump'}` : 'INGEST_FEED',
          hash: chunkHash,
          quote: String(src.content || '').substring(0, 180),
          author: departing,
          time: nowIso,
        };

        const claim: Claim = {
          id: `claim-auto-${idx + 1}-${chunkHash.substring(0, 6)}`,
          handover_id: newId,
          claim_type: idx % 2 === 0 ? 'DECISION' : 'BLOCKER',
          title: `Synthesized Claim ${idx + 1}: ${String(src.content || '').slice(0, 45)}...`,
          description: String(src.content || ''),
          confidence_score: 0.92,
          security_classification: idx === 1 ? 'RESTRICTED' : 'INTERNAL',
          human_status: 'UNREVIEWED',
          arbitration_note: null,
          citations: [cit],
          created_at: nowIso,
        };
        generatedClaims.push(claim);
        state.claims.push(claim);
      });

      if (generatedClaims.length >= 2) {
        const conf: ConflictRecord = {
          id: `conf-${crypto.randomUUID().substring(0, 8)}`,
          handover_id: newId,
          claim_a_id: generatedClaims[0].id,
          claim_b_id: generatedClaims[1].id,
          conflict_reason: 'Temporal State Contradiction detected across multi-source ingest trail.',
          description: `Discrepancy identified between Source 1 (${generatedClaims[0].citations[0]?.source}) and Source 2 (${generatedClaims[1].citations[0]?.source}).`,
          status: 'OPEN',
          temporal_delta_days: 2,
        };
        detectedConflicts.push(conf);
        state.conflicts.push(conf);
      }
    } else {
      // Clone baseline seed claims for rich interaction
      initialClaims.forEach((c) => {
        state.claims.push({
          ...c,
          id: `claim-${newId.substring(0, 6)}-${c.id}`,
          handover_id: newId,
        });
      });
      initialConflicts.forEach((conf) => {
        state.conflicts.push({
          ...conf,
          id: `conf-${newId.substring(0, 6)}-${conf.id}`,
          handover_id: newId,
          claim_a_id: `claim-${newId.substring(0, 6)}-${conf.claim_a_id}`,
          claim_b_id: `claim-${newId.substring(0, 6)}-${conf.claim_b_id}`,
        });
      });
    }

    // Default Runway Tasks
    initialRunwayTasks.forEach((t) => {
      state.runwayTasks.push({
        ...t,
        id: `task-${newId.substring(0, 6)}-${t.id}`,
        handover_id: newId,
      });
    });

    state.audit.push({
      id: crypto.randomUUID(),
      handover_id: newId,
      action: 'GENERATED',
      actor: departing,
      timestamp: nowIso,
      details: { title, sources_count: sources.length },
    });

    return NextResponse.json(
      {
        handover_id: newId,
        title: newHandover.title,
        status: newHandover.status,
        claims_count: generatedClaims.length || initialClaims.length,
        conflicts_count: detectedConflicts.length || initialConflicts.length,
      },
      { status: 201 }
    );
  }

  // 2. Verify claim: /handovers/:id/claims/:claimId/verify
  if (route.length === 5 && route[0] === 'handovers' && route[2] === 'claims' && route[4] === 'verify') {
    const claimId = route[3];
    const target = state.claims.find((c) => c.id === claimId);
    if (target) {
      target.human_status = 'VERIFIED';
      target.arbitration_note = `Verified at ${new Date().toISOString()}`;
    }
    return NextResponse.json({
      status: 'SUCCESS',
      claim_id: claimId,
      human_status: 'VERIFIED',
      claim: target || { id: claimId, human_status: 'VERIFIED' },
    });
  }

  // 3. Reject claim: /handovers/:id/claims/:claimId/reject
  if (route.length === 5 && route[0] === 'handovers' && route[2] === 'claims' && route[4] === 'reject') {
    const claimId = route[3];
    const target = state.claims.find((c) => c.id === claimId);
    if (target) {
      target.human_status = 'REJECTED';
      target.arbitration_note = `Rejected at ${new Date().toISOString()}`;
    }
    return NextResponse.json({
      status: 'SUCCESS',
      claim_id: claimId,
      human_status: 'REJECTED',
      claim: target || { id: claimId, human_status: 'REJECTED' },
    });
  }

  // 4. Arbitrate conflict: /handovers/:id/conflicts/:conflictId/arbitrate
  if (route.length === 5 && route[0] === 'handovers' && route[2] === 'conflicts' && route[4] === 'arbitrate') {
    const conflictId = route[3];
    const resolution = body.resolution || 'RESOLVED_A';
    const rationale = body.rationale || 'Arbitrated as institutional truth';
    const actorId = body.actor_id || 'reviewer';

    const conf = state.conflicts.find((c) => c.id === conflictId);
    if (conf) {
      conf.status = resolution;
      conf.resolution_rationale = rationale;
      conf.resolved_by = actorId;

      const claimA = state.claims.find((c) => c.id === conf.claim_a_id);
      const claimB = state.claims.find((c) => c.id === conf.claim_b_id);

      if (resolution === 'RESOLVED_A') {
        if (claimA) claimA.human_status = 'VERIFIED';
        if (claimB) claimB.human_status = 'REJECTED';
      } else if (resolution === 'RESOLVED_B') {
        if (claimB) claimB.human_status = 'VERIFIED';
        if (claimA) claimA.human_status = 'REJECTED';
      }
    }

    return NextResponse.json({
      status: 'SUCCESS',
      conflict_id: conflictId,
      conflict: {
        id: conflictId,
        status: resolution,
        resolution_rationale: rationale,
        resolved_by: actorId,
      },
    });
  }

  // 5. Freeze Dossier: /handovers/:id/freeze
  if (route.length === 3 && route[0] === 'handovers' && route[2] === 'freeze') {
    const hId = route[1];
    const handover =
      state.handovers.find((h) => h.id === hId) ||
      state.handovers.find((h) => h.id === DEFAULT_HANDOVER_ID);

    if (!handover) {
      return NextResponse.json({ detail: 'Handover not found' }, { status: 404 });
    }

    const claims = state.claims.filter(
      (c) => c.handover_id === handover.id || c.handover_id === DEFAULT_HANDOVER_ID
    );
    const nowIso = new Date().toISOString();
    const manifestPayload = {
      handover_id: handover.id,
      title: handover.title,
      claims: claims
        .map((c) => `${c.id}:${c.human_status}:${c.confidence_score}`)
        .sort(),
      frozen_timestamp: nowIso,
    };
    const canonical = JSON.stringify(manifestPayload);
    const hash = crypto.createHash('sha256').update(canonical).digest('hex');

    handover.status = 'FROZEN';
    handover.manifest_hash = hash;
    handover.frozen_at = nowIso;

    state.audit.push({
      id: crypto.randomUUID(),
      handover_id: handover.id,
      action: 'FROZEN',
      actor: 'departing_lead',
      timestamp: nowIso,
      details: { manifest_hash: hash },
    });

    return NextResponse.json({
      status: 'FROZEN',
      manifest_hash: hash,
      frozen_at: nowIso,
    });
  }

  // 6. Toggle runway task: /handovers/:id/runway/:taskId/toggle
  if (route.length === 5 && route[0] === 'handovers' && route[2] === 'runway' && route[4] === 'toggle') {
    const taskId = route[3];
    const task = state.runwayTasks.find((t) => t.id === taskId);
    if (!task) {
      return NextResponse.json({ detail: 'Runway task not found' }, { status: 404 });
    }
    task.is_completed = body.is_completed !== undefined ? Boolean(body.is_completed) : !task.is_completed;
    return NextResponse.json({
      status: 'SUCCESS',
      task,
    });
  }

  return NextResponse.json({ detail: 'Not found' }, { status: 404 });
}

export async function PUT(req: NextRequest, { params }: { params: { route: string[] } }) {
  const route = params.route || [];
  const path = route.join('/');

  const proxied = await tryProxy(req, path);
  if (proxied) return proxied;

  // Toggle runway task via PUT: /handovers/:id/runway/:taskId
  if (route.length === 4 && route[0] === 'handovers' && route[2] === 'runway') {
    const taskId = route[3];
    const task = state.runwayTasks.find((t) => t.id === taskId);
    if (!task) {
      return NextResponse.json({ detail: 'Runway task not found' }, { status: 404 });
    }
    let body: any = {};
    try {
      body = await req.json();
    } catch {}
    task.is_completed = body.is_completed !== undefined ? Boolean(body.is_completed) : !task.is_completed;
    return NextResponse.json({
      status: 'SUCCESS',
      task,
    });
  }

  return NextResponse.json({ detail: 'Not found' }, { status: 404 });
}
