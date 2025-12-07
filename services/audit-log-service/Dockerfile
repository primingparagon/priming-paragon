FROM python:3.11-slim
WORKDIR /app
COPY pip install -r pyproject.toml
RUN python src/main.py
COPY . .
ENV NODE_ENV=production
EXPOSE 8004
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8004"]
