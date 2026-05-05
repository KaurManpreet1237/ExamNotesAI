import React, { useState, useEffect } from 'react'
import { motion, useScroll, useTransform } from "motion/react"
import { useNavigate } from 'react-router-dom'
import logo from "../assets/logo.png"

// ─── Reusable primitives ──────────────────────────────────────────────────────
const GlassCard = ({ children, className = "", hover = true }) => (
  <div className={`
    rounded-2xl border border-white/10
    bg-gradient-to-br from-white/5 via-white/3 to-transparent
    backdrop-blur-sm
    ${hover ? "hover:border-white/20 hover:bg-white/8 transition-all duration-300" : ""}
    ${className}
  `}>
    {children}
  </div>
)

// ─── Animated background grid ─────────────────────────────────────────────────
const GridBg = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <div className="absolute inset-0"
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
        backgroundSize: "60px 60px"
      }}
    />
    {/* Radial glows */}
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
    <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />
    <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl" />
  </div>
)

// ─── Navbar ───────────────────────────────────────────────────────────────────
function LandingNav({ onCTA }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", fn)
    return () => window.removeEventListener("scroll", fn)
  }, [])

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-black/80 backdrop-blur-xl border-b border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="logo" className="w-8 h-8" />
          <span className="text-white font-semibold text-base">
            ExamNotes <span className="text-gray-400">AI</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how" className="hover:text-white transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onCTA}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold
            bg-white text-black hover:bg-gray-100 transition-all duration-200
            shadow-[0_4px_16px_rgba(255,255,255,0.15)]"
        >
          Start Free Trial
        </motion.button>
      </div>
    </motion.nav>
  )
}

// ─── Section helpers ──────────────────────────────────────────────────────────
const FadeIn = ({ children, delay = 0, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ duration: 0.6, delay }}
    className={className}
  >
    {children}
  </motion.div>
)

const SectionLabel = ({ children }) => (
  <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest
    text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-4">
    {children}
  </span>
)

const GradientText = ({ children, className = "" }) => (
  <span className={`bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400
    bg-clip-text text-transparent ${className}`}>
    {children}
  </span>
)

// ─── Main Auth / Landing ──────────────────────────────────────────────────────
function Auth() {
  const navigate = useNavigate()
  const cta = () => navigate('/login')

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white overflow-x-hidden">
      <LandingNav onCTA={cta} />

      {/* ══════ HERO ══════ */}
      <section className="relative min-h-screen flex items-center pt-24">
        <GridBg />
        <div className="relative max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left */}
          <div>
            <FadeIn delay={0}>
              <div className="inline-flex items-center gap-2 text-xs font-medium
                text-emerald-400 bg-emerald-500/10 border border-emerald-500/20
                rounded-full px-4 py-1.5 mb-6">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                50 free credits — no card required
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <h1 className="text-5xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6">
                Unlock Smart
                <br />
                <GradientText>AI Notes</GradientText>
                <br />
                in Seconds
              </h1>
            </FadeIn>

            <FadeIn delay={0.2}>
              <p className="text-lg text-gray-400 leading-relaxed max-w-lg mb-10">
                Generate exam-focused notes, project documentation, flow diagrams and
                revision-ready content using AI — faster, cleaner and smarter.
              </p>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="flex flex-wrap items-center gap-4">
                <motion.button
                  onClick={cta}
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-8 py-4 rounded-xl font-semibold text-base
                    bg-gradient-to-r from-indigo-500 to-purple-600
                    hover:from-indigo-400 hover:to-purple-500
                    shadow-[0_0_40px_rgba(99,102,241,0.35)]
                    hover:shadow-[0_0_60px_rgba(99,102,241,0.5)]
                    transition-all duration-300"
                >
                  🚀 Start Free Trial
                </motion.button>
                <button
                  onClick={() => document.getElementById("how").scrollIntoView({ behavior: "smooth" })}
                  className="px-6 py-4 rounded-xl font-medium text-base text-gray-300
                    border border-white/15 hover:border-white/30 hover:text-white
                    hover:bg-white/5 transition-all duration-300"
                >
                  See how it works →
                </button>
              </div>
            </FadeIn>

            <FadeIn delay={0.4}>
              <div className="flex flex-wrap items-center gap-6 mt-10 text-sm text-gray-500">
                {["50 free credits", "No credit card", "Instant access", "Cancel anytime"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <span className="text-indigo-400 text-xs">✓</span> {t}
                  </span>
                ))}
              </div>
            </FadeIn>
          </div>

          {/* Right — hero visual */}
          <FadeIn delay={0.3} className="hidden lg:block">
            <div className="relative">
              {/* Main card */}
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative rounded-2xl border border-white/15
                  bg-gradient-to-br from-white/8 via-white/4 to-transparent
                  backdrop-blur-sm p-6 shadow-[0_40px_100px_rgba(0,0,0,0.6)]"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                  <div className="flex-1 h-5 rounded bg-white/5 text-xs text-gray-500 flex items-center px-3">
                    ExamNotes AI — Generating...
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div className="h-3 bg-indigo-500/30 rounded-full w-4/5" />
                  <div className="h-3 bg-white/10 rounded-full w-full" />
                  <div className="h-3 bg-white/10 rounded-full w-3/4" />
                  <div className="h-3 bg-white/10 rounded-full w-5/6" />
                  <div className="h-3 bg-purple-500/20 rounded-full w-2/3" />
                  <div className="h-3 bg-white/10 rounded-full w-full" />
                  <div className="h-3 bg-white/10 rounded-full w-4/5" />
                </div>
                <div className="mt-4 flex gap-2">
                  <div className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-medium">
                    📝 Exam Notes
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-medium">
                    📊 Diagram
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-medium">
                    ⬇️ PDF
                  </div>
                </div>
              </motion.div>

              {/* Floating stat cards */}
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute -left-10 top-8 rounded-xl border border-white/15
                  bg-black/60 backdrop-blur-sm px-4 py-3 shadow-xl"
              >
                <p className="text-xs text-gray-400">Credits saved</p>
                <p className="text-xl font-bold text-white">50 <span className="text-emerald-400 text-sm">Free</span></p>
              </motion.div>

              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -right-8 bottom-10 rounded-xl border border-white/15
                  bg-black/60 backdrop-blur-sm px-4 py-3 shadow-xl"
              >
                <p className="text-xs text-gray-400">Generated in</p>
                <p className="text-xl font-bold text-white">3.2<span className="text-indigo-400 text-sm">s</span></p>
              </motion.div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════ FEATURES ══════ */}
      <section id="features" className="relative py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <FadeIn><SectionLabel>✦ Features</SectionLabel></FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="text-4xl lg:text-5xl font-extrabold mb-4">
                Everything you need to
                <br /><GradientText>ace your exams</GradientText>
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="text-gray-400 text-lg max-w-xl mx-auto">
                One platform. All your study tools. Powered by cutting-edge AI.
              </p>
            </FadeIn>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: "📘", title: "Exam Notes", desc: "High-yield, revision-ready notes with key points, definitions and exam tips auto-extracted.", tag: "Core", color: "from-blue-500/20 to-indigo-500/10" },
              { icon: "📂", title: "Project Notes", desc: "Well-structured documentation for assignments, projects and presentations.", tag: "Core", color: "from-purple-500/20 to-pink-500/10" },
              { icon: "📊", title: "Charts & Diagrams", desc: "Auto-generated flow diagrams, mind maps and visual charts from any topic.", tag: "Visual", color: "from-emerald-500/20 to-teal-500/10" },
              { icon: "⬇️", title: "PDF Export", desc: "Download clean, printable PDFs instantly — ready for offline study.", tag: "Export", color: "from-orange-500/20 to-amber-500/10" },
              { icon: "🎁", title: "50 Free Credits", desc: "Start immediately with 50 credits — no payment, no commitment, no friction.", tag: "Free", color: "from-rose-500/20 to-pink-500/10" },
              { icon: "⚡", title: "Instant Generation", desc: "AI-powered content generated in seconds, not minutes.", tag: "Speed", color: "from-yellow-500/20 to-orange-500/10" },
            ].map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.07}>
                <motion.div
                  whileHover={{ y: -6, scale: 1.015 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={`group relative rounded-2xl p-6 border border-white/8
                    bg-gradient-to-br ${f.color}
                    hover:border-white/20 transition-all duration-300 h-full`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-4xl">{f.icon}</div>
                    <span className="text-xs text-gray-500 bg-white/5 border border-white/10
                      rounded-full px-2.5 py-1">{f.tag}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                </motion.div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ HOW IT WORKS ══════ */}
      <section id="how" className="relative py-32">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <FadeIn><SectionLabel>✦ How it works</SectionLabel></FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="text-4xl lg:text-5xl font-extrabold mb-4">
                From topic to notes
                <br /><GradientText>in 3 simple steps</GradientText>
              </h2>
            </FadeIn>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-[33%] right-[33%] h-px bg-gradient-to-r from-indigo-500/50 via-purple-500/50 to-pink-500/50" />

            {[
              { step: "01", icon: "✏️", title: "Enter your topic", desc: "Type any topic, chapter or subject. Add class level and exam type for better results." },
              { step: "02", icon: "⚡", title: "AI generates instantly", desc: "Our AI processes your request and generates structured, exam-ready content in seconds." },
              { step: "03", icon: "⬇️", title: "Download & study", desc: "Review your notes, explore diagrams, and download clean PDFs for offline use." },
            ].map((s, i) => (
              <FadeIn key={s.step} delay={i * 0.15}>
                <div className="relative text-center group">
                  <div className="relative inline-flex w-20 h-20 rounded-2xl
                    bg-gradient-to-br from-indigo-500/20 to-purple-500/10
                    border border-white/15 items-center justify-center text-4xl mb-5
                    group-hover:border-indigo-500/50 transition-all duration-300 mx-auto">
                    {s.icon}
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full
                      bg-indigo-500 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{s.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ SOCIAL PROOF ══════ */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <FadeIn><SectionLabel>✦ Loved by students</SectionLabel></FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="text-4xl font-extrabold mb-4">
                What our students <GradientText>say</GradientText>
              </h2>
            </FadeIn>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { name: "Priya S.", role: "B.Tech Student", text: "Generated complete DBMS notes in under 30 seconds. The diagrams were perfect for my university exam.", stars: 5 },
              { name: "Arjun M.", role: "12th Grade", text: "I used ExamNotes AI for my board prep. The revision mode is incredible — saved me 3 hours per subject.", stars: 5 },
              { name: "Riya K.", role: "MBA Student", text: "Project documentation used to take me an entire evening. Now it takes 5 minutes. Game changer.", stars: 5 },
            ].map((t, i) => (
              <FadeIn key={t.name} delay={i * 0.1}>
                <GlassCard className="p-6 h-full">
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(t.stars)].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-sm">★</span>
                    ))}
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed mb-5">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30
                      border border-white/10 flex items-center justify-center font-semibold text-sm">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{t.name}</p>
                      <p className="text-gray-500 text-xs">{t.role}</p>
                    </div>
                  </div>
                </GlassCard>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ PRICING PREVIEW ══════ */}
      <section id="pricing" className="py-32 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2
            w-[500px] h-[500px] bg-purple-600/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <FadeIn><SectionLabel>✦ Simple pricing</SectionLabel></FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="text-4xl font-extrabold mb-4">
                Pay only for what you <GradientText>use</GradientText>
              </h2>
              <p className="text-gray-400">Start free. Top up when you need more.</p>
            </FadeIn>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { name: "Starter", price: "₹100", credits: "50 credits", tag: null, desc: "Perfect for quick revisions and single subjects." },
              { name: "Popular", price: "₹200", credits: "120 credits", tag: "Most Popular", desc: "Best value — ideal for semester prep and projects." },
              { name: "Pro", price: "₹500", credits: "300 credits", tag: "Best Value", desc: "For full syllabus coverage and serious preparation." },
            ].map((p, i) => (
              <FadeIn key={p.name} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -6, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={`relative rounded-2xl p-6 border transition-all duration-300
                    ${p.tag === "Most Popular"
                      ? "bg-gradient-to-br from-indigo-500/15 to-purple-500/10 border-indigo-500/40"
                      : "bg-white/3 border-white/10 hover:border-white/20"}`}
                >
                  {p.tag && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2
                      text-xs font-semibold px-4 py-1 rounded-full
                      bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                      {p.tag}
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-white mb-1">{p.name}</h3>
                  <p className="text-gray-500 text-sm mb-4">{p.desc}</p>
                  <p className="text-4xl font-extrabold text-white mb-1">{p.price}</p>
                  <p className="text-indigo-400 text-sm font-medium mb-5">{p.credits}</p>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={cta}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                      ${p.tag === "Most Popular"
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90"
                        : "bg-white/10 border border-white/15 text-white hover:bg-white/20"}`}
                  >
                    Get started
                  </motion.button>
                </motion.div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ FINAL CTA ══════ */}
      <section className="py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <FadeIn>
            <div className="relative rounded-3xl border border-white/10 overflow-hidden
              bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 p-16">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2
                  w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl" />
              </div>
              <div className="relative">
                <h2 className="text-4xl lg:text-5xl font-extrabold mb-4">
                  Ready to study <GradientText>smarter?</GradientText>
                </h2>
                <p className="text-gray-400 text-lg mb-8 max-w-lg mx-auto">
                  Join thousands of students using ExamNotes AI to generate
                  perfect exam notes in seconds.
                </p>
                <motion.button
                  onClick={cta}
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-10 py-4 rounded-xl font-semibold text-lg
                    bg-gradient-to-r from-indigo-500 to-purple-600
                    hover:from-indigo-400 hover:to-purple-500
                    shadow-[0_0_60px_rgba(99,102,241,0.4)]
                    hover:shadow-[0_0_80px_rgba(99,102,241,0.6)]
                    transition-all duration-300"
                >
                  🚀 Start for free — 50 credits
                </motion.button>
                <p className="text-gray-600 text-sm mt-4">No credit card required</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer className="border-t border-white/8 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <img src={logo} alt="logo" className="w-7 h-7" />
                <span className="font-semibold text-white">ExamNotes AI</span>
              </div>
              <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                AI-powered exam notes, project documentation, diagrams and PDFs.
                Built for students who want to study smarter.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium text-sm mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li><button onClick={cta} className="hover:text-white transition-colors">Exam Notes</button></li>
                <li><button onClick={cta} className="hover:text-white transition-colors">Project Notes</button></li>
                <li><button onClick={cta} className="hover:text-white transition-colors">Diagrams & Charts</button></li>
                <li><button onClick={cta} className="hover:text-white transition-colors">PDF Export</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium text-sm mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">support@examnotes.ai</span></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-600 text-xs">© {new Date().getFullYear()} ExamNotes AI. All rights reserved.</p>
            <p className="text-gray-700 text-xs">Built with AI · Made for students</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Auth
