import hashlib
import json
from uuid import UUID, uuid4
from datetime import datetime, timezone

def utc_now_iso():
    return datetime.now(timezone.utc).isoformat()
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.engine.chunker import ChunkerEngine
from app.engine.extractor import ExtractionService
from app.engine.orchestrator import RelayOrchestrator
from app.models.domain import (
    Handover, Claim, DecisionClaim, BlockerClaim,
    ConflictRecord, Citation, RunwayTask, ExtractionResult
)

app = FastAPI(
    title="Relay Core API",
    description="The Immutable Record of Institutional Truth - Knowledge Handover Platform",
    version="1.0.0"
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
    """Helper for Pydantic v1 / v2 compatibility"""
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    elif hasattr(obj, "dict"):
        return obj.dict()
    return obj

# In-memory database store
db: Dict[str, Dict[str, Any]] = {
    "workspaces": {},
    "handovers": {},
    "chunks": {},
    "claims": {},
    "conflicts": {},
    "runway": {},
    "audit_ledger": {}
}

# Pre-seed the default demo handover with the Dragonfly rollback scenario
DEFAULT_HANDOVER_ID = "f5c22997-cbf6-4b89-a5f1-331e3d30628e"
DEFAULT_WORKSPACE_ID = "11111111-2222-3333-4444-555555555555"

def seed_demo_data():
    h_id = DEFAULT_HANDOVER_ID
    db["handovers"][h_id] = {
        "id": h_id,
        "workspace_id": DEFAULT_WORKSPACE_ID,
        "title": "Core Banking API & Session Architecture Handover",
        "departing_user_id": "schen",
        "target_successor_id": "alex.m",
        "status": "UNDER_REVIEW",
        "manifest_hash": None,
        "frozen_at": None,
        "acknowledged_at": None,
        "created_at": "2026-10-25T10:00:00Z"
    }

    # Citations
    cite_pr = {
        "id": str(uuid4()),
        "chunk_id": "chunk_pr_1082",
        "source": "GITHUB_PR #1082",
        "hash": "8a15b3c4f01d5e22",
        "quote": "Refactored session caching. Replaced Redis cluster with local Dragonfly instance due to memory overhead in VPC. Verified in staging.",
        "author": "schen",
        "time": "2026-10-18T14:22:00Z"
    }

    cite_slack = {
        "id": str(uuid4()),
        "chunk_id": "chunk_slack_9921",
        "source": "SLACK_THREAD / #incident-room",
        "hash": "e3b0c44298fc1c14",
        "quote": "Heads up: Dragonfly memory leak bug observed during staging load test. Rolling back to Redis until v1.2 patch lands. Do not use Dragonfly for now.",
        "author": "schen",
        "time": "2026-10-21T09:15:00Z"
    }

    cite_linear = {
        "id": str(uuid4()),
        "chunk_id": "chunk_lin_442",
        "source": "LINEAR_ISSUE / LIN-442",
        "hash": "9f71c420e1a8b301",
        "quote": "Investigate Dragonfly as a memory-efficient replacement for Redis in our session store.",
        "author": "schen",
        "time": "2026-10-15T10:00:00Z"
    }

    cite_auth = {
        "id": str(uuid4()),
        "chunk_id": "chunk_pr_1090",
        "source": "GITHUB_PR #1090",
        "hash": "4b92d837ae1029aa",
        "quote": "Migrated JWT signing keys to AWS KMS with automated 90-day rotation. Deprecated local HMAC-SHA256 secrets.",
        "author": "schen",
        "time": "2026-10-22T16:45:00Z"
    }

    # Claims
    c1_id = "c101-session-retain-redis"
    c2_id = "c102-session-dragonfly-rollout"
    c3_id = "c103-vpc-memory-overhead"
    c4_id = "c104-kms-key-rotation"

    db["claims"][c1_id] = {
        "id": c1_id,
        "handover_id": h_id,
        "claim_type": "DECISION",
        "title": "Session Caching Engine: Retain Redis Core",
        "description": "Retained primary Redis cluster for session caching. Dragonfly migration was formally aborted due to native memory leaks during 50k req/s load test.",
        "confidence_score": 0.96,
        "security_classification": "INTERNAL",
        "human_status": "VERIFIED",
        "arbitration_note": "Verified against staging load test post-mortem on Oct 21.",
        "citations": [cite_slack],
        "created_at": "2026-10-21T09:30:00Z"
    }

    db["claims"][c2_id] = {
        "id": c2_id,
        "handover_id": h_id,
        "claim_type": "DECISION",
        "title": "Session Caching Migration: Dragonfly Replacement",
        "description": "Superseded architectural decision asserting Dragonfly replaced Redis in staging. Flagged as conflicting with operational rollback.",
        "confidence_score": 0.84,
        "security_classification": "INTERNAL",
        "human_status": "UNREVIEWED",
        "arbitration_note": None,
        "citations": [cite_pr],
        "created_at": "2026-10-18T14:30:00Z"
    }

    db["claims"][c3_id] = {
        "id": c3_id,
        "handover_id": h_id,
        "claim_type": "BLOCKER",
        "title": "VPC Memory Overhead & Cluster Eviction Spikes",
        "description": "Current Redis cluster in us-east-1 VPC reaches 88% memory ceiling during batch settlement windows, causing sporadic keyspace evictions.",
        "confidence_score": 0.91,
        "security_classification": "RESTRICTED",
        "human_status": "UNREVIEWED",
        "arbitration_note": None,
        "citations": [cite_linear],
        "created_at": "2026-10-15T11:00:00Z"
    }

    db["claims"][c4_id] = {
        "id": c4_id,
        "handover_id": h_id,
        "claim_type": "DECISION",
        "title": "KMS Cryptographic Signing & Key Rotation",
        "description": "Public key rotation infrastructure finalized. All customer session JWTs are signed via AWS KMS asymmetric RSA-4096 key pairs.",
        "confidence_score": 0.99,
        "security_classification": "PUBLIC",
        "human_status": "VERIFIED",
        "arbitration_note": "Security audit cleared and verified in production.",
        "citations": [cite_auth],
        "created_at": "2026-10-22T17:00:00Z"
    }

    # Conflict Record
    conf_id = "conf-dragonfly-redis-inversion"
    db["conflicts"][conf_id] = {
        "id": conf_id,
        "handover_id": h_id,
        "claim_a_id": c1_id,
        "claim_b_id": c2_id,
        "conflict_reason": "Temporal Architectural Inversion on Session Caching: PR #1082 claimed Dragonfly adoption, but incident thread MSG-9921 ordered immediate rollback to Redis.",
        "description": "Temporal Contradiction: GITHUB_PR #1082 (Oct 18) declared Dragonfly deployed, while SLACK_THREAD MSG-9921 (Oct 21) rolled back to Redis due to memory leaks.",
        "status": "OPEN",
        "temporal_delta_days": 3,
        "resolved_by": None,
        "resolution_rationale": None,
        "resolved_at": None
    }

    # Runway Tasks
    runway_items = [
        {"id": "task-1", "phase": "DAYS_1_7", "title": "IAM & AWS Console Access", "action_type": "GRANT_OWNERSHIP", "action": "GRANT_OWNERSHIP", "target_entity": "AWS Production us-east-1 Console", "target": "AWS Production us-east-1 Console", "is_completed": True, "completed": True},
        {"id": "task-2", "phase": "DAYS_1_7", "title": "Local Dev & VPC Tunneling Runbook", "action_type": "RUNBOOK_VERIFY", "action": "RUNBOOK_VERIFY", "target_entity": "Local Dev Environment & Bastion", "target": "Local Dev Environment & Bastion", "is_completed": True, "completed": True},
        {"id": "task-3", "phase": "DAYS_8_14", "title": "Redis Eviction Monitoring Setup", "action_type": "RUNBOOK_VERIFY", "action": "RUNBOOK_VERIFY", "target_entity": "Datadog Alert Monitors & PagerDuty", "target": "Datadog Alert Monitors & PagerDuty", "is_completed": False, "completed": False},
        {"id": "task-4", "phase": "DAYS_8_14", "title": "Terraform State & KMS Key Policy Audit", "action_type": "RUNBOOK_VERIFY", "action": "RUNBOOK_VERIFY", "target_entity": "Terraform Cloud State Files", "target": "Terraform Cloud State Files", "is_completed": False, "completed": False},
        {"id": "task-5", "phase": "DAYS_15_30", "title": "Core Banking API Architecture Roadmap Hand-off", "action_type": "MIGRATION_TAKEOVER", "action": "MIGRATION_TAKEOVER", "target_entity": "Executive Architecture Board", "target": "Executive Architecture Board", "is_completed": False, "completed": False},
        {"id": "task-6", "phase": "DAYS_15_30", "title": "Departing Lead Credentials Deprovisioning", "action_type": "REVOKE_ACCESS", "action": "REVOKE_ACCESS", "target_entity": "Okta SSO, GitHub Org, AWS Admin", "target": "Okta SSO, GitHub Org, AWS Admin", "is_completed": False, "completed": False},
    ]
    for task in runway_items:
        task["handover_id"] = h_id
        db["runway"][task["id"]] = task

# Seed initial state
seed_demo_data()

# Request schemas
class IngestRequest(BaseModel):
    sources: List[Dict[str, Any]]

class GenerateRequest(BaseModel):
    workspace_id: UUID
    departing_user_id: str
    title: str
    sources: Optional[List[Dict[str, Any]]] = None

class ArbitrateRequest(BaseModel):
    resolution: str  # RESOLVED_A, RESOLVED_B, RESOLVED_CUSTOM
    rationale: str
    actor_id: str = "schen"

class TaskToggleRequest(BaseModel):
    is_completed: Optional[bool] = None

# Health Endpoints
@app.get("/health")
@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "relay-core-api",
        "timestamp": utc_now_iso(),
        "handovers_count": len(db["handovers"]),
        "claims_count": len(db["claims"]),
        "conflicts_count": len(db["conflicts"])
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
        db["chunks"][str(chunk.id)] = c_dict

    return {
        "status": "COMPLETED",
        "workspace_id": ws_id,
        "batch_id": str(uuid4()),
        "chunks_processed": len(chunks)
    }

@app.get("/api/v1/workspaces/{workspace_id}/chunks")
async def list_workspace_chunks(workspace_id: UUID):
    ws_id = str(workspace_id)
    chunks = [c for c in db["chunks"].values() if c.get("workspace_id") == ws_id]
    return {
        "workspace_id": ws_id,
        "count": len(chunks),
        "chunks": chunks
    }

# Handovers
@app.get("/api/v1/handovers")
async def list_handovers():
    return {
        "handovers": list(db["handovers"].values())
    }

@app.post("/api/v1/handovers/generate", status_code=201)
async def generate_handover(request: GenerateRequest):
    handover_id = str(uuid4())
    ws_id = str(request.workspace_id)

    sources = request.sources
    if not sources:
        # Check if chunks exist in db for this workspace
        ws_chunks = [c for c in db["chunks"].values() if c.get("workspace_id") == ws_id]
        if ws_chunks:
            sources = [
                {
                    "content": c["content_raw"],
                    "source_url": c["source_metadata"].get("source_url", ""),
                    "author_handle": c["source_metadata"].get("author", "unknown"),
                    "timestamp": c["source_metadata"].get("timestamp", utc_now_iso()),
                    "source_type": c["source_metadata"].get("source_type", "GENERAL"),
                    "external_id": c["source_metadata"].get("external_id")
                }
                for c in ws_chunks
            ]
        else:
            # Default rich scenario (Dragonfly Rollback)
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
                },
                {
                    "source_type": "LINEAR_ISSUE",
                    "external_id": "LIN-442",
                    "source_url": "https://linear.app/org/issue/LIN-442",
                    "author_handle": request.departing_user_id,
                    "timestamp": "2026-10-15T10:00:00Z",
                    "content": "Investigate Dragonfly as a memory-efficient replacement for Redis in our session store."
                }
            ]

    orchestrator = RelayOrchestrator()
    result = await orchestrator.run_full_pipeline(sources, ws_id)

    db["handovers"][handover_id] = {
        "id": handover_id,
        "workspace_id": ws_id,
        "title": request.title,
        "departing_user_id": request.departing_user_id,
        "target_successor_id": None,
        "status": "UNDER_REVIEW",
        "manifest_hash": None,
        "frozen_at": None,
        "acknowledged_at": None,
        "created_at": utc_now_iso()
    }

    # Store claims and conflicts
    for claim in result["claims"]:
        c_dict = dump_model(claim)
        c_dict["handover_id"] = handover_id
        db["claims"][c_dict["id"]] = c_dict

    for conflict in result["conflicts"]:
        conf_dict = dump_model(conflict)
        conf_dict["handover_id"] = handover_id
        db["conflicts"][conf_dict["id"]] = conf_dict

    # Seed default runway tasks for this handover
    default_runway = [
        {"id": f"task-{handover_id[:4]}-1", "handover_id": handover_id, "phase": "DAYS_1_7", "title": "Access Provisioning", "action_type": "GRANT_OWNERSHIP", "action": "GRANT_OWNERSHIP", "target_entity": "AWS Production Console", "target": "AWS Production Console", "is_completed": False, "completed": False},
        {"id": f"task-{handover_id[:4]}-2", "handover_id": handover_id, "phase": "DAYS_1_7", "title": "Env Setup & Local Bastion", "action_type": "RUNBOOK_VERIFY", "action": "RUNBOOK_VERIFY", "target_entity": "Local Dev Environment", "target": "Local Dev Environment", "is_completed": False, "completed": False},
        {"id": f"task-{handover_id[:4]}-3", "handover_id": handover_id, "phase": "DAYS_8_14", "title": "Infrastructure Audit", "action_type": "RUNBOOK_VERIFY", "action": "RUNBOOK_VERIFY", "target_entity": "Terraform State Files", "target": "Terraform State Files", "is_completed": False, "completed": False},
        {"id": f"task-{handover_id[:4]}-4", "handover_id": handover_id, "phase": "DAYS_15_30", "title": "Stakeholder Hand-off", "action_type": "MIGRATION_TAKEOVER", "action": "MIGRATION_TAKEOVER", "target_entity": "Core Architecture Roadmap", "target": "Core Architecture Roadmap", "is_completed": False, "completed": False},
    ]
    for t in default_runway:
        db["runway"][t["id"]] = t

    return {
        "handover_id": handover_id,
        "status": "UNDER_REVIEW",
        "stats": {
            "decisions_extracted": len(result["claims"]),
            "conflicts_flagged": len(result["conflicts"]),
            "chunks_processed": result.get("processed_chunks", len(sources))
        }
    }

@app.get("/api/v1/handovers/{handover_id}")
async def get_handover(handover_id: str, role: str = Query("ROLE_DIRECT_SUCCESSOR")):
    h_id = str(handover_id)
    if h_id not in db["handovers"]:
        # If the requested handover isn't found, fall back to default demo handover if available
        if DEFAULT_HANDOVER_ID in db["handovers"]:
            h_id = DEFAULT_HANDOVER_ID
        else:
            raise HTTPException(status_code=404, detail="Handover not found")

    handover = db["handovers"][h_id]

    # ABAC Role Projections:
    # ROLE_EXECUTIVE_LEAD: Complete visibility (PUBLIC, INTERNAL, RESTRICTED)
    # ROLE_DIRECT_SUCCESSOR: High operational visibility (PUBLIC, INTERNAL)
    # ROLE_CONTRIBUTOR_TEAM: Public architectural decisions only (PUBLIC)
    role_perms = {
        "ROLE_EXECUTIVE_LEAD": ["PUBLIC", "INTERNAL", "RESTRICTED"],
        "ROLE_DIRECT_SUCCESSOR": ["PUBLIC", "INTERNAL"],
        "ROLE_CONTRIBUTOR_TEAM": ["PUBLIC"],
    }
    allowed = role_perms.get(role, ["PUBLIC"])

    # Filter claims associated with this handover
    matching_claims = [
        c for c in db["claims"].values()
        if c.get("handover_id") == h_id
    ]
    if not matching_claims and h_id == DEFAULT_HANDOVER_ID:
        matching_claims = list(db["claims"].values())

    projected_claims = [
        c for c in matching_claims
        if c.get("security_classification", "INTERNAL") in allowed
    ]

    matching_conflicts = [
        conf for conf in db["conflicts"].values()
        if conf.get("handover_id") == h_id or h_id == DEFAULT_HANDOVER_ID
    ]

    return {
        "handover_id": h_id,
        "title": handover["title"],
        "status": handover["status"],
        "role_projected": role,
        "manifest_hash": handover.get("manifest_hash"),
        "frozen_at": handover.get("frozen_at"),
        "claims": projected_claims,
        "conflicts": matching_conflicts
    }

# Claim Verification & Rejection
@app.post("/api/v1/handovers/{handover_id}/claims/{claim_id}/verify")
async def verify_claim(handover_id: str, claim_id: str):
    if claim_id not in db["claims"]:
        raise HTTPException(status_code=404, detail="Claim not found")

    claim = db["claims"][claim_id]
    claim["human_status"] = "VERIFIED"
    claim["arbitration_note"] = f"Verified by reviewer at {utc_now_iso()}"

    # Log to audit ledger
    audit_id = str(uuid4())
    db["audit_ledger"][audit_id] = {
        "id": audit_id,
        "handover_id": handover_id,
        "action": "CLAIM_VERIFIED",
        "actor_id": "current_reviewer",
        "claim_id": claim_id,
        "timestamp": utc_now_iso()
    }

    return {"status": "SUCCESS", "claim": claim}

@app.post("/api/v1/handovers/{handover_id}/claims/{claim_id}/reject")
async def reject_claim(handover_id: str, claim_id: str):
    if claim_id not in db["claims"]:
        raise HTTPException(status_code=404, detail="Claim not found")

    claim = db["claims"][claim_id]
    claim["human_status"] = "REJECTED"
    claim["arbitration_note"] = f"Rejected by reviewer at {utc_now_iso()}"

    audit_id = str(uuid4())
    db["audit_ledger"][audit_id] = {
        "id": audit_id,
        "handover_id": handover_id,
        "action": "CLAIM_REJECTED",
        "actor_id": "current_reviewer",
        "claim_id": claim_id,
        "timestamp": utc_now_iso()
    }

    return {"status": "SUCCESS", "claim": claim}

# Conflict Arbitration
@app.post("/api/v1/handovers/{handover_id}/conflicts/{conflict_id}/arbitrate")
async def arbitrate_conflict(handover_id: str, conflict_id: str, request: ArbitrateRequest):
    if conflict_id not in db["conflicts"]:
        raise HTTPException(status_code=404, detail="Conflict record not found")

    conflict = db["conflicts"][conflict_id]
    conflict["status"] = request.resolution
    conflict["resolution_rationale"] = request.rationale
    conflict["resolved_by"] = request.actor_id
    conflict["resolved_at"] = utc_now_iso()

    # If RESOLVED_A, mark claim_a as verified and claim_b as rejected
    claim_a_id = conflict.get("claim_a_id")
    claim_b_id = conflict.get("claim_b_id")

    if request.resolution == "RESOLVED_A" and claim_a_id in db["claims"]:
        db["claims"][claim_a_id]["human_status"] = "VERIFIED"
        if claim_b_id in db["claims"]:
            db["claims"][claim_b_id]["human_status"] = "REJECTED"
    elif request.resolution == "RESOLVED_B" and claim_b_id in db["claims"]:
        db["claims"][claim_b_id]["human_status"] = "VERIFIED"
        if claim_a_id in db["claims"]:
            db["claims"][claim_a_id]["human_status"] = "REJECTED"

    return {"status": "SUCCESS", "conflict": conflict}

# Cryptographic Freeze
@app.post("/api/v1/handovers/{handover_id}/freeze")
async def freeze_dossier(handover_id: str):
    h_id = str(handover_id)
    if h_id not in db["handovers"]:
        if DEFAULT_HANDOVER_ID in db["handovers"]:
            h_id = DEFAULT_HANDOVER_ID
        else:
            raise HTTPException(status_code=404, detail="Handover not found")

    handover = db["handovers"][h_id]

    # Gather all verified claims and generate canonical SHA-256 manifest
    matching_claims = [
        c for c in db["claims"].values()
        if c.get("handover_id") == h_id or h_id == DEFAULT_HANDOVER_ID
    ]

    manifest_payload = {
        "handover_id": h_id,
        "title": handover["title"],
        "claims": sorted([c["id"] for c in matching_claims]),
        "frozen_timestamp": utc_now_iso()
    }
    canonical_repr = json.dumps(manifest_payload, sort_keys=True)
    manifest_hash = hashlib.sha256(canonical_repr.encode('utf-8')).hexdigest()

    handover["status"] = "FROZEN"
    handover["manifest_hash"] = manifest_hash
    handover["frozen_at"] = manifest_payload["frozen_timestamp"]

    # Audit entry
    audit_id = str(uuid4())
    db["audit_ledger"][audit_id] = {
        "id": audit_id,
        "handover_id": h_id,
        "action": "FROZEN",
        "actor_id": "departing_lead",
        "manifest_hash": manifest_hash,
        "timestamp": handover["frozen_at"]
    }

    return {
        "status": "FROZEN",
        "manifest_hash": manifest_hash,
        "frozen_at": handover["frozen_at"]
    }

# Runway Tasks
@app.get("/api/v1/handovers/{handover_id}/runway")
async def get_runway_tasks(handover_id: str):
    h_id = str(handover_id)
    tasks = [
        t for t in db["runway"].values()
        if t.get("handover_id") == h_id or h_id == DEFAULT_HANDOVER_ID
    ]
    return {"handover_id": h_id, "tasks": tasks}

@app.put("/api/v1/handovers/{handover_id}/runway/{task_id}")
@app.post("/api/v1/handovers/{handover_id}/runway/{task_id}/toggle")
async def toggle_runway_task(handover_id: str, task_id: str, body: Optional[TaskToggleRequest] = None):
    if task_id not in db["runway"]:
        raise HTTPException(status_code=404, detail="Runway task not found")

    task = db["runway"][task_id]
    if body and body.is_completed is not None:
        new_state = body.is_completed
    else:
        new_state = not task.get("is_completed", False)

    task["is_completed"] = new_state
    task["completed"] = new_state
    task["completed_at"] = utc_now_iso() if new_state else None

    return {"status": "SUCCESS", "task": task}

# Audit Ledger
@app.get("/api/v1/handovers/{handover_id}/audit")
async def get_audit_trail(handover_id: str):
    h_id = str(handover_id)
    records = [
        r for r in db["audit_ledger"].values()
        if r.get("handover_id") == h_id or h_id == DEFAULT_HANDOVER_ID
    ]
    return {"handover_id": h_id, "audit_records": records}
