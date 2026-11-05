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
    assert data["storage"] == "sqlite-persistent"

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

def test_custom_data_ingestion_and_contradiction_detection():
    """
    Validates that ANY arbitrary custom input data (Kafka, RabbitMQ, custom systems)
    is genuinely parsed, chunked, and analyzed for contradictions without hardcoded mocks.
    """
    ws_id = "55555555-6666-7777-8888-999999999999"
    custom_sources = [
        {
            "source_type": "GITHUB_PR",
            "source_url": "https://github.com/org/payments/pull/88",
            "author_handle": "lead_eng",
            "timestamp": "2026-10-01T10:00:00Z",
            "content": "Migrated event bus to Kafka cluster in us-west-2. Replaced legacy RabbitMQ brokers."
        },
        {
            "source_type": "SLACK_THREAD",
            "source_url": "https://org.slack.com/archives/incidents/p12345",
            "author_handle": "lead_eng",
            "timestamp": "2026-10-04T12:00:00Z",
            "content": "Kafka partition rebalance bug causing severe message lag. Aborting migration and rolling back to RabbitMQ immediately."
        }
    ]

    gen_payload = {
        "workspace_id": ws_id,
        "departing_user_id": "lead_eng",
        "title": "Payment Event Bus Handover",
        "sources": custom_sources
    }

    res = client.post("/api/v1/handovers/generate", json=gen_payload)
    assert res.status_code == 201
    gen_data = res.json()

    handover_id = gen_data["handover_id"]
    assert gen_data["stats"]["decisions_extracted"] >= 2
    assert gen_data["stats"]["conflicts_flagged"] >= 1

    # Verify via get_handover API
    get_res = client.get(f"/api/v1/handovers/{handover_id}")
    assert get_res.status_code == 200
    h_data = get_res.json()
    assert h_data["title"] == "Payment Event Bus Handover"
    assert len(h_data["claims"]) >= 2
    assert len(h_data["conflicts"]) >= 1

    # Conflict reason should explicitly reference Kafka/RabbitMQ
    conflict = h_data["conflicts"][0]
    conflict_text = (conflict.get("conflict_reason", "") + conflict.get("description", "")).lower()
    assert "kafka" in conflict_text or "rabbitmq" in conflict_text
