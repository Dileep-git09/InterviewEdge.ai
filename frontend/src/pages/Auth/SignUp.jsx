import React, { useContext, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LuUser, LuMail, LuLock, LuEye, LuEyeOff, LuLoader, LuArrowRight } from "react-icons/lu";
import { API_PATHS } from "../../utils/apiPaths";
import axiosInstance from "../../utils/axiosinstance";
import { UserContext } from "../../context/userContext";
import AuthLayout from "../../components/Auth/AuthLayout";
import Button from "../../components/ui/Button";

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const SignUp = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { updateUser, user } = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user || localStorage.getItem("token")) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) return setError("Please fill in all fields.");
    if (!isEmail(email)) return setError("Please enter a valid email address.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");

    setError(null);
    setLoading(true);
    try {
      const response = await axiosInstance.post(API_PATHS.AUTH.REGISTER, { name, email, password });
      const { token } = response.data;
      if (token) {
        localStorage.setItem("token", token);
        updateUser(response.data);
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-extrabold text-slate-900">Create your account</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">Start preparing in under a minute — it&apos;s free.</p>

      {error && (
        <div className="mb-4 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <form onSubmit={handleSignUp} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Full name</label>
          <div className="relative">
            <LuUser size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text" autoComplete="name" placeholder="Jane Doe"
              value={name} onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
          <div className="relative">
            <LuMail size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email" autoComplete="email" placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
          <div className="relative">
            <LuLock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showPw ? "text" : "password"} autoComplete="new-password" placeholder="Min 8 characters"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button type="button" onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showPw ? <LuEyeOff size={17} /> : <LuEye size={17} />}
            </button>
          </div>
          {password && (
            <p className={`text-xs mt-1.5 ${password.length >= 8 ? "text-emerald-600" : "text-amber-600"}`}>
              {password.length >= 8 ? "Strong enough ✓" : "Use at least 8 characters"}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? <><LuLoader size={18} className="animate-spin" /> Creating account…</> : <>Create account <LuArrowRight size={17} /></>}
        </Button>
      </form>

      <p className="mt-6 text-sm text-slate-500 text-center">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-indigo-600 hover:underline">Log in</Link>
      </p>
    </AuthLayout>
  );
};

export default SignUp;
