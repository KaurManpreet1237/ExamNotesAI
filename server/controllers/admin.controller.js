import UserModel from "../models/user.model.js";
import Notes from "../models/notes.model.js";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users
// Returns all non-admin users with notes count and spend data.
// Supports: ?search=&page=&limit=
// ─────────────────────────────────────────────────────────────────────────────
export const getAllUsers = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build search filter (name or email)
    const filter = {
      role: "user", // never expose other admins
      ...(search
        ? {
            $or: [
              { name: { $regex: search, $options: "i" } },
              { email: { $regex: search, $options: "i" } },
            ],
          }
        : {}),
    };

    const [users, totalUsers] = await Promise.all([
      UserModel.find(filter)
        .select("name email credits totalSpent notes createdAt isGoogleUser")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      UserModel.countDocuments(filter),
    ]);

    // Attach notes count to each user (notes array length already in document)
    const usersWithStats = users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      credits: u.credits,
      totalSpent: u.totalSpent || 0,
      totalNotes: u.notes?.length || 0,
      joinedAt: u.createdAt,
      isGoogleUser: u.isGoogleUser,
    }));

    // System-wide summary
    const [totalCreditsInSystem, totalRevenue] = await Promise.all([
      UserModel.aggregate([
        { $match: { role: "user" } },
        { $group: { _id: null, total: { $sum: "$credits" } } },
      ]),
      UserModel.aggregate([
        { $match: { role: "user" } },
        { $group: { _id: null, total: { $sum: "$totalSpent" } } },
      ]),
    ]);

    return res.status(200).json({
      users: usersWithStats,
      pagination: {
        total: totalUsers,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalUsers / Number(limit)),
      },
      summary: {
        totalUsers,
        totalCreditsInSystem: totalCreditsInSystem[0]?.total || 0,
        totalRevenue: totalRevenue[0]?.total || 0,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: `Get users error: ${error.message}` });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users/:id
// Returns a single user with their full notes list
// ─────────────────────────────────────────────────────────────────────────────
export const getUserDetail = async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.id)
      .select("-password -otp -otpExpiry -otpVerified")
      .populate({ path: "notes", select: "topic classLevel examType createdAt", options: { sort: { createdAt: -1 }, limit: 50 } })
      .lean();

    if (!user)
      return res.status(404).json({ message: "User not found." });

    if (user.role === "admin")
      return res.status(403).json({ message: "Cannot view admin user details." });

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: `Get user detail error: ${error.message}` });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/update-credits
// Manually sets a user's credit balance
// Body: { userId, credits }
// ─────────────────────────────────────────────────────────────────────────────
export const updateUserCredits = async (req, res) => {
  try {
    const { userId, credits } = req.body;

    if (!userId)
      return res.status(400).json({ message: "userId is required." });

    if (credits === undefined || credits === null || isNaN(Number(credits)))
      return res.status(400).json({ message: "credits must be a valid number." });

    const newCredits = Math.max(0, Math.floor(Number(credits)));

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { credits: newCredits, isCreditAvailable: newCredits > 0 },
      { new: true, select: "name email credits" }
    );

    if (!user)
      return res.status(404).json({ message: "User not found." });

    return res.status(200).json({
      message: `Credits updated to ${newCredits} for ${user.name}.`,
      user,
    });
  } catch (error) {
    return res.status(500).json({ message: `Update credits error: ${error.message}` });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/analytics
// Returns earnings data grouped by day (last 30 days) for the chart
// ─────────────────────────────────────────────────────────────────────────────
export const getAnalytics = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Daily earnings — aggregate users whose totalSpent was updated in last 30d
    // Since Stripe webhook updates totalSpent, we use updatedAt as a proxy for
    // when money was received. For real production, you'd store a Payment model.
    const dailyEarnings = await UserModel.aggregate([
      { $match: { totalSpent: { $gt: 0 }, updatedAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$updatedAt" },
            month: { $month: "$updatedAt" },
            day: { $dayOfMonth: "$updatedAt" },
          },
          earnings: { $sum: "$totalSpent" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    // Format for Recharts: [{ date: "May 1", earnings: 200 }, ...]
    const chartData = dailyEarnings.map((d) => ({
      date: `${d._id.day}/${d._id.month}`,
      earnings: d.earnings,
      users: d.count,
    }));

    // Notes generated per day (last 30 days)
    const dailyNotes = await Notes.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    const notesChartData = dailyNotes.map((d) => ({
      date: `${d._id.day}/${d._id.month}`,
      notes: d.count,
    }));

    // Totals
    const [totals] = await UserModel.aggregate([
      { $match: { role: "user" } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalSpent" },
          totalUsers: { $sum: 1 },
          totalCredits: { $sum: "$credits" },
        },
      },
    ]);

    const totalNotes = await Notes.countDocuments();

    return res.status(200).json({
      totals: {
        revenue: totals?.totalRevenue || 0,
        users: totals?.totalUsers || 0,
        credits: totals?.totalCredits || 0,
        notes: totalNotes,
      },
      earningsChart: chartData,
      notesChart: notesChartData,
    });
  } catch (error) {
    return res.status(500).json({ message: `Analytics error: ${error.message}` });
  }
};
