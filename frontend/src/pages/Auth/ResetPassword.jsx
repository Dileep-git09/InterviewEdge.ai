import React, { useContext, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { LuLock, LuEye, LuEyeOff, LuLoader, LuArrowRight } from "react-icons/lu";
import { API_PATHS } from "../../utils/apiPaths";
import axiosInstance from "../../utils/axiosinstance";
import { UserContext } from "../../context/userContext";
import AuthLayout from "../../components/Auth/AuthLayout";
import Button from "../../components/ui/Button";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { updateUser } = useContext(UserContext);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return setError("Password must be at least 6 characters.");
    if (newPassword !== confirmPassword) return setError("Passwords don't match.");

    setError(null);
    setLoading(true);
    try {
      const res = await axiosInstance.post(API_PATHS.AUTH.RESET_PASSWORD(token), { newPassword });
      // Backend logs the user straight in on a successful reset.
      updateUser(res.data);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "This reset link is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-extrabold text-slate-900">Set a new password</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">Choose a new password for your account.</p>

      {error && (
        <div className="mb-4 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">New password</label>
          <div className="relative">
            <LuLock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button type="button" onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showPw ? <LuEyeOff size={17} /> : <LuEye size={17} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm new password</label>
          <div className="relative">
            <LuLock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? <><LuLoader size={18} className="animate-spin" /> Resetting…</> : <>Reset password <LuArrowRight size={17} /></>}
        </Button>
      </form>

      <p className="mt-6 text-sm text-slate-500 text-center">
        <Link to="/login" className="font-semibold text-indigo-600 hover:underline">Back to login</Link>
      </p>
    </AuthLayout>
  );
};

export default ResetPassword;
