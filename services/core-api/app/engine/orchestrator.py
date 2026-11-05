import os
from typing import List, Dict, Any
from pydantic import BaseModel
from relay.services.core-api.app.engine.chunker import ChunkerEngine
from relay.services.core-api.app.engine.extractor import ExtractionService
from relay.services.core-api.app.engine.contradiction import ContradictionEngine

class RelayOrchestrator:
    def __init__(self):
        self.chunker = ChunkerEngine()
        self.extractor = ExtractionService()
        self.contradiction = ContradictionEngine()

    async def run_full_pipeline(self, sources: List[Dict[str, Any]], workspace_id: str):
        # 1. Ingest & Chunk
        chunks = self.chunker.process_payload(sources)

        # 2. Extract Knowledge
        chunk_texts = [c.content_redacted for c in chunks]
        extraction = await self.extractor.extract_from_chunks(chunk_texts, workspace_id)

        # 3. Detect Contradictions
        conflicts = await self.extractor.run_contradiction_pass(
            extraction.decisions + extraction.blockers,
            chunks
        )

        return {
            "claims": extraction.decisions + extraction.blockers,
            "conflicts": conflicts,
            "processed_chunks": len(chunks)
        }
