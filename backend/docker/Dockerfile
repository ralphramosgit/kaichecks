# Kaichecks FastAPI image.
#
# Build context must be the backend/ folder, because the image needs both the
# FastAPI app (backend/fastAPI) and the trained models (backend/machine_learning/
# models). Build and run it through docker/docker-compose.yml, or directly with:
#
#   docker build -f docker/Dockerfile -t kaichecks-api:latest .
#
# run from the backend/ folder.

FROM python:3.12-slim AS runtime

# Keep Python predictable and quiet inside the container.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# libgomp1 is the OpenMP runtime that xgboost needs at import time. It is not in
# the slim base image, so install it and clean the apt lists to keep the layer small.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first so this layer is cached unless requirements change.
COPY fastAPI/requirements.txt ./requirements.txt
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy the application package and the trained model artifacts into the image.
# The models are baked in so the container is self contained, which is what AWS
# ECS wants: an immutable image with everything it needs to run.
COPY fastAPI/app ./app
COPY machine_learning/models ./models

# Point the app at the copied models folder. config.py reads this variable.
ENV KAICHECKS_MODELS_DIR=/app/models \
    KAICHECKS_CORS_ORIGINS=*

# Run as a non root user, which is good practice and expected on ECS.
RUN useradd --create-home --uid 10001 appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Container level health check. Uses the standard library so no extra tools are
# needed in the slim image. ECS and docker compose can both read this status.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health').getcode()==200 else 1)"

# Start the API. 0.0.0.0 so it is reachable from outside the container.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
