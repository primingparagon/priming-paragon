from fastapi import FastAPI, BackgroundTasks
app = FastAPI(title="Pedagogy Ingest Service")

@app.get("/health")
def health():
    return {"status":"ok","service":"pedagogy-ingest"}

# minimal endpoints to trigger scraping
@app.post("/ingest/rss")
def ingest_rss(payload: dict):
    url = payload.get("url")
    return {"status":"queued","url":url}

@app.post("/ingest")
async def ingest(payload: dict, tasks: BackgroundTasks):
    # TODO: push message to worker queue
    tasks.add_task(process_pedagogy_event, payload)
    return {"queued": True}

def process_pedagogy_event(data: dict):
    # TODO: write ingestion logic
    print("Processing pedagogy event:", data)
