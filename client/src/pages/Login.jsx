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

const getRedirectPath = (user) => user?.role === "admin" ? "/admin" : "/";

// Subtle animated background
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
    <div className="absolute top-0 left-1/3 w-80 h-80 bg-indigo-600/12 rounded-full blur-3xl" />
    <div className="absolute bottom-0 right-1/3 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl" />
  </div>
)

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setError("");
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleManualLogin = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError("Please fill in all fields."); return; }
    setLoading(true); setError("");
    try {
      const result = await axios.post(
        serverUrl + "/api/auth/login",
        { email: form.email, password: form.password },
        { withCredentials: true }
      );
      dispatch(setUserData(result.data));
      navigate(getRedirectPath(result.data));
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
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
      navigate(getRedirectPath(result.data));
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
          {/* Top gradient line */}
          <div className="h-px -mx-8 -mt-9 mb-9 bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

          <h2 className="text-2xl font-bold mb-1">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-7">Sign in to continue to ExamCraft</p>

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
            {googleLoading ? "Signing in…" : "Continue with Google"}
          </motion.button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-gray-600 text-xs uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {/* Form */}
          <form onSubmit={handleManualLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                  text-white placeholder-gray-600 text-sm
                  focus:outline-none focus:border-indigo-500/60 focus:bg-white/8
                  focus:ring-1 focus:ring-indigo-500/30
                  transition-all duration-200"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12
                    text-white placeholder-gray-600 text-sm
                    focus:outline-none focus:border-indigo-500/60 focus:bg-white/8
                    focus:ring-1 focus:ring-indigo-500/30
                    transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <AiOutlineEyeInvisible size={17} /> : <AiOutlineEye size={17} />}
                </button>
              </div>
              {/* Forgot password — below the input field */}
              <div className="flex justify-end mt-2">
                <Link to="/forgot-password"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 text-red-400 text-sm
                  bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3"
              >
                <span className="text-red-400 mt-0.5 shrink-0">⚠</span>
                {error}
              </motion.div>
            )}

            {/* Submit */}
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
              {loading ? "Signing in…" : "Sign In"}
            </motion.button>
          </form>

          <p className="text-center text-gray-600 text-sm mt-6">
            No account?{" "}
            <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Create one free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default Login;