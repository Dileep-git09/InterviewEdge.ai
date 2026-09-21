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
> **Google Gemini → Groq** AI with failover (model IDs in `utils/gemini.js` —
> both providers retire model versions periodically, check there first if AI
> calls start 404ing).

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
| `app.js`                                   | Express app                                   | Middleware, routes (mounted under `/api/v1`), error handlers. No side effects — importable by tests without touching real infra |
| `server.js`                                | Production bootstrap                          | Requires `app.js`; connects DB/Redis; seeds; starts cron; `listen()`; graceful shutdown              |
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
| `controller/leaderboardController.js`      | leaderboard handler                           | Best-score-per-user ranking per role, Redis-cached, opt-out-aware                                    |
| `controller/aiController.js`               | AI handlers + cache                           | Generate questions / explanation / from-resume                                                      |
| `utils/gemini.js`                          | AI client                                     | Gemini→Groq failover + JSON/text helpers                                                            |
| `utils/email.js`                           | `sendEmail`                                   | SMTP send for forgot-password; logs to console when unconfigured                                    |
| `utils/monitoring.js`                      | `init`, `captureException`                    | Optional Sentry wiring — no-op unless `SENTRY_DSN` is set                                            |
| `tests/`                                   | Jest + supertest                              | `npm test` — auth, ownership/403, pagination, AI-mocked mock-interview flow (see § 11)               |
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
| `App.jsx`'s inline `ProtectedRoute`        | Route guard   | Redirects unauthenticated users to `/login` (also does route-level code splitting via `React.lazy`) |
| `components/common/ErrorBoundary.jsx`     | Resilience    | Fallback UI on render crashes                                     |
| `components/AnswerRenderer.jsx`           | Renderer      | Domain-aware answer/code rendering                                |
| `components/ui/*`, `components/Layouts/*` | Design system | Reusable UI + app shell                                           |
| `pages/*`                                 | Screens       | Landing, Auth, Dashboard, PrepKit, Mock, Analytics, Profile, Info |

---

# 3. API Standards

All routes are mounted under `/api/v1` (`app.js`) — versioned from the start
so a future breaking change has somewhere to land without pulling the rug out
from under whatever's still calling `/api/v1`.

## Response Conventions (current)

- **Auth:** `{ _id, name, email, token }`
- **Paginated collections:** `{ <resourceKey>, page, limit, total, totalPages }`
  (e.g. `GET /sessions/my-sessions` → `{ sessions, page, limit, total, totalPages }`,
  `GET /mock/my` → `{ success, mocks, page, limit, total, totalPages }`).
  Query params: `?page=` (default 1), `?limit=` (default 10, capped per-route —
  50 for sessions, 100 for mock history since Analytics needs more headroom).
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

- `generateToken(userId, tokenVersion)` — signs a 7-day JWT embedding `tokenVersion`.
- `registerUser` — validates input, hashes password, creates user → **201**.
- `loginUser` — validates credentials (same message for unknown user / wrong password → no enumeration).
- `getUserProfile` / `updateUserProfile` — profile self-service; email-uniqueness check.
- `changePassword` — verifies current password, bumps `user.tokenVersion` (invalidating
  every other previously-issued token), returns a fresh token for the requesting session.
- `logoutAllDevices` — bumps `tokenVersion` without touching the password; the
  explicit "log out everywhere" action, including invalidating the very token
  used to call it.
- `forgotPassword` / `resetPassword` — same enumeration-safe pattern as login
  (identical response whether or not the email exists). Only a SHA-256 hash of
  the reset token is ever stored (`User.resetPasswordTokenHash`, `select: false`),
  1-hour expiry. Delivery goes through `utils/email.js` — logs to the console
  when `SMTP_*` isn't configured, so the flow is fully testable without a real
  mail provider.
- `exportUserData` — everything the app knows about the user (profile,
  sessions+questions, mock interviews, pin events) as one JSON download.
- `deleteAccount` — requires the current password as confirmation (a stolen
  session token alone isn't enough); cascades: deletes owned questions,
  sessions, mock interviews, and pin events, then the user document itself.
- `updateLeaderboardPreference` — toggles `User.leaderboardOptOut` (see § 4
  Leaderboard for what opting out actually hides vs. still counts).

## Sessions (`sessionController.js`)

- `createSession` (**201**, requires `questions` to be an array), `getMySessions`
  (paginated — see § 3), `getSessionById` (**403** if not owner), `deleteSession`
  (**403** if not owner).

## Questions (`questionController.js`)

- `addQuestionsToSession` (**201**, ownership-checked), `togglePinQuestion` (writes a `PinEvent`), `updateQuestionNote`.

## Mock Interview (`mockInterviewController.js`)

- `startMockInterview` (**201**), `submitAnswer` (AI-scored), `completeMockInterview` (debrief), `getMockInterview`, `getMyMockInterviews` (paginated — see § 3), `deleteMockInterview`.
- `isValidId()` guards every id route → clean **404** on bad ObjectId.
- Ideal answers are withheld from the client until a question is answered.

## AI (`aiController.js`)

- `generateInterviewQuestions`, `generateConceptExplanation`, `generateQuestionsFromResume`.
- `extractTextFromFile` — pdf-parse / mammoth extraction.
- `getCache` / `setCache` / `buildQuestionsKey` / `buildExplanationKey` — Redis helpers.

## Top Questions (`topQuestionController.js`)

- `getTopQuestions` — 3-layer cache read; `normaliseRole` for fuzzy role matching.
  Exports `normaliseRole` and `escapeRegExp` — reused by `leaderboardController.js`
  for its own exact (not fuzzy) role matching.

## Leaderboard (`leaderboardController.js`)

- `getLeaderboard` — best completed-mock score per user for a role, ranked
  descending. Redis-cached as `{ userId, score }` pairs only (no names, TTL
  10 min) — reusable across every requester and never goes stale from a
  display-name or opt-out change. Names are resolved and masked
  (`"Asha K."`) per-request from the cached ranking.
- `maskName` — `"Asha Kapoor"` → `"Asha K."`, matching the testimonial format
  already used on the landing page.
- Opt-out (`User.leaderboardOptOut`) only hides a user from *others'* view of
  the named list — they're still counted toward `total` and their own
  `you` block always reflects their real rank, whether or not they've
  opted out. Toggled via `PUT /auth/leaderboard-preference`
  (`authController.updateLeaderboardPreference`).

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
| Redis — leaderboard   | 10 min                                        | `{userId, score}` only — no names, so it's requester-agnostic |
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

- **Primary:** Gemini (`@google/genai`, model ID in `GEMINI_MODEL`). **Fallback:**
  Groq (REST, model ID in `GROQ_MODEL`) — both constants live in `utils/gemini.js`.
  Both providers retire model IDs over time; a 404 "model not found"/"no longer
  available" error means the constant needs bumping to a current model.
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
- **Token revocation:** JWTs are stateless (no blacklist), so revocation works via
  a `tokenVersion` counter on `User` embedded in every signed token. `protect`
  rejects any token whose `tokenVersion` doesn't match the user's current value
  — even if the signature and expiry are still valid. Bumped by
  `changePassword` (invalidates every other session) and `logoutAllDevices`
  (`POST /api/v1/auth/logout-all` — invalidates every session, including the
  one that called it).

## Rate Limiting

- `aiRateLimiter`: per user, 30 req / 15 min (env-tunable) → **429**.
- `authLimiter`: per IP, 10 attempts / 15 min on login/register/forgot-password/
  reset-password → **429** (brute-force guard).
- **Redis-backed with in-memory fallback** (`middleware/rateLimiter.js`): atomic
  `INCR` + `PEXPIRE` gives one shared counter across every instance when Redis
  is available — the earlier in-memory-only Map only limited within a single
  process, letting a client get `MAX` requests *per instance* behind a load
  balancer. Falls straight back to the in-memory Map when Redis is down or a
  call fails mid-request, same as everywhere else in this codebase.
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

**Implemented** — `cd backend && npm test` (Jest + supertest, `backend/tests/`).
Runs against `mongodb-memory-server` (a real, ephemeral, in-memory MongoDB) —
no real Atlas connection, no secrets, safe in CI. `backend/app.js` exports the
configured Express app with no side effects (no `listen()`, no DB/Redis
connect, no cron/seed) specifically so tests can import it directly;
`backend/server.js` is the thin production bootstrap that wraps it.

## Unit Tests — `tests/gemini.test.js`

- The 4-strategy JSON parser cascade (`extractAndParseJSON`).

## Integration Tests — `tests/{auth,sessions,questions,mock,topQuestions,leaderboard}.test.js`

- Auth flow (register/login/protect), **token revocation** (`tokenVersion` on
  password change and `logout-all`), forgot/reset-password, account
  export/deletion.
- **Ownership/403 paths** on sessions, questions, and mock interviews.
- Session/mock **pagination** (page slicing, no cross-page overlap, limit capping).
- The top-questions regex-metacharacter regression (`C++ Developer` etc.).
- Mock interview lifecycle with Gemini **mocked** (`jest.mock("../utils/gemini")`)
  — no real API calls, no quota burned, deterministic.
- Leaderboard ranking (best-score-per-user, not every attempt), exact
  case-insensitive role matching, and the opt-out privacy contract (hidden
  from others' named list, still counted toward total/percentile, always
  visible to the user themselves).

## CI

- `.github/workflows/ci.yml` runs `npm test` (backend) and `npm run lint` +
  `npm run build` (frontend) on every push/PR to `main`.

---

# 12. Concurrency & Resilience

- **Graceful shutdown** on `SIGTERM`/`SIGINT`: stop HTTP server, close Mongo & Redis, exit 0.
- **Crash safety:** `unhandledRejection` logged; `uncaughtException` triggers graceful shutdown so the platform restarts a clean instance.
- **Startup safety:** fatal boot errors `process.exit(1)`.
- **Degradation:** Redis or Gemini outages never take the app down.
- **Health probe:** `GET /health` reports DB + Redis status for load balancers.
- **Multi-instance:** rate limiting is Redis-backed (§8) so limits are shared
  correctly across instances, not just within one process.
- **Monitoring:** `utils/monitoring.js` wires 5xx errors and uncaught
  exceptions to Sentry when `SENTRY_DSN` is set; a no-op otherwise.

---

# 13. Frontend Standards

- **Routing:** every page is `React.lazy`-loaded in `App.jsx` (route-level code
  splitting — each page ships as its own chunk instead of one large initial
  bundle) and wrapped in `<Suspense>`. Every private page is additionally
  wrapped in `ProtectedRoute` (redirects to `/login`).
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
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Forgot-password email delivery — logs to console instead when unset |
| `SENTRY_DSN`                                    | Error monitoring — no-op when unset |
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
