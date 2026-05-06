import UserModel from "../models/user.model.js";
import { getToken } from "../utils/token.js";
import { sendOtpEmail } from "../services/email.service.js";
import crypto from "crypto";

// ─── Password validation ──────────────────────────────────────────────────────
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]).{8,}$/;

const validatePasswordStrength = (password) => {
  if (!password || !PASSWORD_REGEX.test(password)) {
    return "Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character.";
  }
  return null;
};

// ─── Determine role for new user ──────────────────────────────────────────────
// If ADMIN_EMAIL env var matches the signing-up email → assign admin role.
// Only ONE admin exists. All others are "user".
const resolveRole = (email) => {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  return adminEmail && email.toLowerCase().trim() === adminEmail ? "admin" : "user";
};

// ─── Cookie helper ────────────────────────────────────────────────────────────
const setTokenCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE AUTH — POST /api/auth/google
// ─────────────────────────────────────────────────────────────────────────────
export const googleAuth = async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email)
      return res.status(400).json({ message: "Name and email are required." });

    let user = await UserModel.findOne({ email });
    if (!user) {
      user = await UserModel.create({
        name,
        email,
        isGoogleUser: true,
        isVerified: true,
        role: resolveRole(email), // assign admin role if email matches ADMIN_EMAIL
      });
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

    const pwdError = validatePasswordStrength(password);
    if (pwdError) return res.status(400).json({ message: pwdError });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ message: "Invalid email format." });

    const existing = await UserModel.findOne({ email: email.toLowerCase() });
    if (existing) {
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
      password,
      isGoogleUser: false,
      isVerified: true,
      role: resolveRole(email), // assign admin role if email matches ADMIN_EMAIL
    });

    const token = await getToken(user._id);
    setTokenCookie(res, token);
    return res.status(201).json(user);
  } catch (error) {
    return res.status(500).json({ message: `Signup error: ${error.message}` });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN — POST /api/auth/login
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

    const otp = crypto.randomInt(100000, 999999).toString();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
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

    user.otpVerified = true;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ message: "OTP verified successfully." });
  } catch (error) {
    return res.status(500).json({ message: `Verify OTP error: ${error.message}` });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// RESET PASSWORD — POST /api/auth/reset-password
// ─────────────────────────────────────────────────────────────────────────────
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      return res.status(400).json({ message: "All fields are required." });

    const pwdError = validatePasswordStrength(newPassword);
    if (pwdError) return res.status(400).json({ message: pwdError });

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user || !user.otp)
      return res.status(400).json({ message: "OTP not found. Please start over." });
    if (!user.otpVerified)
      return res.status(403).json({ message: "OTP has not been verified. Please verify your OTP first." });
    if (user.otpExpiry < new Date())
      return res.status(400).json({ message: "OTP session expired. Please start over." });
    if (user.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP." });

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
// LOGOUT — GET /api/auth/logout
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
