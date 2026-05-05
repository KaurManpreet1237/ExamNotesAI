import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from "motion/react"
import logo from "../assets/logo.png"
import { useDispatch, useSelector } from 'react-redux'
import axios from 'axios'
import { serverUrl } from '../App'
import { setUserData } from '../redux/userSlice'
import { useNavigate } from 'react-router-dom'

function Navbar() {
  const { userData } = useSelector((state) => state.user)
  const credits = userData.credits
  const [showCredits, setShowCredits] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const dispatch = useDispatch()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", fn)
    return () => window.removeEventListener("scroll", fn)
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    const fn = () => { setShowCredits(false); setShowProfile(false) }
    document.addEventListener("click", fn)
    return () => document.removeEventListener("click", fn)
  }, [])

  const handleSignOut = async () => {
    try {
      await axios.get(serverUrl + "/api/auth/logout", { withCredentials: true })
      dispatch(setUserData(null))
      navigate("/")
    } catch (error) { console.log(error) }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`sticky top-0 z-50 mx-4 mt-4 rounded-2xl
        bg-gradient-to-r from-black/85 via-black/80 to-black/85
        backdrop-blur-2xl border transition-all duration-500
        flex items-center justify-between px-6 py-3.5
        ${scrolled
          ? "border-white/15 shadow-[0_8px_40px_rgba(0,0,0,0.8)]"
          : "border-white/8 shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
        }`}
    >
      {/* Logo */}
      <div
        onClick={() => navigate("/")}
        className="flex items-center gap-2.5 cursor-pointer group"
      >
        <img src={logo} alt="logo" className="w-8 h-8 group-hover:scale-105 transition-transform duration-200" />
        <span className="text-base font-semibold text-white hidden sm:block">
          ExamNotes <span className="text-gray-500">AI</span>
        </span>
      </div>

      {/* Center nav links */}
      <div className="hidden md:flex items-center gap-1 bg-white/5 border border-white/8 rounded-xl p-1">
        {[
          { label: "Generate", path: "/notes", icon: "✨" },
          { label: "History", path: "/history", icon: "📚" },
          { label: "Pricing", path: "/pricing", icon: "💎" },
        ].map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg
              text-sm text-gray-400 hover:text-white hover:bg-white/8
              transition-all duration-200"
          >
            <span className="text-xs">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Credits */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <motion.button
            onClick={() => { setShowCredits(!showCredits); setShowProfile(false) }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl
              bg-white/8 border border-white/12 text-white text-sm
              hover:bg-white/12 hover:border-white/20 transition-all duration-200"
          >
            <span className="text-base">💠</span>
            <span className="font-medium">{credits}</span>
            <span className="w-4 h-4 rounded-full bg-white text-black text-[10px] font-bold
              flex items-center justify-center ml-0.5">+</span>
          </motion.button>

          <AnimatePresence>
            {showCredits && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 8, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-64 rounded-2xl
                  bg-black/95 backdrop-blur-xl border border-white/12
                  shadow-[0_24px_60px_rgba(0,0,0,0.8)] p-4 text-white"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm">Your Credits</h4>
                  <span className="text-xl font-bold text-indigo-400">{credits}</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full mb-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    style={{ width: `${Math.min((credits / 50) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mb-4">Use credits to generate AI notes, diagrams & PDFs.</p>
                <button
                  onClick={() => { setShowCredits(false); navigate("/pricing") }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold
                    bg-gradient-to-r from-indigo-500 to-purple-600
                    hover:opacity-90 transition-opacity"
                >
                  Buy More Credits
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <motion.button
            onClick={() => { setShowProfile(!showProfile); setShowCredits(false) }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/20
              border border-white/15 flex items-center justify-center
              text-white font-bold text-sm hover:border-indigo-500/50 transition-all duration-200"
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
                  bg-black/95 backdrop-blur-xl border border-white/12
                  shadow-[0_24px_60px_rgba(0,0,0,0.8)] overflow-hidden text-white"
              >
                <div className="px-4 py-3.5 border-b border-white/8">
                  <p className="font-medium text-sm truncate">{userData?.name}</p>
                  <p className="text-gray-500 text-xs truncate mt-0.5">{userData?.email}</p>
                </div>
                <div className="p-1.5">
                  <NavMenuItem icon="📚" text="History" onClick={() => { setShowProfile(false); navigate("/history") }} />
                  <NavMenuItem icon="💎" text="Buy Credits" onClick={() => { setShowProfile(false); navigate("/pricing") }} />
                  <div className="my-1 h-px bg-white/8 mx-2" />
                  <NavMenuItem icon="🚪" text="Sign out" red onClick={handleSignOut} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

function NavMenuItem({ icon, text, onClick, red }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm
        transition-all duration-150
        ${red ? "text-red-400 hover:bg-red-500/10" : "text-gray-300 hover:bg-white/8 hover:text-white"}`}
    >
      <span className="text-base">{icon}</span>
      {text}
    </button>
  )
}

export default Navbar
