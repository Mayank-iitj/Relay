# Relay: The Immutable Record of Institutional Truth

Relay is an enterprise knowledge handover platform that extracts, reconciles, and projects project state from scattered communication trails (GitHub PRs, Slack incident dumps, Linear tickets) into an immutable, role-governed Transition Dossier with cryptographic SHA-256 provenance.

---

## 🚀 Quick Start

### 1. Unified Deployment via Docker Compose (Recommended)
Run the entire production stack (FastAPI Backend + Next.js Frontend) in one command:
```bash
docker compose up --build
```
- **Web App**: [http://localhost:3000](http://localhost:3000)
- **Core API & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

*(Optional: To run with local PostgreSQL 16 + pgvector, use `docker compose --profile with-db up --build`)*

---

### 2. Local Development

#### Backend (FastAPI)
```bash
cd services/core-api
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### Frontend (Next.js 14)
```bash
cd apps/web
npm install
npm run dev
```

---

## 🧪 Testing & Verification

Run the entire automated verification suite (FastAPI pytest suite + Next.js type-checking and production build):

**On Windows (PowerShell):**
```powershell
./scripts/test.ps1
```

**On Linux / macOS:**
```bash
chmod +x ./scripts/test.sh
./scripts/test.sh
```

Or run backend tests individually:
```bash
python -m pytest services/core-api -v
```

---

## 🏗️ Architecture

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, Framer Motion.
- **Backend**: FastAPI, Pydantic v2, Python 3.11+.
- **Database (Schema)**: PostgreSQL 16 + pgvector (`schema.sql`).
- **Design Philosophy**: "Industrial Data Tool" (Deterministic, zero-hallucination, high-density, citation-linked).

---

## 🛠️ Core Pipeline

1. **Ingest (`ChunkerEngine`)**: Ingests Git PRs, Slack threads, and issue tracker dumps with enterprise PII redaction (emails, credentials, API tokens) and deterministic UUIDv5 chunk generation.
2. **Extract (`ExtractionService`)**: Synthesizes technical decisions, architectural blockers, and dependencies with cryptographic provenance citations (exact quotes, source handles, timestamps, SHA-256 hashes).
3. **Verify (`ContradictionEngine`)**: Evaluates temporal assertions to surface rollback collisions (e.g., Dragonfly PR rollout vs Slack rollback incident) for human arbitration.
4. **Project (ABAC Role Projections)**: Dynamically gates visibility across roles:
   - `ROLE_EXECUTIVE_LEAD`: Complete visibility (Public, Internal, Restricted).
   - `ROLE_DIRECT_SUCCESSOR`: Operational handover visibility (Public, Internal).
   - `ROLE_CONTRIBUTOR_TEAM`: Public architectural visibility only (Public).
5. **Freeze & Sign-off**: Generates a canonical SHA-256 manifest hash across verified claims, locking the transition dossier into an immutable compliance record.
6. **Transition Runway**: 30-day phased task transfer queue (`Days 1-7`, `Days 8-14`, `Days 15-30`) with real-time state tracking.
