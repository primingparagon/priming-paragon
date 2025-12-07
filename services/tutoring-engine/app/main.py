from fastapi import FastAPI
import os

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/tutor")
def tutor():
    return {"response": "Hello from tutoring-engine!"}
