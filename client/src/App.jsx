import React, { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Auth from './pages/Auth'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import AdminPanel from './pages/AdminPanel'
import { getCurrentUser } from './services/api'
import { useDispatch, useSelector } from 'react-redux'
import History from './pages/History'
import Notes from './pages/Notes'
import Pricing from './pages/Pricing'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentFailed from './pages/PaymentFailed'

export const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:8000"

function App() {
  const dispatch = useDispatch()
  useEffect(() => {
    getCurrentUser(dispatch)
  }, [dispatch])

  const { userData } = useSelector((state) => state.user)
  const isAdmin = userData?.role === "admin"

  return (
    <Routes>
      {/*
        ROOT ROUTE:
        - Guest         → landing page (Auth.jsx)
        - Admin user    → redirect straight to /admin panel
        - Regular user  → dashboard (Home.jsx)
      */}
      <Route
        path='/'
        element={
          !userData ? <Auth /> :
          isAdmin   ? <Navigate to="/admin" replace /> :
                      <Home />
        }
      />

      {/* ── Admin route ── only accessible to logged-in admins ── */}
      <Route
        path='/admin'
        element={
          !userData ? <Navigate to="/" replace /> :
          isAdmin   ? <AdminPanel /> :
                      <Navigate to="/" replace />
        }
      />

      {/* ── Protected user routes ── redirect non-logged-in to landing ── */}
      <Route path='/history' element={userData && !isAdmin ? <History /> : <Navigate to="/" replace />} />
      <Route path='/notes'   element={userData && !isAdmin ? <Notes />   : <Navigate to="/" replace />} />
      <Route path='/pricing' element={userData && !isAdmin ? <Pricing /> : <Navigate to="/" replace />} />

      {/* ── Auth routes ── redirect to correct dashboard if already logged in ── */}
      <Route path='/auth'            element={userData ? <Navigate to="/" replace /> : <Auth />} />
      <Route path='/login'           element={userData ? <Navigate to="/" replace /> : <Login />} />
      <Route path='/signup'          element={userData ? <Navigate to="/" replace /> : <Signup />} />
      <Route path='/forgot-password' element={userData ? <Navigate to="/" replace /> : <ForgotPassword />} />

      {/* ── Payment callbacks ── always accessible ── */}
      <Route path='/payment-success' element={<PaymentSuccess />} />
      <Route path='/payment-failed'  element={<PaymentFailed />} />
    </Routes>
  )
}

export default App