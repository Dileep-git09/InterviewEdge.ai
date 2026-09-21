// Jest global setup — one in-memory MongoDB instance shared across the whole
// test run (mongodb-memory-server). No real Atlas connection, no network,
// nothing to clean up afterward, safe to run in CI with zero secrets.
process.env.JWT_SECRET = "test-jwt-secret-do-not-use-in-prod";
process.env.NODE_ENV = "test";
// The auth brute-force limiter is per-IP; every request in a supertest run
// shares one "IP", so a test file with more than 10 register/login calls
// would otherwise start rate-limiting the test suite itself.
process.env.AUTH_RATE_LIMIT_MAX = "1000";

const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}, 60000);

afterEach(async () => {
  // Clean slate between tests — each test starts with an empty DB.
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongod) await mongod.stop();
});
