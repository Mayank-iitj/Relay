import pytest
from fastapi.testclient import TestClient
from app.main import app, DEFAULT_HANDOVER_ID

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "relay-core-api"

def test_get_default_handover_with_role_projection():
    # Executive Lead sees RESTRICTED, INTERNAL, PUBLIC
    res_exec = client.get(f"/api/v1/handovers/{DEFAULT_HANDOVER_ID}?role=ROLE_EXECUTIVE_LEAD")
    assert res_exec.status_code == 200
    data_exec = res_exec.json()
    assert data_exec["role_projected"] == "ROLE_EXECUTIVE_LEAD"
    classifications_exec = {c["security_classification"] for c in data_exec["claims"]}
    assert "RESTRICTED" in classifications_exec

    # Contributor Team only sees PUBLIC
    res_contrib = client.get(f"/api/v1/handovers/{DEFAULT_HANDOVER_ID}?role=ROLE_CONTRIBUTOR_TEAM")
    assert res_contrib.status_code == 200
    data_contrib = res_contrib.json()
    classifications_contrib = {c["security_classification"] for c in data_contrib["claims"]}
    assert "RESTRICTED" not in classifications_contrib
    assert "INTERNAL" not in classifications_contrib

def test_claim_verification_and_rejection():
    # Verify claim
    res = client.post(f"/api/v1/handovers/{DEFAULT_HANDOVER_ID}/claims/c102-session-dragonfly-rollout/verify")
    assert res.status_code == 200
    assert res.json()["claim"]["human_status"] == "VERIFIED"

    # Reject claim
    res_rej = client.post(f"/api/v1/handovers/{DEFAULT_HANDOVER_ID}/claims/c102-session-dragonfly-rollout/reject")
    assert res_rej.status_code == 200
    assert res_rej.json()["claim"]["human_status"] == "REJECTED"

def test_conflict_arbitration():
    res = client.post(
        f"/api/v1/handovers/{DEFAULT_HANDOVER_ID}/conflicts/conf-dragonfly-redis-inversion/arbitrate",
        json={
            "resolution": "RESOLVED_A",
            "rationale": "Retained Redis confirmed by staging load tests.",
            "actor_id": "lead_architect"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["conflict"]["status"] == "RESOLVED_A"

def test_runway_task_toggle():
    # Get runway tasks
    res = client.get(f"/api/v1/handovers/{DEFAULT_HANDOVER_ID}/runway")
    assert res.status_code == 200
    tasks = res.json()["tasks"]
    assert len(tasks) > 0

    target_task = tasks[0]
    initial_state = target_task["is_completed"]

    # Toggle task
    res_toggle = client.post(f"/api/v1/handovers/{DEFAULT_HANDOVER_ID}/runway/{target_task['id']}/toggle")
    assert res_toggle.status_code == 200
    assert res_toggle.json()["task"]["is_completed"] != initial_state

def test_freeze_dossier():
    res = client.post(f"/api/v1/handovers/{DEFAULT_HANDOVER_ID}/freeze")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "FROZEN"
    assert "manifest_hash" in data
    assert len(data["manifest_hash"]) == 64  # SHA-256 length

def test_ingest_and_generate_pipeline():
    # 1. Ingest chunks
    ws_id = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
    ingest_payload = {
        "sources": [
            {
                "source_type": "GITHUB_PR",
                "source_url": "https://github.com/org/repo/pull/40",
                "author_handle": "lead_dev",
                "timestamp": "2026-10-10T12:00:00Z",
                "content": "Decision: Migrated database to Aurora Postgres with vector extension."
            }
        ]
    }
    ingest_res = client.post(f"/api/v1/workspaces/{ws_id}/ingest", json=ingest_payload)
    assert ingest_res.status_code == 202
    assert ingest_res.json()["chunks_processed"] == 1

    # 2. Generate Handover
    gen_payload = {
        "workspace_id": ws_id,
        "departing_user_id": "lead_dev",
        "title": "Lead Dev Handoff"
    }
    gen_res = client.post("/api/v1/handovers/generate", json=gen_payload)
    assert gen_res.status_code == 201
    gen_data = gen_res.json()
    assert "handover_id" in gen_data
    assert gen_data["status"] == "UNDER_REVIEW"

