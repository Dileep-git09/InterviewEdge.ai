# Contributing to InterviewEdge

Thanks for helping improve InterviewEdge. This doc covers how to get set up, the
standards your change is expected to follow, and how to get it merged.

> This repo isn't under an open-source license yet (see [LICENSE](LICENSE)) —
> contributing here means collaborating directly with the maintainer, not
> forking for redistribution. If you'd like write access, ask the maintainer
> to add you as a collaborator.

## Before you start

- **New feature or big change?** Open an issue first describing what you want
  to build and why. A quick "does this fit the project" check saves you from
  writing something that won't get merged.
- **Bug fix or small change?** Just open a PR — no issue needed.
- Read [ENGINEERING_GUIDELINES.md](ENGINEERING_GUIDELINES.md) once before your
  first PR. It's the actual rulebook for this codebase (layered architecture,
  response conventions, status codes, security standards) — this doc won't
  repeat it.

## Getting set up

Full environment setup (MongoDB, Redis, Gemini/Groq keys, running both
servers) is in the [README](README.md#getting-started). Once that's working
locally:

```bash
git checkout -b your-name/short-description
```

Branch naming isn't strictly enforced, but `<yourname>/<what-it-does>` (e.g.
`asha/fix-mock-skip-button`) keeps the branch list readable.

## Code standards

- **Follow [ENGINEERING_GUIDELINES.md](ENGINEERING_GUIDELINES.md)** — layered
  architecture (routes have no business logic, controllers own
  validation/ownership checks, DB access only through Mongoose models, AI/cache
  logic stays in `utils/`).
- **Match the existing style** in whatever file you're editing rather than
  introducing a new pattern — this codebase has no Prettier config, so
  consistency is by convention, not by tool.
- **No dead code / unused exports.** If you add a utility, wire it up to
  something that actually calls it.
- **Comment the why, not the what.** Function/variable names should make the
  *what* obvious; a comment is for a non-obvious constraint, a workaround, or
  a reason a naive alternative doesn't work.
- **Ownership checks are not optional.** Any new endpoint touching a
  user-owned resource (session, question, mock interview, etc.) must verify
  `resource.user.toString() === req.user._id.toString()` before mutating or
  returning it — see any existing controller for the pattern.
- **Validate at the boundary.** New endpoints should validate `req.body` /
  `req.query` shape before touching the database (see
  `questionController.addQuestionsToSession` for the pattern), matching
  section 5/8 of the engineering guidelines.

## Before opening a PR

Run both of these and make sure they're clean — **this is the actual gate**,
not a suggestion:

```bash
# Frontend
cd frontend
npm run lint
npm run build

# Backend — no test suite yet (see "Good first contributions" below), but at
# minimum syntax-check any file you touched:
cd backend
node --check path/to/your/file.js
```

If your change touches a page or component, **run it in the browser** and
click through the actual flow — `npm run lint` catches undefined variables,
not broken behavior. A past bug in this codebase (a Skip button that silently
did the same thing as Submit) only showed up by actually clicking it.

If your change touches an API route, hit it with a real request (curl,
Postman, or the app itself) against a running backend — don't rely on reading
the code alone. This project's history has more than one case of two files
disagreeing on a route path (`/api/mock` vs `/api/mock-interviews`) that only
a live request would have caught.

## Commit messages

Short, imperative, present tense: `fix: mock interview skip button submits instead of skipping`,
not `Fixed a bug` or `fixing skip button issue`. If it's a fix, say what broke;
if it's a feature, say what it adds — the "why" belongs in the PR description,
not repeated in every commit.

## Opening the PR

- Keep it scoped to one thing. A 20-file PR that fixes a bug *and* refactors
  *and* adds a feature is much harder to review and more likely to get stuck.
- Describe **what changed and why**, not just what — "why" is what future
  readers (including future-you) actually need.
- Call out anything you're unsure about or didn't test, rather than staying
  silent on it.
- Link the issue it closes, if any (`Closes #12`).

## Reporting bugs / requesting features

Open a GitHub issue with:
- What you expected vs. what happened (for bugs)
- Steps to reproduce, if applicable
- Which part of the app (frontend page, or backend route) it affects

## Good first contributions

If you want to start somewhere concrete rather than picking your own task:

- **Add a real test suite.** Section 11 of the engineering guidelines
  documents the intended testing standard (Jest + supertest, prioritizing
  auth and ownership/403 paths) — none of it is implemented yet.
- **Set up CI.** A GitHub Actions workflow that runs `npm run lint` +
  `npm run build` on every PR would have caught several bugs found during
  this project's pre-deployment review before they ever reached a human.
- Check the [Future Scope](README.md#future-scope) section in the README for
  larger feature ideas.

## Questions

Open an issue, or reach the maintainer directly — see the Contact section in
the [README](README.md).
