import React, { useState } from "react";
import { Link } from "react-router-dom";
import { LuMail, LuLoader, LuArrowRight, LuCheck } from "react-icons/lu";
import { API_PATHS } from "../../utils/apiPaths";
import axiosInstance from "../../utils/axiosinstance";
import AuthLayout from "../../components/Auth/AuthLayout";
import Button from "../../components/ui/Button";

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEmail(email)) return setError("Please enter a valid email address.");

    setError(null);
    setLoading(true);
    try {
      await axiosInstance.post(API_PATHS.AUTH.FORGOT_PASSWORD, { email });
      // Always shown regardless of whether the email exists — the backend
      // responds identically either way so this page can't be used to probe
      // for registered accounts.
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout>
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
          <LuCheck size={26} />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 text-center">Check your email</h1>
        <p className="text-sm text-slate-500 mt-2 text-center">
          If an account exists for <strong>{email}</strong>, we've sent a link to reset your password.
          It expires in 1 hour.
        </p>
        <Link to="/login" className="block mt-6 text-sm font-semibold text-indigo-600 hover:underline text-center">
          Back to login
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-extrabold text-slate-900">Forgot your password?</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">
        Enter your email and we'll send you a link to reset it.
      </p>

      {error && (
        <div className="mb-4 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
          <div className="relative">
            <LuMail size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? <><LuLoader size={18} className="animate-spin" /> Sending…</> : <>Send reset link <LuArrowRight size={17} /></>}
        </Button>
      </form>

      <p className="mt-6 text-sm text-slate-500 text-center">
        Remembered it?{" "}
        <Link to="/login" className="font-semibold text-indigo-600 hover:underline">Back to login</Link>
      </p>
    </AuthLayout>
  );
};

export default ForgotPassword;
