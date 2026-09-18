export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const API_PATHS = {
  AUTH: {
    REGISTER:        "/api/auth/register",
    LOGIN:           "/api/auth/login",
    GET_PROFILE:     "/api/auth/profile",
    UPDATE_PROFILE:  "/api/auth/profile",       // PUT — update name & email
    CHANGE_PASSWORD: "/api/auth/change-password", // PUT — change password
    LOGOUT_ALL:      "/api/auth/logout-all",     // POST — invalidate every issued token
  },
  IMAGE: {
    UPLOAD_IMAGE: "/api/upload-image",
  },
  AI: {
    GENERATE_QUESTIONS:  "/api/ai/generate-questions",
    GENERATE_EXPLANATION:"/api/ai/generate-explanation",
    GENERATE_FROM_RESUME:"/api/ai/generate-from-resume",
  },
  SESSION: {
    CREATE:  "/api/sessions/create",
    GET_ALL: (page = 1, limit = 12) => `/api/sessions/my-sessions?page=${page}&limit=${limit}`,
    GET_ONE: (id) => `/api/sessions/${id}`,
    DELETE:  (id) => `/api/sessions/${id}`,
  },
  QUESTION: {
    ADD_TO_SESSION: "/api/questions/add",
    PIN:        (id) => `/api/questions/${id}/pin`,
    UPDATE_NOTE:(id) => `/api/questions/${id}/note`,
  },
  TOP_QUESTIONS: {
    GET: (role, limit = 10) =>
      `/api/top-questions?role=${encodeURIComponent(role)}&limit=${limit}`,
  },
  MOCK: {
    START:    "/api/mock/start",
    MY:       (page = 1, limit = 10) => `/api/mock/my?page=${page}&limit=${limit}`,
    GET_ONE:  (id) => `/api/mock/${id}`,
    ANSWER:   (id) => `/api/mock/${id}/answer`,
    COMPLETE: (id) => `/api/mock/${id}/complete`,
    DELETE:   (id) => `/api/mock/${id}`,
  },
};
