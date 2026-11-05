import os
from typing import List, Dict, Any
from app.engine.chunker import ChunkerEngine
from app.engine.extractor import ExtractionService
from app.engine.contradiction import ContradictionEngine

class RelayOrchestrator:
    def __init__(self):
        self.chunker = ChunkerEngine()
        self.extractor = ExtractionService()
        self.contradiction = ContradictionEngine()

    async def run_full_pipeline(self, sources: List[Dict[str, Any]], workspace_id: str):
        # 1. Ingest & Chunk with PII Redaction and deterministic hashing
        chunks = self.chunker.process_payload(sources)

        # 2. Extract Structured Knowledge Claims with Provenance Citations
        extraction = await self.extractor.extract_from_chunks(chunks, workspace_id)

        # 3. Detect Contradictions
        all_claims = extraction.decisions + extraction.blockers
        conflicts = extraction.conflicts
        if not conflicts:
            conflicts = await self.extractor.run_contradiction_pass(all_claims, chunks)

        return {
            "claims": all_claims,
            "conflicts": conflicts,
            "chunks": chunks,
            "processed_chunks": len(chunks)
        }
