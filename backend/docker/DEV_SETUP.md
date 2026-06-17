# Kaichecks - Local Full Stack Dev Setup

Run the FastAPI backend in Docker and the Next.js frontend on your machine,
wired together on localhost.

## Prerequisites

- Docker Desktop (running)
- Node.js 18+ and npm
- Trained model artifacts present at `backend/machine_learning/models/`
  (`model_metadata.json`, `xgb_classifier.json`, `xgb_regressor.json`,
  `beach_catalog.csv`)

## 1. Start the backend (Docker)

From the `backend/docker/` folder:

```bash
docker compose up --build
```

This builds the image (FastAPI app + models baked in) and serves on port 8000.

Verify it is healthy:

- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/health -> {"status":"ok","models_loaded":true,...}
- Beaches: http://localhost:8000/beaches
- Predict:

  ```bash
  curl -X POST http://localhost:8000/predict \
    -H "Content-Type: application/json" \
    -d '{"rainfall_7day":[4,6,3,8,5,10,7],"month":2}'
  ```

CORS is set to `http://localhost:3000` in `docker-compose.yml` so the browser
allows the frontend to call the API. Stop with `Ctrl+C` (or `docker compose down`).

### Run the backend without Docker (optional)

```bash
cd backend/fastAPI
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

## 2. Start the frontend

```bash
cd ui
npm install
# one-time: create .env.local (or copy .env.example)
echo NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 > .env.local
npm run dev
```

Open http://localhost:3000. The dashboard now pulls the beach catalog from
`/beaches` and scores each rainfall scenario through the real model at `/predict`.
If the backend is down, the UI automatically falls back to the local mock model
(`apiStatus` becomes `"error"`), so it always renders.

## 3. Verify the connection

- Open the browser devtools Network tab; changing the storm should fire
  `POST /predict` to :8000.
- Stop the backend and change the storm: the app keeps working on the local
  fallback. Restart the backend and it goes live again.

---

## AWS deployment (later)

Planned: **AWS Fargate** for the API, **S3** for model storage.

### S3 model storage

Instead of baking models into the image, upload them once:

```bash
aws s3 cp backend/machine_learning/models/ s3://kaichecks-models/models/ --recursive
```

Then enable the commented `_sync_models_from_s3()` path in `app/ml.py`, add
`boto3` to `requirements.txt`, and set on the task:

```
KAICHECKS_MODELS_S3_BUCKET=kaichecks-models
KAICHECKS_MODELS_S3_PREFIX=models/
```

The Fargate task role needs `s3:GetObject` on `arn:aws:s3:::kaichecks-models/*`.

### Push the image to ECR

```bash
aws ecr create-repository --repository-name kaichecks-api
aws ecr get-login-password --region us-west-2 \
  | docker login --username AWS --password-stdin <acct>.dkr.ecr.us-west-2.amazonaws.com
docker build -f docker/Dockerfile -t kaichecks-api ./backend
docker tag kaichecks-api <acct>.dkr.ecr.us-west-2.amazonaws.com/kaichecks-api:latest
docker push <acct>.dkr.ecr.us-west-2.amazonaws.com/kaichecks-api:latest
```

### Fargate task definition (reference)

```jsonc
{
  "family": "kaichecks-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::<acct>:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::<acct>:role/kaichecks-task-role",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "<acct>.dkr.ecr.us-west-2.amazonaws.com/kaichecks-api:latest",
      "portMappings": [{ "containerPort": 8000, "protocol": "tcp" }],
      "environment": [
        {
          "name": "KAICHECKS_CORS_ORIGINS",
          "value": "https://your-frontend-domain",
        },
        { "name": "KAICHECKS_MODELS_S3_BUCKET", "value": "kaichecks-models" },
        { "name": "KAICHECKS_MODELS_S3_PREFIX", "value": "models/" },
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/kaichecks-api",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "api",
        },
      },
    },
  ],
}
```

Front it with an Application Load Balancer (or API Gateway), then set the
frontend's `NEXT_PUBLIC_API_BASE_URL` to that public URL.
