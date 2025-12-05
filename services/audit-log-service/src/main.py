from fastapi import FastAPI
from pydantic import BaseModel
app = FastAPI(title="Audit Log Service")

class AuditItem(BaseModel):
    user_id: str
    service: str
    action: str
    payload: dict

@app.post("/log")
def log_item(item: AuditItem):
    # In prod: write to immutable DB table
    print("AUDIT:", item.dict())
    return {"status":"logged"}
