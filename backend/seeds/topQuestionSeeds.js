const TopQuestion = require("../models/TopQuestion");

// ─────────────────────────────────────────────────────────────────────────────
// seedTopQuestions
//
// Pre-populates the TopQuestion collection with real-world scenario questions
// for the most common roles. This solves the cold start problem — the feature
// works on day one with zero users.
//
// baseScore: 50 — gives seeded questions a head start over community questions.
// As users pin questions, community scores climb and the best ones surface.
//
// Run once: node seeds/topQuestionSeeds.js
// Safe to run multiple times — uses upsert so it won't create duplicates.
// ─────────────────────────────────────────────────────────────────────────────

const SEEDS = [
  // ── Frontend Developer ──────────────────────────────────────────────────
  {
    role: "frontend developer",
    baseScore: 50,
    tags: ["scenario", "technical"],
    questions: [
      {
        question:
          "You notice your React app re-renders 200+ components on a single button click. How do you diagnose and fix this?",
        answer:
          "I would start by using React DevTools Profiler to identify which components are re-rendering unnecessarily. Common causes are prop reference changes — objects or arrays created inline in JSX — which break shallow equality checks. I would wrap expensive components with React.memo, use useCallback for event handlers passed as props, and useMemo for derived data. If the issue is state updates triggering a large tree, I would consider splitting the context or moving state closer to where it is actually used.",
      },
      {
        question:
          "A client reports that their e-commerce site scores 32 on Google Lighthouse. What is your step-by-step performance improvement plan?",
        answer:
          "I would start with the Lighthouse report itself, focusing on the three biggest wins: Largest Contentful Paint, Total Blocking Time, and Cumulative Layout Shift. For LCP I would audit image sizes and implement next-gen formats like WebP, add lazy loading for below-the-fold images, and ensure hero images are preloaded. For TBT I would code-split large JS bundles using dynamic imports, defer non-critical scripts, and remove unused dependencies. For CLS I would add explicit width and height to all images and avoid inserting content above existing content. I would also enable gzip or Brotli compression on the server and add a CDN in front of static assets.",
      },
      {
        question:
          "How would you implement role-based access control on the frontend without exposing sensitive logic to the client?",
        answer:
          "The key principle is that the frontend RBAC is purely for UX — hiding buttons and routes — never for security. Real access control must always be enforced on the backend. On the frontend I would store the user's role in a context after login, use a ProtectedRoute wrapper component that checks the role before rendering a page, and conditionally render UI elements. I would never store sensitive data in the client based on role. Every API call that requires a privilege must be protected server-side regardless of what the frontend shows.",
      },
    ],
  },

  // ── Backend Developer ───────────────────────────────────────────────────
  {
    role: "backend developer",
    baseScore: 50,
    tags: ["scenario", "technical"],
    questions: [
      {
        question:
          "Your Node.js API is handling 10,000 requests per second and latency spikes to 8 seconds under load. Walk me through how you debug and resolve this.",
        answer:
          "I would start by profiling the event loop using clinic.js or node --prof to find blocking synchronous operations. Common culprits are synchronous file reads, CPU-heavy JSON parsing, or missing database indexes causing full collection scans. I would check MongoDB's slow query log and add indexes for frequently queried fields. If the bottleneck is I/O-bound, I would add Redis caching in front of hot database queries. If it's CPU-bound, I would offload the work to worker threads or a separate microservice. Finally I would add horizontal scaling behind a load balancer and ensure connection pooling is configured correctly.",
      },
      {
        question:
          "Design a rate limiter for an API endpoint that must allow 100 requests per minute per user and be distributed across 3 servers.",
        answer:
          "A distributed rate limiter requires shared state — a single server counter won't work across 3 nodes. I would use Redis with the sliding window counter algorithm. For each request I would increment a key like rate:userId:currentMinute with an INCR command and set a 60-second TTL on first write. If the count exceeds 100 I return a 429 Too Many Requests with a Retry-After header. Because all 3 servers share the same Redis instance, the count is consistent. For higher accuracy I would use Redis' sorted sets for a true sliding window instead of fixed-minute buckets.",
      },
      {
        question:
          "A critical security audit reveals that your REST API exposes internal database IDs in URLs. What is the risk and how do you fix it?",
        answer:
          "Exposing sequential MongoDB ObjectIDs or auto-increment integers lets attackers enumerate resources — they can guess other users' resource IDs and attempt unauthorised access. The immediate fix is ensuring every endpoint verifies ownership: the requesting user's ID must match the resource's owner field, not just check that the resource exists. For the IDs themselves I would switch to UUIDs or Hashids to make enumeration infeasible. I would also add rate limiting to prevent brute-force attempts even with random IDs.",
      },
    ],
  },

  // ── Full Stack Developer ────────────────────────────────────────────────
  {
    role: "full stack developer",
    baseScore: 50,
    tags: ["scenario", "system-design"],
    questions: [
      {
        question:
          "Design a real-time notification system for a social platform with 500,000 active users. What stack would you choose and why?",
        answer:
          "For 500k concurrent users I would not use polling — it does not scale. I would use WebSockets via Socket.IO for real-time delivery, with Redis Pub/Sub as the message broker so notifications published on any server node fan out to all connected clients. Each server subscribes to a Redis channel and forwards messages to the relevant connected sockets. For persistence I would store notifications in MongoDB with a read/unread flag, so users who are offline can retrieve them on login. The socket layer would be horizontally scaled behind a load balancer with sticky sessions. For very high throughput I would evaluate moving to a dedicated message queue like Bull with Redis.",
      },
      {
        question:
          "Your authentication tokens are being stolen and used from different IPs. How do you detect and prevent session hijacking?",
        answer:
          "JWT tokens alone cannot be revoked once issued. My defence would be layered. First I would add refresh token rotation — short-lived access tokens (15 min) with long-lived refresh tokens stored in HttpOnly cookies that cannot be read by JavaScript. On each refresh I would issue a new refresh token and invalidate the old one in Redis. Second I would store the issuing IP and user agent in the token payload and compare on each request — a significant mismatch triggers re-authentication. Third I would implement anomaly detection: if the same token is used from two different continents within minutes, invalidate it immediately and alert the user.",
      },
    ],
  },

  // ── Data Scientist ──────────────────────────────────────────────────────
  {
    role: "data scientist",
    baseScore: 50,
    tags: ["scenario", "ml"],
    questions: [
      {
        question:
          "Your fraud detection model has 99% accuracy but the business says it is useless. What is happening and how do you fix it?",
        answer:
          "This is the classic imbalanced class problem. If only 0.5% of transactions are fraudulent, a model that predicts 'not fraud' for every single transaction achieves 99.5% accuracy while catching zero fraud. Accuracy is the wrong metric here. I would switch to precision, recall, and F1-score, focusing on recall for the fraud class — we want to catch as many fraudulent transactions as possible even at the cost of some false positives. I would address the imbalance using SMOTE for oversampling the minority class, adjust class weights in the model, use an anomaly detection approach, or use a cost-sensitive learning framework that penalises missing a fraud case more heavily than a false alarm.",
      },
      {
        question:
          "How would you explain to a non-technical executive why your churn prediction model is right 78% of the time but the business outcome improved by only 3%?",
        answer:
          "Model accuracy and business impact are different problems. A few things could explain the gap: the model might be predicting churn correctly but the retention interventions being triggered are ineffective or too late. The model might have high accuracy on easy cases but miss the high-value customers who churn. Or the model's predictions are not being acted upon in real time. I would move the conversation from model metrics to business metrics: which customers were predicted to churn, which were contacted, and what was their conversion rate on the retention offer? This audit usually reveals whether the gap is in the model, the intervention, or the operational process.",
      },
    ],
  },

  // ── DevOps Engineer ─────────────────────────────────────────────────────
  {
    role: "devops engineer",
    baseScore: 50,
    tags: ["scenario", "infrastructure"],
    questions: [
      {
        question:
          "Production is down. The deployment you made 20 minutes ago is suspected. What is your immediate response?",
        answer:
          "The first priority is restoring service, not finding the root cause. I would immediately trigger a rollback to the previous known-good deployment — in Kubernetes this is kubectl rollout undo deployment/app, in most CI/CD pipelines there is a one-click rollback. While the rollback deploys I would check application logs and error rates in the monitoring dashboard to confirm the rollback fixes the issue. Only after service is restored do I start the post-mortem: diff the deployment, check for database migrations that cannot be rolled back, review what changed in configuration. I would document the timeline and run a blameless post-mortem with the team.",
      },
      {
        question:
          "How would you design a CI/CD pipeline for a microservices application with 12 services where a bug in one service must not block deployments of the others?",
        answer:
          "Each service needs an independent pipeline. I would structure the repository as a monorepo with path-based pipeline triggers — a change to service-A only triggers service-A's pipeline, leaving all other services unaffected. Each pipeline runs: lint → unit tests → build Docker image → push to registry → deploy to staging → run integration tests → deploy to production with a canary rollout. Services communicate via versioned APIs or events, so I would also run a contract test stage using Pact to catch interface breakages before they reach production. Deployment is independent per service, so a failing service-A pipeline has no effect on service-B through service-L.",
      },
    ],
  },

  // ── Product Manager ─────────────────────────────────────────────────────
  {
    role: "product manager",
    baseScore: 50,
    tags: ["scenario", "behavioural"],
    questions: [
      {
        question:
          "Engineering says a feature will take 3 months. The CEO wants it in 3 weeks. How do you handle this?",
        answer:
          "I would not simply relay the CEO's demand to engineering — that destroys trust. Instead I would first understand what outcome the CEO actually needs from the feature and by when. Often the underlying goal can be partially achieved with a smaller scope. I would work with engineering to identify what a meaningful slice of the feature would look like in 3 weeks — the smallest version that delivers value. I would present both options to the CEO with clear trade-offs: the 3-week version delivers X, the 3-month version delivers X plus Y and Z. If the CEO still insists on 3 weeks, I would escalate the resource constraint — can we bring in additional engineers, de-prioritise other work, or buy a third-party solution?",
      },
      {
        question:
          "Two of your top-priority features are in direct conflict for engineering resources. How do you decide which one to build first?",
        answer:
          "I would use a structured prioritisation framework rather than gut feel or whoever shouts loudest. My preferred approach is an impact vs effort matrix combined with RICE scoring — Reach, Impact, Confidence, and Effort. I would gather data: how many users does each feature serve, what is the measurable business impact (revenue, retention, acquisition), how confident am I in that estimate, and what is the engineering effort? I would also consider strategic alignment — which feature advances the company's north star metric this quarter? After the analysis I would bring both stakeholders together, walk through the data, and make the decision transparent so whoever's feature is deprioritised understands the reasoning and the timeline.",
      },
    ],
  },

  // ── Teacher / Educator ──────────────────────────────────────────────────
  {
    role: "teacher",
    baseScore: 50,
    tags: ["scenario", "behavioural"],
    questions: [
      {
        question:
          "A student consistently scores below average despite attending every class and seemingly paying attention. What do you do?",
        answer:
          "Attending class and understanding the material are different things. I would start with a private one-on-one conversation with the student to understand their experience — do they feel lost, are they struggling with specific concepts, or is something outside the classroom affecting them? I would review their work carefully to identify where the gaps are rather than just noting that marks are low. I might try a different teaching approach for that student — some learners respond better to visual explanations, worked examples, or peer learning. I would also involve the parents or guardians early if the student is young, and refer to a learning support specialist if I suspect an underlying learning difference.",
      },
      {
        question:
          "Describe how you would teach a complex concept to a class where half the students are advanced and half are struggling with basics.",
        answer:
          "This is a differentiated instruction challenge. I would structure the lesson in layers. I would start with the foundational concept in a concrete, relatable way that anchors all students — a real-world analogy or demonstration. Then I would use collaborative grouping, pairing stronger students with those who are struggling, which reinforces the advanced students' understanding while supporting others. I would provide tiered tasks: the core task is accessible to everyone, extension tasks challenge the advanced students further. I would circulate and spend more one-on-one time with struggling students during independent work time. The goal is that every student makes progress from where they are, not that everyone reaches the same point in the same lesson.",
      },
    ],
  },

  // ── Civil Engineer ──────────────────────────────────────────────────────
  {
    role: "civil engineer",
    baseScore: 50,
    tags: ["scenario", "technical"],
    questions: [
      {
        question:
          "During construction you discover the soil bearing capacity is 30% lower than the geotechnical report indicated. What do you do?",
        answer:
          "This is a safety-critical situation that requires immediate action. I would halt the relevant construction activities and notify the project manager and structural engineer on record immediately. I would commission additional soil investigation — further bore holes and lab testing — to understand the extent of the discrepancy. While waiting for results I would not allow any further loading of the affected area. Once we have accurate data I would work with the structural engineer to assess whether the original foundation design can be modified — options include widening footings to distribute load, using a raft foundation, deep pile foundations, or ground improvement techniques like compaction grouting. All changes would be formally documented and approved before resuming work. I would also review the original geotechnical report to understand why the discrepancy occurred.",
      },
      {
        question:
          "You are managing a bridge rehabilitation project and discover mid-project that the original structural drawings do not match the as-built condition. How do you proceed?",
        answer:
          "The as-built condition is the reality we must work with, not the drawings. I would immediately commission a full structural survey of the actual bridge — measured drawings, material testing if possible, and load capacity assessment based on what is actually there. I would suspend any work that assumes the original drawing dimensions until we have clarity. The structural assessment may reveal that the as-built condition is actually adequate, requires minor modifications to the rehabilitation scope, or has a fundamental issue that requires redesign. All of this gets formally documented and the client and relevant authorities are notified. I would also investigate whether the discrepancy has regulatory implications — some jurisdictions require as-built conditions to be re-certified.",
      },
    ],
  },
];

const seedTopQuestions = async () => {
  console.log("Seeding top questions...");
  let total = 0;

  for (const roleData of SEEDS) {
    for (const q of roleData.questions) {
      const score = roleData.baseScore; // starts at base, cron will add community pins

      await TopQuestion.findOneAndUpdate(
        { role: roleData.role, question: q.question },
        {
          $setOnInsert: {
            role:           roleData.role,
            question:       q.question,
            answer:         q.answer,
            baseScore:      roleData.baseScore,
            uniqueUserPins: 0,
            score,
            source:         "seeded",
            tags:           roleData.tags || [],
          },
        },
        { upsert: true, new: true }
      );
      total++;
    }
  }

  console.log(`Seeded ${total} top questions across ${SEEDS.length} roles.`);
};

module.exports = { seedTopQuestions };