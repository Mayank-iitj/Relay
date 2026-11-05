import re
from typing import List, Tuple, Dict, Any, Optional
from datetime import datetime, timezone
from uuid import uuid4
from app.models.domain import ConflictRecord, Claim

class ContradictionEngine:
    def __init__(self):
        # Known enterprise entities and patterns
        self.common_entities = [
            "dragonfly", "redis", "postgres", "postgresql", "mysql", "mongodb",
            "kafka", "rabbitmq", "sqs", "sns", "kinesis",
            "auth0", "cognito", "clerk", "keycloak", "jwt",
            "docker", "kubernetes", "k8s", "terraform", "helm",
            "vpc", "aws", "gcp", "azure", "datadog", "pagerduty", "kms"
        ]

        self.adopt_keywords = [
            "adopt", "adopted", "adopting", "replace", "replaced", "replacing",
            "migrate", "migrated", "migrating", "switch", "switched", "deploy",
            "deployed", "deploying", "retained", "retain", "active", "enabled",
            "implement", "implemented", "upgrade", "upgraded", "use", "using"
        ]

        self.rollback_keywords = [
            "rollback", "rolled back", "rolling back", "revert", "reverted", "reverting",
            "abort", "aborted", "aborting", "leak", "leaking", "bug", "issue", "failure",
            "failing", "do not use", "deprecated", "deprecate", "eviction", "decommission",
            "decommissioned", "crashing", "corrupted"
        ]

    def calculate_confidence(self, prov_score: float, freq_score: float, fresh_score: float) -> float:
        """
        Calculates confidence score based on Document 7:
        S = 0.40(C_prov) + 0.30(C_freq) + 0.30(C_fresh)
        """
        score = (0.40 * prov_score) + (0.30 * freq_score) + (0.30 * fresh_score)
        return round(min(max(score, 0.0), 1.0), 2)

    def extract_entities_from_text(self, text: str) -> List[str]:
        text_lower = text.lower()
        found = set()
        for e in self.common_entities:
            if re.search(r'\b' + re.escape(e) + r'\b', text_lower):
                found.add(e)

        # Detect PascalCase / CamelCase custom service names (e.g. AuthService, SessionStore, PaymentGateway)
        custom_names = re.findall(r'\b[A-Z][a-zA-Z0-9]{2,}(?:Service|Store|Gateway|Engine|Worker|Queue|DB|API)\b', text)
        for cn in custom_names:
            found.add(cn.lower())

        return list(found)

    def detect_conflicts_between_claims(self, claims: List[Any]) -> List[ConflictRecord]:
        """
        Performs pairwise assertion matrix check to identify temporal state collisions.
        """
        conflicts = []

        for i in range(len(claims)):
            for j in range(i + 1, len(claims)):
                c1 = claims[i]
                c2 = claims[j]

                c1_id = c1.id if hasattr(c1, "id") else c1["id"]
                c2_id = c2.id if hasattr(c2, "id") else c2["id"]
                c1_title = c1.title if hasattr(c1, "title") else c1["title"]
                c2_title = c2.title if hasattr(c2, "title") else c2["title"]
                c1_desc = c1.description if hasattr(c1, "description") else c1["description"]
                c2_desc = c2.description if hasattr(c2, "description") else c2["description"]

                c1_full = f"{c1_title} {c1_desc}".lower()
                c2_full = f"{c2_title} {c2_desc}".lower()

                # Entity overlap
                e1 = self.extract_entities_from_text(c1_full)
                e2 = self.extract_entities_from_text(c2_full)
                shared_entities = set(e1).intersection(set(e2))

                if not shared_entities:
                    continue

                # Polarity check
                c1_adopt = any(k in c1_full for k in self.adopt_keywords)
                c1_rollback = any(k in c1_full for k in self.rollback_keywords)
                c2_adopt = any(k in c2_full for k in self.adopt_keywords)
                c2_rollback = any(k in c2_full for k in self.rollback_keywords)

                # Check for inversion
                is_inverted = (c1_adopt and c2_rollback) or (c1_rollback and c2_adopt)

                if is_inverted:
                    entity_str = ", ".join([e.title() for e in shared_entities])
                    c1_time_str = getattr(c1, "created_at", None) or (c1.get("created_at") if isinstance(c1, dict) else None)
                    c2_time_str = getattr(c2, "created_at", None) or (c2.get("created_at") if isinstance(c2, dict) else None)

                    delta_days = 3
                    try:
                        if c1_time_str and c2_time_str:
                            t1 = datetime.fromisoformat(c1_time_str.replace("Z", "+00:00"))
                            t2 = datetime.fromisoformat(c2_time_str.replace("Z", "+00:00"))
                            delta_days = max(abs((t2 - t1).days), 1)
                    except Exception:
                        pass

                    hid = getattr(c1, "handover_id", None) or (c1.get("handover_id") if isinstance(c1, dict) else None)

                    reason = f"Temporal Architectural Inversion on {entity_str}: Claim '{c1_title}' conflicts with Claim '{c2_title}' regarding active infrastructure vs operational rollback."
                    desc = f"Temporal Contradiction ({delta_days}d delta): Source evidence indicates conflicting architectural state for {entity_str}. Claim #{c1_id[:8]} vs Claim #{c2_id[:8]}."

                    conflicts.append(ConflictRecord(
                        id=f"conf-{uuid4().hex[:12]}",
                        handover_id=hid,
                        claim_a_id=c1_id,
                        claim_b_id=c2_id,
                        conflict_reason=reason,
                        description=desc,
                        status="OPEN",
                        temporal_delta_days=delta_days
                    ))

        return conflicts

    def detect_conflicts_from_chunks(self, chunks: List[Any], claims: List[Any]) -> List[ConflictRecord]:
        return self.detect_conflicts_between_claims(claims)
