from fastapi import FastAPI
app = FastAPI(title="Assessment Service")

@app.get("/health")
def health():
    return {"status": "ok", "service": "assessment-service"}
