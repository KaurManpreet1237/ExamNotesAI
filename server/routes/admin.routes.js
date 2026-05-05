import express from "express";
import requireAdmin from "../middleware/admin.middleware.js";
import {
  getAllUsers,
  getUserDetail,
  updateUserCredits,
  getAnalytics,
} from "../controllers/admin.controller.js";

const adminRouter = express.Router();

// All admin routes are protected by requireAdmin middleware
adminRouter.use(requireAdmin);

adminRouter.get("/users", getAllUsers);              // GET  /api/admin/users?search=&page=&limit=
adminRouter.get("/users/:id", getUserDetail);        // GET  /api/admin/users/:id
adminRouter.put("/update-credits", updateUserCredits); // PUT  /api/admin/update-credits
adminRouter.get("/analytics", getAnalytics);         // GET  /api/admin/analytics

export default adminRouter;
