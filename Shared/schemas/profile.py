from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID

class AccessibilityProfile(BaseModel):
    screen_reader_enabled: Optional[bool] = False
    preferred_highlight_color: Optional[str] = None
    max_visual_elements: Optional[int] = None

class Persona(BaseModel):
    tone: str
    scaffolding: str
    challenge: str
    modal_pref: List[str] = []

class StudentProfile(BaseModel):
    user_id: UUID
    declared_grade: Optional[str]
    persona: Persona
    accessibility: Optional[AccessibilityProfile]
    iep_flags: Optional[List[str]] = []
