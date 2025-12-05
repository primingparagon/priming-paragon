FROM python:3.11-slim
WORKDIR /app
COPY pyproject.toml .
RUN pip install --upgrade pip && pip install fastapi uvicorn pydantic python-dotenv requests
COPY src/ ./src
EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
