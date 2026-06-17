# Docker for the Kaichecks API

This folder holds everything needed to containerize the FastAPI service in
`backend/fastAPI`. The image bundles the app and the trained models from
`backend/machine_learning/models` so the container runs with no external
dependencies, which is what AWS ECS expects.

## Contents

- `Dockerfile` builds the runtime image (Python 3.12 slim, installs deps, copies
  the app and the models, runs uvicorn as a non root user).
- `docker-compose.yml` builds and runs the image locally for testing.

The `.dockerignore` that controls the build lives one level up at
`backend/.dockerignore`, because Docker reads it from the build context root.

## Why the build context is `backend/`

The image needs two folders that live side by side under `backend/`: the app
(`fastAPI/app`) and the models (`machine_learning/models`). Docker cannot copy
from outside the build context, so the context is `backend/` and the COPY paths
in the Dockerfile are written relative to it.

## Test locally with compose

From this `backend/docker/` folder:

```bash
docker compose up --build
```

Then open http://localhost:8000/docs and try the endpoints, or:

```bash
curl http://localhost:8000/health
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"rainfall_7day": [0, 0, 5, 12, 30, 8, 2], "month": 12}'
```

Stop it with Ctrl C, then `docker compose down`.

## Test locally with plain docker

From the parent `backend/` folder (the build context):

```bash
docker build -f docker/Dockerfile -t kaichecks-api:latest .
docker run --rm -p 8000:8000 kaichecks-api:latest
```

## Configuration

Both are environment variables read by `app/config.py`:

- `KAICHECKS_MODELS_DIR` where the model files live. Defaults to `/app/models`
  inside the image, already set in the Dockerfile.
- `KAICHECKS_CORS_ORIGINS` comma separated allowed origins. Set this to your
  frontend URL when you wire up the UI, for example
  `KAICHECKS_CORS_ORIGINS=http://localhost:5173`.

## Push to AWS ECR and run on ECS later

The image is ECS ready: it listens on port 8000, runs as a non root user, and has
a container health check. A typical flow when you get to it:

```bash
# 1. Build for the linux/amd64 platform ECS Fargate uses.
#    Run from the backend/ folder.
docker build --platform linux/amd64 -f docker/Dockerfile -t kaichecks-api:latest .

# 2. Create an ECR repo once.
aws ecr create-repository --repository-name kaichecks-api

# 3. Log in, tag, and push (replace ACCOUNT and REGION).
aws ecr get-login-password --region REGION \
  | docker login --username AWS --password-stdin ACCOUNT.dkr.ecr.REGION.amazonaws.com
docker tag kaichecks-api:latest ACCOUNT.dkr.ecr.REGION.amazonaws.com/kaichecks-api:latest
docker push ACCOUNT.dkr.ecr.REGION.amazonaws.com/kaichecks-api:latest
```

Then point an ECS task definition at that image, map container port 8000, and set
`KAICHECKS_CORS_ORIGINS` to your frontend origin. The health check path for an ECS
or load balancer target group is `GET /health`.

Note on the `--platform linux/amd64` flag: include it when building on an Apple
Silicon or ARM machine so the image matches Fargate. On an x86 machine it is
already the default.
