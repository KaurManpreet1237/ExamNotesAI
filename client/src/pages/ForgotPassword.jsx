import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import axios from "axios";
import { serverUrl } from "../App";
import { Link, useNavigate } from "react-router-dom";

const STEP = { EMAIL: 1, OTP: 2, SUCCESS: 3 };

function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEP.EMAIL);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  /* ── Step 1: Send OTP ── */
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) { setError("Please enter your email address."); return; }
    setLoading(true); setError("");
    try {
      await axios.post(serverUrl + "/api/auth/send-otp", { email });
      setStep(STEP.OTP);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP.");
    } finally { setLoading(false); }
  };

  /* ── Step 2: Verify OTP + Reset Password ── */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword || !confirmPassword) { setError("All fields are required."); return; }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }

    setLoading(true); setError("");
    try {
      // Verify OTP first
      await axios.post(serverUrl + "/api/auth/verify-otp", { email, otp });
      // Then reset
      await axios.post(serverUrl + "/api/auth/reset-password", { email, otp, newPassword });
      setStep(STEP.SUCCESS);
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <h1 className="text-3xl font-extrabold text-gray-900">ExamNotes AI</h1>
        <p className="text-sm text-gray-500 mt-1">AI-powered exam-oriented notes & revision</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-2xl
          bg-gradient-to-br from-black/90 via-black/85 to-black/90
          border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.4)]
          px-8 py-10 text-white"
      >
        <AnimatePresence mode="wait">

          {/* ── STEP 1: Email ── */}
          {step === STEP.EMAIL && (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold mb-1">Forgot password?</h2>
              <p className="text-gray-400 text-sm mb-8">
                Enter your email and we'll send a 6-digit OTP to reset your password.
              </p>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    placeholder="you@example.com"
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3
                      text-white placeholder-gray-500 text-sm
                      focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
                  />
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
                  {loading ? "Sending OTP…" : "Send OTP"}
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* ── STEP 2: OTP + New Password ── */}
          {step === STEP.OTP && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold mb-1">Reset password</h2>
              <p className="text-gray-400 text-sm mb-2">
                A 6-digit OTP has been sent to
              </p>
              <p className="text-white text-sm font-medium mb-8">{email}</p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Enter OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
                    placeholder="123456"
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3
                      text-white placeholder-gray-500 text-sm tracking-widest text-center text-xl font-bold
                      focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">New password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                      placeholder="Min. 6 characters"
                      className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 pr-12
                        text-white placeholder-gray-500 text-sm
                        focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                    >
                      {showPassword ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Confirm new password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                    placeholder="Re-enter password"
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3
                      text-white placeholder-gray-500 text-sm
                      focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
                  />
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
                <button
                  type="button"
                  onClick={() => { setStep(STEP.EMAIL); setError(""); setOtp(""); }}
                  className="w-full text-center text-gray-500 text-sm hover:text-gray-300 transition-colors"
                >
                  ← Back to email
                </button>
              </form>
            </motion.div>
          )}

          {/* ── STEP 3: Success ── */}
          {step === STEP.SUCCESS && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-2xl font-bold mb-2">Password Reset!</h2>
              <p className="text-gray-400 text-sm mb-8">
                Your password has been updated successfully. You can now log in with your new password.
              </p>
              <motion.button
                onClick={() => navigate("/login")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-white text-black font-semibold rounded-xl py-3 hover:bg-gray-100 transition-all"
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

function ErrorBox({ message }) {
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
    >
      {message}
    </motion.p>
  );
}

export default ForgotPassword;
