from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime

class DecisionClaim(BaseModel):
    title: str
    description: str
    confidence_score: float = Field(..., ge=0, le=1)
    security_classification: str = "INTERNAL"
    citations: List[str] # List of chunk IDs

class BlockerClaim(BaseModel):
    title: str
    description: str
    confidence_score: float = Field(..., ge=0, le=1)
    security_classification: str = "INTERNAL"
    citations: List[str]

class ConflictRecord(BaseModel):
    claim_a_id: UUID
    claim_b_id: UUID
    conflict_reason: str
    status: str = "OPEN"
    temporal_delta_days: int

class ExtractionResult(BaseModel):
    decisions: List[DecisionClaim]
    blockers: List[BlockerClaim]
    conflicts: List[ConflictRecord]
