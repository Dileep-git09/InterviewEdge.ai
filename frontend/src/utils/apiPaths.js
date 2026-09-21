export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// All app routes are versioned server-side under /api/v1 — see backend/server.js.
const V1 = "/api/v1";

export const API_PATHS = {
  AUTH: {
    REGISTER:        `${V1}/auth/register`,
    LOGIN:           `${V1}/auth/login`,
    GET_PROFILE:     `${V1}/auth/profile`,
    UPDATE_PROFILE:  `${V1}/auth/profile`,       // PUT — update name & email
    CHANGE_PASSWORD: `${V1}/auth/change-password`, // PUT — change password
    LOGOUT_ALL:      `${V1}/auth/logout-all`,     // POST — invalidate every issued token
    FORGOT_PASSWORD: `${V1}/auth/forgot-password`, // POST — request a reset link
    RESET_PASSWORD:  (token) => `${V1}/auth/reset-password/${token}`, // POST
    EXPORT_DATA:     `${V1}/auth/export`,          // GET — download all my data
    DELETE_ACCOUNT:  `${V1}/auth/account`,         // DELETE — permanently delete account
  },
  AI: {
    GENERATE_QUESTIONS:  `${V1}/ai/generate-questions`,
    GENERATE_EXPLANATION:`${V1}/ai/generate-explanation`,
    GENERATE_FROM_RESUME:`${V1}/ai/generate-from-resume`,
  },
  SESSION: {
    CREATE:  `${V1}/sessions/create`,
    GET_ALL: (page = 1, limit = 12) => `${V1}/sessions/my-sessions?page=${page}&limit=${limit}`,
    GET_ONE: (id) => `${V1}/sessions/${id}`,
    DELETE:  (id) => `${V1}/sessions/${id}`,
  },
  QUESTION: {
    ADD_TO_SESSION: `${V1}/questions/add`,
    PIN:        (id) => `${V1}/questions/${id}/pin`,
    UPDATE_NOTE:(id) => `${V1}/questions/${id}/note`,
  },
  TOP_QUESTIONS: {
    GET: (role, limit = 10) =>
      `${V1}/top-questions?role=${encodeURIComponent(role)}&limit=${limit}`,
  },
  MOCK: {
    START:    `${V1}/mock/start`,
    MY:       (page = 1, limit = 10) => `${V1}/mock/my?page=${page}&limit=${limit}`,
    GET_ONE:  (id) => `${V1}/mock/${id}`,
    ANSWER:   (id) => `${V1}/mock/${id}/answer`,
    COMPLETE: (id) => `${V1}/mock/${id}/complete`,
    DELETE:   (id) => `${V1}/mock/${id}`,
  },
};
