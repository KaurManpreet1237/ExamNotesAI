import React, { useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import MermaidSetup from './MermaidSetup'
import RechartSetUp from './RechartSetUp'
import { exportToPdf } from '../utils/exportPdf'
import { motion } from 'motion/react'

// ─── Markdown renderers ───────────────────────────────────────────────────────
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
  p:  ({ children }) => <p className="text-gray-700 leading-relaxed mb-3">{children}</p>,
  ul: ({ children }) => <ul className="list-disc ml-6 space-y-1.5 text-gray-700">{children}</ul>,
  li: ({ children }) => <li className="marker:text-indigo-500">{children}</li>,
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, color }) {
  const palette = {
    indigo: 'from-indigo-100 to-indigo-50 text-indigo-700',
    purple: 'from-purple-100 to-purple-50 text-purple-700',
    green:  'from-green-100  to-green-50  text-green-700',
    cyan:   'from-cyan-100   to-cyan-50   text-cyan-700',
    rose:   'from-rose-100   to-rose-50   text-rose-700',
  }
  return (
    <div className={`mb-4 px-4 py-2.5 rounded-xl
      bg-gradient-to-r ${palette[color] || palette.indigo}
      font-semibold flex items-center gap-2 text-base`}>
      <span>{icon}</span>
      <span>{title}</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
function FinalResult({ result }) {
  const contentRef = useRef(null)
  const [quickRev, setQuickRev]   = useState(false)
  const [downloading, setDL]      = useState(false)
  const [dlError, setErr]         = useState('')

  if (
    !result ||
    !result.subTopics ||
    !result.questions ||
    !result.revisionPoints
  ) return null

  // Extract topic from notes heading for the PDF header label
  const topicMatch = (result.notes || '').match(/^#+\s+(.+)/m)
  const topicName  = topicMatch ? topicMatch[1].replace(/[#*]/g, '').trim() : 'Study Notes'

  const handleDownload = async () => {
    if (!contentRef.current) return
    setDL(true)
    setErr('')
    try {
      // Short settle: ensures Recharts/Mermaid fully paint before capture
      await new Promise((r) => setTimeout(r, 300))
      await exportToPdf(contentRef.current, 'ExamCraft', topicName)
    } catch (e) {
      console.error('PDF export error:', e)
      setErr('Download failed. Please try again.')
    } finally {
      setDL(false)
    }
  }

  return (
    // contentRef — everything inside here is captured for the PDF
    <div ref={contentRef} className="mt-4 p-3 sm:p-4 space-y-8 bg-white">

      {/*
        data-pdf-hide — exportPdf.js finds this in onclone and sets display:none.
        This means the buttons are VISIBLE to the user but HIDDEN in the PDF capture.
        ──────────────────────────────────────────────────────────────────────────
      */}
      <div data-pdf-hide className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Page title — plain text, no gradient clip (which html2canvas breaks) */}
        <h2 className="text-2xl sm:text-3xl font-bold text-indigo-700">
          📘 Generated Notes
        </h2>

        <div className="flex flex-wrap gap-3">
          {/* Quick Revision toggle */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setQuickRev(!quickRev)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${quickRev
                ? 'bg-green-600 text-white shadow-[0_4px_14px_rgba(34,197,94,0.35)]'
                : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
              }`}
          >
            {quickRev ? '✓ Exit Revision' : '⚡ Quick Revision'}
          </motion.button>

          {/* Download button */}
          <div>
            <motion.button
              whileHover={{ scale: downloading ? 1 : 1.03 }}
              whileTap={{ scale: downloading ? 1 : 0.97 }}
              onClick={handleDownload}
              disabled={downloading}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold
                transition-all duration-200
                ${downloading
                  ? 'bg-indigo-300 cursor-not-allowed text-white'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 shadow-[0_4px_14px_rgba(99,102,241,0.4)]'
                }`}
            >
              {downloading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating PDF…
                </>
              ) : (
                <>⬇️ Download PDF</>
              )}
            </motion.button>
            {dlError && <p className="text-red-500 text-xs mt-1">{dlError}</p>}
          </div>
        </div>
      </div>

      {/* ── Sub Topics ── (included in PDF) */}
      {!quickRev && (
        <section>
          <SectionHeader icon="⭐" title="Sub Topics by Priority" color="indigo" />
          {Object.entries(result.subTopics).map(([star, topics]) => (
            <div key={star} className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-indigo-600">{star}</span>
                <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200
                  rounded-full px-2.5 py-0.5">
                  {star.includes('⭐⭐⭐') ? 'Frequently Asked'
                   : star.includes('⭐⭐') ? 'Important' : 'Standard'}
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
      {!quickRev && (
        <section>
          <SectionHeader icon="📝" title="Detailed Notes" color="purple" />
          <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 shadow-sm">
            <ReactMarkdown components={mdComponents}>{result.notes}</ReactMarkdown>
          </div>
        </section>
      )}

      {/* ── Quick Revision ── */}
      {quickRev && (
        <section className="rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50
          border border-green-200 p-5 sm:p-6">
          <h3 className="font-bold text-green-700 mb-4 text-lg">⚡ Quick Revision Points</h3>
          <ul className="space-y-2 text-gray-800">
            {result.revisionPoints.map((p, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="text-green-500 mt-0.5 shrink-0">✓</span>{p}
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
        </section>
      )}

      {/* ── Charts ── */}
      {result.charts?.length > 0 && (
        <section>
          <SectionHeader icon="📈" title="Visual Charts" color="indigo" />
          <RechartSetUp charts={result.charts} />
        </section>
      )}

      {/* ── Important Questions ── */}
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