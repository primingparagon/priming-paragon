from pydantic import BaseModel
from typing import Dict, Any, Optional
from uuid import UUID
from datetime import datetime

class TeachingMethod(BaseModel):
    id: UUID
    name: str
    version: str
    metadata: Dict[str, Any]
    raw_source: Optional[str]
    created_by: Optional[str]
    created_at: datetime
