from fastapi import FastAPI
from pydantic import BaseModel
import os, sys
# add repo root shared to path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "..", "shared"))

from shared.schemas.user import UserPublic  # this works because we added shared to path

app = FastAPI(title="Tutoring Engine")

class HelloResp(BaseModel):
    msg: str

@app.get("/health", response_model=HelloResp)
def health():
    return {"msg": "tutoring-engine OK"}

@app.post("/decide")
def decide(payload: dict):
    # placeholder TSE decision logic
    return {"action": "explain_concept", "reason": "placeholder", "pedagogy_version": "0.1.0"}
