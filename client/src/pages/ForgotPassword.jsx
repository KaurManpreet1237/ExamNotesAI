import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import axios from "axios";
import { serverUrl } from "../App";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

// ─── Password validator ────────────────────────────────────────────────────────
const validatePassword = (pwd) => {
  if (!pwd) return "Password is required.";
  if (pwd.length < 8) return "At least 8 characters required.";
  if (!/[A-Z]/.test(pwd)) return "Include at least one uppercase letter.";
  if (!/[a-z]/.test(pwd)) return "Include at least one lowercase letter.";
  if (!/\d/.test(pwd)) return "Include at least one number.";
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd))
    return "Include at least one special character.";
  return null;
};

// ─── Step config ──────────────────────────────────────────────────────────────
const STEP = { EMAIL: "email", OTP: "otp", RESET: "reset", SUCCESS: "success" };
const STEPS = [STEP.EMAIL, STEP.OTP, STEP.RESET];

const STEP_META = {
  [STEP.EMAIL]: { label: "Enter Email", icon: "✉" },
  [STEP.OTP]:   { label: "Verify OTP",  icon: "🔑" },
  [STEP.RESET]: { label: "New Password", icon: "🔒" },
};

// ─── Background ───────────────────────────────────────────────────────────────
const AuthBg = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden">
    <div className="absolute inset-0 bg-[#0a0a0b]" />
    <div className="absolute inset-0" style={{
      backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
      backgroundSize: "60px 60px"
    }} />
    <div className="absolute top-0 left-1/3 w-96 h-96 bg-indigo-600/12 rounded-full blur-3xl" />
    <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />
  </div>
);

// ─── Progress stepper ─────────────────────────────────────────────────────────
function StepBar({ current }) {
  const idx = STEPS.indexOf(current);
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                transition-all duration-400
                ${done   ? "bg-indigo-500 text-white"
                : active ? "bg-white text-black ring-2 ring-indigo-500 ring-offset-2 ring-offset-black"
                         : "bg-white/10 text-gray-500"}`}>
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-[10px] mt-1 font-medium transition-colors duration-300
                ${active ? "text-indigo-400" : done ? "text-gray-400" : "text-gray-600"}`}>
                {STEP_META[s].label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 mb-5 transition-all duration-500
                ${i < idx ? "bg-indigo-500" : "bg-white/10"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Input field ──────────────────────────────────────────────────────────────
function Field({ label, type = "text", value, onChange, placeholder, right, hint }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12
            text-white placeholder-gray-600 text-sm
            focus:outline-none focus:border-indigo-500/60 focus:bg-white/8
            focus:ring-1 focus:ring-indigo-500/30 transition-all duration-200"
        />
        {right}
      </div>
      {hint && <p className="text-gray-600 text-xs mt-1.5">{hint}</p>}
    </div>
  );
}

// ─── Error / success inline message ──────────────────────────────────────────
function Alert({ message, type = "error" }) {
  if (!message) return null;
  const styles = type === "error"
    ? "text-red-400 bg-red-500/8 border-red-500/20"
    : "text-emerald-400 bg-emerald-500/8 border-emerald-500/20";
  return (
    <motion.div
      key={message}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-2 text-sm border rounded-xl px-4 py-3 ${styles}`}
    >
      <span className="shrink-0 mt-0.5">{type === "error" ? "⚠" : "✓"}</span>
      {message}
    </motion.div>
  );
}

// ─── Password strength ────────────────────────────────────────────────────────
function StrengthBar({ password }) {
  if (!password) return null;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const colors = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-emerald-400", "bg-emerald-500"];
  const labels = ["", "Weak", "Fair", "Good", "Strong", "Very strong"];
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1,2,3,4,5].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300
            ${i <= score ? colors[score] : "bg-white/10"}`} />
        ))}
      </div>
      {score > 0 && (
        <p className={`text-xs ${score >= 4 ? "text-emerald-400" : "text-gray-500"}`}>
          {labels[score]}
        </p>
      )}
    </div>
  );
}

// ─── Password rules checklist ─────────────────────────────────────────────────
function PwdRules({ password }) {
  const rules = [
    ["At least 8 characters",    password.length >= 8],
    ["One uppercase (A–Z)",      /[A-Z]/.test(password)],
    ["One lowercase (a–z)",      /[a-z]/.test(password)],
    ["One number (0–9)",         /\d/.test(password)],
    ["One special character",    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)],
  ];
  return (
    <div className="bg-white/3 border border-white/8 rounded-xl p-3 space-y-1.5">
      <p className="text-xs font-medium text-gray-400 mb-2">Password requirements:</p>
      {rules.map(([rule, met]) => (
        <p key={rule} className={`text-xs flex items-center gap-2 transition-colors
          ${met ? "text-emerald-400" : "text-gray-600"}`}>
          <span className={`text-[10px] ${met ? "text-emerald-400" : "text-gray-700"}`}>
            {met ? "✓" : "○"}
          </span>
          {rule}
        </p>
      ))}
    </div>
  );
}

// ─── Primary button ───────────────────────────────────────────────────────────
function PrimaryBtn({ children, disabled, ...props }) {
  return (
    <motion.button
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.99 }}
      disabled={disabled}
      className="w-full py-3 rounded-xl font-semibold text-sm
        bg-gradient-to-r from-indigo-500 to-purple-600
        hover:from-indigo-400 hover:to-purple-500
        shadow-[0_4px_20px_rgba(99,102,241,0.3)]
        hover:shadow-[0_8px_30px_rgba(99,102,241,0.5)]
        transition-all duration-300
        disabled:opacity-40 disabled:cursor-not-allowed"
      {...props}
    >
      {children}
    </motion.button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
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
  const [otpVerified, setOtpVerified] = useState(false);

  const clearError = () => setError("");

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setLoading(true); clearError();
    try {
      await axios.post(serverUrl + "/api/auth/send-otp", { email: email.trim() });
      setOtp(""); setStep(STEP.OTP);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally { setLoading(false); }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) { setError("Please enter the full 6-digit OTP."); return; }
    setLoading(true); clearError();
    try {
      await axios.post(serverUrl + "/api/auth/verify-otp", { email, otp });
      setOtpVerified(true); setNewPassword(""); setConfirmPassword(""); setStep(STEP.RESET);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired OTP.");
    } finally { setLoading(false); }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otpVerified) { setError("OTP verification required."); setStep(STEP.EMAIL); return; }
    const pwdErr = validatePassword(newPassword);
    if (pwdErr) { setError(pwdErr); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true); clearError();
    try {
      await axios.post(serverUrl + "/api/auth/reset-password", { email, otp, newPassword });
      setStep(STEP.SUCCESS);
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed. Please try again.");
    } finally { setLoading(false); }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setLoading(true); clearError(); setOtp("");
    try {
      await axios.post(serverUrl + "/api/auth/send-otp", { email });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP.");
    } finally { setLoading(false); }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-16">
      <AuthBg />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <img src={logo} alt="logo" className="w-8 h-8 group-hover:scale-105 transition-transform" />
            <span className="text-white font-semibold text-base">
              ExamNotes <span className="text-gray-500">AI</span>
            </span>
          </Link>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl border border-white/10
            bg-gradient-to-br from-white/6 via-white/4 to-white/2
            backdrop-blur-xl
            shadow-[0_40px_100px_rgba(0,0,0,0.6)]
            px-8 py-9 text-white"
        >
          {/* Gradient top border */}
          <div className="h-px -mx-8 -mt-9 mb-9 bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

          <AnimatePresence mode="wait">

            {/* ── STEP 1: EMAIL ── */}
            {step === STEP.EMAIL && (
              <motion.div key="email"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
              >
                {step !== STEP.SUCCESS && <StepBar current={step} />}

                <div className="mb-7">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/20
                    flex items-center justify-center text-2xl mb-4">
                    ✉️
                  </div>
                  <h2 className="text-2xl font-bold mb-1">Forgot password?</h2>
                  <p className="text-gray-500 text-sm">
                    Enter your account email and we'll send a 6-digit code to reset your password.
                  </p>
                </div>

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <Field
                    label="Email address"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError(); }}
                    placeholder="you@example.com"
                  />
                  <Alert message={error} />
                  <PrimaryBtn disabled={loading}>
                    {loading ? "Sending OTP…" : "Send OTP →"}
                  </PrimaryBtn>
                </form>
              </motion.div>
            )}

            {/* ── STEP 2: OTP ── */}
            {step === STEP.OTP && (
              <motion.div key="otp"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
              >
                <StepBar current={step} />

                <div className="mb-7">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/20
                    flex items-center justify-center text-2xl mb-4">
                    🔑
                  </div>
                  <h2 className="text-2xl font-bold mb-1">Check your email</h2>
                  <p className="text-gray-500 text-sm mb-1">We sent a 6-digit code to</p>
                  <p className="text-indigo-400 font-medium text-sm truncate">{email}</p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">
                      Enter 6-digit OTP
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); clearError(); }}
                      placeholder="• • • • • •"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4
                        text-white placeholder-gray-700 text-3xl font-bold tracking-[0.8em]
                        text-center focus:outline-none focus:border-indigo-500/60 focus:bg-white/8
                        focus:ring-1 focus:ring-indigo-500/30 transition-all duration-200"
                    />
                    {/* OTP progress dots */}
                    <div className="flex justify-center gap-2 mt-3">
                      {[0,1,2,3,4,5].map((i) => (
                        <div key={i}
                          className={`w-2 h-2 rounded-full transition-all duration-200
                            ${i < otp.length ? "bg-indigo-500" : "bg-white/15"}`}
                        />
                      ))}
                    </div>
                    <p className="text-gray-600 text-xs mt-2 text-center">
                      Code expires in 10 minutes
                    </p>
                  </div>

                  <Alert message={error} />

                  <PrimaryBtn disabled={loading || otp.length !== 6}>
                    {loading ? "Verifying…" : "Verify OTP →"}
                  </PrimaryBtn>

                  <div className="flex justify-between items-center pt-1">
                    <button type="button"
                      onClick={() => { setStep(STEP.EMAIL); clearError(); setOtp(""); }}
                      className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
                      ← Change email
                    </button>
                    <button type="button"
                      onClick={handleResendOtp}
                      disabled={loading}
                      className="text-indigo-400 text-sm hover:text-indigo-300 transition-colors
                        disabled:opacity-40 disabled:cursor-not-allowed">
                      Resend code
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ── STEP 3: RESET ── */}
            {step === STEP.RESET && (
              <motion.div key="reset"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
              >
                <StepBar current={step} />

                <div className="mb-7">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/20
                    flex items-center justify-center text-2xl mb-4">
                    🔒
                  </div>
                  <h2 className="text-2xl font-bold mb-1">Set new password</h2>
                  <p className="text-gray-500 text-sm flex items-center gap-1.5">
                    <span className="text-emerald-400">✓</span> OTP verified — choose a strong password.
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <Field
                      label="New password"
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); clearError(); }}
                      placeholder="Min 8 chars, A-Z, 0-9, symbol"
                      right={
                        <button type="button"
                          onClick={() => setShowNew((p) => !p)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                          {showNew ? <span className="text-sm">🙈</span> : <span className="text-sm">👁</span>}
                        </button>
                      }
                    />
                    <StrengthBar password={newPassword} />
                  </div>

                  <div>
                    <Field
                      label="Confirm new password"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); clearError(); }}
                      placeholder="Re-enter password"
                      right={
                        <button type="button"
                          onClick={() => setShowConfirm((p) => !p)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                          {showConfirm ? <span className="text-sm">🙈</span> : <span className="text-sm">👁</span>}
                        </button>
                      }
                    />
                    {confirmPassword && (
                      <p className={`text-xs mt-1.5 ${newPassword === confirmPassword ? "text-emerald-400" : "text-red-400"}`}>
                        {newPassword === confirmPassword ? "✓ Passwords match" : "✗ Do not match"}
                      </p>
                    )}
                  </div>

                  {newPassword && <PwdRules password={newPassword} />}
                  <Alert message={error} />

                  <PrimaryBtn disabled={loading}>
                    {loading ? "Resetting…" : "Reset Password →"}
                  </PrimaryBtn>
                </form>
              </motion.div>
            )}

            {/* ── STEP 4: SUCCESS ── */}
            {step === STEP.SUCCESS && (
              <motion.div key="success"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
                className="text-center py-4"
              >
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.15 }}
                  className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/20
                    flex items-center justify-center text-4xl mx-auto mb-6"
                >
                  ✅
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">Password updated!</h2>
                <p className="text-gray-500 text-sm mb-8">
                  Your password has been reset successfully.
                  You can now sign in with your new password.
                </p>
                <motion.button
                  onClick={() => navigate("/login")}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 rounded-xl font-semibold text-sm
                    bg-gradient-to-r from-indigo-500 to-purple-600
                    hover:from-indigo-400 hover:to-purple-500
                    shadow-[0_4px_20px_rgba(99,102,241,0.3)]
                    transition-all duration-300"
                >
                  Go to Login →
                </motion.button>
              </motion.div>
            )}

          </AnimatePresence>

          {step !== STEP.SUCCESS && (
            <p className="text-center text-gray-600 text-sm mt-6">
              Remember your password?{" "}
              <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default ForgotPassword;
