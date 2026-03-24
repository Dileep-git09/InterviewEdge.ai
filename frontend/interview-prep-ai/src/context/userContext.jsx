import React, { createContext, useState, useEffect } from "react";
import axiosInstance from "../utils/axiosinstance"; // Adjust the path as needed
import { API_PATHS } from "../utils/apiPaths"; // Adjust the path as needed

export const UserContext = createContext();

const UserProvider = ({ children }) => {
  // State for user data, loading status, and error
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch user data
  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(API_PATHS.AUTH.GET_PROFILE);
      setUser(response.data); // Assuming user data is directly in response.data
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
      setUser(null);
      setError(err);

      if (err.response && err.response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login"; // your login route
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to update user data (e.g., after an edit)
  const updateUser = (newUserData) => {
    setUser(newUserData);
    localStorage.setItem("token", newUserData.token);
    setLoading(false);
  };

  // Function to clear user data (e.g., on logout)
  const clearUser = () => {
    setUser(null);
    localStorage.removeItem("token"); // Clear token from local storage on logout
  };

  // Fetch user on component mount (and optionally when the token changes)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchUser();
    } else {
      setLoading(false); // If no token, no need to load user
    }
  }, []); // Empty dependency array means this runs once on mount

  return (
    <UserContext.Provider
      value={{ user, loading, error, updateUser, clearUser, fetchUser }}
    >
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;
