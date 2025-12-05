from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID

class UserPublic(BaseModel):
    id: UUID
    email: EmailStr
    display_name: Optional[str]
    role: str
