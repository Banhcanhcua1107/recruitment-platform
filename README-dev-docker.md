# Development Docker Setup

This setup runs the full development stack with one command:

- `redis`
- `ai-service` (FastAPI + Uvicorn reload)
- `celery-worker` (watchfiles + Celery autorestart)
- `frontend` (Next.js dev server)

## Prerequisites

- Docker Desktop with Compose support
- A local `.env.local` file at the repo root

If you do not have `.env.local` yet:

```bash
cp .env.example .env.local
```

Then fill in the required secrets such as Supabase, SMTP, Cloudinary, and OCR tokens.

## Why The Mounts Look Like This

- `frontend` mounts the whole repo because the Next.js app lives at the repo root.
- `ai-service` and `celery-worker` only mount `./ai-service` plus `./docs:ro`.
- `./docs` is mounted because the OCR pipeline can read `docs/OCR/api.txt` from a repo-relative path.

## Start The Full Dev Stack

```bash
docker compose up --build
```

After the first build, use plain `docker compose up` for normal development.
You should not need to rebuild or reset the whole stack for regular UI/code changes.

App URLs:

- Frontend: [http://localhost:3000](http://localhost:3000)
- AI service health: [http://localhost:8000/health](http://localhost:8000/health)
- Redis: `localhost:6379`

## Common Commands

Start in the background:

```bash
docker compose up --build -d
```

Normal day-to-day restart without rebuilding:

```bash
docker compose up
docker compose up -d
```

Stop the stack:

```bash
docker compose down
```

Stop and remove volumes:

```bash
docker compose down -v
```

Follow all logs:

```bash
docker compose logs -f
```

Follow one service:

```bash
docker compose logs -f frontend
docker compose logs -f ai-service
docker compose logs -f celery-worker
docker compose logs -f redis
```

Open a shell inside a container:

```bash
docker compose exec frontend bash
docker compose exec ai-service bash
docker compose exec celery-worker bash
docker compose exec redis redis-cli
```

Rebuild one service only when dependencies or Dockerfiles changed:

```bash
docker compose build frontend
docker compose build ai-service
```

Recreate after a rebuild:

```bash
docker compose up --build frontend
docker compose up --build ai-service celery-worker
```

Reset frontend dependency caches only if dependency state is broken:

```bash
docker compose down -v
docker compose up --build
```

## Important Environment Variables

Two AI service URLs are intentionally different:

- `NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8000`
  - Used by browser-side requests from your host machine.
- `AI_SERVICE_URL=http://ai-service:8000`
  - Used by container-to-container traffic inside Docker Compose.

Other important vars for Docker dev:

- `REDIS_URL=redis://redis:6379/0`
- `CELERY_BROKER_URL=redis://redis:6379/0`
- `CELERY_RESULT_BACKEND=redis://redis:6379/0`
- `SOFFICE_PATH=soffice`
- `OLLAMA_BASE_URL=http://host.docker.internal:11434`

## Hot Reload Notes

- Frontend Docker dev uses `next dev --webpack` plus polling to make file watching reliable on Windows bind mounts.
- Backend uses Uvicorn reload with polling enabled.
- Celery worker uses `watchfiles` so task code changes trigger a worker restart.
- Regular edits in `src/`, `public/`, and other frontend files should appear automatically without rebuilding containers.
- Rebuild the `frontend` service only when `package.json`, `package-lock.json`, `Dockerfile.frontend`, or base Node dependencies change.

You do not need a local Node install, local Python venv, or local Redis for this workflow.
