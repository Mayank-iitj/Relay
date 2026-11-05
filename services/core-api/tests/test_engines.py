import pytest
import asyncio
from app.engine.chunker import ChunkerEngine
from app.engine.contradiction import ContradictionEngine
from app.engine.extractor import ExtractionService
from app.engine.orchestrator import RelayOrchestrator
from app.models.domain import DecisionClaim, BlockerClaim, Citation

def test_chunker_redaction():
    chunker = ChunkerEngine()
    sensitive_text = "Contact alice@example.com with api_key=secret_123456 and password=supersecret"
    redacted = chunker.redact(sensitive_text)
    assert "[EMAIL]" in redacted
    assert "alice@example.com" not in redacted
    assert "api_key=[REDACTED]" in redacted
    assert "password=[REDACTED]" in redacted

def test_chunker_deterministic_hash_and_id():
    chunker = ChunkerEngine()
    chunk1 = chunker.create_chunk(
        content="System uses Redis",
        source_url="https://github.com/org/repo/pull/1",
        author="alice",
        timestamp="2026-10-01T00:00:00Z",
        source_type="GITHUB_PR"
    )
    chunk2 = chunker.create_chunk(
        content="System uses Redis",
        source_url="https://github.com/org/repo/pull/1",
        author="alice",
        timestamp="2026-10-01T00:00:00Z",
        source_type="GITHUB_PR"
    )
    assert chunk1.id == chunk2.id
    assert chunk1.chunk_hash == chunk2.chunk_hash

def test_contradiction_confidence_calculation():
    engine = ContradictionEngine()
    # S = 0.40(C_prov) + 0.30(C_freq) + 0.30(C_fresh)
    # 0.4*1.0 + 0.3*0.8 + 0.3*0.9 = 0.4 + 0.24 + 0.27 = 0.91
    score = engine.calculate_confidence(1.0, 0.8, 0.9)
    assert score == 0.91

def test_contradiction_detection():
    engine = ContradictionEngine()
    claim_adopt = DecisionClaim(
        id="c-adopt",
        title="Migrated to Dragonfly",
        description="Replaced Redis cluster with Dragonfly instance in staging.",
        confidence_score=0.92,
        security_classification="INTERNAL"
    )
    claim_rollback = DecisionClaim(
        id="c-rollback",
        title="Retain Redis Session Store",
        description="Dragonfly memory leak bug observed; rolling back to Redis immediately.",
        confidence_score=0.95,
        security_classification="INTERNAL"
    )
    conflicts = engine.detect_conflicts_between_claims([claim_adopt, claim_rollback])
    assert len(conflicts) == 1
    assert conflicts[0].status == "OPEN"
    assert "Dragonfly" in conflicts[0].conflict_reason or "Dragonfly" in conflicts[0].description

def test_orchestrator_pipeline():
    orchestrator = RelayOrchestrator()
    sample_sources = [
        {
            "source_type": "GITHUB_PR",
            "external_id": "PR-1082",
            "source_url": "https://github.com/org/core-api/pull/1082",
            "author_handle": "schen",
            "timestamp": "2026-10-18T14:22:00Z",
            "content": "Replaced Redis cluster with Dragonfly."
        },
        {
            "source_type": "SLACK_THREAD",
            "external_id": "MSG-9921",
            "source_url": "https://org.slack.com/archives/C021/p1697640000",
            "author_handle": "schen",
            "timestamp": "2026-10-21T09:15:00Z",
            "content": "Dragonfly leak bug. Rolling back to Redis."
        }
    ]
    result = asyncio.run(orchestrator.run_full_pipeline(sample_sources, "ws-123"))
    assert "claims" in result
    assert len(result["claims"]) >= 2
    assert "conflicts" in result
    assert len(result["conflicts"]) >= 1

