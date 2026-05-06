import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { serverUrl } from '../App'
import { AnimatePresence, motion } from "motion/react"
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
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
    <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-purple-600/7 rounded-full blur-3xl" />
    <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-indigo-600/6 rounded-full blur-3xl" />
  </div>
)

function History() {
  const [topics,         setTopics]       = useState([])
  const navigate                          = useNavigate()
  const { userData }                      = useSelector((state) => state.user)
  const [isSidebarOpen,  setIsSidebarOpen] = useState(false)
  const [activeNoteId,   setActiveNoteId]  = useState(null)
  const [selectedNote,   setSelectedNote]  = useState(null)
  const [loading,        setLoading]       = useState(false)

  useEffect(() => {
    const myNotes = async () => {
      try {
        const res = await axios.get(serverUrl + "/api/notes/getnotes", { withCredentials: true })
        setTopics(Array.isArray(res.data) ? res.data : [])
      } catch (error) { console.log(error) }
    }
    myNotes()
  }, [])

  const openNotes = async (noteId) => {
    setLoading(true)
    setActiveNoteId(noteId)
    if (window.innerWidth < 1024) setIsSidebarOpen(false)
    try {
      const res = await axios.get(serverUrl + `/api/notes/${noteId}`, { withCredentials: true })
      setSelectedNote(res.data.content)
    } catch (error) { console.log(error) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (window.innerWidth >= 1024) setIsSidebarOpen(true)
  }, [])

  return (
    <div className="min-h-screen">
      <PageBg />
      <Navbar />

      {/* ── Mobile overlay drawer ── */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 z-50 h-full
                w-full xs:w-80 sm:w-80
                bg-gradient-to-br from-[#0d0d14] via-[#111118] to-[#0d0d14]
                border-r border-white/10
                shadow-[4px_0_40px_rgba(0,0,0,0.7)]
                flex flex-col lg:hidden"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/8">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📚</span>
                  <span className="text-white font-semibold text-sm">Your Notes</span>
                  {topics.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full
                      bg-indigo-500/25 text-indigo-300 border border-indigo-500/25 font-bold">
                      {topics.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="w-7 h-7 rounded-lg bg-white/8 border border-white/10
                    flex items-center justify-center text-gray-400
                    hover:bg-white/15 hover:text-white transition-all"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate("/notes")}
                  className="w-full mb-3 flex items-center justify-center gap-2
                    px-4 py-2.5 rounded-xl
                    bg-gradient-to-r from-indigo-500 to-purple-600
                    text-white text-sm font-semibold
                    hover:opacity-90 transition-opacity shadow-sm"
                >
                  + New Notes
                </motion.button>
                {topics.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-3xl mb-2">📭</p>
                    <p className="text-xs text-gray-500">No notes yet</p>
                  </div>
                ) : (
                  topics.map((t, i) => (
                    <NoteCard key={i} t={t} active={activeNoteId === t._id} onClick={() => openNotes(t._id)} />
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Page body ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Mobile top bar */}
        <div className="flex items-center justify-between mb-5 lg:hidden">
          <div>
            <h1 className="text-xl font-extrabold text-white">My Notes</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {topics.length} note{topics.length !== 1 ? "s" : ""}
            </p>
          </div>
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl
              bg-gradient-to-r from-indigo-500 to-purple-600
              text-white text-sm font-semibold shadow-sm"
          >
            ☰ Notes
          </motion.button>
        </div>

        {/* Desktop two-column layout */}
        <div className="flex gap-6">

          {/* Desktop sidebar */}
          <aside className="hidden lg:flex flex-col
            w-64 xl:w-72 shrink-0 rounded-2xl
            bg-gradient-to-br from-black/90 via-black/85 to-black/90
            backdrop-blur-xl border border-white/10
            shadow-[0_20px_60px_rgba(0,0,0,0.45)]
            p-5 h-[calc(100vh-110px)] sticky top-4 overflow-y-auto"
          >
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/notes")}
              className="w-full mb-4 flex items-center justify-center gap-2
                px-4 py-2.5 rounded-xl
                bg-gradient-to-r from-indigo-500 to-purple-600
                text-white text-sm font-semibold
                hover:opacity-90 transition-opacity shadow-sm"
            >
              + New Notes
            </motion.button>
            <div className="h-px bg-white/10 mb-4" />
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white">Your Notes</h2>
              {topics.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full
                  bg-indigo-500/20 text-indigo-300 border border-indigo-500/20">
                  {topics.length}
                </span>
              )}
            </div>
            {topics.length === 0 ? (
              <p className="text-xs text-gray-500 px-1">No notes yet.</p>
            ) : (
              <ul className="space-y-2">
                {topics.map((t, i) => (
                  <NoteCard key={i} t={t} active={activeNoteId === t._id} onClick={() => openNotes(t._id)} />
                ))}
              </ul>
            )}
          </aside>

          {/* Main content — dark card */}
          <main className="flex-1 min-w-0 rounded-2xl
            bg-gradient-to-br from-[#111118] via-[#0f0f16] to-[#111118]
            border border-white/10
            shadow-[0_20px_60px_rgba(0,0,0,0.5)]
            p-4 sm:p-6 min-h-[75vh]"
          >
            {loading && (
              <div className="flex flex-col items-center justify-center h-full py-20">
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="text-4xl mb-4"
                >
                  📖
                </motion.div>
                <p className="text-gray-500 text-sm">Loading notes…</p>
              </div>
            )}

            {!loading && !selectedNote && (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center px-4">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="w-14 h-14 rounded-2xl
                    bg-gradient-to-br from-indigo-500/20 to-purple-500/10
                    border border-indigo-500/20
                    flex items-center justify-center text-2xl mb-4"
                >
                  📚
                </motion.div>
                <p className="text-base font-semibold text-white mb-1">Select a note</p>
                <p className="text-sm text-gray-500 max-w-xs">
                  Choose a topic from the sidebar to view your notes.
                </p>
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden mt-5 px-5 py-2.5 rounded-xl text-sm font-medium
                    bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm"
                >
                  Browse Notes
                </motion.button>
              </div>
            )}

            {!loading && selectedNote && (
              <FinalResult result={selectedNote} />
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

// ─── Note card ────────────────────────────────────────────────────────────────
function NoteCard({ t, active, onClick }) {
  return (
    <motion.li
      whileHover={{ x: 2 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={`list-none cursor-pointer rounded-xl p-3 border transition-all duration-200
        ${active
          ? "bg-indigo-500/25 border-indigo-500/50 shadow-[0_0_0_1px_rgba(99,102,241,0.3)]"
          : "bg-white/5 border-white/8 hover:bg-white/10 hover:border-white/15"
        }`}
    >
      <p className="text-sm font-semibold text-white truncate">{t.topic}</p>
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {t.classLevel && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
            {t.classLevel}
          </span>
        )}
        {t.examType && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
            {t.examType}
          </span>
        )}
      </div>
      <div className="flex gap-2.5 mt-1.5 text-[10px] text-gray-500">
        {t.revisionMode   && <span>⚡ Revision</span>}
        {t.includeDiagram && <span>📊 Diagram</span>}
        {t.includeChart   && <span>📈 Chart</span>}
      </div>
    </motion.li>
  )
}

export default History
