FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY pipelines/ ./pipelines/
COPY scripts/ ./scripts/

# NOTE: Dataset/ is excluded from the image. To use /admin/retrain in Docker,
# volume-mount the dataset: -v /path/to/Dataset:/app/Dataset

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
