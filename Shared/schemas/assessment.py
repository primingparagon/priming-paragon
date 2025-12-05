from pydantic import BaseModel
from typing import List, Dict, Any
from uuid import UUID
from datetime import datetime

class AssessmentResult(BaseModel):
    id: UUID
    user_id: UUID
    type: str
    score: float
    theta: float
    items: List[Dict[str, Any]]
    created_at: datetime
