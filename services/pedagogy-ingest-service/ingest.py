import time
import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_URL = os.getenv("API_GATEWAY_URL", "")

def run_cycle():
    print("Running ingest cycle...")
    try:
        # Example placeholder ingest action
        requests.post(f"{API_URL}/data/ingest", json={"msg": "hello from ingest"})
    except Exception as e:
        print("Error sending data:", e)

if __name__ == "__main__":
    print("Pedagogy Ingest Worker started.")
    while True:
        run_cycle()
        time.sleep(60)  # every 1 minute

