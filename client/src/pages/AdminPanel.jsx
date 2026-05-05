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

// ─── Guard ────────────────────────────────────────────────────────────────────
function AdminGuard({ children }) {
  const { userData } = useSelector((s) => s.user);
  if (!userData) return <Navigate to="/" replace />;
  if (userData.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

// ─── Background ───────────────────────────────────────────────────────────────
const DarkBg = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
    <div className="absolute inset-0 bg-[#0a0a0b]" />
    <div className="absolute inset-0" style={{
      backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
      backgroundSize: "60px 60px"
    }} />
    <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-3xl" />
    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/6 rounded-full blur-3xl" />
  </div>
);

// ─── Navbar ───────────────────────────────────────────────────────────────────
function AdminNavbar({ activeTab, setActiveTab }) {
  const { userData } = useSelector((s) => s.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const fn = (e) => { if (!e.target.closest("[data-profile]")) setShowProfile(false); };
    document.addEventListener("click", fn);
    return () => document.removeEventListener("click", fn);
  }, []);

  const handleSignOut = async () => {
    try {
      await axios.get(serverUrl + "/api/auth/logout", { withCredentials: true });
      dispatch(setUserData(null));
      navigate("/");
    } catch (e) { console.error(e); }
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="sticky top-0 z-50 mx-4 mt-4 rounded-2xl
        bg-black/70 backdrop-blur-2xl
        border border-white/10
        shadow-[0_8px_40px_rgba(0,0,0,0.6)]
        flex items-center justify-between px-6 py-3.5"
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <img src={logo} alt="logo" className="w-8 h-8" />
        <span className="text-white font-semibold hidden sm:block">
          ExamCraft
        </span>
        <span className="bg-indigo-500/15 border border-indigo-500/25 text-indigo-400
          text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
          Admin
        </span>
      </div>

      {/* Center tabs */}
      <div className="flex items-center gap-1 bg-white/5 border border-white/8 rounded-xl p-1">
        {[
          { id: "users", label: "👥 Users" },
          { id: "analytics", label: "📊 Analytics" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${activeTab === tab.id
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm"
                : "text-gray-500 hover:text-white"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile */}
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/8
          rounded-full px-3.5 py-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-gray-400 text-sm">{userData?.name?.split(" ")[0]}</span>
        </div>

        <div data-profile className="relative">
          <motion.button
            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowProfile((p) => !p)}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/25 to-purple-500/15
              border border-indigo-500/30 flex items-center justify-center
              text-white font-bold text-sm"
          >
            {userData?.name?.charAt(0).toUpperCase()}
          </motion.button>

          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 8, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-52 rounded-2xl
                  bg-black/95 backdrop-blur-xl border border-white/10
                  shadow-[0_24px_60px_rgba(0,0,0,0.8)] overflow-hidden text-white"
              >
                <div className="px-4 py-3.5 border-b border-white/8">
                  <p className="font-medium text-sm truncate">{userData?.name}</p>
                  <p className="text-gray-500 text-xs truncate mt-0.5">{userData?.email}</p>
                  <span className="inline-block mt-1.5 text-[10px] font-bold text-indigo-400
                    bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2 py-0.5">
                    ADMIN
                  </span>
                </div>
                <div className="p-1.5">
                  <button onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl
                      text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                    🚪 Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.nav>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, sub, color = "from-indigo-500/10", delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5, scale: 1.02 }}
      className={`relative rounded-2xl p-5 border border-white/10
        bg-gradient-to-br ${color} to-transparent
        hover:border-white/20 transition-all duration-300 overflow-hidden`}
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/3 blur-2xl pointer-events-none" />
      <div className="flex items-start justify-between" style={{ transform: "translateZ(15px)" }}>
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">{label}</p>
          <p className="text-3xl font-extrabold text-white">{value}</p>
          {sub && <p className="text-gray-600 text-xs mt-1">{sub}</p>}
        </div>
        <span className="text-3xl opacity-70">{icon}</span>
      </div>
    </motion.div>
  );
}

// ─── Dark tooltip ─────────────────────────────────────────────────────────────
function DarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-black/90 border border-white/15 rounded-xl px-4 py-3 text-white text-sm shadow-2xl">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ─── User card ────────────────────────────────────────────────────────────────
const CARD_GRADIENTS = [
  "from-indigo-500/15 to-purple-500/5",
  "from-blue-500/15 to-cyan-500/5",
  "from-emerald-500/15 to-teal-500/5",
  "from-orange-500/15 to-amber-500/5",
  "from-rose-500/15 to-pink-500/5",
];
const AVATAR_COLORS = [
  "from-indigo-500/40 to-purple-500/30",
  "from-blue-500/40 to-cyan-500/30",
  "from-emerald-500/40 to-teal-500/30",
  "from-orange-500/40 to-amber-500/30",
  "from-rose-500/40 to-pink-500/30",
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
      whileHover={{ y: -6, scale: 1.015 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`relative rounded-2xl p-5 border border-white/10
        bg-gradient-to-br ${CARD_GRADIENTS[index % CARD_GRADIENTS.length]}
        hover:border-white/20 transition-all duration-300 overflow-hidden`}
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/3 blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br
            ${AVATAR_COLORS[index % AVATAR_COLORS.length]}
            border border-white/15 flex items-center justify-center font-bold text-white text-sm`}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-white text-sm leading-tight">{user.name}</p>
            <p className="text-gray-500 text-xs mt-0.5 truncate max-w-[130px]">{user.email}</p>
          </div>
        </div>
        {user.isGoogleUser && (
          <span className="text-[10px] bg-white/8 border border-white/10 text-gray-400 px-2 py-0.5 rounded-full">
            G
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "Credits", value: user.credits, icon: "💠" },
          { label: "Notes", value: user.totalNotes, icon: "📝" },
          { label: "Spent", value: `₹${user.totalSpent}`, icon: "💰" },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-black/20 border border-white/8 rounded-xl p-2.5 text-center">
            <p className="text-base mb-0.5">{icon}</p>
            <p className="text-[10px] text-gray-500 leading-none">{label}</p>
            <p className="font-bold text-white text-sm mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Credit editor */}
      <div className="flex gap-2 mb-3">
        <input
          type="number" min="0"
          value={creditInput}
          onChange={(e) => setCreditInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
          className="flex-1 bg-black/20 border border-white/10 rounded-xl px-3 py-2
            text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
          placeholder="Credits"
        />
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          onClick={handleUpdate}
          disabled={saving}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap
            ${saved
              ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
              : "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90"
            } disabled:cursor-not-allowed`}
        >
          {saved ? "✓" : saving ? "…" : "Set"}
        </motion.button>
      </div>

      <p className="text-gray-700 text-[10px]">
        Joined {new Date(user.joinedAt).toLocaleDateString("en-IN", {
          day: "numeric", month: "short", year: "numeric"
        })}
      </p>
    </motion.div>
  );
}

// ─── Chart card ───────────────────────────────────────────────────────────────
function ChartCard({ title, sub, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm
        shadow-[0_20px_60px_rgba(0,0,0,0.4)] p-7"
    >
      <h3 className="text-white font-semibold text-base mb-1">{title}</h3>
      <p className="text-gray-600 text-sm mb-6">{sub}</p>
      {children}
    </motion.div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="rounded-2xl border border-white/8 bg-white/3 p-5 h-52 animate-pulse">
    <div className="flex gap-3 mb-4">
      <div className="w-10 h-10 rounded-xl bg-white/8" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3 bg-white/8 rounded w-2/3" />
        <div className="h-2 bg-white/5 rounded w-1/2" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2 mb-3">
      {[1,2,3].map(i => <div key={i} className="h-14 bg-white/5 rounded-xl" />)}
    </div>
    <div className="h-9 bg-white/5 rounded-xl" />
  </div>
);

// ─── Section header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, sub }) => (
  <div className="mb-8">
    <h2 className="text-2xl font-extrabold text-white">{title}</h2>
    {sub && <p className="text-gray-600 text-sm mt-1">{sub}</p>}
  </div>
);

// ─── Admin footer ─────────────────────────────────────────────────────────────
function AdminFooter() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="mx-4 mb-4 mt-16 rounded-2xl border border-white/8
        bg-black/40 backdrop-blur-sm px-8 py-5"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="logo" className="h-6 w-6" />
          <span className="text-gray-500 text-sm">
            ExamCraft · Admin Panel
          </span>
        </div>
        <p className="text-gray-700 text-xs">
          © {new Date().getFullYear()} ExamCraft · Secure admin access
        </p>
      </div>
    </motion.footer>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
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
      setUsers(data.users); setSummary(data.summary); setPagination(data.pagination);
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
    <div className="min-h-screen">
      <DarkBg />
      <AdminNavbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

        {/* ── USERS ── */}
        {activeTab === "users" && (
          <AnimatePresence mode="wait">
            <motion.div key="users"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <SectionHeader
                title="User Management"
                sub="Search, view and manage credits for all registered users."
              />

              {/* Stats */}
              {summary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Total Users"       value={summary.totalUsers}           icon="👥" sub="All registered" color="from-indigo-500/10" delay={0}    />
                  <StatCard label="Total Revenue"     value={`₹${summary.totalRevenue}`}  icon="💰" sub="All time"       color="from-emerald-500/10" delay={0.05} />
                  <StatCard label="Credits in System" value={summary.totalCreditsInSystem} icon="💠" sub="Active"         color="from-purple-500/10" delay={0.1}  />
                  <StatCard label="This Page"         value={`${users.length}`}            icon="📋"                      color="from-blue-500/10"   delay={0.15} />
                </div>
              )}

              {/* Search + pagination */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 text-sm pointer-events-none">🔍</span>
                  <input
                    type="text"
                    placeholder="Search by name or email…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5
                      text-white text-sm placeholder-gray-600
                      focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                </div>
                {pagination.totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300
                        hover:bg-white/8 disabled:opacity-30 transition-all">
                      ← Prev
                    </button>
                    <span className="text-gray-600 text-sm px-2">{page} / {pagination.totalPages}</span>
                    <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={page === pagination.totalPages}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300
                        hover:bg-white/8 disabled:opacity-30 transition-all">
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

        {/* ── ANALYTICS ── */}
        {activeTab === "analytics" && (
          <AnimatePresence mode="wait">
            <motion.div key="analytics"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <SectionHeader
                title="Analytics"
                sub="Revenue trends, note activity and platform metrics."
              />

              {analyticsLoading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-28 rounded-2xl bg-white/3 border border-white/8 animate-pulse" />
                  ))}
                </div>
              ) : analytics ? (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Total Revenue"    value={`₹${analytics.totals.revenue}`} icon="💰" sub="All time" color="from-emerald-500/10" delay={0}    />
                    <StatCard label="Total Users"      value={analytics.totals.users}          icon="👥"               color="from-indigo-500/10"  delay={0.05} />
                    <StatCard label="Notes Generated"  value={analytics.totals.notes}          icon="📝" sub="All time" color="from-purple-500/10"  delay={0.1}  />
                    <StatCard label="Credits in System" value={analytics.totals.credits}       icon="💠"               color="from-blue-500/10"    delay={0.15} />
                  </div>

                  <ChartCard title="Revenue — Last 30 Days" sub="Daily earnings in ₹ INR from Stripe payments" delay={0.2}>
                    {analytics.earningsChart.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-14 text-center">
                        <p className="text-4xl mb-3">💳</p>
                        <p className="text-gray-600 text-sm">No revenue data yet. Stripe payment activity will appear here.</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={analytics.earningsChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="date" tick={{ fill: "#4b5563", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#4b5563", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<DarkTooltip />} />
                          <Area type="monotone" dataKey="earnings" name="₹ Earnings"
                            stroke="#6366f1" strokeWidth={2} fill="url(#earningsGrad)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </ChartCard>

                  <ChartCard title="Notes Generated — Last 30 Days" sub="Daily AI note generation activity" delay={0.3}>
                    {analytics.notesChart.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-14 text-center">
                        <p className="text-4xl mb-3">📝</p>
                        <p className="text-gray-600 text-sm">No notes generated in the last 30 days.</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={analytics.notesChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="date" tick={{ fill: "#4b5563", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#4b5563", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<DarkTooltip />} />
                          <Bar dataKey="notes" name="Notes" fill="#8b5cf6" radius={[5, 5, 0, 0]} maxBarSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </ChartCard>
                </>
              ) : (
                <p className="text-center text-gray-600 py-20">Failed to load analytics.</p>
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