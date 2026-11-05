from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from uuid import UUID, uuid4
from datetime import datetime
import asyncio

# Import our engines
from relay.services.core-api.app.engine.chunker import ChunkerEngine
from relay.services.core-api.app.engine.extractor import ExtractionService
from relay.services.core-api.app.engine.orchestrator import RelayOrchestrator

app = FastAPI(title="Relay Core API")

# Enable CORS for the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory state for hackathon demo (would be Postgres in prod)
db = {
    "workspaces": {},
    "handovers": {},
    "chunks": {},
    "claims": {},
    "conflicts": {}
}

class IngestRequest(BaseModel):
    sources: List[Dict[str, Any]]

class GenerateRequest(BaseModel):
    workspace_id: UUID
    departing_user_id: str
    title: str

@app.post("/api/v1/workspaces/{workspace_id}/ingest", status_code=202)
async def ingest_data(workspace_id: UUID, request: IngestRequest):
    # Real processing using our ChunkerEngine
    chunker = ChunkerEngine()
    chunks = chunker.process_payload(request.sources)

    # Store in memory
    for chunk in chunks:
        db["chunks"][str(chunk.id)] = chunk.dict()

    return {
        "status": "COMPLETED",
        "batch_id": str(uuid4()),
        "chunks_processed": len(chunks)
    }

@app.post("/api/v1/handovers/generate", status_code=201)
async def generate_handover(request: GenerateRequest):
    handover_id = uuid4()

    # Use the orchestrator to synthesize knowledge
    orchestrator = RelayOrchestrator()
    # In a real scenario, we'd pull chunks for the workspace_id
    # For the demo, we'll use a few mock sources if none exist
    mock_sources = [
        {"source_type": "GITHUB_PR", "external_id": "PR-1", "source_url": "url1", "author_handle": "schen", "timestamp": "2026-10-01T00:00:00Z", "content": "Decision: Use Redis for cache."},
        {"source_type": "SLACK_THREAD", "external_id": "MSG-1", "source_url": "url2", "author_handle": "schen", "timestamp": "2026-10-02T00:00:00Z", "content": "Actually, Redis is leaking, we need to rollback."}
    ]

    result = asyncio.run(orchestrator.run_full_pipeline(mock_sources, str(request.workspace_id)))

    # Save handover
    db["handovers"][str(handover_id)] = {
        "id": str(handover_id),
        "title": request.title,
        "status": "UNDER_REVIEW",
        "departing_user_id": request.departing_user_id
    }

    # Save claims and conflicts
    for claim in result["claims"]:
        # Since result claims are Pydantic, convert to dict
        c_dict = claim.dict() if hasattr(claim, 'dict') else claim
        db["claims"][c_dict['id']] = c_dict

    for conflict in result["conflicts"]:
        conf_dict = conflict.dict() if hasattr(conflict, 'dict') else conflict
        db["conflicts"][conf_dict['id']] = conf_dict

    return {
        "handover_id": str(handover_id),
        "status": "UNDER_REVIEW",
        "stats": {
            "decisions_extracted": len(result["claims"]),
            "conflicts_flagged": len(result["conflicts"]),
        }
    }

@app.get("/api/v1/handovers/{handover_id}")
async def get_handover(handover_id: UUID, role: str):
    h_id = str(handover_id)
    if h_id not in db["handovers"]:
        raise HTTPException(status_code=404, detail="Handover not found")

    handover = db["handovers"][h_id]

    # Simple Role Projection Logic
    role_perms = {
        "ROLE_EXECUTIVE_LEAD": ["PUBLIC", "INTERNAL", "RESTRICTED"],
        "ROLE_DIRECT_SUCCESSOR": ["PUBLIC", "INTERNAL"],
        "ROLE_CONTRIBUTOR_TEAM": ["PUBLIC"],
    }
    allowed = role_perms.get(role, ["PUBLIC"])

    # Filter claims by role
    projected_claims = [
        c for c in db["claims"].values()
        if c.get('security_classification', 'INTERNAL') in allowed
    ]

    return {
        "handover_id": h_id,
        "title": handover["title"],
        "status": handover["status"],
        "role_projected": role,
        "claims": projected_claims,
        "conflicts": list(db["conflicts"].values())
    }
