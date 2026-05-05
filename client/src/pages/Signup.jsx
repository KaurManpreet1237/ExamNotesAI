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
import logo from "../assets/logo.png";

// Shared password validator
const validatePassword = (pwd) => {
  if (!pwd) return "Password is required.";
  if (pwd.length < 8) return "At least 8 characters required.";
  if (!/[A-Z]/.test(pwd)) return "Include at least one uppercase letter.";
  if (!/[a-z]/.test(pwd)) return "Include at least one lowercase letter.";
  if (!/\d/.test(pwd)) return "Include at least one number.";
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd)) return "Include at least one special character.";
  return null;
};

// Password strength bar
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
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300
            ${i <= score ? colors[score] : "bg-white/10"}`} />
        ))}
      </div>
      {score > 0 && (
        <p className={`text-xs mt-1 ${score >= 4 ? "text-emerald-400" : "text-gray-500"}`}>
          {labels[score]}
        </p>
      )}
    </div>
  );
}

// Shared background
const AuthBg = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden">
    <div className="absolute inset-0 bg-[#0a0a0b]" />
    <div className="absolute inset-0"
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
        backgroundSize: "60px 60px"
      }}
    />
    <div className="absolute top-0 right-1/3 w-80 h-80 bg-purple-600/12 rounded-full blur-3xl" />
    <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl" />
  </div>
)

function Signup() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [showPwd, setShowPwd] = useState(false);
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
    if (!name || !email || !password || !confirmPassword) { setError("Please fill in all fields."); return; }
    const pwdErr = validatePassword(password);
    if (pwdErr) { setError(pwdErr); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true); setError("");
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
    } finally { setLoading(false); }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true); setError("");
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
    } finally { setGoogleLoading(false); }
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
              ExamCraft
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
          <div className="h-px -mx-8 -mt-9 mb-9 bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />

          <div className="flex items-start justify-between mb-7">
            <div>
              <h2 className="text-2xl font-bold mb-1">Create your account</h2>
              <p className="text-gray-500 text-sm">Get 50 free credits — no card needed</p>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20
              rounded-full px-3 py-1.5 text-emerald-400 text-xs font-medium shrink-0">
              🎁 Free
            </div>
          </div>

          {/* Google */}
          <motion.button
            onClick={handleGoogleAuth}
            disabled={googleLoading || loading}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl
              bg-white/8 border border-white/12 text-white text-sm font-medium
              hover:bg-white/12 hover:border-white/20 transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FcGoogle size={18} />
            {googleLoading ? "Signing up…" : "Continue with Google"}
          </motion.button>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-gray-600 text-xs uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Full name</label>
              <input
                type="text" name="name" value={form.name} onChange={handleChange}
                placeholder="John Doe" autoComplete="name"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                  text-white placeholder-gray-600 text-sm
                  focus:outline-none focus:border-indigo-500/60 focus:bg-white/8
                  focus:ring-1 focus:ring-indigo-500/30 transition-all duration-200"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email address</label>
              <input
                type="email" name="email" value={form.email} onChange={handleChange}
                placeholder="you@example.com" autoComplete="email"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                  text-white placeholder-gray-600 text-sm
                  focus:outline-none focus:border-indigo-500/60 focus:bg-white/8
                  focus:ring-1 focus:ring-indigo-500/30 transition-all duration-200"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"} name="password"
                  value={form.password} onChange={handleChange}
                  placeholder="Min 8 chars, A-Z, 0-9, symbol" autoComplete="new-password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12
                    text-white placeholder-gray-600 text-sm
                    focus:outline-none focus:border-indigo-500/60 focus:bg-white/8
                    focus:ring-1 focus:ring-indigo-500/30 transition-all duration-200"
                />
                <button type="button" onClick={() => setShowPwd((p) => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPwd ? <AiOutlineEyeInvisible size={17} /> : <AiOutlineEye size={17} />}
                </button>
              </div>
              <StrengthBar password={form.password} />
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Confirm password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"} name="confirmPassword"
                  value={form.confirmPassword} onChange={handleChange}
                  placeholder="Re-enter password" autoComplete="new-password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12
                    text-white placeholder-gray-600 text-sm
                    focus:outline-none focus:border-indigo-500/60 focus:bg-white/8
                    focus:ring-1 focus:ring-indigo-500/30 transition-all duration-200"
                />
                <button type="button" onClick={() => setShowConfirm((p) => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showConfirm ? <AiOutlineEyeInvisible size={17} /> : <AiOutlineEye size={17} />}
                </button>
              </div>
              {form.confirmPassword && (
                <p className={`text-xs mt-1.5 ${
                  form.password === form.confirmPassword ? "text-emerald-400" : "text-red-400"
                }`}>
                  {form.password === form.confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 text-red-400 text-sm
                  bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3"
              >
                <span className="shrink-0 mt-0.5">⚠</span> {error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading || googleLoading}
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3 rounded-xl font-semibold text-sm
                bg-gradient-to-r from-indigo-500 to-purple-600
                hover:from-indigo-400 hover:to-purple-500
                shadow-[0_4px_20px_rgba(99,102,241,0.3)]
                hover:shadow-[0_8px_30px_rgba(99,102,241,0.5)]
                transition-all duration-300
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account…" : "Create Free Account"}
            </motion.button>
          </form>

          <p className="text-center text-gray-600 text-sm mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default Signup;