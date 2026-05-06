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
    <div className="min-h-screen bg-[#fafafa] text-black">
      <Navbar />

      {/* ── Hero ── */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <FadeIn delay={0}>
              <div className="inline-flex items-center gap-2 text-xs font-medium
                text-indigo-600 bg-indigo-50 border border-indigo-100
                rounded-full px-4 py-1.5 mb-5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                Welcome back, {userData?.name?.split(" ")[0]} 👋
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight mb-5
                bg-gradient-to-br from-gray-900 via-gray-700 to-gray-900
                bg-clip-text text-transparent">
                Create Smart
                <br />
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600
                  bg-clip-text text-transparent">
                  AI Notes
                </span>
                <br />
                in Seconds
              </h1>
            </FadeIn>

            <FadeIn delay={0.2}>
              <p className="text-gray-500 text-lg leading-relaxed max-w-lg mb-8">
                Generate exam-focused notes, project documentation, flow diagrams
                and revision-ready content — faster, cleaner and smarter.
              </p>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="flex flex-wrap gap-3">
                <motion.button
                  onClick={() => navigate("/notes")}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                  className="px-8 py-3.5 rounded-xl font-semibold text-base text-white
                    bg-gradient-to-r from-indigo-600 to-purple-600
                    hover:from-indigo-500 hover:to-purple-500
                    shadow-[0_8px_30px_rgba(99,102,241,0.35)]
                    hover:shadow-[0_12px_40px_rgba(99,102,241,0.5)]
                    transition-all duration-300"
                >
                  ✨ Start Generating
                </motion.button>
                <motion.button
                  onClick={() => navigate("/history")}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                  className="px-6 py-3.5 rounded-xl font-medium text-base text-gray-700
                    bg-white border border-gray-200 hover:border-gray-300
                    shadow-sm hover:shadow-md transition-all duration-300"
                >
                  📚 My Notes
                </motion.button>
              </div>
            </FadeIn>
          </div>

          {/* Right image — NO 3D transforms (cause blur on GPU compositing) */}
          <FadeIn delay={0.3}>
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="relative rounded-3xl overflow-hidden
                border border-gray-200 shadow-[0_30px_80px_rgba(0,0,0,0.12)]">
                <img
                  src={img}
                  alt="Students studying"
                  className="w-full object-cover"
                />
                {/* Floating badges */}
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm
                    border border-gray-200 rounded-2xl px-4 py-2.5 shadow-lg"
                >
                  <p className="text-xs text-gray-500">Generated in</p>
                  <p className="text-base font-bold text-gray-900">3.2 seconds ⚡</p>
                </motion.div>
                <motion.div
                  animate={{ y: [0, 6, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm
                    border border-gray-200 rounded-2xl px-4 py-2.5 shadow-lg"
                >
                  <p className="text-xs text-gray-500">Credits</p>
                  <p className="text-base font-bold text-indigo-600">{userData?.credits} 💠</p>
                </motion.div>
              </div>
            </motion.div>
          </FadeIn>
        </div>
      </section>

      {/* ── Quick actions ── */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        <FadeIn delay={0.4}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
            Quick actions
          </h2>
        </FadeIn>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: "✨", label: "Generate Notes", sub: "Create AI notes", action: () => navigate("/notes"), gradient: "from-indigo-500/10 to-purple-500/5", border: "hover:border-indigo-300" },
            { icon: "📚", label: "My History", sub: "View past notes", action: () => navigate("/history"), gradient: "from-blue-500/10 to-cyan-500/5", border: "hover:border-blue-300" },
            { icon: "💎", label: "Buy Credits", sub: `${userData?.credits} remaining`, action: () => navigate("/pricing"), gradient: "from-emerald-500/10 to-teal-500/5", border: "hover:border-emerald-300" },
            { icon: "📄", label: "PDF Export", sub: "Download notes", action: () => navigate("/notes"), gradient: "from-orange-500/10 to-amber-500/5", border: "hover:border-orange-300" },
          ].map((item, i) => (
            <FadeIn key={item.label} delay={0.4 + i * 0.08}>
              {/* Clean hover: y translate + shadow only — no scale on container, no 3D */}
              <motion.button
                onClick={item.action}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`w-full text-left rounded-2xl p-5 border border-gray-200
                  bg-gradient-to-br ${item.gradient}
                  ${item.border}
                  hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]
                  transition-all duration-300 group`}
              >
                <span className="text-3xl block mb-3">{item.icon}</span>
                <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                <p className="text-gray-500 text-xs mt-0.5">{item.sub}</p>
              </motion.button>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <FadeIn>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">What you can create</h2>
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/notes")}
              className="px-5 py-2 rounded-xl text-sm font-medium text-white
                bg-gradient-to-r from-indigo-600 to-purple-600
                hover:opacity-90 transition-opacity"
            >
              Start now →
            </motion.button>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: "📘", title: "Exam Notes", desc: "High-yield notes with revision points.", color: "border-blue-100 hover:border-blue-300" },
            { icon: "📂", title: "Project Notes", desc: "Documentation for assignments.", color: "border-purple-100 hover:border-purple-300" },
            { icon: "📊", title: "Diagrams", desc: "Visual flow charts and mind maps.", color: "border-emerald-100 hover:border-emerald-300" },
            { icon: "⬇️", title: "PDF Download", desc: "Clean printable PDFs instantly.", color: "border-orange-100 hover:border-orange-300" },
          ].map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.07}>
              {/* No 3D preserve-3d, no translateZ — just y-lift + shadow elevation */}
              <motion.div
                onClick={() => navigate("/notes")}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`cursor-pointer rounded-2xl p-6 bg-white border ${f.color}
                  shadow-sm hover:shadow-[0_16px_40px_rgba(0,0,0,0.1)]
                  transition-all duration-300`}
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 text-base mb-1.5">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default Home
