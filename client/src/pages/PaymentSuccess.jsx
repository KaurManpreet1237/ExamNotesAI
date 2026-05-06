import React, { useEffect } from 'react'
import { motion } from "motion/react"
import { FiCheckCircle } from "react-icons/fi"
import { getCurrentUser } from '../services/api'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'

function PaymentSuccess() {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    getCurrentUser(dispatch)
    const t = setTimeout(() => navigate("/"), 5000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center p-4 gap-6"
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
        backgroundSize: "56px 56px"
      }}
    >
      {/* Glow */}
      <div className="absolute w-80 h-80 bg-green-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.7, ease: "easeOut", type: "spring", stiffness: 200 }}
        className="relative w-24 h-24 rounded-full
          bg-green-500/15 border border-green-500/30
          flex items-center justify-center text-green-400 text-5xl"
      >
        <FiCheckCircle />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-center"
      >
        <h1 className="text-2xl font-bold text-white mb-2">Payment Successful!</h1>
        <p className="text-green-400 font-medium mb-1">Credits have been added to your account.</p>
        <p className="text-gray-500 text-sm">Redirecting to dashboard in 5 seconds…</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex gap-2"
      >
        {[0, 0.15, 0.3].map((d, i) => (
          <motion.div key={i}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: d }}
            className="w-2 h-2 rounded-full bg-green-500/60"
          />
        ))}
      </motion.div>
    </div>
  )
}

export default PaymentSuccess
