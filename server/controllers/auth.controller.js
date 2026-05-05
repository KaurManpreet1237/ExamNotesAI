import UserModel from "../models/user.model.js";
import { getToken } from "../utils/token.js";
import { sendOtpEmail } from "../services/email.service.js";
import crypto from "crypto";

// ─── Shared password validation (mirrors frontend rules exactly) ──────────────
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]).{8,}$/;

const validatePasswordStrength = (password) => {
  if (!password || !PASSWORD_REGEX.test(password)) {
    return "Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character.";
  }
  return null; // valid
};

// ─── Cookie helper ────────────────────────────────────────────────────────────
const setTokenCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE AUTH — POST /api/auth/google  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
export const googleAuth = async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email)
      return res.status(400).json({ message: "Name and email are required." });

    let user = await UserModel.findOne({ email });
    if (!user) {
      user = await UserModel.create({ name, email, isGoogleUser: true, isVerified: true });
    } else if (!user.isGoogleUser) {
      user.isGoogleUser = true;
      await user.save();
    }

    const token = await getToken(user._id);
    setTokenCookie(res, token);
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: `Google auth error: ${error.message}` });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SIGNUP — POST /api/auth/signup
// ─────────────────────────────────────────────────────────────────────────────
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required." });

    // Strong password validation
    const pwdError = validatePasswordStrength(password);
    if (pwdError) return res.status(400).json({ message: pwdError });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ message: "Invalid email format." });

    const existing = await UserModel.findOne({ email: email.toLowerCase() });
    if (existing) {
      // Google-only user adding a manual password — allow
      if (existing.isGoogleUser && !existing.password) {
        existing.password = password;
        existing.isVerified = true;
        await existing.save();
        const token = await getToken(existing._id);
        setTokenCookie(res, token);
        return res.status(200).json(existing);
      }
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const user = await UserModel.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,         // hashed by pre-save hook in model
      isGoogleUser: false,
      isVerified: true,
    });

    const token = await getToken(user._id);
    setTokenCookie(res, token);
    return res.status(201).json(user);
  } catch (error) {
    return res.status(500).json({ message: `Signup error: ${error.message}` });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN — POST /api/auth/login  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required." });

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(401).json({ message: "Invalid email or password." });

    if (user.isGoogleUser && !user.password)
      return res.status(401).json({
        message: "This account uses Google Sign-In. Please continue with Google.",
      });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid email or password." });

    const token = await getToken(user._id);
    setTokenCookie(res, token);
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: `Login error: ${error.message}` });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SEND OTP — POST /api/auth/send-otp
// ─────────────────────────────────────────────────────────────────────────────
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(404).json({ message: "No account found with this email." });

    if (user.isGoogleUser && !user.password)
      return res.status(400).json({
        message: "This account uses Google Sign-In. Password reset is not applicable.",
      });

    const otp = crypto.randomInt(100000, 999999).toString();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    // Clear any previous otpVerified flag so the user must re-verify
    user.otpVerified = false;
    await user.save({ validateBeforeSave: false });

    await sendOtpEmail(email, otp);
    return res.status(200).json({ message: "OTP sent to your email address." });
  } catch (error) {
    return res.status(500).json({ message: `Failed to send OTP: ${error.message}` });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY OTP — POST /api/auth/verify-otp
// Sets otpVerified = true on the user so reset-password can proceed
// ─────────────────────────────────────────────────────────────────────────────
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP are required." });

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user || !user.otp)
      return res.status(400).json({ message: "OTP not found. Please request a new one." });

    if (user.otpExpiry < new Date())
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });

    if (user.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP. Please try again." });

    // Mark OTP as verified — reset-password will check this flag
    user.otpVerified = true;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ message: "OTP verified successfully." });
  } catch (error) {
    return res.status(500).json({ message: `Verify OTP error: ${error.message}` });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// RESET PASSWORD — POST /api/auth/reset-password
// Requires otpVerified = true (set by /verify-otp) — cannot be bypassed
// ─────────────────────────────────────────────────────────────────────────────
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      return res.status(400).json({ message: "All fields are required." });

    // Strong password validation on backend (same rules as frontend)
    const pwdError = validatePasswordStrength(newPassword);
    if (pwdError) return res.status(400).json({ message: pwdError });

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user || !user.otp)
      return res.status(400).json({ message: "OTP not found. Please start over." });

    // Enforce that /verify-otp was called first
    if (!user.otpVerified)
      return res.status(403).json({
        message: "OTP has not been verified. Please verify your OTP first.",
      });

    if (user.otpExpiry < new Date())
      return res.status(400).json({ message: "OTP session expired. Please start over." });

    if (user.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP." });

    // Update password — pre-save hook hashes it
    user.password = newPassword;
    user.otp = null;
    user.otpExpiry = null;
    user.otpVerified = false;
    await user.save();

    return res.status(200).json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    return res.status(500).json({ message: `Reset password error: ${error.message}` });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGOUT — GET /api/auth/logout  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
export const logOut = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });
    return res.status(200).json({ message: "Logged out successfully." });
  } catch (error) {
    return res.status(500).json({ message: `Logout error: ${error.message}` });
  }
};