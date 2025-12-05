from fastapi import FastAPI
app = FastAPI(title="Pedagogy Ingest Service")

@app.get("/health")
def health():
    return {"status":"ok","service":"pedagogy-ingest"}

# minimal endpoints to trigger scraping
@app.post("/ingest/rss")
def ingest_rss(payload: dict):
    url = payload.get("url")
    return {"status":"queued","url":url}
