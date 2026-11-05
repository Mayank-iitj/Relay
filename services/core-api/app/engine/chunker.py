import re
import hashlib
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class Chunk(BaseModel):
    id: uuid.UUID
    content_raw: str
    content_redacted: str
    chunk_hash: str
    source_metadata: Dict[str, Any]

class ChunkerEngine:
    def __init__(self):
        # Simple PII patterns for the hackathon
        self.pii_patterns = [
            (re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'), "[EMAIL]"),
            (re.compile(r'\b\d{4}-\d{4}-\d{4}-\d{4}\b'), "[CARD]"),
            (re.compile(r'(?i)api[_-]?key[:=]\s*[a-z0-9_\-]+'), "api_key=[REDACTED]"),
            (re.compile(r'(?i)password[:=]\s*[a-z0-9_\-]+'), "password=[REDACTED]"),
        ]

    def redact(self, text: str) -> str:
        redacted = text
        for pattern, replacement in self.pii_patterns:
            redacted = pattern.sub(replacement, redacted)
        return redacted

    def generate_hash(self, content: str) -> str:
        return hashlib.sha256(content.encode('utf-8')).hexdigest()

    def create_chunk(self, content: str, source_url: str, author: str, timestamp: str, source_type: str) -> Chunk:
        redacted_content = self.redact(content)
        chunk_hash = self.generate_hash(content)

        # UUIDv5 for deterministic IDs based on provenance
        namespace = uuid.NAMESPACE_DNS
        name = f"{source_url}:{timestamp}:{author}"
        chunk_id = uuid.uuid5(namespace, name)

        return Chunk(
            id=chunk_id,
            content_raw=content,
            content_redacted=redacted_content,
            chunk_hash=chunk_hash,
            source_metadata={
                "source_url": source_url,
                "author": author,
                "timestamp": timestamp,
                "source_type": source_type
            }
        )

    def process_payload(self, sources: List[Dict[str, Any]]) -> List[Chunk]:
        chunks = []
        for s in sources:
            chunk = self.create_chunk(
                content=s['content'],
                source_url=s['source_url'],
                author=s['author_handle'],
                timestamp=s['timestamp'],
                source_type=s['source_type']
            )
            chunks.append(chunk)
        return chunks
