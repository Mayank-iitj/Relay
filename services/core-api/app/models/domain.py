from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime, timezone

def utc_now_iso():
    return datetime.now(timezone.utc).isoformat()

class Citation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    chunk_id: Optional[str] = None
    source: str = "GITHUB_PR"
    hash: Optional[str] = None
    quote: str
    author: Optional[str] = "@unknown"
    time: Optional[str] = None

class Claim(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    handover_id: Optional[str] = None
    claim_type: str = "DECISION"  # DECISION, BLOCKER, DEPENDENCY, RUNWAY_ITEM
    title: str
    description: str
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    security_classification: str = "INTERNAL"  # PUBLIC, INTERNAL, RESTRICTED
    human_status: str = "UNREVIEWED"  # UNREVIEWED, VERIFIED, MODIFIED, REJECTED
    arbitration_note: Optional[str] = None
    citations: List[Citation] = Field(default_factory=list)
    created_at: str = Field(default_factory=utc_now_iso)

class DecisionClaim(Claim):
    claim_type: str = "DECISION"

class BlockerClaim(Claim):
    claim_type: str = "BLOCKER"

class ConflictRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    handover_id: Optional[str] = None
    claim_a_id: str
    claim_b_id: str
    conflict_reason: str
    description: Optional[str] = None
    status: str = "OPEN"  # OPEN, RESOLVED_A, RESOLVED_B, RESOLVED_CUSTOM
    temporal_delta_days: int = 0
    resolved_by: Optional[str] = None
    resolution_rationale: Optional[str] = None
    resolved_at: Optional[str] = None

    def __init__(self, **data):
        super().__init__(**data)
        if not self.description:
            self.description = self.conflict_reason

class RunwayTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    handover_id: Optional[str] = None
    phase: str  # DAYS_1_7, DAYS_8_14, DAYS_15_30
    title: str
    action_type: str  # GRANT_OWNERSHIP, RUNBOOK_VERIFY, MIGRATION_TAKEOVER, REVOKE_ACCESS
    action: Optional[str] = None
    target_entity: str
    target: Optional[str] = None
    is_completed: bool = False
    completed: Optional[bool] = False
    completed_by: Optional[str] = None
    completed_at: Optional[str] = None

    def __init__(self, **data):
        super().__init__(**data)
        if not self.action:
            self.action = self.action_type
        if not self.target:
            self.target = self.target_entity
        if self.completed is not None:
            self.is_completed = self.completed
        else:
            self.completed = self.is_completed

class Handover(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    workspace_id: str
    title: str
    departing_user_id: str
    target_successor_id: Optional[str] = None
    status: str = "UNDER_REVIEW"  # DRAFT, UNDER_REVIEW, FROZEN, ACKNOWLEDGED
    manifest_hash: Optional[str] = None
    frozen_at: Optional[str] = None
    acknowledged_at: Optional[str] = None
    created_at: str = Field(default_factory=utc_now_iso)

class ExtractionResult(BaseModel):
    decisions: List[DecisionClaim] = Field(default_factory=list)
    blockers: List[BlockerClaim] = Field(default_factory=list)
    conflicts: List[ConflictRecord] = Field(default_factory=list)
