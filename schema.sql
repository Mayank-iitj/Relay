-- Relay Core Relational Schema (PostgreSQL 16)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Source Chunks Table
CREATE TABLE source_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    source_type VARCHAR(32) NOT NULL, -- 'GITHUB_PR', 'SLACK_THREAD', 'LINEAR_ISSUE'
    source_url TEXT NOT NULL,
    external_id VARCHAR(128) NOT NULL,
    author_handle VARCHAR(64) NOT NULL,
    content_raw TEXT NOT NULL,
    content_redacted TEXT NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMPTZ NOT NULL,
    ingested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    chunk_hash CHAR(64) NOT NULL UNIQUE
);

CREATE INDEX idx_source_chunks_workspace ON source_chunks(workspace_id);
CREATE INDEX idx_source_chunks_hash ON source_chunks(chunk_hash);

-- 2. Handovers Table
CREATE TABLE handovers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    departing_user_id VARCHAR(64) NOT NULL,
    target_successor_id VARCHAR(64),
    status VARCHAR(32) DEFAULT 'DRAFT', -- 'DRAFT', 'UNDER_REVIEW', 'FROZEN', 'ACKNOWLEDGED'
    manifest_hash CHAR(64),
    frozen_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Claims (Knowledge Nodes) Table
CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handover_id UUID NOT NULL REFERENCES handovers(id) ON DELETE CASCADE,
    claim_type VARCHAR(32) NOT NULL, -- 'DECISION', 'BLOCKER', 'DEPENDENCY', 'RUNWAY_ITEM'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    confidence_score NUMERIC(3, 2) NOT NULL, -- 0.00 to 1.00
    security_classification VARCHAR(32) NOT NULL DEFAULT 'INTERNAL', -- 'PUBLIC', 'INTERNAL', 'RESTRICTED'
    human_status VARCHAR(32) NOT NULL DEFAULT 'UNREVIEWED', -- 'UNREVIEWED', 'VERIFIED', 'MODIFIED', 'REJECTED'
    arbitration_note TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_claims_handover ON claims(handover_id);

-- 4. Claim Citations (Junction Table for Traceability)
CREATE TABLE claim_citations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    chunk_id UUID NOT NULL REFERENCES source_chunks(id),
    quote_offset_start INT,
    quote_offset_end INT,
    exact_quote TEXT NOT NULL
);

CREATE INDEX idx_citations_claim ON claim_citations(claim_id);

-- 5. Contradiction Records
CREATE TABLE conflict_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handover_id UUID NOT NULL REFERENCES handovers(id) ON DELETE CASCADE,
    claim_a_id UUID NOT NULL REFERENCES claims(id),
    claim_b_id UUID NOT NULL REFERENCES claims(id),
    conflict_reason TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'OPEN', -- 'OPEN', 'RESOLVED_A', 'RESOLVED_B', 'RESOLVED_CUSTOM'
    resolved_by VARCHAR(64),
    resolution_rationale TEXT,
    resolved_at TIMESTAMPTZ
);

-- 6. Transition Runway (30-Day Actionable Queue)
CREATE TABLE runway_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handover_id UUID NOT NULL REFERENCES handovers(id) ON DELETE CASCADE,
    phase VARCHAR(32) NOT NULL, -- 'DAYS_1_7', 'DAYS_8_14', 'DAYS_15_30'
    title VARCHAR(255) NOT NULL,
    action_type VARCHAR(32) NOT NULL, -- 'REVOKE_ACCESS', 'GRANT_OWNERSHIP', 'RUNBOOK_VERIFY', 'MIGRATION_TAKEOVER'
    target_entity VARCHAR(255) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_by VARCHAR(64),
    completed_at TIMESTAMPTZ
);

-- 7. Audit & Sign-off Ledger
CREATE TABLE audit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handover_id UUID NOT NULL REFERENCES handovers(id),
    action VARCHAR(64) NOT NULL, -- 'HANDOVER_GENERATED', 'CLAIM_VERIFIED', 'CONFLICT_RESOLVED', 'FROZEN', 'ACKNOWLEDGED'
    actor_id VARCHAR(64) NOT NULL,
    payload_snapshot JSONB NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
