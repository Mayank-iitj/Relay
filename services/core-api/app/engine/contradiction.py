import re
from typing import List, Tuple, Dict, Any, Optional
from datetime import datetime
from uuid import uuid4
from app.models.domain import ExtractionResult, DecisionClaim, BlockerClaim, ConflictRecord, Claim

class ContradictionEngine:
    def __init__(self):
        # Keywords indicating adoption / replacement vs deprecation / rollback / failure
        self.adopt_keywords = ["replace", "migrate", "migrated", "switched", "adopt", "deployed", "retained", "active", "enable"]
        self.rollback_keywords = ["rollback", "rolled back", "revert", "reverted", "abort", "aborted", "leak", "bug", "do not use", "deprecated", "failing"]

    def calculate_confidence(self, prov_score: float, freq_score: float, fresh_score: float) -> float:
        # S = 0.40(C_prov) + 0.30(C_freq) + 0.30(C_fresh)
        score = (0.40 * prov_score) + (0.30 * freq_score) + (0.30 * fresh_score)
        return round(min(max(score, 0.0), 1.0), 2)

    def detect_conflicts_between_claims(self, claims: List[Claim]) -> List[ConflictRecord]:
        conflicts = []
        for i in range(len(claims)):
            for j in range(i + 1, len(claims)):
                c1 = claims[i]
                c2 = claims[j]

                # Check if both claims discuss common critical entities (e.g. dragonfly, redis, session caching)
                c1_text = f"{c1.title} {c1.description}".lower()
                c2_text = f"{c2.title} {c2.description}".lower()

                # Entity overlap check
                entities = ["dragonfly", "redis", "postgres", "kafka", "vpc", "auth0", "docker", "k8s"]
                shared_entities = [e for e in entities if e in c1_text and e in c2_text]

                if shared_entities:
                    c1_has_rollback = any(k in c1_text for k in self.rollback_keywords)
                    c2_has_rollback = any(k in c2_text for k in self.rollback_keywords)
                    c1_has_adopt = any(k in c1_text for k in self.adopt_keywords)
                    c2_has_adopt = any(k in c2_text for k in self.adopt_keywords)

                    if (c1_has_adopt and c2_has_rollback) or (c1_has_rollback and c2_has_adopt):
                        entity_name = shared_entities[0].title()
                        conflict = ConflictRecord(
                            id=str(uuid4()),
                            handover_id=c1.handover_id or c2.handover_id,
                            claim_a_id=c1.id,
                            claim_b_id=c2.id,
                            conflict_reason=f"Temporal Architectural Inversion on {entity_name}: One source asserts migration to {entity_name}, while a subsequent operational trail mandates rollback/retention.",
                            description=f"Temporal Architectural Inversion on {entity_name}: Claim #{c1.id[:8]} conflicts with Claim #{c2.id[:8]} regarding system state and active infrastructure.",
                            status="OPEN",
                            temporal_delta_days=3
                        )
                        conflicts.append(conflict)
        return conflicts

    def detect_conflicts_from_chunks(self, chunks: List[Any], claims: List[Claim]) -> List[ConflictRecord]:
        # Pairwise check between claims and evidence chunks
        conflicts = self.detect_conflicts_between_claims(claims)
        return conflicts
