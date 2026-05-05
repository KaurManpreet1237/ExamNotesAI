import UserModel from "../models/user.model.js";
import { getToken } from "../utils/token.js";
import { sendOtpEmail } from "../services/email.service.js";
import crypto from "crypto";

/* ─────────────────────────────────────────────
   HELPER: set httpOnly JWT cookie
   ───────────────────────────────────────────── */
const setTokenCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

/* ─────────────────────────────────────────────
   GOOGLE AUTH  (existing – unchanged)
   POST /api/auth/google
   ───────────────────────────────────────────── */
export const googleAuth = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email)
      return res.status(400).json({ message: "Name and email are required." });

    let user = await UserModel.findOne({ email });
    if (!user) {
      user = await UserModel.create({ name, email, isGoogleUser: true, isVerified: true });
    } else {
      // If the user previously registered manually, mark them as also having Google
      if (!user.isGoogleUser) {
        user.isGoogleUser = true;
        await user.save();
      }
    }

    const token = await getToken(user._id);
    setTokenCookie(res, token);
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: `Google auth error: ${error.message}` });
  }
};

/* ─────────────────────────────────────────────
   MANUAL SIGNUP
   POST /api/auth/signup
   ───────────────────────────────────────────── */
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Input validation
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required." });

    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters." });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ message: "Invalid email format." });

    // Check if user already exists
    const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      if (existingUser.isGoogleUser && !existingUser.password) {
        // Google-only user trying to create manual account: allow, set password
        existingUser.password = password; // will be hashed by pre-save hook
        existingUser.isVerified = true;
        await existingUser.save();

        const token = await getToken(existingUser._id);
        setTokenCookie(res, token);
        return res.status(200).json(existingUser);
      }
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    // Create new user — password hashed via pre-save hook in model
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

/* ─────────────────────────────────────────────
   MANUAL LOGIN
   POST /api/auth/login
   ───────────────────────────────────────────── */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required." });

    const user = await UserModel.findOne({ email: email.toLowerCase() });

    if (!user)
      return res.status(401).json({ message: "Invalid email or password." });

    // Google-only user trying to login manually
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

/* ─────────────────────────────────────────────
   SEND OTP (Forgot Password Step 1)
   POST /api/auth/send-otp
   ───────────────────────────────────────────── */
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

    // Generate cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save({ validateBeforeSave: false });

    await sendOtpEmail(email, otp);

    return res.status(200).json({ message: "OTP sent to your email address." });
  } catch (error) {
    return res.status(500).json({ message: `Send OTP error: ${error.message}` });
  }
};

/* ─────────────────────────────────────────────
   VERIFY OTP (Forgot Password Step 2)
   POST /api/auth/verify-otp
   ───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   RESET PASSWORD (Forgot Password Step 3)
   POST /api/auth/reset-password
   ───────────────────────────────────────────── */
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

    // Set new password — pre-save hook will hash it
    user.password = newPassword;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    return res.status(200).json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    return res.status(500).json({ message: `Reset password error: ${error.message}` });
  }
};

/* ─────────────────────────────────────────────
   LOGOUT (existing – unchanged)
   GET /api/auth/logout
   ───────────────────────────────────────────── */
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
