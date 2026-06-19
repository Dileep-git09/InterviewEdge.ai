// Curated interview prep "kit" — inspired by topic-based kits, but multi-domain
// so it works for any role this app supports. Each topic can spin up a real
// AI-generated practice session via the existing generate-questions flow.
//
// `companyPct` is an illustrative "asked by ~X% of companies" stat (for the UI).
// `role` / `topicsToFocus` are passed to the AI when starting a session.

export const PREP_CATEGORIES = [
  { id: "all",        label: "All Topics" },
  { id: "dsa",        label: "Data Structures & Algorithms" },
  { id: "frontend",   label: "Frontend" },
  { id: "backend",    label: "Backend" },
  { id: "system",     label: "System Design" },
  { id: "behavioral", label: "Behavioral" },
];

export const PREP_TOPICS = [
  // ── DSA ──────────────────────────────────────────────────────────────────
  { id: "arrays", title: "Arrays & Hashing", category: "dsa", difficulty: "easy", companyPct: 70,
    blurb: "Two pointers, sliding window, prefix sums and hashmap patterns.",
    role: "Software Engineer", topicsToFocus: "Arrays, Hashing, Two Pointers, Sliding Window" },
  { id: "strings", title: "String Manipulation", category: "dsa", difficulty: "easy", companyPct: 55,
    blurb: "Parsing, pattern matching, anagrams and in-place transforms.",
    role: "Software Engineer", topicsToFocus: "Strings, Pattern Matching, Anagrams" },
  { id: "dp", title: "Dynamic Programming", category: "dsa", difficulty: "hard", companyPct: 40,
    blurb: "Memoization, tabulation, knapsack and sequence DP.",
    role: "Software Engineer", topicsToFocus: "Dynamic Programming, Memoization, Tabulation" },
  { id: "graphs", title: "Graphs & Traversal", category: "dsa", difficulty: "hard", companyPct: 35,
    blurb: "BFS, DFS, shortest paths, topological sort and union-find.",
    role: "Software Engineer", topicsToFocus: "Graphs, BFS, DFS, Shortest Path, Union Find" },
  { id: "trees", title: "Trees & BST", category: "dsa", difficulty: "medium", companyPct: 45,
    blurb: "Traversals, balanced trees, tries and recursion on trees.",
    role: "Software Engineer", topicsToFocus: "Binary Trees, BST, Tries, Recursion" },

  // ── Frontend ───────────────────────────────────────────────────────────────
  { id: "react", title: "React & Hooks", category: "frontend", difficulty: "medium", companyPct: 60,
    blurb: "Hooks, reconciliation, performance and component patterns.",
    role: "Frontend Developer", topicsToFocus: "React, Hooks, Reconciliation, Performance" },
  { id: "js-core", title: "JavaScript Core", category: "frontend", difficulty: "medium", companyPct: 65,
    blurb: "Closures, event loop, promises, prototypes and `this`.",
    role: "Frontend Developer", topicsToFocus: "Closures, Event Loop, Promises, Prototypes" },
  { id: "css", title: "CSS & Responsive UI", category: "frontend", difficulty: "easy", companyPct: 40,
    blurb: "Flexbox, grid, specificity, responsive and accessibility.",
    role: "Frontend Developer", topicsToFocus: "CSS, Flexbox, Grid, Responsive Design, Accessibility" },

  // ── Backend ──────────────────────────────────────────────────────────────
  { id: "node-api", title: "Node.js & REST APIs", category: "backend", difficulty: "medium", companyPct: 50,
    blurb: "Express, middleware, auth, error handling and validation.",
    role: "Backend Developer", topicsToFocus: "Node.js, Express, REST, Authentication, Middleware" },
  { id: "databases", title: "Databases & SQL", category: "backend", difficulty: "medium", companyPct: 55,
    blurb: "Indexing, joins, transactions, normalization and NoSQL.",
    role: "Backend Developer", topicsToFocus: "SQL, Indexing, Transactions, Normalization, NoSQL" },
  { id: "concurrency", title: "Concurrency & Async", category: "backend", difficulty: "hard", companyPct: 30,
    blurb: "Threads, locks, async patterns, queues and race conditions.",
    role: "Backend Developer", topicsToFocus: "Concurrency, Async, Queues, Race Conditions" },

  // ── System Design ───────────────────────────────────────────────────────────
  { id: "sysdesign", title: "System Design Basics", category: "system", difficulty: "hard", companyPct: 48,
    blurb: "Scaling, caching, load balancing, sharding and CAP.",
    role: "Software Engineer", topicsToFocus: "System Design, Scaling, Caching, Load Balancing, CAP" },
  { id: "api-design", title: "API & Architecture", category: "system", difficulty: "medium", companyPct: 38,
    blurb: "REST vs gRPC, rate limiting, idempotency and versioning.",
    role: "Software Engineer", topicsToFocus: "API Design, gRPC, Rate Limiting, Idempotency" },

  // ── Behavioral ─────────────────────────────────────────────────────────────
  { id: "behavioral", title: "Behavioral (STAR)", category: "behavioral", difficulty: "easy", companyPct: 90,
    blurb: "Leadership, conflict, ownership and the STAR framework.",
    role: "Software Engineer", topicsToFocus: "Behavioral, STAR Method, Leadership, Conflict Resolution" },
  { id: "hr-round", title: "HR & Culture Fit", category: "behavioral", difficulty: "easy", companyPct: 85,
    blurb: "Strengths, motivations, salary talk and company fit.",
    role: "Software Engineer", topicsToFocus: "HR Questions, Strengths, Motivation, Culture Fit" },
];
