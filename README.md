# Recruitment Platform

## Fake Gmail Testing Quick Start

This project includes a deterministic email testing pool for recruitment flows.

### 1. Start Docker services

```bash
docker compose up --build
```

Main URLs:

- App: http://localhost:3000
- Mailpit UI: http://localhost:8025
- Accounts UI: http://localhost:3000/email-testing/accounts
- Inbox UI: http://localhost:3000/email-testing/inbox

### 2. Seed the default recruitment pool (40 + 20)

```bash
curl -X POST http://localhost:3000/api/fake-accounts/seed
```

Default seeded format:

- Candidates: `candidate01@gmail.test` ... `candidate40@gmail.test`
- Recruiters: `recruiter01@gmail.test` ... `recruiter20@gmail.test`

Expected behavior:

- Duplicate-safe on repeated runs
- Returns created/skipped summary

### 3. Optional custom seed counts

```bash
curl -X POST http://localhost:3000/api/fake-accounts/seed \
  -H "Content-Type: application/json" \
  -d '{"candidateCount":50,"recruiterCount":25}'
```

### 4. Verify accounts and role filtering

```bash
curl "http://localhost:3000/api/fake-accounts"
curl "http://localhost:3000/api/fake-accounts?role=candidate"
curl "http://localhost:3000/api/fake-accounts?role=recruiter"
```

### 4.5 Sync fake accounts into real web users

This step creates/updates real Supabase users and candidate profiles from the fake Gmail pool,
so candidates appear on HR home and candidate profile pages like normal registrations.

```bash
curl -X POST http://localhost:3000/api/fake-accounts/sync-recruitment \
  -H "Content-Type: application/json" \
  -d '{"role":"all","seedIfEmpty":true}'
```

After syncing:

- Open http://localhost:3000/hr-home to see seeded candidates
- Click candidate cards to open /candidate/[id] profiles
- HR contact flow continues to send emails through existing mail setup

### 5. Send test emails between seeded accounts

From UI:

1. Open http://localhost:3000/email-testing/accounts
2. Pick sender and recipient
3. Use OTP / Verification / Password reset / Apply job / Notification buttons

From API:

```bash
curl -X POST http://localhost:3000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "from":"candidate01@gmail.test",
    "to":"recruiter01@gmail.test",
    "template":"notification",
    "data":{"notificationTitle":"Test flow","notificationMessage":"Candidate to recruiter message"}
  }'
```

### 6. Inspect inbox and Mailpit

Backend inbox proxy:

```bash
curl "http://localhost:3000/api/test-inbox?email=recruiter01@gmail.test&limit=20"
```

UI inbox viewer:

- http://localhost:3000/email-testing/inbox

Mailpit mailbox:

- http://localhost:8025

## Safety rules

- In `EMAIL_MODE=test`, only `.test` addresses are allowed for the test send route.
- Test mode targets Mailpit SMTP, so no external email delivery is allowed in this flow.
- Production-like real SMTP remains available via `EMAIL_MODE=real` and real SMTP credentials.
- Optional: set `EMAIL_TESTING_SYNC_PASSWORD` to control the default password used when sync creates new Supabase auth users from fake accounts.
