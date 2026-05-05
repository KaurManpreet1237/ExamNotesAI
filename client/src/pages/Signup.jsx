import React, { useState } from "react";
import { motion } from "motion/react";
import { FcGoogle } from "react-icons/fc";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../utils/firebase";
import axios from "axios";
import { serverUrl } from "../App";
import { useDispatch } from "react-redux";
import { setUserData } from "../redux/userSlice";
import { Link, useNavigate } from "react-router-dom";

// ─── Shared password validator (same rules as backend) ────────────────────────
const validatePassword = (pwd) => {
  if (!pwd) return "Password is required.";
  if (pwd.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pwd)) return "Must include at least one uppercase letter (A–Z).";
  if (!/[a-z]/.test(pwd)) return "Must include at least one lowercase letter (a–z).";
  if (!/\d/.test(pwd)) return "Must include at least one number (0–9).";
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd))
    return "Must include at least one special character (!@#$% etc).";
  return null;
};

// ─── Password strength bar ────────────────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password),
  ].filter(Boolean).length;
  const colors = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-green-500"];
  const labels = ["", "Weak", "Fair", "Good", "Strong", "Very strong"];
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
      {score > 0 && (
        <p className={`text-xs ${score >= 4 ? "text-green-400" : "text-gray-500"}`}>
          {labels[score]}
        </p>
      )}
    </div>
  );
}

function Signup() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setError("");
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const { name, email, password, confirmPassword } = form;

    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    // Frontend strong password validation
    const pwdError = validatePassword(password);
    if (pwdError) { setError(pwdError); return; }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await axios.post(
        serverUrl + "/api/auth/signup",
        { name, email, password },
        { withCredentials: true }
      );
      dispatch(setUserData(result.data));
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const response = await signInWithPopup(auth, provider);
      const { displayName: name, email } = response.user;
      const result = await axios.post(
        serverUrl + "/api/auth/google",
        { name, email },
        { withCredentials: true }
      );
      dispatch(setUserData(result.data));
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Google sign-in failed.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8 text-center"
      >
        <h1 className="text-3xl font-extrabold text-gray-900">ExamNotes AI</h1>
        <p className="text-sm text-gray-500 mt-1">AI-powered exam-oriented notes & revision</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="w-full max-w-md rounded-2xl
          bg-gradient-to-br from-black/90 via-black/85 to-black/90
          border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.4)]
          px-8 py-10 text-white"
      >
        <h2 className="text-2xl font-bold mb-1">Create your account</h2>
        <p className="text-gray-400 text-sm mb-8">
          Get <span className="text-white font-semibold">50 free credits</span> instantly — no card required.
        </p>

        {/* Google */}
        <motion.button
          onClick={handleGoogleAuth}
          disabled={googleLoading || loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-3
            bg-white/10 hover:bg-white/15 border border-white/15
            text-white font-medium rounded-xl py-3 transition-all
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FcGoogle size={20} />
          {googleLoading ? "Signing up…" : "Continue with Google"}
        </motion.button>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-gray-500 text-xs uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Full name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="John Doe"
              autoComplete="name"
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3
                text-white placeholder-gray-500 text-sm
                focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Email address</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3
                text-white placeholder-gray-500 text-sm
                focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min 8 chars, A-Z, 0-9, symbol"
                autoComplete="new-password"
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
            <PasswordStrength password={form.password} />
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Confirm password</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                autoComplete="new-password"
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
            {form.confirmPassword && (
              <p className={`text-xs mt-1.5 ${
                form.password === form.confirmPassword ? "text-green-400" : "text-red-400"
              }`}>
                {form.password === form.confirmPassword
                  ? "✓ Passwords match"
                  : "✗ Passwords do not match"}
              </p>
            )}
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            type="submit"
            disabled={loading || googleLoading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full bg-white text-black font-semibold rounded-xl py-3
              hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? "Creating account…" : "Create Account"}
          </motion.button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-white font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default Signup;