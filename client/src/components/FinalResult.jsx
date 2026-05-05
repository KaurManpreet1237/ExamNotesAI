import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import MermaidSetup from './MermaidSetup'
import RechartSetUp from './RechartSetUp'
import { downloadPdf } from '../services/api'
import { motion } from 'motion/react'

// ─── Markdown render components ───────────────────────────────────────────────
const mdComponents = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-indigo-700 mt-6 mb-4 border-b border-indigo-100 pb-2">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold text-indigo-600 mt-5 mb-3">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-gray-700 leading-relaxed mb-3">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc ml-6 space-y-1.5 text-gray-700">{children}</ul>
  ),
  li: ({ children }) => (
    <li className="marker:text-indigo-500">{children}</li>
  ),
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, color }) {
  const palette = {
    indigo: "from-indigo-50 to-indigo-100/50 text-indigo-700 border-indigo-200",
    purple: "from-purple-50 to-purple-100/50 text-purple-700 border-purple-200",
    green:  "from-green-50 to-green-100/50 text-green-700 border-green-200",
    cyan:   "from-cyan-50 to-cyan-100/50 text-cyan-700 border-cyan-200",
    rose:   "from-rose-50 to-rose-100/50 text-rose-700 border-rose-200",
  }
  return (
    <div className={`mb-5 px-4 py-2.5 rounded-xl border
      bg-gradient-to-r ${palette[color] || palette.indigo}
      font-semibold flex items-center gap-2 text-base`}>
      <span>{icon}</span>
      <span>{title}</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
function FinalResult({ result }) {
  const [quickRevision, setQuickRevision] = useState(false)
  const [downloading, setDownloading]     = useState(false)
  const [dlError, setDlError]             = useState("")

  // Guard: don't render without required fields
  if (
    !result ||
    !result.subTopics ||
    !result.questions ||
    !result.revisionPoints
  ) return null

  const handleDownload = async () => {
    setDownloading(true)
    setDlError("")
    try {
      await downloadPdf(result)
    } catch (err) {
      console.error("PDF download error:", err)
      setDlError("Download failed. Please try again.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="mt-6 p-4 sm:p-6 space-y-10 bg-white rounded-2xl">

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold
          bg-gradient-to-r from-indigo-600 to-purple-600
          bg-clip-text text-transparent">
          📘 Generated Notes
        </h2>

        <div className="flex flex-wrap gap-3">
          {/* Quick revision toggle */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setQuickRevision(!quickRevision)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
              ${quickRevision
                ? "bg-green-600 text-white shadow-[0_4px_14px_rgba(34,197,94,0.35)]"
                : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
              }`}
          >
            {quickRevision ? "✓ Exit Revision" : "⚡ Quick Revision"}
          </motion.button>

          {/* Download PDF */}
          <div className="flex flex-col items-end gap-1">
            <motion.button
              whileHover={{ scale: downloading ? 1 : 1.03 }}
              whileTap={{ scale: downloading ? 1 : 0.97 }}
              onClick={handleDownload}
              disabled={downloading}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold
                transition-all duration-200
                ${downloading
                  ? "bg-indigo-300 cursor-not-allowed text-white"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 shadow-[0_4px_14px_rgba(99,102,241,0.4)]"
                }`}
            >
              {downloading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating PDF…
                </>
              ) : (
                <>⬇️ Download PDF</>
              )}
            </motion.button>

            {/* Error message under button */}
            {dlError && (
              <p className="text-red-500 text-xs">{dlError}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Sub Topics ── */}
      {!quickRevision && (
        <section>
          <SectionHeader icon="⭐" title="Sub Topics by Priority" color="indigo" />
          {Object.entries(result.subTopics).map(([star, topics]) => (
            <div key={star} className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-indigo-600">{star}</span>
                <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200
                  rounded-full px-2.5 py-0.5">
                  {star.includes("⭐⭐⭐") ? "Frequently Asked"
                   : star.includes("⭐⭐") ? "Important" : "Standard"}
                </span>
              </div>
              <ul className="list-disc ml-6 text-gray-700 space-y-1">
                {Array.isArray(topics) && topics.map((t, i) => (
                  <li key={i} className="marker:text-indigo-400">{t}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* ── Detailed Notes ── */}
      {!quickRevision && (
        <section>
          <SectionHeader icon="📝" title="Detailed Notes" color="purple" />
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <ReactMarkdown components={mdComponents}>
              {result.notes}
            </ReactMarkdown>
          </div>
        </section>
      )}

      {/* ── Quick Revision ── */}
      {quickRevision && (
        <section className="rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50
          border border-green-200 p-6">
          <h3 className="font-bold text-green-700 mb-4 text-lg flex items-center gap-2">
            ⚡ Exam Quick Revision Points
          </h3>
          <ul className="space-y-2 text-gray-800">
            {result.revisionPoints.map((p, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="text-green-500 mt-0.5 text-sm shrink-0">✓</span>
                {p}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Diagram ── */}
      {result.diagram?.data && (
        <section>
          <SectionHeader icon="📊" title="Diagram" color="cyan" />
          <MermaidSetup diagram={result.diagram.data} />
          <p className="mt-2 text-xs text-gray-400 italic">
            ℹ️ This diagram is included in your PDF download as an image.
          </p>
        </section>
      )}

      {/* ── Charts ── */}
      {result.charts?.length > 0 && (
        <section>
          <SectionHeader icon="📈" title="Visual Charts" color="indigo" />
          <RechartSetUp charts={result.charts} />
          <p className="mt-2 text-xs text-gray-400 italic">
            ℹ️ Charts are included in your PDF as rendered visuals.
          </p>
        </section>
      )}

      {/* ── Questions ── */}
      {result.questions && (
        <section>
          <SectionHeader icon="❓" title="Important Questions" color="rose" />

          {Array.isArray(result.questions.short) && result.questions.short.length > 0 && (
            <div className="mb-5">
              <p className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
                Short Answer Questions
              </p>
              <ul className="list-decimal ml-6 text-gray-700 space-y-1.5">
                {result.questions.short.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          )}

          {Array.isArray(result.questions.long) && result.questions.long.length > 0 && (
            <div className="mb-5">
              <p className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" />
                Long Answer Questions
              </p>
              <ul className="list-decimal ml-6 text-gray-700 space-y-1.5">
                {result.questions.long.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          )}

          {result.questions.diagram && (
            <div>
              <p className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 inline-block" />
                Diagram-Based Question
              </p>
              <ul className="list-disc ml-6 text-gray-700">
                <li>{result.questions.diagram}</li>
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default FinalResult