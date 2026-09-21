import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { LuUser, LuMail, LuLock, LuCheck, LuLoader, LuEye, LuEyeOff, LuLogOut, LuDownload, LuTrash2, LuTrophy } from "react-icons/lu";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/Layouts/DashboardLayout";
import Modal from "../../components/Modal";
import axiosInstance from "../../utils/axiosinstance";
import { API_PATHS } from "../../utils/apiPaths";
import { UserContext } from "../../context/userContext";

// ── Small reusable input with label + optional show/hide toggle ───────────────
const Field = ({ label, icon, type = "text", value, onChange, placeholder, toggle, onToggle, hint }) => {
  const Icon = icon;
  return (
  <div>
    <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
    <div className="relative flex items-center">
      <span className="absolute left-3 text-slate-400">
        <Icon size={16} />
      </span>
      <input
        type={toggle !== undefined ? (toggle ? "text" : "password") : type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
      />
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 text-slate-400 hover:text-slate-600 transition"
          tabIndex={-1}
        >
          {toggle ? <LuEyeOff size={15} /> : <LuEye size={15} />}
        </button>
      )}
    </div>
    {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
  </div>
  );
};

// ── Section card wrapper ──────────────────────────────────────────────────────
const Section = ({ title, subtitle, children }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
    <div className="border-b border-slate-100 pb-4">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

// ── Main page ────────────────────────────────────────────────────────────────
const MyProfile = () => {
  const { user, updateUser, clearUser } = useContext(UserContext);
  const navigate = useNavigate();

  // ── Info section state ────────────────────────────────────────────────────
  const [name, setName]   = useState(user?.name  || "");
  const [email, setEmail] = useState(user?.email || "");
  const [infoLoading, setInfoLoading]   = useState(false);
  const [infoSuccess, setInfoSuccess]   = useState(false);

  // ── Password section state ─────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword]     = useState("");
  const [newPassword, setNewPassword]             = useState("");
  const [confirmPassword, setConfirmPassword]     = useState("");
  const [showCurrent, setShowCurrent]             = useState(false);
  const [showNew, setShowNew]                     = useState(false);
  const [showConfirm, setShowConfirm]             = useState(false);
  const [passLoading, setPassLoading]             = useState(false);
  const [passError, setPassError]                 = useState(null);

  // ── Security section state ────────────────────────────────────────────────
  const [loggingOutAll, setLoggingOutAll]         = useState(false);
  const [exporting, setExporting]                 = useState(false);

  // ── Privacy section state ─────────────────────────────────────────────────
  const [leaderboardOptOut, setLeaderboardOptOut] = useState(user?.leaderboardOptOut ?? false);
  const [savingPreference, setSavingPreference]   = useState(false);

  // ── Danger zone state ─────────────────────────────────────────────────────
  const [deleteModalOpen, setDeleteModalOpen]     = useState(false);
  const [deletePassword, setDeletePassword]       = useState("");
  const [deleteError, setDeleteError]             = useState(null);
  const [deleting, setDeleting]                   = useState(false);

  const avatarLetter = (name || user?.name || "U")[0].toUpperCase();

  // ── Save name + email ─────────────────────────────────────────────────────
  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name cannot be empty."); return; }
    if (!email.trim()) { toast.error("Email cannot be empty."); return; }
    // Simple email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address."); return;
    }

    setInfoLoading(true);
    setInfoSuccess(false);
    try {
      const res = await axiosInstance.put(API_PATHS.AUTH.UPDATE_PROFILE, { name, email });
      updateUser({ ...res.data }); // refresh context (no new token for info-only update)
      setInfoSuccess(true);
      toast.success("Profile updated!");
      setTimeout(() => setInfoSuccess(false), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setInfoLoading(false);
    }
  };

  // ── Change password ───────────────────────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassError(null);

    if (!currentPassword) { setPassError("Enter your current password."); return; }
    if (!newPassword)      { setPassError("Enter a new password."); return; }
    if (newPassword.length < 6) { setPassError("New password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setPassError("Passwords don't match."); return; }
    if (currentPassword === newPassword) { setPassError("New password must differ from current."); return; }

    setPassLoading(true);
    try {
      const res = await axiosInstance.put(API_PATHS.AUTH.CHANGE_PASSWORD, {
        currentPassword,
        newPassword,
      });
      // Changing the password invalidates every previously-issued token
      // (including the one this request used) — store the fresh one the
      // server just issued so this tab stays logged in.
      if (res.data?.token) updateUser({ ...user, token: res.data.token });
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPassError(err.response?.data?.message || "Failed to change password.");
    } finally {
      setPassLoading(false);
    }
  };

  // ── Log out of every device ───────────────────────────────────────────────
  const handleLogoutAll = async () => {
    setLoggingOutAll(true);
    try {
      await axiosInstance.post(API_PATHS.AUTH.LOGOUT_ALL);
      toast.success("Logged out of all devices.");
      clearUser();
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to log out of all devices.");
      setLoggingOutAll(false);
    }
  };

  // ── Download all my data ──────────────────────────────────────────────────
  const handleExportData = async () => {
    setExporting(true);
    try {
      const res = await axiosInstance.get(API_PATHS.AUTH.EXPORT_DATA, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "interviewedge-data-export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Your data export has started downloading.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to export your data.");
    } finally {
      setExporting(false);
    }
  };

  // ── Leaderboard visibility ────────────────────────────────────────────────
  const handleToggleLeaderboard = async () => {
    const next = !leaderboardOptOut;
    setSavingPreference(true);
    try {
      await axiosInstance.put(API_PATHS.AUTH.LEADERBOARD_PREFERENCE, { optOut: next });
      setLeaderboardOptOut(next);
      updateUser({ ...user, leaderboardOptOut: next });
      toast.success(next ? "You're hidden from leaderboards." : "You're visible on leaderboards again.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update your preference.");
    } finally {
      setSavingPreference(false);
    }
  };

  // ── Permanently delete account ────────────────────────────────────────────
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deletePassword) { setDeleteError("Enter your password to confirm."); return; }

    setDeleteError(null);
    setDeleting(true);
    try {
      await axiosInstance.delete(API_PATHS.AUTH.DELETE_ACCOUNT, { data: { password: deletePassword } });
      toast.success("Your account has been deleted.");
      clearUser();
      navigate("/");
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Failed to delete account.");
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout title="My Profile" subtitle="Edit your name, email and password">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Avatar block ── */}
        <div className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="w-16 h-16 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-2xl shadow-md flex-shrink-0">
            {avatarLetter}
          </div>
          <div>
            <p className="font-bold text-slate-900">{user?.name || "—"}</p>
            <p className="text-sm text-slate-400">{user?.email || "—"}</p>
          </div>
        </div>

        {/* ── Name & Email section ── */}
        <Section title="Personal Info" subtitle="Update your display name and email address.">
          <form onSubmit={handleSaveInfo} className="space-y-3">
            <Field
              label="Full Name"
              icon={LuUser}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />
            <Field
              label="Email Address"
              icon={LuMail}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              hint="Changing your email will require you to log in again."
            />
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={infoLoading}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition"
              >
                {infoLoading ? (
                  <><LuLoader size={14} className="animate-spin" /> Saving…</>
                ) : infoSuccess ? (
                  <><LuCheck size={14} /> Saved!</>
                ) : (
                  "Save changes"
                )}
              </button>
            </div>
          </form>
        </Section>

        {/* ── Password section ── */}
        <Section title="Change Password" subtitle="Use a strong password of at least 6 characters.">
          <form onSubmit={handleChangePassword} className="space-y-3">
            <Field
              label="Current Password"
              icon={LuLock}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Your current password"
              toggle={showCurrent}
              onToggle={() => setShowCurrent((v) => !v)}
            />
            <Field
              label="New Password"
              icon={LuLock}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              toggle={showNew}
              onToggle={() => setShowNew((v) => !v)}
            />
            <Field
              label="Confirm New Password"
              icon={LuLock}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              toggle={showConfirm}
              onToggle={() => setShowConfirm((v) => !v)}
            />

            {/* Strength indicator */}
            {newPassword && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => {
                    const score =
                      (newPassword.length >= 6 ? 1 : 0) +
                      (/[A-Z]/.test(newPassword) ? 1 : 0) +
                      (/[0-9]/.test(newPassword) ? 1 : 0) +
                      (/[^A-Za-z0-9]/.test(newPassword) ? 1 : 0);
                    return (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          level <= score
                            ? score <= 1 ? "bg-rose-400"
                              : score <= 2 ? "bg-amber-400"
                              : score <= 3 ? "bg-indigo-400"
                              : "bg-emerald-500"
                            : "bg-slate-100"
                        }`}
                      />
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400">
                  {(() => {
                    const s =
                      (newPassword.length >= 6 ? 1 : 0) +
                      (/[A-Z]/.test(newPassword) ? 1 : 0) +
                      (/[0-9]/.test(newPassword) ? 1 : 0) +
                      (/[^A-Za-z0-9]/.test(newPassword) ? 1 : 0);
                    return s <= 1 ? "Weak" : s <= 2 ? "Fair" : s <= 3 ? "Good" : "Strong";
                  })()}
                </p>
              </div>
            )}

            {passError && (
              <p className="text-xs text-rose-500 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                {passError}
              </p>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={passLoading}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 disabled:opacity-60 transition"
              >
                {passLoading ? (
                  <><LuLoader size={14} className="animate-spin" /> Updating…</>
                ) : (
                  "Change Password"
                )}
              </button>
            </div>
          </form>
        </Section>

        {/* ── Security section ── */}
        <Section title="Security" subtitle="Signed in on a device you don't recognize? End every session at once.">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-slate-400">
              This logs you out here too — you'll need to log in again afterward.
            </p>
            <button
              type="button"
              onClick={handleLogoutAll}
              disabled={loggingOutAll}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-rose-600 bg-rose-50 rounded-xl hover:bg-rose-100 disabled:opacity-60 transition flex-shrink-0"
            >
              {loggingOutAll ? (
                <><LuLoader size={14} className="animate-spin" /> Logging out…</>
              ) : (
                <><LuLogOut size={14} /> Log out of all devices</>
              )}
            </button>
          </div>
        </Section>

        {/* ── Your data ── */}
        <Section title="Your Data" subtitle="Download everything InterviewEdge has stored about you.">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-slate-400">
              Profile, sessions, questions, and mock interview history as one JSON file.
            </p>
            <button
              type="button"
              onClick={handleExportData}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-60 transition flex-shrink-0"
            >
              {exporting ? (
                <><LuLoader size={14} className="animate-spin" /> Preparing…</>
              ) : (
                <><LuDownload size={14} /> Download my data</>
              )}
            </button>
          </div>
        </Section>

        {/* ── Privacy ── */}
        <Section title="Privacy" subtitle="Leaderboards are on by default — your best score per role, shown as a masked name (e.g. “Asha K.”).">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <LuTrophy size={14} className="flex-shrink-0" />
              <span>Appear on public leaderboards</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!leaderboardOptOut}
              disabled={savingPreference}
              onClick={handleToggleLeaderboard}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
                !leaderboardOptOut ? "bg-indigo-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  !leaderboardOptOut ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </Section>

        {/* ── Danger zone ── */}
        <Section title="Danger Zone" subtitle="This cannot be undone.">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-slate-400">
              Permanently deletes your account, sessions, questions, and mock interview history.
            </p>
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition flex-shrink-0"
            >
              <LuTrash2 size={14} /> Delete account
            </button>
          </div>
        </Section>

      </div>

      {/* ── Delete account confirmation ── */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setDeletePassword(""); setDeleteError(null); }}
        title="Delete your account?"
      >
        <p className="text-sm text-slate-500 mb-4">
          This permanently deletes your account and every session, question, and mock interview
          you've created. This can't be undone. Enter your password to confirm.
        </p>
        <form onSubmit={handleDeleteAccount} className="space-y-3">
          <Field
            label="Password"
            icon={LuLock}
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            placeholder="Your current password"
          />
          {deleteError && (
            <p className="text-xs text-rose-500 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
              {deleteError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setDeleteModalOpen(false); setDeletePassword(""); setDeleteError(null); }}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={deleting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 disabled:opacity-60 transition"
            >
              {deleting ? (
                <><LuLoader size={14} className="animate-spin" /> Deleting…</>
              ) : (
                "Permanently delete"
              )}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default MyProfile;
