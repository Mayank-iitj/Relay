import re
import hashlib
import uuid
from datetime import datetime, timezone

def utc_now_iso():
    return datetime.now(timezone.utc).isoformat()
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
        # PII patterns for enterprise redaction
        self.pii_patterns = [
            (re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'), "[EMAIL]"),
            (re.compile(r'\b\d{4}-\d{4}-\d{4}-\d{4}\b'), "[CARD]"),
            (re.compile(r'(?i)api[_-]?key[:=]\s*[a-z0-9_\-]+'), "api_key=[REDACTED]"),
            (re.compile(r'(?i)password[:=]\s*[^\s,]+'), "password=[REDACTED]"),
            (re.compile(r'(?i)bearer\s+[a-z0-9\-._~+/]+=*'), "bearer [REDACTED]"),
            (re.compile(r'(?i)secret[:=]\s*[^\s,]+'), "secret=[REDACTED]"),
        ]

    def redact(self, text: str) -> str:
        redacted = text
        for pattern, replacement in self.pii_patterns:
            redacted = pattern.sub(replacement, redacted)
        return redacted

    def generate_hash(self, content: str) -> str:
        return hashlib.sha256(content.encode('utf-8')).hexdigest()

    def create_chunk(self, content: str, source_url: str, author: str, timestamp: str, source_type: str, external_id: Optional[str] = None) -> Chunk:
        redacted_content = self.redact(content)
        chunk_hash = self.generate_hash(content)

        # UUIDv5 for deterministic IDs based on provenance
        namespace = uuid.NAMESPACE_DNS
        name = f"{source_url}:{timestamp}:{author}:{external_id or ''}"
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
                "source_type": source_type,
                "external_id": external_id or ""
            }
        )

    def process_payload(self, sources: List[Dict[str, Any]]) -> List[Chunk]:
        chunks = []
        for s in sources:
            chunk = self.create_chunk(
                content=s.get('content', s.get('content_raw', '')),
                source_url=s.get('source_url', ''),
                author=s.get('author_handle', s.get('author', 'unknown')),
                timestamp=s.get('timestamp', utc_now_iso()),
                source_type=s.get('source_type', 'GENERAL'),
                external_id=s.get('external_id')
            )
            chunks.append(chunk)
        return chunks
