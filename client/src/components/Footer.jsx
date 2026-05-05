import React from 'react'
import { motion } from "motion/react"
import logo from "../assets/logo.png"
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import axios from 'axios'
import { serverUrl } from '../App'
import { setUserData } from '../redux/userSlice'

function Footer() {
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const handleSignOut = async () => {
    try {
      await axios.get(serverUrl + "/api/auth/logout", { withCredentials: true })
      dispatch(setUserData(null))
      navigate("/")
    } catch (error) { console.log(error) }
  }

  const links = {
    "Product": [
      { label: "Generate Notes", action: () => navigate("/notes") },
      { label: "My History", action: () => navigate("/history") },
      { label: "Buy Credits", action: () => navigate("/pricing") },
    ],
    "Account": [
      { label: "Sign Out", action: handleSignOut, red: true },
      { label: "support@examnotes.ai", action: () => {} },
    ],
  }

  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="mx-4 mb-4 mt-16 rounded-2xl
        bg-gradient-to-br from-black/90 via-black/85 to-black/90
        backdrop-blur-2xl border border-white/8
        shadow-[0_25px_60px_rgba(0,0,0,0.7)]"
    >
      {/* Top gradient line */}
      <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

      <div className="px-8 py-10">
        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <img src={logo} alt="logo" className="h-8 w-8 object-contain" />
              <span className="font-semibold text-white">
                ExamCraft
              </span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              AI-powered exam notes, project documentation, flow diagrams
              and printable PDFs. Built for students who want to study smarter.
            </p>
            {/* Subtle stat */}
            <div className="flex items-center gap-4 mt-5">
              <div className="text-center">
                <p className="text-white font-bold text-lg">50+</p>
                <p className="text-gray-600 text-xs">Free credits</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="text-white font-bold text-lg">3s</p>
                <p className="text-gray-600 text-xs">Generation</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="text-white font-bold text-lg">AI</p>
                <p className="text-gray-600 text-xs">Powered</p>
              </div>
            </div>
          </div>

          {/* Links */}
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h4 className="text-white text-xs font-semibold uppercase tracking-widest mb-4">{title}</h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.label}>
                    <button
                      onClick={item.action}
                      className={`text-sm transition-colors duration-200
                        ${item.red
                          ? "text-red-500 hover:text-red-400"
                          : "text-gray-500 hover:text-white"}`}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="pt-6 border-t border-white/8 flex flex-col sm:flex-row
          items-center justify-between gap-3">
          <p className="text-gray-600 text-xs">
            © {new Date().getFullYear()} ExamCraft. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-gray-600 text-xs">All systems operational</p>
          </div>
        </div>
      </div>
    </motion.footer>
  )
}

export default Footer