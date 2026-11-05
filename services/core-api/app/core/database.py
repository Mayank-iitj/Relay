import os
import sqlite3
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

def utc_now_iso():
    return datetime.now(timezone.utc).isoformat()

DB_PATH = os.environ.get("RELAY_DB_PATH", str(Path(__file__).parent.parent.parent / "relay.db"))

class Database:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._init_db()

    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS source_chunks (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                source_type TEXT NOT NULL,
                source_url TEXT NOT NULL,
                external_id TEXT,
                author_handle TEXT NOT NULL,
                content_raw TEXT NOT NULL,
                content_redacted TEXT NOT NULL,
                chunk_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                ingested_at TEXT NOT NULL
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS handovers (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                title TEXT NOT NULL,
                departing_user_id TEXT NOT NULL,
                target_successor_id TEXT,
                status TEXT DEFAULT 'UNDER_REVIEW',
                manifest_hash TEXT,
                frozen_at TEXT,
                acknowledged_at TEXT,
                created_at TEXT NOT NULL
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS claims (
                id TEXT PRIMARY KEY,
                handover_id TEXT NOT NULL,
                claim_type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                confidence_score REAL NOT NULL,
                security_classification TEXT NOT NULL DEFAULT 'INTERNAL',
                human_status TEXT NOT NULL DEFAULT 'UNREVIEWED',
                arbitration_note TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (handover_id) REFERENCES handovers(id) ON DELETE CASCADE
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS claim_citations (
                id TEXT PRIMARY KEY,
                claim_id TEXT NOT NULL,
                chunk_id TEXT,
                source TEXT NOT NULL,
                author TEXT,
                hash TEXT,
                exact_quote TEXT NOT NULL,
                timestamp TEXT,
                FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS conflict_records (
                id TEXT PRIMARY KEY,
                handover_id TEXT NOT NULL,
                claim_a_id TEXT NOT NULL,
                claim_b_id TEXT NOT NULL,
                conflict_reason TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'OPEN',
                temporal_delta_days INTEGER DEFAULT 0,
                resolved_by TEXT,
                resolution_rationale TEXT,
                resolved_at TEXT,
                FOREIGN KEY (handover_id) REFERENCES handovers(id) ON DELETE CASCADE
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS runway_tasks (
                id TEXT PRIMARY KEY,
                handover_id TEXT NOT NULL,
                phase TEXT NOT NULL,
                title TEXT NOT NULL,
                action_type TEXT NOT NULL,
                target_entity TEXT NOT NULL,
                is_completed INTEGER DEFAULT 0,
                completed_by TEXT,
                completed_at TEXT,
                FOREIGN KEY (handover_id) REFERENCES handovers(id) ON DELETE CASCADE
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_ledger (
                id TEXT PRIMARY KEY,
                handover_id TEXT NOT NULL,
                action TEXT NOT NULL,
                actor_id TEXT NOT NULL,
                payload_snapshot TEXT NOT NULL,
                timestamp TEXT NOT NULL
            );
            """)
            conn.commit()

    # --- Handover CRUD ---
    def save_handover(self, h: Dict[str, Any]):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT OR REPLACE INTO handovers (
                id, workspace_id, title, departing_user_id, target_successor_id,
                status, manifest_hash, frozen_at, acknowledged_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                h["id"], h["workspace_id"], h["title"], h["departing_user_id"],
                h.get("target_successor_id"), h.get("status", "UNDER_REVIEW"),
                h.get("manifest_hash"), h.get("frozen_at"), h.get("acknowledged_at"),
                h.get("created_at", utc_now_iso())
            ))
            conn.commit()

    def get_handover(self, handover_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM handovers WHERE id = ?;", (handover_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return dict(row)

    def list_handovers(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM handovers ORDER BY created_at DESC;")
            return [dict(r) for r in cursor.fetchall()]

    # --- Chunks CRUD ---
    def save_chunk(self, c: Dict[str, Any]):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            meta = c.get("source_metadata", {})
            cursor.execute("""
            INSERT OR REPLACE INTO source_chunks (
                id, workspace_id, source_type, source_url, external_id,
                author_handle, content_raw, content_redacted, chunk_hash,
                created_at, ingested_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                str(c["id"]), c.get("workspace_id", "default"),
                meta.get("source_type", "DOC"), meta.get("source_url", ""),
                meta.get("external_id"), meta.get("author", "unknown"),
                c["content_raw"], c["content_redacted"], c["chunk_hash"],
                meta.get("timestamp", utc_now_iso()), utc_now_iso()
            ))
            conn.commit()

    def list_chunks(self, workspace_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if workspace_id:
                cursor.execute("SELECT * FROM source_chunks WHERE workspace_id = ?;", (workspace_id,))
            else:
                cursor.execute("SELECT * FROM source_chunks;")
            return [dict(r) for r in cursor.fetchall()]

    # --- Claims & Citations CRUD ---
    def save_claim(self, c: Dict[str, Any]):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT OR REPLACE INTO claims (
                id, handover_id, claim_type, title, description,
                confidence_score, security_classification, human_status,
                arbitration_note, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                c["id"], c["handover_id"], c.get("claim_type", "DECISION"),
                c["title"], c["description"], float(c["confidence_score"]),
                c.get("security_classification", "INTERNAL"),
                c.get("human_status", "UNREVIEWED"),
                c.get("arbitration_note"), c.get("created_at", utc_now_iso())
            ))

            # Citations
            for cite in c.get("citations", []):
                cite_id = cite.get("id") or f"cite-{c['id'][:8]}"
                cursor.execute("""
                INSERT OR REPLACE INTO claim_citations (
                    id, claim_id, chunk_id, source, author, hash, exact_quote, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    cite_id, c["id"], cite.get("chunk_id"),
                    cite.get("source", "GENERAL"), cite.get("author", "@unknown"),
                    cite.get("hash", ""), cite.get("quote", ""), cite.get("time", utc_now_iso())
                ))
            conn.commit()

    def get_claims_for_handover(self, handover_id: str) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM claims WHERE handover_id = ? ORDER BY created_at ASC;", (handover_id,))
            claims = [dict(r) for r in cursor.fetchall()]

            for cl in claims:
                cursor.execute("SELECT * FROM claim_citations WHERE claim_id = ?;", (cl["id"],))
                raw_cites = [dict(cite) for cite in cursor.fetchall()]
                cl["citations"] = [
                    {
                        "id": rc["id"],
                        "chunk_id": rc["chunk_id"],
                        "source": rc["source"],
                        "author": rc["author"],
                        "hash": rc["hash"],
                        "quote": rc["exact_quote"],
                        "time": rc["timestamp"]
                    }
                    for rc in raw_cites
                ]
            return claims

    def update_claim_status(self, claim_id: str, status: str, note: Optional[str] = None):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE claims SET human_status = ?, arbitration_note = ? WHERE id = ?;
            """, (status, note, claim_id))
            conn.commit()

    # --- Conflict Records CRUD ---
    def save_conflict(self, conf: Dict[str, Any]):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT OR REPLACE INTO conflict_records (
                id, handover_id, claim_a_id, claim_b_id, conflict_reason,
                description, status, temporal_delta_days, resolved_by,
                resolution_rationale, resolved_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                conf["id"], conf["handover_id"], conf["claim_a_id"], conf["claim_b_id"],
                conf["conflict_reason"], conf.get("description", conf["conflict_reason"]),
                conf.get("status", "OPEN"), conf.get("temporal_delta_days", 0),
                conf.get("resolved_by"), conf.get("resolution_rationale"),
                conf.get("resolved_at")
            ))
            conn.commit()

    def get_conflicts_for_handover(self, handover_id: str) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM conflict_records WHERE handover_id = ?;", (handover_id,))
            return [dict(r) for r in cursor.fetchall()]

    def update_conflict_status(self, conflict_id: str, status: str, rationale: str, actor_id: str):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE conflict_records
            SET status = ?, resolution_rationale = ?, resolved_by = ?, resolved_at = ?
            WHERE id = ?;
            """, (status, rationale, actor_id, utc_now_iso(), conflict_id))
            conn.commit()

    # --- Runway Tasks CRUD ---
    def save_runway_task(self, t: Dict[str, Any]):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT OR REPLACE INTO runway_tasks (
                id, handover_id, phase, title, action_type, target_entity,
                is_completed, completed_by, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                t["id"], t["handover_id"], t["phase"], t["title"],
                t.get("action_type", t.get("action", "RUNBOOK_VERIFY")),
                t.get("target_entity", t.get("target", "System")),
                1 if t.get("is_completed") or t.get("completed") else 0,
                t.get("completed_by"), t.get("completed_at")
            ))
            conn.commit()

    def get_runway_tasks(self, handover_id: str) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM runway_tasks WHERE handover_id = ?;", (handover_id,))
            tasks = [dict(r) for r in cursor.fetchall()]
            for t in tasks:
                t["is_completed"] = bool(t["is_completed"])
                t["completed"] = t["is_completed"]
                t["action"] = t["action_type"]
                t["target"] = t["target_entity"]
            return tasks

    def toggle_runway_task(self, task_id: str, is_completed: Optional[bool] = None) -> Dict[str, Any]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM runway_tasks WHERE id = ?;", (task_id,))
            row = cursor.fetchone()
            if not row:
                raise KeyError(f"Task {task_id} not found")
            curr = bool(row["is_completed"])
            new_val = is_completed if is_completed is not None else not curr
            now_str = utc_now_iso() if new_val else None
            cursor.execute("""
            UPDATE runway_tasks SET is_completed = ?, completed_at = ? WHERE id = ?;
            """, (1 if new_val else 0, now_str, task_id))
            conn.commit()

            cursor.execute("SELECT * FROM runway_tasks WHERE id = ?;", (task_id,))
            updated = dict(cursor.fetchone())
            updated["is_completed"] = bool(updated["is_completed"])
            updated["completed"] = updated["is_completed"]
            updated["action"] = updated["action_type"]
            updated["target"] = updated["target_entity"]
            return updated

    # --- Audit Ledger ---
    def record_audit(self, handover_id: str, action: str, actor_id: str, snapshot: Dict[str, Any]):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            audit_id = f"audit-{utc_now_iso()}-{os.urandom(4).hex()}"
            cursor.execute("""
            INSERT INTO audit_ledger (id, handover_id, action, actor_id, payload_snapshot, timestamp)
            VALUES (?, ?, ?, ?, ?, ?);
            """, (audit_id, handover_id, action, actor_id, json.dumps(snapshot), utc_now_iso()))
            conn.commit()

    def get_audit_trail(self, handover_id: str) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM audit_ledger WHERE handover_id = ? ORDER BY timestamp DESC;", (handover_id,))
            return [
                {
                    "id": r["id"],
                    "handover_id": r["handover_id"],
                    "action": r["action"],
                    "actor_id": r["actor_id"],
                    "payload_snapshot": json.loads(r["payload_snapshot"]),
                    "timestamp": r["timestamp"]
                }
                for r in cursor.fetchall()
            ]

# Singleton instance
db_instance = Database()
