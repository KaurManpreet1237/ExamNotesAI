import React from 'react'
import Navbar from '../components/Navbar'
import { motion } from "motion/react"
import img from "../assets/img1.png"
import Footer from '../components/Footer'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

const FadeIn = ({ children, delay = 0, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
    className={className}
  >
    {children}
  </motion.div>
)

function Home() {
  const navigate = useNavigate()
  const { userData } = useSelector((state) => state.user)

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white overflow-x-hidden relative">

      {/* Background Grid */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px"
          }}
        />

        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <Navbar />

        {/* ───────── HERO ───────── */}
        <section className="max-w-7xl mx-auto px-6 pt-16 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* LEFT */}
            <div>

              <FadeIn delay={0}>
                <div
                  className="inline-flex items-center gap-2 text-xs font-medium
                  text-indigo-300 bg-indigo-500/10 border border-indigo-500/20
                  rounded-full px-4 py-1.5 mb-6"
                >
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                  Welcome back, {userData?.name?.split(" ")[0]} 👋
                </div>
              </FadeIn>

              <FadeIn delay={0.1}>
                <h1
                  className="text-5xl lg:text-7xl font-extrabold leading-[1.05]
                  tracking-tight mb-6"
                >
                  Create Smart
                  <br />

                  <span
                    className="bg-gradient-to-r from-indigo-400
                    via-purple-400 to-pink-400
                    bg-clip-text text-transparent"
                  >
                    AI Notes
                  </span>

                  <br />
                  in Seconds
                </h1>
              </FadeIn>

              <FadeIn delay={0.2}>
                <p
                  className="text-lg text-gray-400 leading-relaxed
                  max-w-xl mb-10"
                >
                  Generate exam-focused notes, project documentation,
                  flow diagrams and revision-ready content —
                  faster, cleaner and smarter.
                </p>
              </FadeIn>

              <FadeIn delay={0.3}>
                <div className="flex flex-wrap gap-4">

                  <motion.button
                    onClick={() => navigate("/notes")}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="
                      px-8 py-4 rounded-xl font-semibold text-base
                      bg-gradient-to-r from-indigo-500 to-purple-600
                      hover:from-indigo-400 hover:to-purple-500
                      shadow-[0_0_40px_rgba(99,102,241,0.35)]
                      hover:shadow-[0_0_60px_rgba(99,102,241,0.5)]
                      transition-all duration-300
                    "
                  >
                    ✨ Start Generating
                  </motion.button>

                  <motion.button
                    onClick={() => navigate("/history")}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="
                      px-6 py-4 rounded-xl font-medium text-base
                      text-gray-200
                      border border-white/15
                      bg-white/5
                      hover:bg-white/10
                      hover:border-white/25
                      transition-all duration-300
                    "
                  >
                    📚 My Notes
                  </motion.button>

                </div>
              </FadeIn>

              <FadeIn delay={0.4}>
                <div className="flex flex-wrap items-center gap-6 mt-10 text-sm text-gray-500">
                  {[
                    "AI Powered",
                    "Instant Notes",
                    "PDF Export",
                    "Flow Diagrams"
                  ].map((item) => (
                    <span key={item} className="flex items-center gap-1.5">
                      <span className="text-indigo-400 text-xs">✓</span>
                      {item}
                    </span>
                  ))}
                </div>
              </FadeIn>

            </div>

            {/* RIGHT IMAGE */}
            {/* RIGHT IMAGE */}
<FadeIn delay={0.3}>
  <div className="relative hidden lg:block">

    {/* Main AI Card */}
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className="
        relative rounded-3xl border border-white/10
        bg-gradient-to-br from-white/8 via-white/5 to-transparent
        backdrop-blur-sm p-6
        shadow-[0_40px_100px_rgba(0,0,0,0.65)]
        overflow-hidden
      "
    >

      {/* Window Header */}
      <div className="flex items-center gap-3 mb-5">

        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
        </div>

        <div
          className="
            flex-1 h-6 rounded-md
            bg-white/5 text-xs text-gray-500
            flex items-center px-3
          "
        >
          ExamCraft — Generating...
        </div>

      </div>

      {/* AI Content Lines */}
      <div className="space-y-3">

        <div className="h-3 rounded-full bg-indigo-500/40 w-4/5" />

        <div className="h-3 rounded-full bg-white/10 w-full" />

        <div className="h-3 rounded-full bg-white/10 w-3/4" />

        <div className="h-3 rounded-full bg-white/10 w-5/6" />

        <div className="h-3 rounded-full bg-purple-500/30 w-2/3" />

        <div className="h-3 rounded-full bg-white/10 w-full" />

        <div className="h-3 rounded-full bg-white/10 w-4/5" />

      </div>

      {/* Bottom Tags */}
      <div className="mt-6 flex flex-wrap gap-3">

        <div
          className="
            px-4 py-2 rounded-xl
            bg-indigo-500/20
            text-indigo-300
            text-sm font-medium
          "
        >
          📝 Exam Notes
        </div>

        <div
          className="
            px-4 py-2 rounded-xl
            bg-purple-500/20
            text-purple-300
            text-sm font-medium
          "
        >
          📊 Diagram
        </div>

        <div
          className="
            px-4 py-2 rounded-xl
            bg-emerald-500/20
            text-emerald-300
            text-sm font-medium
          "
        >
          ⬇️ PDF
        </div>

      </div>

    </motion.div>

    {/* Credits Floating Card */}
    <motion.div
      animate={{ y: [0, 8, 0] }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
        delay: 0.5
      }}
      className="
        absolute -left-8 top-10
        rounded-2xl border border-white/10
        bg-black/70 backdrop-blur-sm
        px-5 py-4 shadow-xl
      "
    >
      <p className="text-xs text-gray-400">
        Credits saved
      </p>

      <p className="text-2xl font-bold text-white">
        50
        <span className="text-emerald-400 text-sm ml-1">
          Free
        </span>
      </p>
    </motion.div>

    {/* Generation Speed Card */}
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{
        duration: 3.5,
        repeat: Infinity,
        ease: "easeInOut",
        delay: 1
      }}
      className="
        absolute -right-8 bottom-10
        rounded-2xl border border-white/10
        bg-black/70 backdrop-blur-sm
        px-5 py-4 shadow-xl
      "
    >
      <p className="text-xs text-gray-400">
        Generated in
      </p>

      <p className="text-2xl font-bold text-white">
        3.2
        <span className="text-indigo-400 text-sm">
          s
        </span>
      </p>
    </motion.div>

  </div>
</FadeIn>

          </div>
        </section>

        {/* ───────── QUICK ACTIONS ───────── */}
        <section className="max-w-7xl mx-auto px-6 py-10">

          <FadeIn delay={0.4}>
            <h2
              className="text-xs font-semibold uppercase tracking-widest
              text-gray-500 mb-5"
            >
              Quick actions
            </h2>
          </FadeIn>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">

            {[
              {
                icon: "✨",
                label: "Generate Notes",
                sub: "Create AI notes",
                action: () => navigate("/notes"),
              },
              {
                icon: "📚",
                label: "My History",
                sub: "View past notes",
                action: () => navigate("/history"),
              },
              {
                icon: "💎",
                label: "Buy Credits",
                sub: `${userData?.credits} remaining`,
                action: () => navigate("/pricing"),
              },
              {
                icon: "📄",
                label: "PDF Export",
                sub: "Download notes",
                action: () => navigate("/notes"),
              },
            ].map((item, i) => (

              <FadeIn key={item.label} delay={0.4 + i * 0.08}>

                <motion.button
                  onClick={item.action}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="
                    w-full text-left rounded-2xl p-5
                    border border-white/10
                    bg-gradient-to-br
                    from-white/8 via-white/5 to-transparent
                    backdrop-blur-sm
                    hover:border-indigo-500/30
                    hover:shadow-[0_10px_30px_rgba(99,102,241,0.15)]
                    transition-all duration-300
                  "
                >
                  <span className="text-3xl block mb-3">
                    {item.icon}
                  </span>

                  <p className="font-semibold text-white text-sm">
                    {item.label}
                  </p>

                  <p className="text-gray-400 text-xs mt-1">
                    {item.sub}
                  </p>

                </motion.button>

              </FadeIn>
            ))}

          </div>
        </section>

        {/* ───────── FEATURES ───────── */}
        <section className="max-w-7xl mx-auto px-6 py-16">

          <FadeIn>
            <div className="flex items-center justify-between mb-10">

              <h2 className="text-3xl font-bold text-white">
                What you can create
              </h2>

              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/notes")}
                className="
                  px-5 py-2.5 rounded-xl text-sm font-medium
                  text-white
                  bg-gradient-to-r from-indigo-500 to-purple-600
                  hover:opacity-90
                  transition-opacity
                "
              >
                Start now →
              </motion.button>

            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

            {[
              {
                icon: "📘",
                title: "Exam Notes",
                desc: "High-yield notes with revision points."
              },
              {
                icon: "📂",
                title: "Project Notes",
                desc: "Documentation for assignments."
              },
              {
                icon: "📊",
                title: "Diagrams",
                desc: "Visual flow charts and mind maps."
              },
              {
                icon: "⬇️",
                title: "PDF Download",
                desc: "Clean printable PDFs instantly."
              },
            ].map((f, i) => (

              <FadeIn key={f.title} delay={i * 0.07}>

                <motion.div
                  onClick={() => navigate("/notes")}
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="
                    cursor-pointer rounded-2xl p-6
                    border border-white/10
                    bg-gradient-to-br
                    from-white/8 via-white/5 to-transparent
                    backdrop-blur-sm
                    hover:border-indigo-500/30
                    hover:shadow-[0_16px_40px_rgba(0,0,0,0.45)]
                    transition-all duration-300
                  "
                >

                  <div className="text-4xl mb-4">
                    {f.icon}
                  </div>

                  <h3 className="font-semibold text-white text-base mb-2">
                    {f.title}
                  </h3>

                  <p className="text-gray-400 text-sm leading-relaxed">
                    {f.desc}
                  </p>

                </motion.div>

              </FadeIn>

            ))}

          </div>

        </section>

        <Footer />
      </div>
    </div>
  )
}

export default Home