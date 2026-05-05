import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import axios from "axios";
import { serverUrl } from "../App";
import { Link, useNavigate } from "react-router-dom";

// ─── Shared password rules (mirror these in the backend) ─────────────────────
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]).{8,}$/;

const validatePassword = (pwd) => {
  if (!pwd) return "Password is required.";
  if (pwd.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pwd)) return "Password must include at least one uppercase letter.";
  if (!/[a-z]/.test(pwd)) return "Password must include at least one lowercase letter.";
  if (!/\d/.test(pwd)) return "Password must include at least one number.";
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd))
    return "Password must include at least one special character (!@#$%^&* etc).";
  return null; // valid
};

// ─── Step constants ────────────────────────────────────────────────────────────
const STEP = { EMAIL: "email", OTP: "otp", RESET: "reset", SUCCESS: "success" };

// ─── Progress bar at top of card ──────────────────────────────────────────────
const steps = [STEP.EMAIL, STEP.OTP, STEP.RESET];
function ProgressBar({ current }) {
  const idx = steps.indexOf(current);
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
              i <= idx ? "bg-white" : "bg-white/15"
            }`}
          />
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Shared error display ──────────────────────────────────────────────────────
function ErrorBox({ message }) {
  return (
    <motion.p
      key={message}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
    >
      {message}
    </motion.p>
  );
}

// ─── Shared input ─────────────────────────────────────────────────────────────
function InputField({ label, type = "text", value, onChange, placeholder, children }) {
  return (
    <div>
      <label className="block text-sm text-gray-300 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3
            text-white placeholder-gray-500 text-sm pr-12
            focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
        />
        {children}
      </div>
    </div>
  );
}

// ─── Password strength indicator ──────────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ["", "Weak", "Fair", "Good", "Strong", "Very strong"];
  const colors = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-green-500"];
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? colors[score] : "bg-white/10"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${score >= 4 ? "text-green-400" : "text-gray-500"}`}>
        {score > 0 ? labels[score] : ""}
      </p>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(STEP.EMAIL);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Tracks that OTP was verified on the client — gate for rendering reset form
  const [otpVerified, setOtpVerified] = useState(false);

  const clearError = () => setError("");

  // ── STEP 1: Send OTP ──────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setLoading(true); clearError();
    try {
      await axios.post(serverUrl + "/api/auth/send-otp", { email: email.trim() });
      setOtp("");
      setStep(STEP.OTP);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 2: Verify OTP only — no password fields until this succeeds ──────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) { setError("Please enter the full 6-digit OTP."); return; }
    setLoading(true); clearError();
    try {
      await axios.post(serverUrl + "/api/auth/verify-otp", { email, otp });
      setOtpVerified(true);
      setNewPassword("");
      setConfirmPassword("");
      setStep(STEP.RESET);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 3: Reset Password — only reachable after OTP verified ────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();

    // Guard: should never happen but prevents direct URL tricks
    if (!otpVerified) {
      setError("OTP verification required. Please start over.");
      setStep(STEP.EMAIL);
      return;
    }

    const pwdError = validatePassword(newPassword);
    if (pwdError) { setError(pwdError); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }

    setLoading(true); clearError();
    try {
      await axios.post(serverUrl + "/api/auth/reset-password", {
        email,
        otp,
        newPassword,
      });
      setStep(STEP.SUCCESS);
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP helper ─────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    setLoading(true); clearError(); setOtp("");
    try {
      await axios.post(serverUrl + "/api/auth/send-otp", { email });
      setError(""); // clear any previous
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      {/* Branding */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 text-center"
      >
        <h1 className="text-3xl font-extrabold text-gray-900">ExamNotes AI</h1>
        <p className="text-sm text-gray-500 mt-1">AI-powered exam-oriented notes & revision</p>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full max-w-md rounded-2xl
          bg-gradient-to-br from-black/90 via-black/85 to-black/90
          border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.4)]
          px-8 py-10 text-white"
      >
        {/* Progress bar (hidden on success screen) */}
        {step !== STEP.SUCCESS && <ProgressBar current={step} />}

        <AnimatePresence mode="wait">

          {/* ════════════ STEP 1: EMAIL ════════════ */}
          {step === STEP.EMAIL && (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-2xl font-bold mb-1">Forgot password?</h2>
              <p className="text-gray-400 text-sm mb-8">
                Enter your account email and we'll send a 6-digit code to reset your password.
              </p>

              <form onSubmit={handleSendOtp} className="space-y-4">
                <InputField
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError(); }}
                  placeholder="you@example.com"
                />
                {error && <ErrorBox message={error} />}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full bg-white text-black font-semibold rounded-xl py-3
                    hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending…" : "Send OTP"}
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* ════════════ STEP 2: OTP VERIFY (no password fields) ════════════ */}
          {step === STEP.OTP && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-2xl font-bold mb-1">Check your email</h2>
              <p className="text-gray-400 text-sm mb-1">We sent a 6-digit code to</p>
              <p className="text-white font-semibold text-sm mb-8 truncate">{email}</p>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Enter OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); clearError(); }}
                    placeholder="• • • • • •"
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-4
                      text-white placeholder-gray-600 text-3xl font-bold tracking-[0.6em]
                      text-center focus:outline-none focus:border-white/40 focus:bg-white/10
                      transition-all"
                  />
                  <p className="text-gray-500 text-xs mt-2 text-center">
                    Code expires in 10 minutes
                  </p>
                </div>

                {error && <ErrorBox message={error} />}

                <motion.button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full bg-white text-black font-semibold rounded-xl py-3
                    hover:bg-gray-100 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? "Verifying…" : "Verify OTP"}
                </motion.button>

                <div className="flex justify-between items-center pt-1">
                  <button
                    type="button"
                    onClick={() => { setStep(STEP.EMAIL); clearError(); setOtp(""); }}
                    className="text-gray-500 text-sm hover:text-gray-300 transition-colors"
                  >
                    ← Change email
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="text-gray-400 text-sm hover:text-white transition-colors
                      disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Resend code
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ════════════ STEP 3: NEW PASSWORD (only after OTP verified) ════════════ */}
          {step === STEP.RESET && (
            <motion.div
              key="reset"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-2xl font-bold mb-1">Set new password</h2>
              <p className="text-gray-400 text-sm mb-8">
                OTP verified ✓ — Choose a strong password for your account.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* New password */}
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">New password</label>
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); clearError(); }}
                      placeholder="Min 8 chars, A-Z, 0-9, symbol"
                      className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 pr-12
                        text-white placeholder-gray-500 text-sm
                        focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((p) => !p)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                    >
                      {showNew ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                    </button>
                  </div>
                  <PasswordStrength password={newPassword} />
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Confirm password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); clearError(); }}
                      placeholder="Re-enter your new password"
                      className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 pr-12
                        text-white placeholder-gray-500 text-sm
                        focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((p) => !p)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                    >
                      {showConfirm ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                    </button>
                  </div>
                  {/* Live match indicator */}
                  {confirmPassword && (
                    <p className={`text-xs mt-1.5 ${
                      newPassword === confirmPassword ? "text-green-400" : "text-red-400"
                    }`}>
                      {newPassword === confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                    </p>
                  )}
                </div>

                {/* Password rules hint */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-gray-400 space-y-1">
                  <p className="font-medium text-gray-300 mb-1">Password must have:</p>
                  {[
                    ["At least 8 characters", newPassword.length >= 8],
                    ["One uppercase letter (A–Z)", /[A-Z]/.test(newPassword)],
                    ["One lowercase letter (a–z)", /[a-z]/.test(newPassword)],
                    ["One number (0–9)", /\d/.test(newPassword)],
                    ["One special character (!@#$%…)", /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(newPassword)],
                  ].map(([rule, met]) => (
                    <p key={rule} className={met ? "text-green-400" : "text-gray-500"}>
                      {met ? "✓" : "○"} {rule}
                    </p>
                  ))}
                </div>

                {error && <ErrorBox message={error} />}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full bg-white text-black font-semibold rounded-xl py-3
                    hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Resetting…" : "Reset Password"}
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* ════════════ STEP 4: SUCCESS ════════════ */}
          {step === STEP.SUCCESS && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
              className="text-center py-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
                className="text-6xl mb-5"
              >
                ✅
              </motion.div>
              <h2 className="text-2xl font-bold mb-2">Password updated!</h2>
              <p className="text-gray-400 text-sm mb-8">
                Your password has been reset successfully. You can now sign in with your new password.
              </p>
              <motion.button
                onClick={() => navigate("/login")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-white text-black font-semibold rounded-xl py-3
                  hover:bg-gray-100 transition-all"
              >
                Go to Login
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>

        {step !== STEP.SUCCESS && (
          <p className="text-center text-gray-500 text-sm mt-6">
            Remember your password?{" "}
            <Link to="/login" className="text-white font-medium hover:underline">
              Sign in
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}

export default ForgotPassword;