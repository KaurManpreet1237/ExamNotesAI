import express from "express";
import {
  googleAuth,
  signup,
  login,
  sendOtp,
  verifyOtp,
  resetPassword,
  logOut,
} from "../controllers/auth.controller.js";

const authRouter = express.Router();

// Existing
authRouter.post("/google", googleAuth);
authRouter.get("/logout", logOut);

// New manual auth routes
authRouter.post("/signup", signup);
authRouter.post("/login", login);

// Forgot password flow
authRouter.post("/send-otp", sendOtp);
authRouter.post("/verify-otp", verifyOtp);
authRouter.post("/reset-password", resetPassword);

export default authRouter;
