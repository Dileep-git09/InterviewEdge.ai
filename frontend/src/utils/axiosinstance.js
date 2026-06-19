import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URL } from "./apiPaths";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 80000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ── Request Interceptor — attach the JWT ──────────────────────────────────────
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("token");
    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor — centralized failure handling ───────────────────────
// Gives the user real feedback for every common failure mode instead of failing
// silently. Each call site can still catch the rejected promise for its own UX.
const AUTH_PATHS = ["/login", "/signup"];

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status } = error.response;
      const onAuthPage = AUTH_PATHS.some((p) => window.location.pathname.startsWith(p));

      if (status === 401) {
        // Session expired / invalid — clear token and bounce to login once.
        localStorage.removeItem("token");
        if (!onAuthPage) {
          toast.error("Your session has expired. Please log in again.");
          window.location.assign("/login");
        }
      } else if (status === 403) {
        // Authorization failure — e.g. trying to access another user's resource.
        toast.error("You don't have permission to do that.");
      } else if (status === 429) {
        toast.error(error.response.data?.message || "Too many requests. Please slow down.");
      } else if (status >= 500) {
        toast.error("Something went wrong on our end. Please try again shortly.");
      }
    } else if (error.code === "ECONNABORTED") {
      toast.error("The request timed out. Please try again.");
    } else if (error.message === "Network Error") {
      toast.error("Can't reach the server. Check your connection and try again.");
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
