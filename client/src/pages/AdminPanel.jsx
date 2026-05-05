import React, { useEffect, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import { serverUrl } from "../App";
import { setUserData } from "../redux/userSlice";
import logo from "../assets/logo.png";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Route guard ──────────────────────────────────────────────────────────────
function AdminGuard({ children }) {
  const { userData } = useSelector((s) => s.user);
  if (!userData) return <Navigate to="/" replace />;
  if (userData.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

// ─── Admin Navbar (matches project dark card style) ───────────────────────────
function AdminNavbar({ activeTab, setActiveTab }) {
  const { userData } = useSelector((s) => s.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);

  const handleSignOut = async () => {
    try {
      await axios.get(serverUrl + "/api/auth/logout", { withCredentials: true });
      dispatch(setUserData(null));
      navigate("/");
    } catch (e) { console.error(e); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="relative z-20 mx-6 mt-6
        rounded-2xl
        bg-gradient-to-br from-black/90 via-black/80 to-black/90
        backdrop-blur-2xl
        border border-white/10
        shadow-[0_22px_55px_rgba(0,0,0,0.75)]
        flex items-center justify-between px-8 py-4"
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <img src={logo} alt="logo" className="w-9 h-9" />
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-white hidden md:block">
            ExamNotes <span className="text-gray-400">AI</span>
          </span>
          <span className="bg-white/10 border border-white/15 text-gray-300
            text-xs font-medium px-2.5 py-0.5 rounded-full">
            Admin
          </span>
        </div>
      </div>

      {/* Center: Tabs */}
      <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
        {[{ id: "users", label: "👥 Users" }, { id: "analytics", label: "📊 Analytics" }].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-white text-black shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Right: Profile */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10
          rounded-full px-4 py-2">
          <span className="text-green-400 text-xs">●</span>
          <span className="text-gray-300 text-sm">{userData?.name?.split(" ")[0]}</span>
        </div>
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowProfile((p) => !p)}
            className="w-9 h-9 rounded-full bg-white/10 border border-white/20
              flex items-center justify-center text-white font-bold text-sm"
          >
            {userData?.name?.charAt(0).toUpperCase()}
          </motion.button>
          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 10, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-4 w-52
                  rounded-2xl bg-black/90 backdrop-blur-xl
                  border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.7)]
                  p-2 text-white"
              >
                <div className="px-4 py-3 border-b border-white/10 mb-1">
                  <p className="text-xs text-gray-500 mb-0.5">Signed in as</p>
                  <p className="text-sm font-medium truncate">{userData?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{userData?.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-400
                    hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Admin Footer ─────────────────────────────────────────────────────────────
function AdminFooter() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="mx-6 mb-6 mt-16
        rounded-2xl
        bg-gradient-to-br from-black/90 via-black/80 to-black/90
        backdrop-blur-2xl border border-white/10
        px-8 py-6 shadow-[0_25px_60px_rgba(0,0,0,0.7)]"
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="logo" className="h-7 w-7 object-contain" />
          <span className="text-sm font-semibold
            bg-gradient-to-br from-white via-gray-300 to-white
            bg-clip-text text-transparent">
            ExamNotes <span className="text-gray-400">AI</span>
          </span>
          <span className="text-gray-600 text-sm">· Admin Panel</span>
        </div>
        <p className="text-xs text-gray-500 text-center">
          Secure admin access — all credit changes take effect immediately.
        </p>
        <p className="text-xs text-gray-600">
          © {new Date().getFullYear()} ExamNotes AI
        </p>
      </div>
    </motion.div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, sub, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -6, rotateX: 6, rotateY: -6, scale: 1.02 }}
      className="rounded-2xl
        bg-gradient-to-br from-black/90 via-black/80 to-black/90
        border border-white/10
        shadow-[0_20px_50px_rgba(0,0,0,0.5)]
        p-6 text-white cursor-default"
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className="flex items-start justify-between"
        style={{ transform: "translateZ(20px)" }}>
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">{label}</p>
          <p className="text-3xl font-extrabold">{value}</p>
          {sub && <p className="text-gray-500 text-xs mt-1.5">{sub}</p>}
        </div>
        <span className="text-3xl opacity-80">{icon}</span>
      </div>
    </motion.div>
  );
}

// ─── Dark tooltip for charts ──────────────────────────────────────────────────
function DarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-black/90 border border-white/15 rounded-xl px-4 py-3 text-white text-sm shadow-xl">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ─── User card ────────────────────────────────────────────────────────────────
const AVATAR_GRADIENTS = [
  "from-violet-500/30 to-purple-500/30",
  "from-blue-500/30 to-cyan-500/30",
  "from-emerald-500/30 to-teal-500/30",
  "from-orange-500/30 to-amber-500/30",
  "from-rose-500/30 to-pink-500/30",
];

function UserCard({ user, onUpdateCredits, index }) {
  const [creditInput, setCreditInput] = useState(String(user.credits));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleUpdate = async () => {
    const val = Number(creditInput);
    if (isNaN(val) || val < 0) return;
    setSaving(true);
    try {
      await onUpdateCredits(user._id, val);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -8, rotateX: 4, rotateY: -4, scale: 1.02 }}
      className="relative rounded-2xl
        bg-gradient-to-br from-black/90 via-black/80 to-black/90
        border border-white/10
        shadow-[0_20px_50px_rgba(0,0,0,0.5)]
        p-5 text-white overflow-hidden"
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Corner glow */}
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/5 blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between mb-4" style={{ transform: "translateZ(15px)" }}>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br
            ${AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length]}
            border border-white/15 flex items-center justify-center
            text-lg font-bold text-white`}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">{user.name}</p>
            <p className="text-gray-400 text-xs mt-0.5 truncate max-w-[140px]">{user.email}</p>
          </div>
        </div>
        {user.isGoogleUser && (
          <span className="text-xs bg-white/5 border border-white/10 text-gray-400 px-2 py-0.5 rounded-full">G</span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4" style={{ transform: "translateZ(10px)" }}>
        {[
          { label: "Credits", value: user.credits, icon: "💠" },
          { label: "Notes",   value: user.totalNotes, icon: "📝" },
          { label: "Spent",   value: `₹${user.totalSpent}`, icon: "💰" },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-white/5 border border-white/8 rounded-xl p-2.5 text-center">
            <p className="text-base mb-0.5">{icon}</p>
            <p className="text-xs text-gray-400 leading-none">{label}</p>
            <p className="font-bold text-sm mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Credit editor */}
      <div className="flex items-center gap-2 mb-3" style={{ transform: "translateZ(10px)" }}>
        <input
          type="number"
          min="0"
          value={creditInput}
          onChange={(e) => setCreditInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
          className="flex-1 bg-white/5 border border-white/15 rounded-xl px-3 py-2
            text-white text-sm focus:outline-none focus:border-white/40 transition-all"
          placeholder="Credits"
        />
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleUpdate}
          disabled={saving}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap
            disabled:cursor-not-allowed
            ${saved
              ? "bg-green-500/20 border border-green-500/30 text-green-400"
              : "bg-white text-black hover:bg-gray-100"
            }`}
        >
          {saved ? "✓" : saving ? "…" : "Set"}
        </motion.button>
      </div>

      {/* Join date */}
      <p className="text-gray-600 text-xs" style={{ transform: "translateZ(5px)" }}>
        Joined {new Date(user.joinedAt).toLocaleDateString("en-IN", {
          day: "numeric", month: "short", year: "numeric"
        })}
      </p>
    </motion.div>
  );
}

// ─── Chart wrapper card ───────────────────────────────────────────────────────
function ChartCard({ title, sub, delay = 0, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="rounded-2xl
        bg-gradient-to-br from-black/90 via-black/80 to-black/90
        border border-white/10
        shadow-[0_25px_60px_rgba(0,0,0,0.55)]
        p-7"
    >
      <h3 className="text-white font-semibold text-base mb-1">{title}</h3>
      <p className="text-gray-500 text-sm mb-6">{sub}</p>
      {children}
    </motion.div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-black/80 to-black/70
      border border-white/10 p-5 h-56 animate-pulse">
      <div className="flex gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-white/10" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 bg-white/10 rounded w-2/3" />
          <div className="h-2 bg-white/5 rounded w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl" />)}
      </div>
      <div className="h-9 bg-white/5 rounded-xl" />
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
function AdminDashboard() {
  const [users, setUsers]           = useState([]);
  const [analytics, setAnalytics]   = useState(null);
  const [summary, setSummary]       = useState(null);
  const [pagination, setPagination] = useState({});
  const [search, setSearch]         = useState("");
  const [debouncedSearch, setDS]    = useState("");
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [analyticsLoading, setAL]   = useState(true);
  const [activeTab, setActiveTab]   = useState("users");

  useEffect(() => {
    const t = setTimeout(() => setDS(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${serverUrl}/api/admin/users?search=${debouncedSearch}&page=${page}&limit=12`,
        { withCredentials: true }
      );
      setUsers(data.users);
      setSummary(data.summary);
      setPagination(data.pagination);
    } catch (e) { console.error(e.message); }
    finally { setLoading(false); }
  }, [debouncedSearch, page]);

  const fetchAnalytics = useCallback(async () => {
    setAL(true);
    try {
      const { data } = await axios.get(`${serverUrl}/api/admin/analytics`, { withCredentials: true });
      setAnalytics(data);
    } catch (e) { console.error(e.message); }
    finally { setAL(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { if (activeTab === "analytics") fetchAnalytics(); }, [activeTab, fetchAnalytics]);

  const handleUpdateCredits = async (userId, credits) => {
    await axios.put(`${serverUrl}/api/admin/update-credits`, { userId, credits }, { withCredentials: true });
    setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, credits } : u));
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <AdminNavbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="max-w-7xl mx-auto px-6 py-10">

        {/* ─── USERS TAB ─── */}
        {activeTab === "users" && (
          <AnimatePresence mode="wait">
            <motion.div key="users"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Page title */}
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">User Management</h2>
                <p className="text-sm text-gray-400 mt-1">Search, view and adjust credits for all users.</p>
              </div>

              {/* Stat cards */}
              {summary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Total Users"       value={summary.totalUsers}            icon="👥" sub="Registered" delay={0}    />
                  <StatCard label="Total Revenue"     value={`₹${summary.totalRevenue}`}   icon="💰" sub="All time"   delay={0.05} />
                  <StatCard label="Credits in System" value={summary.totalCreditsInSystem}  icon="💠" sub="Active"     delay={0.1}  />
                  <StatCard label="This Page"         value={`${users.length} users`}       icon="📋"                  delay={0.15} />
                </div>
              )}

              {/* Search + pagination */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
                  <input
                    type="text"
                    placeholder="Search by name or email…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5
                      text-sm focus:outline-none focus:border-gray-400
                      bg-white shadow-sm transition-all"
                  />
                </div>
                {pagination.totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 rounded-xl bg-white border border-gray-200
                        text-sm hover:border-gray-300 disabled:opacity-40 shadow-sm transition-all">
                      ← Prev
                    </button>
                    <span className="text-gray-500 text-sm px-2">{page} / {pagination.totalPages}</span>
                    <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={page === pagination.totalPages}
                      className="px-4 py-2 rounded-xl bg-white border border-gray-200
                        text-sm hover:border-gray-300 disabled:opacity-40 shadow-sm transition-all">
                      Next →
                    </button>
                  </div>
                )}
              </div>

              {/* Grid */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-24">
                  <p className="text-5xl mb-4">🔍</p>
                  <p className="text-gray-500">{search ? `No users found for "${search}"` : "No users yet."}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {users.map((user, i) => (
                    <UserCard key={user._id} user={user} index={i} onUpdateCredits={handleUpdateCredits} />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* ─── ANALYTICS TAB ─── */}
        {activeTab === "analytics" && (
          <AnimatePresence mode="wait">
            <motion.div key="analytics"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Analytics</h2>
                <p className="text-sm text-gray-400 mt-1">Revenue trends, note activity and platform metrics.</p>
              </div>

              {analyticsLoading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-28 rounded-2xl bg-gray-200 animate-pulse" />
                  ))}
                </div>
              ) : analytics ? (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Total Revenue"    value={`₹${analytics.totals.revenue}`} icon="💰" sub="All time" delay={0}    />
                    <StatCard label="Total Users"      value={analytics.totals.users}          icon="👥"               delay={0.05} />
                    <StatCard label="Notes Generated"  value={analytics.totals.notes}          icon="📝" sub="All time" delay={0.1}  />
                    <StatCard label="Credits in System" value={analytics.totals.credits}       icon="💠"               delay={0.15} />
                  </div>

                  <ChartCard title="Revenue — Last 30 Days" sub="Daily earnings in ₹ INR from Stripe payments" delay={0.2}>
                    {analytics.earningsChart.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-14 text-center">
                        <p className="text-4xl mb-3">💳</p>
                        <p className="text-gray-500 text-sm">No revenue yet. Stripe payment activity will appear here.</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={analytics.earningsChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#ffffff" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                          <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<DarkTooltip />} />
                          <Area type="monotone" dataKey="earnings" name="₹ Earnings"
                            stroke="#e5e7eb" strokeWidth={2} fill="url(#earningsGrad)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </ChartCard>

                  <ChartCard title="Notes Generated — Last 30 Days" sub="Daily AI note generation activity across all users" delay={0.3}>
                    {analytics.notesChart.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-14 text-center">
                        <p className="text-4xl mb-3">📝</p>
                        <p className="text-gray-500 text-sm">No notes generated in the last 30 days.</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={analytics.notesChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                          <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<DarkTooltip />} />
                          <Bar dataKey="notes" name="Notes" fill="rgba(255,255,255,0.65)"
                            radius={[5, 5, 0, 0]} maxBarSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </ChartCard>
                </>
              ) : (
                <p className="text-center text-gray-400 py-20">Failed to load analytics.</p>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <AdminFooter />
    </div>
  );
}

export default function AdminPage() {
  return <AdminGuard><AdminDashboard /></AdminGuard>;
}