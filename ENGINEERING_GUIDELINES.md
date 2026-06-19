# InterviewEdge — Engineering Guidelines & System Reference

## Objective

This document is the single source of truth for the **InterviewEdge** codebase —
its architecture, modules, functions, packages, security standards, data flows
and operational pipelines. It defines the standards that all AI-assisted and
developer-written code must follow to keep the project consistent, secure,
reliable and maintainable. Use it to track _what exists_, _how it works_ and
_the rules to follow_.

> Stack: **React 19 + Vite + Tailwind** (frontend) · **Node.js + Express 5 +
> MongoDB/Mongoose** (backend) · **Redis (Upstash)** cache · **node-cron** jobs ·
> **Google Gemini 2.5 Flash → Groq (Llama 3.3)** AI with failover.

---

# 1. Architecture Standards

## Layered Architecture

The backend follows a strict request pipeline:

```text
Route → Middleware → Controller → Service / Utils → Model (Mongoose) → MongoDB
                              �‑ Cache (Redis) ‑↑   ↑ AI layer (Gemini/Groq) ↑
```

### Route Responsibilities

- Define the HTTP method + path and attach middleware (`protect`, rate limiters, `multer`).
- Contain **no business logic**.

### Middleware Responsibilities

- Cross-cutting concerns: authentication (`protect`), rate limiting, body parsing,
  security headers, compression, error handling.

### Controller Responsibilities

- Handle HTTP request/response and input validation.
- Enforce **authorization / ownership** checks.
- Delegate AI/caching work to `utils/` helpers.
- Return standardized JSON + the correct status code.

### Service / Utils Responsibilities

- Business logic that is not HTTP-specific: AI calls (`utils/gemini.js`),
  prompt building (`utils/prompts.js`, `utils/mockPrompts.js`), caching helpers,
  aggregation (`jobs/`), seeding (`seeds/`).

### Model (Data Layer) Responsibilities

- Encapsulate database access through **Mongoose schemas** only.
- Define indexes, validation and relationships (`ref` / `populate`).

> **Rule:** keep business logic out of routes; keep database logic in models;
> keep AI/cache logic in `utils/`. Reuse existing patterns before adding new ones.

---

# 2. Project Structure & Modules

## Backend (`/backend`)

| Path                                       | Module                                        | Responsibility                                                                                      |
| ------------------------------------------ | --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `server.js`                                | App bootstrap                                 | Mounts middleware, routes, error handlers; connects DB/Redis; seeds; starts cron; graceful shutdown |
| `config/db.js`                             | `connectDB`                                   | Mongoose connection (exits process on failure)                                                      |
| `config/redis.js`                          | `redisClient`, `connectRedis`                 | Upstash Redis client with graceful degradation                                                      |
| `middleware/authMiddleware.js`             | `protect`                                     | Verifies JWT, loads `req.user`, rejects deleted users                                               |
| `middleware/rateLimiter.js`                | `aiRateLimiter`, `authLimiter`, `makeLimiter` | Fixed-window rate limiting (per user / per IP)                                                      |
| `middleware/errorMiddleware.js`            | `notFound`, `errorHandler`                    | 404 + centralized error mapping                                                                     |
| `controller/authController.js`             | auth handlers                                 | Register / login / profile / change-password                                                        |
| `controller/sessionController.js`          | session handlers                              | CRUD for interview sessions                                                                         |
| `controller/questionController.js`         | question handlers                             | Add / pin / note questions                                                                          |
| `controller/mockInterviewController.js`    | mock handlers                                 | Start / answer / complete / fetch / delete mocks                                                    |
| `controller/topQuestionController.js`      | community handler                             | Cached community Top Questions                                                                      |
| `controller/aiController.js`               | AI handlers + cache                           | Generate questions / explanation / from-resume                                                      |
| `utils/gemini.js`                          | AI client                                     | Gemini→Groq failover + JSON/text helpers                                                            |
| `utils/prompts.js`, `utils/mockPrompts.js` | Prompt builders                               | Domain-aware prompt construction                                                                    |
| `jobs/aggregateTopQuestions.js`            | `startTopQuestionsCron`                       | Hourly community aggregation pipeline                                                               |
| `seeds/topQuestionSeeds.js`                | `seedTopQuestions`                            | Upsert-safe seed of starter questions                                                               |
| `models/*.js`                              | Mongoose models                               | `User`, `Session`, `Question`, `MockInterview`, `PinEvent`, `TopQuestion`                           |

## Frontend (`/frontend/src`)

| Path                                      | Module        | Responsibility                                                    |
| ----------------------------------------- | ------------- | ----------------------------------------------------------------- |
| `main.jsx`                                | Entry         | Mounts `<App/>` inside `<ErrorBoundary>`                          |
| `App.jsx`                                 | Router        | Routes + `ProtectedRoute` guards + `<Toaster/>`                   |
| `utils/axiosinstance.js`                  | HTTP client   | JWT request interceptor + centralized failure handling            |
| `utils/apiPaths.js`                       | API map       | Base URL + endpoint constants                                     |
| `context/userContext.jsx`                 | Auth state    | Current user + token lifecycle                                    |
| `components/Auth/ProtectedRoute.jsx`      | Route guard   | Redirects unauthenticated users to `/login`                       |
| `components/common/ErrorBoundary.jsx`     | Resilience    | Fallback UI on render crashes                                     |
| `components/AnswerRenderer.jsx`           | Renderer      | Domain-aware answer/code rendering                                |
| `components/ui/*`, `components/Layouts/*` | Design system | Reusable UI + app shell                                           |
| `pages/*`                                 | Screens       | Landing, Auth, Dashboard, PrepKit, Mock, Analytics, Profile, Info |

---

# 3. API Standards

## Response Conventions (current)

- **Auth:** `{ _id, name, email, token }`
- **Collections:** raw array (e.g. `GET /sessions/my-sessions`)
- **Single resource / actions:** `{ success: true, <resource> }` or `{ message }`
- **Errors (via `errorHandler`):** `{ success: false, message, stack? }`
  _(stack only outside production)_

## Recommended Standard Envelope (target for new endpoints)

```json
{ "statusCode": 200, "message": "Success", "data": {} }
```

```json
{ "statusCode": 400, "message": "Validation Error", "data": null }
```

## HTTP Status Codes

| Status | Usage                                                              |
| ------ | ------------------------------------------------------------------ |
| 200    | Successful request (reads, updates, login)                         |
| 201    | Resource created (register, session/question/mock creation)        |
| 400    | Validation / bad input                                             |
| 401    | Not authenticated (missing/invalid/expired token, bad credentials) |
| 403    | Authenticated but not allowed (accessing another user's resource)  |
| 404    | Resource or route not found                                        |
| 409    | Conflict (duplicate email)                                         |
| 413    | Payload too large (file > 5 MB, body > 1 MB)                       |
| 429    | Too many requests (AI abuse, login brute-force)                    |
| 500    | Internal server error (safe message in production)                 |
| 503    | Service unavailable (reserved for downstream/dependency outages)   |

> **Rule:** always return the most specific correct code; never return 200 with an
> error body. Creation = 201, ownership failure = 403, missing = 404.

---

# 4. Core Functions Reference

## Auth (`authController.js`)

- `generateToken(userId)` — signs a 7-day JWT.
- `registerUser` — validates input, hashes password, creates user → **201**.
- `loginUser` — validates credentials (same message for unknown user / wrong password → no enumeration).
- `getUserProfile` / `updateUserProfile` / `changePassword` — profile self-service; email-uniqueness and current-password checks.

## Sessions (`sessionController.js`)

- `createSession` (**201**), `getMySessions`, `getSessionById` (**403** if not owner), `deleteSession` (**403** if not owner).

## Questions (`questionController.js`)

- `addQuestionsToSession` (**201**, ownership-checked), `togglePinQuestion` (writes a `PinEvent`), `updateQuestionNote`.

## Mock Interview (`mockInterviewController.js`)

- `startMockInterview` (**201**), `submitAnswer` (AI-scored), `completeMockInterview` (debrief), `getMockInterview`, `getMyMockInterviews`, `deleteMockInterview`.
- `isValidId()` guards every id route → clean **404** on bad ObjectId.
- Ideal answers are withheld from the client until a question is answered.

## AI (`aiController.js`)

- `generateInterviewQuestions`, `generateConceptExplanation`, `generateQuestionsFromResume`.
- `extractTextFromFile` — pdf-parse / mammoth extraction.
- `getCache` / `setCache` / `buildQuestionsKey` / `buildExplanationKey` — Redis helpers.

## Top Questions (`topQuestionController.js`)

- `getTopQuestions` — 3-layer cache read; `normaliseRole` for fuzzy role matching.

## AI Client (`utils/gemini.js`)

- `callGemini` → primary; `callGroq` → fallback.
- `callAIForJSON` / `callAIForText` — failover + 4-strategy JSON parse cascade.

---

# 5. Database Standards

## ORM

- **Mongoose** must be used for all database access. No direct driver calls.

## Models & Relationships

- `Session → Question`: one-to-many, **referenced** (separate collection).
- `MockInterview`: **embeds** its question/answer/score subdocuments.
- `PinEvent` → aggregated into `TopQuestion` by the cron job.

## Indexing

Indexes should exist on frequently-queried fields:

- `User.email` (unique), `Session.user`, `Question.session`, `MockInterview.user`,
  `TopQuestion.role`, `PinEvent.role`.

## Validation & Safety

- Validate ObjectIds before `findById` (returns 404, never a 500).
- Use `runValidators: true` on updates.
- Never trust client input — validate and normalize (e.g. lowercase email).

---

# 6. Caching & Pipelines

## Three-Layer Cache (read path)

```text
Client → ① CDN (edge, Cache-Control) → ② Redis (Upstash, ~5ms) → ③ MongoDB (source)
```

| Layer                 | TTL / Header                                  | Notes                           |
| --------------------- | --------------------------------------------- | ------------------------------- |
| CDN                   | `s-maxage=3600, stale-while-revalidate=86400` | Public Top-Questions only       |
| Redis — questions     | 24 h                                          | Keyed by role+topics+difficulty |
| Redis — explanations  | 7 days                                        | Stable content                  |
| Redis — top-questions | 1 h                                           | Busted by the cron              |
| Résumé generation     | **not cached**                                | Unique per upload               |

> **Rule:** every cache call checks `redisClient.isReady` first → graceful
> degradation to AI/DB if Redis is down.

## Cron Aggregation Pipeline (`jobs/aggregateTopQuestions.js`)

```text
PinEvents → group by role+question → count unique users
          → score = baseScore + uniqueUserPins × 10
          → upsert TopQuestion → bust Redis cache
```

- Schedule: hourly (`0 * * * *`). Also seeds 18 questions across 8 roles on boot.

---

# 7. AI Integration Standards

- **Primary:** Gemini 2.5 Flash (`@google/genai`). **Fallback:** Groq Llama 3.3 (REST).
- On rate-limit / quota / outage → automatically fail over to Groq.
- All AI JSON passes the **4-strategy parser**: direct → strip fences → bracket-depth scan → sanitize.
- Prompts are **domain-aware**: never assume "software"; only emit code when relevant.
- AI endpoints are **authenticated + per-user rate limited** (`aiRateLimiter`).

---

# 8. Security Standards

## Packages & Their Roles

| Package          | Role                                                                    |
| ---------------- | ----------------------------------------------------------------------- |
| **helmet**       | Sets secure HTTP headers (clickjacking, MIME-sniffing, XSS protections) |
| **compression**  | Gzip responses                                                          |
| **cors**         | Origin allowlist (`FRONTEND_URL`); `*` only in local dev                |
| **bcryptjs**     | One-way password hashing (salt rounds = 10)                             |
| **jsonwebtoken** | Stateless 7-day JWT auth                                                |
| **multer**       | In-memory upload parsing (5 MB limit, PDF/DOC/DOCX whitelist)           |
| **express.json** | Body parsing with a 1 MB limit                                          |

## Authentication & Authorization

- `protect` verifies the JWT and loads `req.user`; rejects tokens for **deleted users** (401).
- **Ownership checks** on every session/question/mock → **403** on cross-account access (IDOR protection).

## Rate Limiting

- `aiRateLimiter`: per user, 30 req / 15 min (env-tunable) → **429**.
- `authLimiter`: per IP, 10 attempts / 15 min on login/register → **429** (brute-force guard).
- `trust proxy = 1` so limits key on the real client IP behind a proxy.

## Input & Transport

- Validate presence, email format, password length; normalize emails to lowercase.
- Login uses a single generic failure message (no user enumeration).
- Duplicate email → **409**; oversized body/file → **413**.

> **Rule (breach handling):** authentication failures = 401, authorization
> failures = 403, abuse = 429. Never leak stack traces or raw errors in production.

---

# 9. Error Handling Standards

- All failures flow through **one** handler: `errorMiddleware.errorHandler`.
- Express 5 auto-forwards async controller errors to it.
- Status mapping: MulterError → 413/400, CastError → 404, ValidationError → 400,
  duplicate key → 409, JWT errors → 401, default → 500.
- `notFound` returns a JSON **404** for unmatched routes.
- Stack traces are included **only** when `NODE_ENV !== "production"`.
- Frontend: `ErrorBoundary` catches render crashes; the axios interceptor surfaces
  401/403/429/5xx/timeout/network failures as user toasts.

---

# 10. Logging Standards

Structured, level-based server logging:

- `console.error` for 5xx and caught faults (event + identifiers).
- Startup logs for DB/Redis/cron/seed status.

Log levels: **info · warn · error**. Logs should include event name, status, and
relevant identifiers (user id, route). _Recommended:_ adopt `pino`/`morgan` +
log aggregation in production.

---

# 11. Testing Standards

## Unit Tests — required for

- Input validators, slug/JSON parsers, scoring/aggregation logic, AI helpers (mocked).

## Integration Tests — required for

- Auth flow, **ownership/403 paths**, session/question/mock lifecycle, cache fallback.

> _Recommended stack:_ Jest + supertest. Prioritize the auth and ownership paths.

---

# 12. Concurrency & Resilience

- **Graceful shutdown** on `SIGTERM`/`SIGINT`: stop HTTP server, close Mongo & Redis, exit 0.
- **Crash safety:** `unhandledRejection` logged; `uncaughtException` triggers graceful shutdown so the platform restarts a clean instance.
- **Startup safety:** fatal boot errors `process.exit(1)`.
- **Degradation:** Redis or Gemini outages never take the app down.
- **Health probe:** `GET /health` reports DB + Redis status for load balancers.
- **Future (multi-instance):** move rate limiting to Redis for shared windows.

---

# 13. Frontend Standards

- **Routing:** every private page is wrapped in `ProtectedRoute` (redirects to `/login`).
- **HTTP:** all calls go through `axiosInstance` (JWT attached, failures handled centrally). No raw `fetch` for app APIs.
- **State:** auth via `userContext`; token in `localStorage`, cleared on 401.
- **Resilience:** `ErrorBoundary` wraps the app.
- **UI:** reuse the `components/ui` design system (`Button`, `Badge`, `Card`, `ProgressBar`, `StatCard`); no ad-hoc duplicates.
- **Config:** API base URL from `VITE_API_BASE_URL` (never hard-coded).

---

# 14. Environment Variables

| Variable                                        | Purpose                          |
| ----------------------------------------------- | -------------------------------- |
| `PORT`                                          | API port (default 8000)          |
| `MONGO_URI`                                     | MongoDB connection string        |
| `JWT_SECRET`                                    | JWT signing secret               |
| `GEMINI_API_KEY` / `GROQ_API_KEY`               | AI providers                     |
| `REDIS_URL`                                     | Upstash Redis (`rediss://`)      |
| `AI_RATE_LIMIT_MAX` / `AI_RATE_LIMIT_WINDOW_MS` | AI limiter tuning                |
| `AUTH_RATE_LIMIT_MAX`                           | Login/register limiter tuning    |
| `FRONTEND_URL`                                  | CORS allowlist (comma-separated) |
| `NODE_ENV`                                      | `production` hides stack traces  |
| `VITE_API_BASE_URL`                             | Frontend → API base URL          |

---

# General Engineering Principles

- Prefer readability over cleverness.
- Keep business logic out of routes; keep DB logic in models; keep AI/cache logic in `utils/`.
- Validate and never trust client input.
- Enforce least privilege — ownership-check every resource.
- Defense in depth — helmet + CORS + rate limits + validation + auth.
- Fail fast on boot; degrade gracefully at runtime.
- One error path; consistent status codes and JSON shapes.
- Don't leak internals (no stack traces in production).
- Reuse existing patterns before introducing new abstractions.
- Maintain backward compatibility whenever possible.
