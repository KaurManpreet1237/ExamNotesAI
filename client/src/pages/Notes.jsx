import React, { useState } from 'react'
import { motion, AnimatePresence } from "motion/react"
import { useSelector } from 'react-redux'
import TopicForm from '../components/TopicForm'
import Sidebar from '../components/Sidebar'
import FinalResult from '../components/FinalResult'
import Navbar from '../components/Navbar'

// ─── Dark background ──────────────────────────────────────────────────────────
const PageBg = () => (
  <div className="fixed inset-0 pointer-events-none -z-10">
    <div className="absolute inset-0 bg-[#0a0a0b]" />
    <div className="absolute inset-0" style={{
      backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
      backgroundSize: "56px 56px"
    }} />
    <div className="absolute top-0 right-1/3 w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-3xl" />
    <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-purple-600/6 rounded-full blur-3xl" />
  </div>
)

function Notes() {
  const { userData } = useSelector((state) => state.user)
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState("")

  return (
    <div className="min-h-screen">
      <PageBg />
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">

        {/* ── Page header ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase
            tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20
            rounded-full px-3 py-1 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            AI Workspace
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
            Generate Notes
          </h1>
          <p className="text-gray-500 text-sm mt-1.5">
            Enter any topic and let AI build exam-ready notes, diagrams and charts in seconds.
          </p>
        </motion.div>

        {/* ── TopicForm ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06 }}
        >
          <TopicForm
            loading={loading}
            setResult={setResult}
            setLoading={setLoading}
            setError={setError}
          />
        </motion.div>

        {/* ── Error banner ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-2.5 text-red-400 text-sm
                bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
            >
              <span className="text-base shrink-0">⚠️</span>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty state ── */}
        {!result && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="rounded-2xl border-2 border-dashed border-white/8
              bg-white/3
              flex flex-col items-center justify-center
              py-20 px-6 text-center"
          >
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-16 h-16 rounded-2xl
                bg-gradient-to-br from-indigo-500/20 to-purple-500/10
                border border-indigo-500/20
                flex items-center justify-center text-3xl mb-5"
            >
              📘
            </motion.div>
            <h3 className="text-base font-semibold text-white mb-1.5">
              Generated notes will appear here
            </h3>
            <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
              Fill in the form above, choose your options, and click{" "}
              <span className="text-indigo-400 font-medium">Generate Notes</span>.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {["📋 Exam Notes", "📊 Diagrams", "📈 Charts", "⬇️ PDF Export"].map((f) => (
                <span key={f}
                  className="text-xs px-3 py-1.5 rounded-full
                    bg-white/5 border border-white/10 text-gray-400">
                  {f}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Result panel ── */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="flex flex-col lg:grid lg:grid-cols-4 gap-6"
          >
            <div className="lg:col-span-1 lg:sticky lg:top-4 self-start">
              <Sidebar result={result} />
            </div>

            {/* Dark notes card */}
            <div className="lg:col-span-3 rounded-2xl
              bg-gradient-to-br from-[#111118] via-[#0f0f16] to-[#111118]
              border border-white/10
              shadow-[0_20px_60px_rgba(0,0,0,0.5)]
              p-4 sm:p-6">
              <FinalResult result={result} />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default Notes
