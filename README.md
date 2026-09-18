# InterviewEdge

AI-powered interview preparation: role-specific question generation, resume-based
question sets, timed mock interviews with AI scoring, community-sourced top
questions, and progress tracking — built with React, Node.js/Express, and
MongoDB, with Google Gemini (Groq as automatic fallback) for every AI feature.

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
  - [1. Prerequisites](#1-prerequisites)
  - [2. Clone and install](#2-clone-and-install)
  - [3. Set up MongoDB Atlas](#3-set-up-mongodb-atlas)
  - [4. Set up Upstash Redis (optional but recommended)](#4-set-up-upstash-redis-optional-but-recommended)
  - [5. Get AI API keys](#5-get-ai-api-keys)
  - [6. Configure environment variables](#6-configure-environment-variables)
  - [7. Run it](#7-run-it)
- [Environment variables reference](#environment-variables-reference)
- [API overview](#api-overview)
- [Deployment](#deployment)
- [Troubleshooting / known gotchas](#troubleshooting-known-gotchas)
- [Future scope](#future-scope)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Features

- **AI-generated interview questions** — tailored to role, experience level, and
  topics to focus on, with model answers.
- **Resume-based question generation** — upload a PDF/DOC/DOCX resume and get
  section-aware questions an interviewer would actually ask about your projects.
- **Timed mock interviews** — real countdown per question, AI scoring with
  strengths/improvements/missed points per answer, and an overall debrief at
  the end.
- **Concept explanations** — on-demand, AI-generated deep dives into any
  technical concept.
- **Session management** — pin important questions, attach personal notes,
  revisit past sessions.
- **Community Top Questions** — the questions most pinned by other candidates
  for a given role, aggregated hourly and CDN/Redis-cacheable.
- **Prep Kit** — curated topics with real-world frequency signal, so you know
  where to spend your prep time.
- **Progress analytics** — track your mock interview history and scores.
- **Resilient AI layer** — Gemini is primary; on quota/rate-limit/outage it
  automatically fails over to Groq, so a single provider hiccup doesn't take
  the AI features down.

## Tech stack

| Layer | Stack |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS, React Router, Axios, Framer Motion |
| Backend | Node.js, Express 5, Mongoose (MongoDB) |
| Cache | Redis (Upstash), with graceful degradation if unavailable |
| AI | Google Gemini (primary) → Groq (automatic fallback) |
| Security | helmet, CORS allowlist, JWT auth, bcrypt, per-user/IP rate limiting |
| Scheduled jobs | node-cron (hourly community question aggregation) |

## Architecture

The backend follows a strict layered pipeline — routes contain no business
logic, controllers own validation and ownership checks, all database access
goes through Mongoose models, and AI/caching logic lives in `utils/`:

```text
Route → Middleware → Controller → Service / Utils → Model (Mongoose) → MongoDB
                              └─ Cache (Redis) ─┘   └─ AI layer (Gemini/Groq) ┘
```

**[ENGINEERING_GUIDELINES.md](ENGINEERING_GUIDELINES.md) is the full source of
truth** for architecture, API conventions, security standards, caching, and
error handling — read it before contributing. This README covers setup,
deployment, and project direction; it deliberately doesn't repeat that doc.

## Project structure

```text
InterviewEdge.ai/
├── backend/
│   ├── server.js              # App bootstrap: middleware, routes, graceful shutdown
│   ├── config/                # DB (Mongoose) and Redis client setup
│   ├── middleware/             # auth, rate limiting, centralized error handling
│   ├── controller/             # request handlers — one file per resource
│   ├── routes/                 # route → controller wiring, no logic
│   ├── models/                 # Mongoose schemas
│   ├── utils/                  # AI client (Gemini→Groq failover), prompt builders
│   ├── jobs/                   # hourly Top Questions aggregation cron
│   └── seeds/                  # upsert-safe starter data
└── frontend/
    ├── src/
    │   ├── pages/               # one folder per screen (Dashboard, MockInterview, Analytics, ...)
    │   ├── components/          # shared UI, layout shell, error boundary
    │   ├── context/             # auth/user state
    │   └── utils/               # axios instance, API path map
    └── vite.config.js
```

See the module tables in [ENGINEERING_GUIDELINES.md § 2](ENGINEERING_GUIDELINES.md#2-project-structure-modules)
for a file-by-file responsibility breakdown.

## Getting started

### 1. Prerequisites

- [Node.js](https://nodejs.org) 20+ and npm
- A [MongoDB Atlas](https://cloud.mongodb.com) account (free tier is fine)
- An [Upstash](https://console.upstash.com) account (free tier is fine) —
  optional, the app runs without it, just without caching
- A [Google AI Studio](https://aistudio.google.com/app/apikey) API key (free)
- A [Groq](https://console.groq.com) API key (free, no card) — used as the AI
  fallback

### 2. Clone and install

```bash
git clone <this-repo-url>
cd InterviewEdge.ai

cd backend && npm install
cd ../frontend && npm install
```

### 3. Set up MongoDB Atlas

1. Create a free (M0) cluster.
2. **Database Access** → add a database user with a strong, generated
   password (not a dictionary word or your own name — it ends up in your
   connection string).
3. **Network Access** → add the IP address(es) that need to connect: your own
   machine for local dev, and your deploy host's IP for production (or
   `0.0.0.0/0` if your host has no static IP — see
   [Deployment](#deployment)).
4. **Database** → **Connect** → **Drivers** → copy the connection string and
   substitute your user's password in for `<db_password>`.
5. **Free-tier (M0) clusters auto-pause after ~60 days of inactivity.** If
   your app suddenly can't connect, check whether the cluster shows *paused*
   in the dashboard first — see [Troubleshooting](#troubleshooting-known-gotchas).

### 4. Set up Upstash Redis (optional but recommended)

1. Create a free Redis database, in a region close to your backend.
2. Copy the connection string from the **Connect** tab — it must start with
   `rediss://` (two S's — TLS is required; the client is configured to reject
   a plain `redis://` URL's non-TLS assumptions otherwise).
3. If this is skipped or the value is wrong, the app still works — Redis
   failures are caught and logged, and every AI/Top-Questions call falls back
   to calling the AI directly / querying MongoDB.

### 5. Get AI API keys

- **Gemini** (primary): [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) → Create API key.
- **Groq** (fallback): [console.groq.com](https://console.groq.com) → API Keys → Create API Key.

Both are free tier, no credit card. The app tries Gemini first and only calls
Groq when Gemini fails with a quota/rate-limit/auth/outage error — see
`backend/utils/gemini.js`.

### 6. Configure environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill in `backend/.env` with the values from steps 3–5. Generate a `JWT_SECRET`
with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

See [Environment variables reference](#environment-variables-reference) for
what every variable does.

### 7. Run it

Two terminals:

```bash
# Terminal 1 — backend (nodemon, auto-restarts on change)
cd backend
npm run dev
```

```bash
# Terminal 2 — frontend
cd frontend
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`). The frontend
talks to the backend at `http://localhost:8000` by default — matches
`PORT=8000` in `backend/.env`.

**Running in VS Code:** just open the repo root as the workspace folder and
use two split integrated terminals for the two commands above — no extra
config needed. The ESLint and Tailwind CSS IntelliSense extensions are worth
installing (VS Code will likely prompt for them) but aren't required.

## Environment variables reference

Full annotated template: [`backend/.env.example`](backend/.env.example),
[`frontend/.env.example`](frontend/.env.example).

| Variable | Where | Required | Purpose |
| --- | --- | --- | --- |
| `PORT` | backend | no (default 8000) | API port |
| `NODE_ENV` | backend | no | `production` hides stack traces in error responses |
| `MONGO_URI` | backend | **yes** | MongoDB Atlas connection string |
| `JWT_SECRET` | backend | **yes** | JWT signing secret |
| `GEMINI_API_KEY` | backend | **yes** | Primary AI provider |
| `GROQ_API_KEY` | backend | recommended | AI fallback — without it, a Gemini outage/quota hit fails outright instead of degrading |
| `REDIS_URL` | backend | recommended | Upstash cache — app runs without it, just uncached |
| `FRONTEND_URL` | backend | production only | Comma-separated CORS allowlist; open to all origins when unset (dev convenience) |
| `AI_RATE_LIMIT_MAX` / `AI_RATE_LIMIT_WINDOW_MS` | backend | no | Tune the per-user AI request limiter |
| `AUTH_RATE_LIMIT_MAX` | backend | no | Tune the per-IP login/register brute-force limiter |
| `VITE_API_BASE_URL` | frontend | production only | Backend URL — baked in at **build** time, must be set in your hosting provider's build environment, not just a local `.env` |

## API overview

All routes are prefixed with `/api`. Full request/response conventions,
status-code standards, and per-endpoint function references are in
[ENGINEERING_GUIDELINES.md §§ 3–4](ENGINEERING_GUIDELINES.md#3-api-standards).

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | — | Create an account |
| POST | `/auth/login` | — | Log in |
| GET / PUT | `/auth/profile` | ✓ | Get / update profile |
| PUT | `/auth/change-password` | ✓ | Change password |
| POST | `/ai/generate-questions` | ✓ | Generate role-specific questions |
| POST | `/ai/generate-explanation` | ✓ | Explain a concept |
| POST | `/ai/generate-from-resume` | ✓ | Generate questions from an uploaded resume |
| POST | `/sessions/create` | ✓ | Create a prep session |
| GET | `/sessions/my-sessions` | ✓ | List your sessions |
| GET / DELETE | `/sessions/:id` | ✓ | Get / delete a session |
| POST | `/questions/add` | ✓ | Add questions to a session |
| POST | `/questions/:id/pin` | ✓ | Pin/unpin a question |
| POST | `/questions/:id/note` | ✓ | Attach a note to a question |
| GET | `/top-questions?role=&limit=` | — | Community top questions for a role |
| POST | `/mock/start` | ✓ | Start a mock interview |
| GET | `/mock/:id` | ✓ | Fetch a mock attempt |
| GET | `/mock/my` | ✓ | List your mock attempts |
| POST | `/mock/:id/answer` | ✓ | Submit + AI-grade one answer |
| POST | `/mock/:id/complete` | ✓ | Finish and get the overall debrief |
| DELETE | `/mock/:id` | ✓ | Delete a mock attempt |
| GET | `/health` | — | Health probe (DB/Redis status) — for load balancers/uptime monitors |

## Deployment

1. **Backend**: deploy `backend/` to any Node host (Render, Railway, Fly.io,
   etc.). Set every variable from the reference table above in that host's
   environment settings — not just locally.
   - Whitelist the host's outbound IP in **Atlas → Network Access**. Hosts
     with dynamic/rotating egress IPs (most PaaS free tiers) generally need
     `0.0.0.0/0` unless you pay for a static-IP add-on — if so, prefer that
     and skip the wildcard.
   - Set `FRONTEND_URL` to your deployed frontend's exact URL once you have
     it, to lock CORS down from the wide-open local-dev default.
2. **Frontend**: deploy `frontend/` to any static host (Vercel, Netlify,
   etc.). Set `VITE_API_BASE_URL` to your deployed backend's URL in that
   host's **build-time** environment variables (Vite bakes it in at build,
   not at runtime — a value only in a local `.env` won't reach the deployed
   build).
3. Confirm `GET /health` on the deployed backend returns
   `{ "status": "ok", "db": "connected" }` before pointing the frontend at it.

## Troubleshooting / known gotchas

These are real issues hit while building and deploying this project — saving
the next person the debugging time:

- **Backend can't connect to MongoDB, error mentions "IP not whitelisted"** —
  that message is Mongoose's generic guess, not necessarily the real cause.
  Also check: is the Atlas cluster **paused**? (Free M0 clusters auto-pause
  after ~60 days idle.) A paused cluster can present a stale/expired TLS
  certificate that fails with a *different* underlying error (`certificate
  has expired`) while Mongoose still reports the generic whitelist message.
  Resume the cluster (Atlas → your cluster → **Connect** → it'll prompt to
  resume) and retry.
- **AI requests failing with "model not found" / 404** — Google and Groq both
  retire model versions over time. If this happens, check
  `backend/utils/gemini.js` — `GEMINI_MODEL` and `GROQ_MODEL` are the two
  constants to update; check each provider's current model list.
- **Server hangs on boot, never logs "Server running on port..."** — if this
  happens with Redis configured, check `REDIS_URL` is reachable; the client's
  reconnect strategy is bounded (3 attempts) specifically so an unreachable
  Redis fails fast instead of hanging startup forever.
- **Redis `WRONGPASS` error** — the token in the connection string doesn't
  match. Re-copy it directly from Upstash's **Connect** tab rather than
  retyping; these tokens are long and easy to lose a character from.

## Future scope

Ideas for where this could go next, roughly ordered by how much value they'd
add relative to effort:

- **Automated test suite** — Jest + supertest, prioritizing the auth and
  ownership/403 paths (see [ENGINEERING_GUIDELINES.md § 11](ENGINEERING_GUIDELINES.md#11-testing-standards)).
  Nothing is automated today; every check so far has been manual.
- **CI pipeline** — GitHub Actions running lint + build on every PR. Would
  have caught several bugs found during manual pre-deployment review before
  they ever reached a person.
- **Redis-backed rate limiting** — the current limiter is in-memory per
  process; fine for a single instance, but won't share state across multiple
  instances behind a load balancer (already flagged in the engineering docs).
- **Voice-based mock interviews** — speech-to-text answer input for a more
  realistic interview simulation than typing.
- **Peer comparison / leaderboards** — surface how your mock scores compare
  to others in the same role, building on the existing community
  Top-Questions signal.
- **Multi-language question generation** — carried over from the original
  project roadmap, not yet built.
- **Shareable results** — export a mock interview debrief as a PDF or a
  shareable link.
- **Additional AI provider as a third fallback** — for even higher
  resilience beyond the current Gemini → Groq chain.
- **Admin/moderation tooling** for the community Top Questions pipeline, as
  the pinning volume grows.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for environment setup specifics, code
standards, and the PR checklist. Short version: read
[ENGINEERING_GUIDELINES.md](ENGINEERING_GUIDELINES.md) first, run lint/build
before opening a PR, and actually exercise the flow you changed rather than
relying on reading the code.

## License

All rights reserved — see [LICENSE](LICENSE). This project was built during an
internship, so its licensing depends on confirming IP ownership with that
organization; it isn't under an open-source license yet.

## Contact

**Dileep Guglavath**
📧 [dileepguglavath9@gmail.com](mailto:dileepguglavath9@gmail.com)
🔗 [LinkedIn](https://linkedin.com/in/dileepguglavath/)
