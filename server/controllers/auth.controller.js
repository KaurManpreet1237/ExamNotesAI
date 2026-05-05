import UserModel from "../models/user.model.js";
import { getToken } from "../utils/token.js";
import { sendOtpEmail } from "../services/email.service.js";
import crypto from "crypto";

const setTokenCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

// POST /api/auth/google
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

// POST /api/auth/signup
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required." });
    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters." });

    const existing = await UserModel.findOne({ email: email.toLowerCase() });
    if (existing) {
      // Google-only user adding a password
      if (existing.isGoogleUser && !existing.password) {
        existing.password = password;
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
    });

    const token = await getToken(user._id);
    setTokenCookie(res, token);
    return res.status(201).json(user);
  } catch (error) {
    return res.status(500).json({ message: `Signup error: ${error.message}` });
  }
};

// POST /api/auth/login
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

// POST /api/auth/send-otp
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ message: "Email is required." });

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(404).json({ message: "No account found with this email." });

    if (user.isGoogleUser && !user.password)
      return res.status(400).json({
        message: "This account uses Google Sign-In. Password reset is not applicable.",
      });

    const otp = crypto.randomInt(100000, 999999).toString();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    await sendOtpEmail(email, otp);
    return res.status(200).json({ message: "OTP sent to your email address." });
  } catch (error) {
    // Surface the real error message to frontend (helpful during dev)
    return res.status(500).json({ message: `Failed to send OTP: ${error.message}` });
  }
};

// POST /api/auth/verify-otp
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

    return res.status(200).json({ message: "OTP verified successfully." });
  } catch (error) {
    return res.status(500).json({ message: `Verify OTP error: ${error.message}` });
  }
};

// POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      return res.status(400).json({ message: "All fields are required." });
    if (newPassword.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters." });

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user || !user.otp)
      return res.status(400).json({ message: "OTP not found. Please start over." });
    if (user.otpExpiry < new Date())
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    if (user.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP." });

    user.password = newPassword;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    return res.status(200).json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    return res.status(500).json({ message: `Reset password error: ${error.message}` });
  }
};

// GET /api/auth/logout
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