import React, { useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import MermaidSetup from './MermaidSetup'
import RechartSetUp from './RechartSetUp'
import { exportToPdf } from '../utils/exportPdf'
import { motion } from 'motion/react'

// ─── Dark markdown renderers ──────────────────────────────────────────────────
const mdComponents = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-indigo-400 mt-6 mb-4 border-b border-indigo-500/20 pb-2">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold text-indigo-300 mt-5 mb-3">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold text-gray-200 mt-4 mb-2">{children}</h3>
  ),
  p:  ({ children }) => <p className="text-gray-300 leading-relaxed mb-3">{children}</p>,
  ul: ({ children }) => <ul className="list-disc ml-6 space-y-1.5 text-gray-300">{children}</ul>,
  li: ({ children }) => <li className="marker:text-indigo-400">{children}</li>,
  strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
  code: ({ children }) => (
    <code className="bg-white/8 text-indigo-300 px-1.5 py-0.5 rounded text-sm font-mono">
      {children}
    </code>
  ),
}

// ─── Dark section header ──────────────────────────────────────────────────────
function SectionHeader({ icon, title, color }) {
  const palette = {
    indigo: 'bg-indigo-500/12 border-indigo-500/20 text-indigo-300',
    purple: 'bg-purple-500/12 border-purple-500/20 text-purple-300',
    green:  'bg-green-500/12  border-green-500/20  text-green-300',
    cyan:   'bg-cyan-500/12   border-cyan-500/20   text-cyan-300',
    rose:   'bg-rose-500/12   border-rose-500/20   text-rose-300',
  }
  return (
    <div className={`mb-4 px-4 py-2.5 rounded-xl border
      ${palette[color] || palette.indigo}
      font-semibold flex items-center gap-2 text-sm`}>
      <span>{icon}</span>
      <span>{title}</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
function FinalResult({ result }) {
  const contentRef            = useRef(null)
  const [quickRev, setQuickRev] = useState(false)
  const [downloading, setDL]    = useState(false)
  const [dlError, setErr]       = useState('')

  if (
    !result ||
    !result.subTopics ||
    !result.questions ||
    !result.revisionPoints
  ) return null

  const topicMatch = (result.notes || '').match(/^#+\s+(.+)/m)
  const topicName  = topicMatch ? topicMatch[1].replace(/[#*]/g, '').trim() : 'Study Notes'

  const handleDownload = async () => {
    if (!contentRef.current) return
    setDL(true)
    setErr('')
    try {
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
    <div ref={contentRef} className="space-y-8">

      {/* ── Action bar (hidden in PDF) ── */}
      <div data-pdf-hide className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white">
          📘 Generated Notes
        </h2>

        <div className="flex flex-wrap gap-3">
          {/* Quick Revision toggle */}
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setQuickRev(!quickRev)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${quickRev
                ? 'bg-green-500/20 border border-green-500/30 text-green-300'
                : 'bg-white/8 border border-white/12 text-gray-300 hover:bg-white/12 hover:text-white'
              }`}
          >
            {quickRev ? '✓ Exit Revision' : '⚡ Quick Revision'}
          </motion.button>

          {/* Download */}
          <div>
            <motion.button
              whileHover={{ y: downloading ? 0 : -1 }}
              whileTap={{ scale: downloading ? 1 : 0.97 }}
              onClick={handleDownload}
              disabled={downloading}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold
                transition-all duration-200
                ${downloading
                  ? 'bg-indigo-500/30 cursor-not-allowed text-indigo-400'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 shadow-[0_4px_14px_rgba(99,102,241,0.3)]'
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
            {dlError && <p className="text-red-400 text-xs mt-1">{dlError}</p>}
          </div>
        </div>
      </div>

      {/* ── Sub Topics ── */}
      {!quickRev && (
        <section>
          <SectionHeader icon="⭐" title="Sub Topics by Priority" color="indigo" />
          {Object.entries(result.subTopics).map(([star, topics]) => (
            <div key={star} className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-indigo-300">{star}</span>
                <span className="text-xs text-gray-500 bg-white/5 border border-white/10
                  rounded-full px-2.5 py-0.5">
                  {star.includes('⭐⭐⭐') ? 'Frequently Asked'
                   : star.includes('⭐⭐') ? 'Important' : 'Standard'}
                </span>
              </div>
              <ul className="list-disc ml-6 text-gray-300 space-y-1">
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
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5 sm:p-6">
            <ReactMarkdown components={mdComponents}>{result.notes}</ReactMarkdown>
          </div>
        </section>
      )}

      {/* ── Quick Revision ── */}
      {quickRev && (
        <section className="rounded-2xl bg-green-500/10 border border-green-500/20 p-5 sm:p-6">
          <h3 className="font-bold text-green-300 mb-4 text-base">⚡ Quick Revision Points</h3>
          <ul className="space-y-2">
            {result.revisionPoints.map((p, i) => (
              <li key={i} className="flex items-start gap-2.5 text-gray-300 text-sm">
                <span className="text-green-400 mt-0.5 shrink-0">✓</span>{p}
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
              <p className="font-semibold text-gray-300 text-sm mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
                Short Answer Questions
              </p>
              <ul className="list-decimal ml-6 text-gray-400 space-y-1.5 text-sm">
                {result.questions.short.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          )}

          {Array.isArray(result.questions.long) && result.questions.long.length > 0 && (
            <div className="mb-5">
              <p className="font-semibold text-gray-300 text-sm mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />
                Long Answer Questions
              </p>
              <ul className="list-decimal ml-6 text-gray-400 space-y-1.5 text-sm">
                {result.questions.long.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          )}

          {result.questions.diagram && (
            <div>
              <p className="font-semibold text-gray-300 text-sm mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
                Diagram-Based Question
              </p>
              <ul className="list-disc ml-6 text-gray-400 text-sm">
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
