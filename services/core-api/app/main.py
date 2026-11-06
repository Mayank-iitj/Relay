import hashlib
import json
from uuid import UUID, uuid4
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.engine.chunker import ChunkerEngine
from app.engine.extractor import ExtractionService
from app.engine.orchestrator import RelayOrchestrator
from app.engine.github_importer import GitHubImporter
from app.core.database import db_instance, utc_now_iso
from app.models.domain import (
    Handover, Claim, DecisionClaim, BlockerClaim,
    ConflictRecord, Citation, RunwayTask, ExtractionResult
)

app = FastAPI(
    title="Relay Core API",
    description="The Immutable Record of Institutional Truth - Knowledge Handover Platform",
    version="1.1.0"
)

# Enable CORS for Next.js frontend and local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def dump_model(obj: Any) -> Dict[str, Any]:
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    elif hasattr(obj, "dict"):
        return obj.dict()
    return obj

DEFAULT_HANDOVER_ID = "f5c22997-cbf6-4b89-a5f1-331e3d30628e"
DEFAULT_WORKSPACE_ID = "11111111-2222-3333-4444-555555555555"

def ensure_seed_data():
    """Ensure baseline initial dataset exists in SQLite database"""
    existing = db_instance.get_handover(DEFAULT_HANDOVER_ID)
    if existing:
        return

    # Seed Handover
    db_instance.save_handover({
        "id": DEFAULT_HANDOVER_ID,
        "workspace_id": DEFAULT_WORKSPACE_ID,
        "title": "Core Banking API & Session Architecture Handover",
        "departing_user_id": "schen",
        "target_successor_id": "alex.m",
        "status": "UNDER_REVIEW",
        "manifest_hash": None,
        "frozen_at": None,
        "acknowledged_at": None,
        "created_at": "2026-10-25T10:00:00Z"
    })

    # Citations & Claims
    cite_pr = {
        "id": "cite-pr-1082",
        "chunk_id": "chunk_pr_1082",
        "source": "GITHUB_PR #1082",
        "hash": "8a15b3c4f01d5e22",
        "quote": "Refactored session caching. Replaced Redis cluster with local Dragonfly instance due to memory overhead in VPC. Verified in staging.",
        "author": "schen",
        "time": "2026-10-18T14:22:00Z"
    }

    cite_slack = {
        "id": "cite-slack-9921",
        "chunk_id": "chunk_slack_9921",
        "source": "SLACK_THREAD / #incident-room",
        "hash": "e3b0c44298fc1c14",
        "quote": "Heads up: Dragonfly memory leak bug observed during staging load test. Rolling back to Redis until v1.2 patch lands. Do not use Dragonfly for now.",
        "author": "schen",
        "time": "2026-10-21T09:15:00Z"
    }

    cite_linear = {
        "id": "cite-lin-442",
        "chunk_id": "chunk_lin_442",
        "source": "LINEAR_ISSUE / LIN-442",
        "hash": "9f71c420e1a8b301",
        "quote": "Investigate Dragonfly as a memory-efficient replacement for Redis in our session store.",
        "author": "schen",
        "time": "2026-10-15T10:00:00Z"
    }

    cite_auth = {
        "id": "cite-pr-1090",
        "chunk_id": "chunk_pr_1090",
        "source": "GITHUB_PR #1090",
        "hash": "4b92d837ae1029aa",
        "quote": "Migrated JWT signing keys to AWS KMS with automated 90-day rotation. Deprecated local HMAC-SHA256 secrets.",
        "author": "schen",
        "time": "2026-10-22T16:45:00Z"
    }

    c1_id = "c101-session-retain-redis"
    c2_id = "c102-session-dragonfly-rollout"
    c3_id = "c103-vpc-memory-overhead"
    c4_id = "c104-kms-key-rotation"

    db_instance.save_claim({
        "id": c1_id,
        "handover_id": DEFAULT_HANDOVER_ID,
        "claim_type": "DECISION",
        "title": "Session Caching Engine: Retain Redis Core",
        "description": "Retained primary Redis cluster for session caching. Dragonfly migration was formally aborted due to native memory leaks during 50k req/s load test.",
        "confidence_score": 0.96,
        "security_classification": "INTERNAL",
        "human_status": "VERIFIED",
        "arbitration_note": "Verified against staging load test post-mortem on Oct 21.",
        "citations": [cite_slack],
        "created_at": "2026-10-21T09:30:00Z"
    })

    db_instance.save_claim({
        "id": c2_id,
        "handover_id": DEFAULT_HANDOVER_ID,
        "claim_type": "DECISION",
        "title": "Session Caching Migration: Dragonfly Replacement",
        "description": "Superseded architectural decision asserting Dragonfly replaced Redis in staging. Flagged as conflicting with operational rollback.",
        "confidence_score": 0.84,
        "security_classification": "INTERNAL",
        "human_status": "UNREVIEWED",
        "arbitration_note": None,
        "citations": [cite_pr],
        "created_at": "2026-10-18T14:30:00Z"
    })

    db_instance.save_claim({
        "id": c3_id,
        "handover_id": DEFAULT_HANDOVER_ID,
        "claim_type": "BLOCKER",
        "title": "VPC Memory Overhead & Cluster Eviction Spikes",
        "description": "Current Redis cluster in us-east-1 VPC reaches 88% memory ceiling during batch settlement windows, causing sporadic keyspace evictions.",
        "confidence_score": 0.91,
        "security_classification": "RESTRICTED",
        "human_status": "UNREVIEWED",
        "arbitration_note": None,
        "citations": [cite_linear],
        "created_at": "2026-10-15T11:00:00Z"
    })

    db_instance.save_claim({
        "id": c4_id,
        "handover_id": DEFAULT_HANDOVER_ID,
        "claim_type": "DECISION",
        "title": "KMS Cryptographic Signing & Key Rotation",
        "description": "Public key rotation infrastructure finalized. All customer session JWTs are signed via AWS KMS asymmetric RSA-4096 key pairs.",
        "confidence_score": 0.99,
        "security_classification": "PUBLIC",
        "human_status": "VERIFIED",
        "arbitration_note": "Security audit cleared and verified in production.",
        "citations": [cite_auth],
        "created_at": "2026-10-22T17:00:00Z"
    })

    # Conflict Record
    db_instance.save_conflict({
        "id": "conf-dragonfly-redis-inversion",
        "handover_id": DEFAULT_HANDOVER_ID,
        "claim_a_id": c1_id,
        "claim_b_id": c2_id,
        "conflict_reason": "Temporal Architectural Inversion on Session Caching: PR #1082 claimed Dragonfly adoption, but incident thread MSG-9921 ordered immediate rollback to Redis.",
        "description": "Temporal Contradiction: GITHUB_PR #1082 (Oct 18) declared Dragonfly deployed, while SLACK_THREAD MSG-9921 (Oct 21) rolled back to Redis due to memory leaks.",
        "status": "OPEN",
        "temporal_delta_days": 3
    })

    # Runway Tasks
    runway_items = [
        {"id": "task-1", "handover_id": DEFAULT_HANDOVER_ID, "phase": "DAYS_1_7", "title": "IAM & AWS Console Access", "action_type": "GRANT_OWNERSHIP", "target_entity": "AWS Production us-east-1 Console", "is_completed": True},
        {"id": "task-2", "handover_id": DEFAULT_HANDOVER_ID, "phase": "DAYS_1_7", "title": "Local Dev & VPC Tunneling Runbook", "action_type": "RUNBOOK_VERIFY", "target_entity": "Local Dev Environment & Bastion", "is_completed": True},
        {"id": "task-3", "handover_id": DEFAULT_HANDOVER_ID, "phase": "DAYS_8_14", "title": "Redis Eviction Monitoring Setup", "action_type": "RUNBOOK_VERIFY", "target_entity": "Datadog Alert Monitors & PagerDuty", "is_completed": False},
        {"id": "task-4", "handover_id": DEFAULT_HANDOVER_ID, "phase": "DAYS_8_14", "title": "Terraform State & KMS Key Policy Audit", "action_type": "RUNBOOK_VERIFY", "target_entity": "Terraform Cloud State Files", "is_completed": False},
        {"id": "task-5", "handover_id": DEFAULT_HANDOVER_ID, "phase": "DAYS_15_30", "title": "Core Banking API Architecture Roadmap Hand-off", "action_type": "MIGRATION_TAKEOVER", "target_entity": "Executive Architecture Board", "is_completed": False},
        {"id": "task-6", "handover_id": DEFAULT_HANDOVER_ID, "phase": "DAYS_15_30", "title": "Departing Lead Credentials Deprovisioning", "action_type": "REVOKE_ACCESS", "target_entity": "Okta SSO, GitHub Org, AWS Admin", "is_completed": False},
    ]
    for task in runway_items:
        db_instance.save_runway_task(task)

ensure_seed_data()

# Schemas
class IngestRequest(BaseModel):
    sources: List[Dict[str, Any]]

class GenerateRequest(BaseModel):
    workspace_id: UUID
    departing_user_id: str
    title: str
    sources: Optional[List[Dict[str, Any]]] = None

class GitHubImportRequest(BaseModel):
    clone_url: str
    branch: Optional[str] = "main"
    token: Optional[str] = None
    title: Optional[str] = None
    departing_user_id: Optional[str] = None
    workspace_id: Optional[UUID] = None
    max_commits: Optional[int] = 20

class ArbitrateRequest(BaseModel):
    resolution: str  # RESOLVED_A, RESOLVED_B, RESOLVED_CUSTOM
    rationale: str
    actor_id: str = "reviewer"

class TaskToggleRequest(BaseModel):
    is_completed: Optional[bool] = None

# Health Endpoints
@app.get("/health")
@app.get("/api/v1/health")
async def health_check():
    handovers = db_instance.list_handovers()
    chunks = db_instance.list_chunks()
    return {
        "status": "healthy",
        "service": "relay-core-api",
        "storage": "sqlite-persistent",
        "timestamp": utc_now_iso(),
        "handovers_count": len(handovers),
        "chunks_count": len(chunks)
    }

# Workspaces & Ingestion
@app.post("/api/v1/workspaces/{workspace_id}/ingest", status_code=202)
async def ingest_data(workspace_id: UUID, request: IngestRequest):
    chunker = ChunkerEngine()
    chunks = chunker.process_payload(request.sources)

    ws_id = str(workspace_id)
    for chunk in chunks:
        c_dict = dump_model(chunk)
        c_dict["workspace_id"] = ws_id
        db_instance.save_chunk(c_dict)

    return {
        "status": "COMPLETED",
        "workspace_id": ws_id,
        "batch_id": str(uuid4()),
        "chunks_processed": len(chunks)
    }

@app.get("/api/v1/workspaces/{workspace_id}/chunks")
async def list_workspace_chunks(workspace_id: UUID):
    ws_id = str(workspace_id)
    chunks = db_instance.list_chunks(ws_id)
    return {
        "workspace_id": ws_id,
        "count": len(chunks),
        "chunks": chunks
    }

# Handovers
@app.get("/api/v1/handovers")
async def list_handovers():
    handovers = db_instance.list_handovers()
    return {"handovers": handovers}

@app.post("/api/v1/handovers/generate", status_code=201)
async def generate_handover(request: GenerateRequest):
    handover_id = str(uuid4())
    ws_id = str(request.workspace_id)

    sources = request.sources
    if not sources:
        # Check if chunks exist in db for this workspace
        ws_chunks = db_instance.list_chunks(ws_id)
        if ws_chunks:
            sources = [
                {
                    "content": c["content_raw"],
                    "source_url": c["source_url"],
                    "author_handle": c["author_handle"],
                    "timestamp": c["created_at"],
                    "source_type": c["source_type"],
                    "external_id": c.get("external_id")
                }
                for c in ws_chunks
            ]
        else:
            # Baseline test payload if user provides empty sources
            sources = [
                {
                    "source_type": "GITHUB_PR",
                    "external_id": "PR-1082",
                    "source_url": "https://github.com/org/core-api/pull/1082",
                    "author_handle": request.departing_user_id,
                    "timestamp": "2026-10-18T14:22:00Z",
                    "content": "Refactored session caching. Replaced Redis cluster with local Dragonfly instance due to memory overhead in VPC. Verified in staging."
                },
                {
                    "source_type": "SLACK_THREAD",
                    "external_id": "MSG-9921",
                    "source_url": "https://org.slack.com/archives/C021/p1697640000",
                    "author_handle": request.departing_user_id,
                    "timestamp": "2026-10-21T09:15:00Z",
                    "content": "Heads up: Dragonfly memory leak bug observed during staging load test. Rolling back to Redis until v1.2 patch lands. Do not use Dragonfly for now."
                }
            ]

    # Run genuine extraction pipeline
    orchestrator = RelayOrchestrator()
    result = await orchestrator.run_full_pipeline(sources, ws_id)

    # Save to SQLite
    db_instance.save_handover({
        "id": handover_id,
        "workspace_id": ws_id,
        "title": request.title,
        "departing_user_id": request.departing_user_id,
        "target_successor_id": None,
        "status": "UNDER_REVIEW",
        "created_at": utc_now_iso()
    })

    # Save chunks, claims, conflicts
    for chunk in result.get("chunks", []):
        c_dict = dump_model(chunk)
        c_dict["workspace_id"] = ws_id
        db_instance.save_chunk(c_dict)

    for claim in result["claims"]:
        c_dict = dump_model(claim)
        c_dict["handover_id"] = handover_id
        db_instance.save_claim(c_dict)

    for conflict in result["conflicts"]:
        conf_dict = dump_model(conflict)
        conf_dict["handover_id"] = handover_id
        db_instance.save_conflict(conf_dict)

    # Dynamic runway generation based on claims
    default_runway = [
        {"id": f"task-{handover_id[:6]}-1", "handover_id": handover_id, "phase": "DAYS_1_7", "title": f"Access Provisioning for {request.title}", "action_type": "GRANT_OWNERSHIP", "target_entity": "Production Console & Repos", "is_completed": False},
        {"id": f"task-{handover_id[:6]}-2", "handover_id": handover_id, "phase": "DAYS_1_7", "title": "Runbook & Environment Replication", "action_type": "RUNBOOK_VERIFY", "target_entity": "Staging Environment", "is_completed": False},
        {"id": f"task-{handover_id[:6]}-3", "handover_id": handover_id, "phase": "DAYS_8_14", "title": "Resolve Flagged Architectural Contradictions", "action_type": "RUNBOOK_VERIFY", "target_entity": "Architecture Committee", "is_completed": False},
        {"id": f"task-{handover_id[:6]}-4", "handover_id": handover_id, "phase": "DAYS_15_30", "title": "Complete Ownership Transfer & Credential Deprovisioning", "action_type": "REVOKE_ACCESS", "target_entity": f"@{request.departing_user_id} Accounts", "is_completed": False},
    ]
    for t in default_runway:
        db_instance.save_runway_task(t)

    return {
        "handover_id": handover_id,
        "status": "UNDER_REVIEW",
        "stats": {
            "decisions_extracted": len(result["claims"]),
            "conflicts_flagged": len(result["conflicts"]),
            "chunks_processed": result.get("processed_chunks", len(sources))
        }
    }

@app.post("/api/v1/handovers/import-github", status_code=201)
async def import_github_handover(request: GitHubImportRequest):
    """
    Imports a Git repository via Clone URL (no OAuth setup required).
    Inspects commits, reconstructs architectural trails, flags contradictions,
    and initializes a new Transition Dossier.
    """
    repo_data = GitHubImporter.import_repository(
        clone_url=request.clone_url,
        branch=request.branch or "main",
        token=request.token,
        max_commits=request.max_commits or 20
    )

    handover_id = str(uuid4())
    ws_id = str(request.workspace_id or DEFAULT_WORKSPACE_ID)

    repo_name = repo_data.get("repo") or "Repository"
    default_author = repo_data["commits"][0]["author"] if repo_data.get("commits") else "lead_dev"
    departing_user = request.departing_user_id or default_author
    dossier_title = request.title or f"{repo_name} Architecture & Handover Dossier"

    # Run genuine extraction pipeline over repo commits
    orchestrator = RelayOrchestrator()
    result = await orchestrator.run_full_pipeline(repo_data["source_chunks"], ws_id)

    # Save Handover
    db_instance.save_handover({
        "id": handover_id,
        "workspace_id": ws_id,
        "title": dossier_title,
        "departing_user_id": departing_user,
        "target_successor_id": "alex.m",
        "status": "UNDER_REVIEW",
        "created_at": utc_now_iso()
    })

    # Save chunks, claims, conflicts
    for chunk in result.get("chunks", []):
        c_dict = dump_model(chunk)
        c_dict["workspace_id"] = ws_id
        db_instance.save_chunk(c_dict)

    for claim in result["claims"]:
        c_dict = dump_model(claim)
        c_dict["handover_id"] = handover_id
        db_instance.save_claim(c_dict)

    for conflict in result["conflicts"]:
        conf_dict = dump_model(conflict)
        conf_dict["handover_id"] = handover_id
        db_instance.save_conflict(conf_dict)

    # Repository-specific runway tasks
    repo_runway = [
        {"id": f"task-{handover_id[:6]}-1", "handover_id": handover_id, "phase": "DAYS_1_7", "title": f"Clone & Local Dev Environment Setup for {repo_name}", "action_type": "GRANT_OWNERSHIP", "target_entity": f"{repo_name} Local Sandbox & Docker", "is_completed": True},
        {"id": f"task-{handover_id[:6]}-2", "handover_id": handover_id, "phase": "DAYS_1_7", "title": f"Git Permissions & Branch Protection Audit for {repo_name}", "action_type": "RUNBOOK_VERIFY", "target_entity": f"GitHub Org & Protected Branches", "is_completed": False},
        {"id": f"task-{handover_id[:6]}-3", "handover_id": handover_id, "phase": "DAYS_8_14", "title": "Review Git Commit Architectural Contradictions", "action_type": "RUNBOOK_VERIFY", "target_entity": "Institutional Conflict Ledger", "is_completed": False},
        {"id": f"task-{handover_id[:6]}-4", "handover_id": handover_id, "phase": "DAYS_15_30", "title": f"Final Codebase Sign-Off & Revoke @{departing_user} Push Access", "action_type": "REVOKE_ACCESS", "target_entity": "GitHub Repository Admin Access", "is_completed": False},
    ]
    for t in repo_runway:
        db_instance.save_runway_task(t)

    return {
        "handover_id": handover_id,
        "title": dossier_title,
        "repo": repo_name,
        "commits_count": repo_data.get("commits_count", len(repo_data.get("commits", []))),
        "status": "UNDER_REVIEW",
        "stats": {
            "decisions_extracted": len(result["claims"]),
            "conflicts_flagged": len(result["conflicts"]),
            "chunks_processed": result.get("processed_chunks", len(repo_data["source_chunks"]))
        }
    }

@app.get("/api/v1/handovers/{handover_id}")
async def get_handover(handover_id: str, role: str = Query("ROLE_DIRECT_SUCCESSOR")):
    h_id = str(handover_id)
    handover = db_instance.get_handover(h_id)
    if not handover:
        handover = db_instance.get_handover(DEFAULT_HANDOVER_ID)
        if not handover:
            raise HTTPException(status_code=404, detail="Handover not found")
        h_id = DEFAULT_HANDOVER_ID

    role_perms = {
        "ROLE_EXECUTIVE_LEAD": ["PUBLIC", "INTERNAL", "RESTRICTED"],
        "ROLE_DIRECT_SUCCESSOR": ["PUBLIC", "INTERNAL"],
        "ROLE_CONTRIBUTOR_TEAM": ["PUBLIC"],
    }
    allowed = role_perms.get(role, ["PUBLIC"])

    all_claims = db_instance.get_claims_for_handover(h_id)
    projected_claims = [
        c for c in all_claims
        if c.get("security_classification", "INTERNAL") in allowed
    ]
    conflicts = db_instance.get_conflicts_for_handover(h_id)

    return {
        "handover_id": h_id,
        "title": handover["title"],
        "status": handover["status"],
        "role_projected": role,
        "manifest_hash": handover.get("manifest_hash"),
        "frozen_at": handover.get("frozen_at"),
        "claims": projected_claims,
        "conflicts": conflicts
    }

# Claim Verification & Rejection
@app.post("/api/v1/handovers/{handover_id}/claims/{claim_id}/verify")
async def verify_claim(handover_id: str, claim_id: str):
    db_instance.update_claim_status(claim_id, "VERIFIED", f"Verified at {utc_now_iso()}")
    db_instance.record_audit(handover_id, "CLAIM_VERIFIED", "reviewer", {"claim_id": claim_id})
    return {"status": "SUCCESS", "claim_id": claim_id, "human_status": "VERIFIED", "claim": {"id": claim_id, "human_status": "VERIFIED"}}

@app.post("/api/v1/handovers/{handover_id}/claims/{claim_id}/reject")
async def reject_claim(handover_id: str, claim_id: str):
    db_instance.update_claim_status(claim_id, "REJECTED", f"Rejected at {utc_now_iso()}")
    db_instance.record_audit(handover_id, "CLAIM_REJECTED", "reviewer", {"claim_id": claim_id})
    return {"status": "SUCCESS", "claim_id": claim_id, "human_status": "REJECTED", "claim": {"id": claim_id, "human_status": "REJECTED"}}

# Conflict Arbitration
@app.post("/api/v1/handovers/{handover_id}/conflicts/{conflict_id}/arbitrate")
async def arbitrate_conflict(handover_id: str, conflict_id: str, request: ArbitrateRequest):
    db_instance.update_conflict_status(conflict_id, request.resolution, request.rationale, request.actor_id)

    # Automatically align claims
    conflicts = db_instance.get_conflicts_for_handover(handover_id)
    target_conf = next((c for c in conflicts if c["id"] == conflict_id), None)
    if target_conf:
        claim_a = target_conf["claim_a_id"]
        claim_b = target_conf["claim_b_id"]
        if request.resolution == "RESOLVED_A":
            db_instance.update_claim_status(claim_a, "VERIFIED", "Arbitrated as canonical institutional truth")
            db_instance.update_claim_status(claim_b, "REJECTED", "Superseded / invalidated via arbitration")
        elif request.resolution == "RESOLVED_B":
            db_instance.update_claim_status(claim_b, "VERIFIED", "Arbitrated as canonical institutional truth")
            db_instance.update_claim_status(claim_a, "REJECTED", "Superseded / invalidated via arbitration")

    db_instance.record_audit(handover_id, "CONFLICT_ARBITRATED", request.actor_id, {
        "conflict_id": conflict_id,
        "resolution": request.resolution,
        "rationale": request.rationale
    })

    return {
        "status": "SUCCESS",
        "conflict_id": conflict_id,
        "conflict": {
            "id": conflict_id,
            "status": request.resolution,
            "resolution_rationale": request.rationale,
            "resolved_by": request.actor_id
        }
    }

# Cryptographic Freeze
@app.post("/api/v1/handovers/{handover_id}/freeze")
async def freeze_dossier(handover_id: str):
    handover = db_instance.get_handover(handover_id) or db_instance.get_handover(DEFAULT_HANDOVER_ID)
    if not handover:
        raise HTTPException(status_code=404, detail="Handover not found")
    h_id = handover["id"]

    claims = db_instance.get_claims_for_handover(h_id)
    manifest_payload = {
        "handover_id": h_id,
        "title": handover["title"],
        "claims": sorted([f"{c['id']}:{c['human_status']}:{c.get('confidence_score')}" for c in claims]),
        "frozen_timestamp": utc_now_iso()
    }
    canonical_repr = json.dumps(manifest_payload, sort_keys=True)
    manifest_hash = hashlib.sha256(canonical_repr.encode('utf-8')).hexdigest()

    handover["status"] = "FROZEN"
    handover["manifest_hash"] = manifest_hash
    handover["frozen_at"] = manifest_payload["frozen_timestamp"]
    db_instance.save_handover(handover)

    db_instance.record_audit(h_id, "FROZEN", "departing_lead", {
        "manifest_hash": manifest_hash,
        "timestamp": handover["frozen_at"]
    })

    return {
        "status": "FROZEN",
        "manifest_hash": manifest_hash,
        "frozen_at": handover["frozen_at"]
    }

# Runway Tasks
@app.get("/api/v1/handovers/{handover_id}/runway")
async def get_runway_tasks(handover_id: str):
    h_id = str(handover_id)
    tasks = db_instance.get_runway_tasks(h_id)
    if not tasks and h_id != DEFAULT_HANDOVER_ID:
        tasks = db_instance.get_runway_tasks(DEFAULT_HANDOVER_ID)
    return {"handover_id": h_id, "tasks": tasks}

@app.put("/api/v1/handovers/{handover_id}/runway/{task_id}")
@app.post("/api/v1/handovers/{handover_id}/runway/{task_id}/toggle")
async def toggle_runway_task(handover_id: str, task_id: str, body: Optional[TaskToggleRequest] = None):
    try:
        updated = db_instance.toggle_runway_task(task_id, body.is_completed if body else None)
        return {"status": "SUCCESS", "task": updated}
    except KeyError:
        raise HTTPException(status_code=404, detail="Runway task not found")

# Audit Ledger
@app.get("/api/v1/handovers/{handover_id}/audit")
async def get_audit_trail(handover_id: str):
    records = db_instance.get_audit_trail(handover_id)
    return {"handover_id": handover_id, "audit_records": records}
