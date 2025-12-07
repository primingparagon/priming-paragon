FROM python:3.11-slim
WORKDIR /app
COPY pyproject.toml .
RUN pip install --upgrade pip && pip install fastapi uvicorn requests beautifulsoup4 pydantic python-dotenv
COPY src/ ./src
EXPOSE 8003
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8003"]

FROM python:3.11
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD python ingest.py
