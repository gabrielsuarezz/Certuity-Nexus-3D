# Agent backend container — portable across Railway / Fly.io / Render / any host.
# Build context must be this `server/` directory.
FROM python:3.11-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    AUDIT_LOG_PATH=/tmp/audit.log.jsonl

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app ./app

# Hosts inject $PORT; default to 8000 for a plain `docker run`.
ENV PORT=8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
