va# Development Docker Setup

This setup runs the full development stack with one command:

- `redis`
- `mongodb`
- `mailpit` (SMTP + web inbox)
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
- Mailpit UI: [http://localhost:8025](http://localhost:8025)
- Redis: `localhost:6379`
- MongoDB: `localhost:27017`

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
docker compose logs -f mongodb
docker compose logs -f mailpit
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
- `EMAIL_MODE=test` (safe local mode, routes all new test API emails to Mailpit)
- `MONGODB_URI=mongodb://mongodb:27017/recruitment_platform`
- `MAILPIT_SMTP_HOST=mailpit`
- `MAILPIT_API_BASE_URL=http://mailpit:8025`
- `MAILPIT_WEB_URL=http://localhost:8025`
- `EMAIL_TESTING_SYNC_PASSWORD=TalentFlowTest#2026` (optional override for fake-account -> Supabase auth sync)

To use real SMTP in production-like tests:

- `EMAIL_MODE=real`
- `REAL_SMTP_HOST=smtp.gmail.com`
- `REAL_SMTP_PORT=587`
- `REAL_SMTP_USER=your-gmail-address`
- `REAL_SMTP_PASS=your-gmail-app-password`
- `REAL_SMTP_FROM=your-gmail-address`

## Hot Reload Notes

- Frontend Docker dev uses `next dev --webpack` plus polling to make file watching reliable on Windows bind mounts.
- Backend uses Uvicorn reload with polling enabled.
- Celery worker uses `watchfiles` so task code changes trigger a worker restart.
- Regular edits in `src/`, `public/`, and other frontend files should appear automatically without rebuilding containers.
- Rebuild the `frontend` service only when `package.json`, `package-lock.json`, `Dockerfile.frontend`, or base Node dependencies change.

You do not need a local Node install, local Python venv, or local Redis for this workflow.

## End-To-End Email Testing Flow

1. Start the stack:

```bash
docker compose up --build
```

2. Open the test console pages:

- Accounts + flow simulator: [http://localhost:3000/email-testing/accounts](http://localhost:3000/email-testing/accounts)
- Inbox viewer: [http://localhost:3000/email-testing/inbox](http://localhost:3000/email-testing/inbox)

3. Seed the deterministic recruitment pool (40 candidates + 20 recruiters):

```bash
curl -X POST http://localhost:3000/api/fake-accounts/seed
```

If you need custom counts:

```bash
curl -X POST http://localhost:3000/api/fake-accounts/seed \
  -H "Content-Type: application/json" \
  -d '{"candidateCount":50,"recruiterCount":25}'
```

4. Verify seeded accounts:

```bash
curl "http://localhost:3000/api/fake-accounts"
curl "http://localhost:3000/api/fake-accounts?role=candidate"
curl "http://localhost:3000/api/fake-accounts?role=recruiter"
```

5. Sync fake accounts into real in-app users (Supabase auth + profiles + candidate profiles):

```bash
curl -X POST http://localhost:3000/api/fake-accounts/sync-recruitment \
  -H "Content-Type: application/json" \
  -d '{"role":"all","seedIfEmpty":true}'
```

After this step, fake candidate emails are visible on `http://localhost:3000/hr-home` like normal public candidate registrations.

Default seeded examples:

- `candidate01@gmail.test` ... `candidate40@gmail.test`
- `recruiter01@gmail.test` ... `recruiter20@gmail.test`

6. Send emails between fake accounts using one of the flow buttons:

- OTP
- Verification
- Password reset
- Apply job
- Notification

Or call API directly:

```bash
curl -X POST http://localhost:3000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "from":"candidate01@gmail.test",
    "to":"recruiter01@gmail.test",
    "template":"notification",
    "data":{"notificationTitle":"Test","notificationMessage":"Hello recruiter"}
  }'
```

7. View messages in either place:

- Internal inbox viewer page at `/email-testing/inbox`
- Mailpit UI at [http://localhost:8025](http://localhost:8025)

Or fetch inbox JSON through backend proxy:

```bash
curl "http://localhost:3000/api/test-inbox?email=recruiter01@gmail.test&limit=20"
```

Safety behavior in TEST mode: only `.test` addresses are accepted by the new `/api/send-email` route.
