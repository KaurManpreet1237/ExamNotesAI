import jwt from "jsonwebtoken";
import UserModel from "../models/user.model.js";

/**
 * requireAdmin middleware
 * - Verifies JWT (same as isAuth)
 * - Additionally checks user.role === "admin"
 * - Attaches req.userId and req.adminUser for downstream controllers
 */
const requireAdmin = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    if (!token)
      return res.status(401).json({ message: "Authentication required." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.userId)
      return res.status(401).json({ message: "Invalid token." });

    const user = await UserModel.findById(decoded.userId).select("-password -otp");
    if (!user)
      return res.status(401).json({ message: "User not found." });

    if (user.role !== "admin")
      return res.status(403).json({ message: "Access denied. Admins only." });

    req.userId = decoded.userId;
    req.adminUser = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

export default requireAdmin;
