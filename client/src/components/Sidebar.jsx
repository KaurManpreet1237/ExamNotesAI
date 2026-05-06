import React from 'react'
import { motion } from 'motion/react'

function Sidebar({ result }) {
  if (
    !result ||
    !result.subTopics ||
    !result.questions ||
    !result.questions.short ||
    !result.questions.long
  ) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl
        bg-gradient-to-br from-black/90 via-black/85 to-black/90
        backdrop-blur-xl border border-white/10
        shadow-[0_20px_50px_rgba(0,0,0,0.45)]
        p-5 space-y-6 text-white"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/25
          flex items-center justify-center text-base">
          📌
        </div>
        <div>
          <h3 className="text-sm font-bold text-white leading-tight">Quick Exam View</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">Priority overview</p>
        </div>
      </div>

      {/* Importance badge */}
      {result.importance && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl
          bg-amber-500/10 border border-amber-500/20">
          <span className="text-sm">{result.importance}</span>
          <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide">
            Importance
          </span>
        </div>
      )}

      {/* Sub Topics */}
      <section>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          ⭐ Sub Topics (Priority)
        </p>
        <div className="space-y-2">
          {Object.entries(result.subTopics).map(([star, topics]) => {
            const isHigh   = star.includes("⭐⭐⭐")
            const isMed    = star.includes("⭐⭐") && !isHigh
            const color    = isHigh ? "text-red-400 bg-red-500/10 border-red-500/20"
                           : isMed  ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                                    : "text-green-400 bg-green-500/10 border-green-500/20"
            return (
              <div key={star}
                className={`rounded-xl border p-3 ${color}`}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  {star}
                </p>
                <ul className="space-y-1">
                  {topics.map((t, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-300">
                      <span className="mt-0.5 shrink-0 opacity-60">•</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      {/* Questions */}
      <section className="space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          ❓ Important Questions
        </p>

        {/* Short */}
        <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-3">
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2">
            Short Answer
          </p>
          <ul className="space-y-1.5">
            {result.questions.short.map((q, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-300">
                <span className="text-indigo-400 font-bold shrink-0 mt-0.5">Q{i + 1}.</span>
                {q}
              </li>
            ))}
          </ul>
        </div>

        {/* Long */}
        <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-3">
          <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2">
            Long Answer
          </p>
          <ul className="space-y-1.5">
            {result.questions.long.map((q, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-300">
                <span className="text-purple-400 font-bold shrink-0 mt-0.5">Q{i + 1}.</span>
                {q}
              </li>
            ))}
          </ul>
        </div>

        {/* Diagram question */}
        {result.questions.diagram && (
          <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-3">
            <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-2">
              Diagram Based
            </p>
            <p className="text-[11px] text-gray-300">{result.questions.diagram}</p>
          </div>
        )}
      </section>
    </motion.div>
  )
}

export default Sidebar