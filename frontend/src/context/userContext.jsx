/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect } from "react";
import axiosInstance from "../utils/axiosinstance";
import { API_PATHS } from "../utils/apiPaths";

export const UserContext = createContext();

const UserProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // ── Fetch user profile from the API ──────────────────────────────────────
  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(API_PATHS.AUTH.GET_PROFILE);
      setUser(response.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
      setUser(null);
      setError(err);

      if (err.response && err.response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Update user after login / profile edit ────────────────────────────────
  // BUG FIX: previously this always called localStorage.setItem("token", ...)
  // even when newUserData.token was undefined (e.g. after a profile edit that
  // doesn't return a token). That overwrote the valid token with the string
  // "undefined", logging the user out on the next request.
  //
  // Now we only write to localStorage when a token is actually present.
  const updateUser = (newUserData) => {
    setUser(newUserData);
    if (newUserData?.token) {
      localStorage.setItem("token", newUserData.token);
    }
    setLoading(false);
  };

  // ── Clear user on logout ──────────────────────────────────────────────────
  const clearUser = () => {
    setUser(null);
    localStorage.removeItem("token");
  };

  // ── On mount: if a token exists, fetch the profile ────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <UserContext.Provider
      value={{ user, loading, error, updateUser, clearUser, fetchUser }}
    >
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;
