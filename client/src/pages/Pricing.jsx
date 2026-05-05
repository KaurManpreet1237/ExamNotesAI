import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from "motion/react"
import axios from 'axios';
import { serverUrl } from '../App';
import logo from '../assets/logo.png'

const FadeIn = ({ children, delay = 0, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={className}
  >
    {children}
  </motion.div>
)

function Pricing() {
  const navigate = useNavigate()
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payingAmount, setPayingAmount] = useState(null);

  const handlePaying = async (amount) => {
    try {
      setPayingAmount(amount)
      setPaying(true)
      const result = await axios.post(serverUrl + "/api/credit/order", { amount }, { withCredentials: true })
      if (result.data.url) window.location.href = result.data.url
      setPaying(false)
    } catch (error) {
      setPaying(false)
      console.log(error)
    }
  }

  const plans = [
    {
      name: "Starter",
      price: "₹100",
      amount: 100,
      credits: 50,
      description: "Perfect for quick revisions",
      color: "from-blue-500/10 to-indigo-500/5",
      border: "border-white/10",
      tag: null,
      features: ["50 AI-generated notes", "Exam-focused content", "Diagram & chart support", "PDF download", "Fast generation"],
    },
    {
      name: "Popular",
      price: "₹200",
      amount: 200,
      credits: 120,
      description: "Best value for students",
      color: "from-indigo-500/15 to-purple-500/10",
      border: "border-indigo-500/40",
      tag: "Most Popular",
      tagColor: "from-indigo-500 to-purple-600",
      features: ["120 AI-generated notes", "All Starter features", "Revision mode access", "Priority AI response", "2.4× more value"],
    },
    {
      name: "Pro Learner",
      price: "₹500",
      amount: 500,
      credits: 300,
      description: "For serious exam preparation",
      color: "from-purple-500/10 to-pink-500/5",
      border: "border-white/10",
      tag: "Best Value",
      tagColor: "from-purple-500 to-pink-600",
      features: ["300 AI-generated notes", "Maximum credit value", "Full syllabus coverage", "Charts & diagrams", "3× more value"],
    },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
            backgroundSize: "60px 60px"
          }}
        />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-600/8 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative sticky top-0 z-50 border-b border-white/8 bg-black/60 backdrop-blur-xl"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 group"
          >
            <img src={logo} alt="logo" className="w-7 h-7 group-hover:scale-105 transition-transform" />
            <span className="font-semibold text-white">ExamNotes <span className="text-gray-500">AI</span></span>
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-gray-400
              hover:text-white transition-colors"
          >
            ← Back to dashboard
          </button>
        </div>
      </motion.header>

      <main className="relative max-w-5xl mx-auto px-6 py-20">
        {/* Title */}
        <div className="text-center mb-16">
          <FadeIn>
            <div className="inline-flex items-center gap-2 text-xs font-medium
              text-indigo-400 bg-indigo-500/10 border border-indigo-500/20
              rounded-full px-4 py-1.5 mb-5">
              ✦ Simple, transparent pricing
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h1 className="text-4xl lg:text-5xl font-extrabold mb-4">
              Buy credits.
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400
                bg-clip-text text-transparent">
                Study smarter.
              </span>
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="text-gray-500 text-lg max-w-md mx-auto">
              One-time credit purchases. No subscriptions, no hidden fees.
              Use credits whenever you need them.
            </p>
          </FadeIn>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
          {plans.map((plan, i) => {
            const isSelected = selectedPrice === plan.amount;
            const isPaying = paying && payingAmount === plan.amount;
            return (
              <FadeIn key={plan.name} delay={i * 0.1}>
                <motion.div
                  onClick={() => setSelectedPrice(plan.amount)}
                  whileHover={{ y: -8, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={`relative cursor-pointer rounded-2xl p-6 border transition-all duration-300 h-full
                    bg-gradient-to-br ${plan.color}
                    ${isSelected
                      ? "border-indigo-500/70 shadow-[0_0_40px_rgba(99,102,241,0.2)]"
                      : plan.border + " hover:border-white/20"
                    }`}
                >
                  {/* Tag */}
                  {plan.tag && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className={`text-xs font-semibold px-4 py-1 rounded-full
                        bg-gradient-to-r ${plan.tagColor} text-white shadow-lg`}>
                        {plan.tag}
                      </span>
                    </div>
                  )}

                  {isSelected && (
                    <div className="absolute top-4 right-4 w-5 h-5 rounded-full
                      bg-indigo-500 flex items-center justify-center text-xs">✓</div>
                  )}

                  <div className="mb-5">
                    <h2 className="text-lg font-bold text-white mb-1">{plan.name}</h2>
                    <p className="text-gray-500 text-sm">{plan.description}</p>
                  </div>

                  <div className="mb-5">
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-indigo-400 text-sm font-semibold">{plan.credits} credits</span>
                      <span className="text-gray-700 text-xs">one-time</span>
                    </div>
                  </div>

                  <motion.button
                    disabled={isPaying}
                    onClick={(e) => { e.stopPropagation(); handlePaying(plan.amount) }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold mb-5 transition-all duration-200
                      ${isPaying
                        ? "bg-white/10 text-gray-500 cursor-not-allowed"
                        : isSelected
                          ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-[0_4px_20px_rgba(99,102,241,0.4)]"
                          : "bg-white/10 border border-white/15 text-white hover:bg-white/15 hover:border-white/25"
                      }`}
                  >
                    {isPaying ? "Redirecting…" : "Buy Now"}
                  </motion.button>

                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-gray-400">
                        <span className="text-indigo-400 mt-0.5 shrink-0 text-xs">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </FadeIn>
            )
          })}
        </div>

        {/* Value comparison */}
        <FadeIn delay={0.4}>
          <div className="rounded-2xl border border-white/8 bg-white/3 p-6 text-center">
            <p className="text-gray-400 text-sm mb-4">
              💡 Not sure which to pick?
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              {[
                { label: "₹2 / credit", plan: "Starter" },
                { label: "₹1.67 / credit", plan: "Popular", best: true },
                { label: "₹1.67 / credit", plan: "Pro", note: "Max credits" },
              ].map((v) => (
                <div key={v.plan} className={`rounded-xl p-3 text-center
                  ${v.best ? "bg-indigo-500/10 border border-indigo-500/20" : "bg-white/3"}`}>
                  <p className={`text-sm font-bold ${v.best ? "text-indigo-400" : "text-white"}`}>{v.label}</p>
                  <p className="text-gray-600 text-xs mt-0.5">{v.plan}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </main>
    </div>
  )
}

export default Pricing
