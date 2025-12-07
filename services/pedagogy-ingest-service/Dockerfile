FROM python:3.11-slim

WORKDIR /app

# Install Poetry if the project uses pyproject.toml
RUN pip install poetry

COPY pyproject.toml poetry.lock* ./

RUN poetry install --no-root --no-interaction --no-ansi

COPY . .

ENV SCRAPER_MODE=production

CMD ["python", "src/main.py"]
