import React, { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Auth from './pages/Auth'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
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

  return (
    <Routes>
      {/*
        ROOT ROUTE — public landing page for guests, dashboard for logged-in users.
        Previously this redirected unauthenticated users to /login — now it shows
        the landing page (Auth.jsx) instead, so the app always starts with a home page.
      */}
      <Route
        path='/'
        element={userData ? <Home /> : <Auth />}
      />

      {/* Protected routes — redirect to landing if not authenticated */}
      <Route path='/history'  element={userData ? <History />  : <Navigate to="/" replace />} />
      <Route path='/notes'    element={userData ? <Notes />    : <Navigate to="/" replace />} />
      <Route path='/pricing'  element={userData ? <Pricing />  : <Navigate to="/" replace />} />

      {/* Auth routes — redirect to dashboard if already logged in */}
      <Route path='/auth'           element={userData ? <Navigate to="/" replace /> : <Auth />} />
      <Route path='/login'          element={userData ? <Navigate to="/" replace /> : <Login />} />
      <Route path='/signup'         element={userData ? <Navigate to="/" replace /> : <Signup />} />
      <Route path='/forgot-password' element={userData ? <Navigate to="/" replace /> : <ForgotPassword />} />

      {/* Payment callbacks — always accessible */}
      <Route path='/payment-success' element={<PaymentSuccess />} />
      <Route path='/payment-failed'  element={<PaymentFailed />} />
    </Routes>
  )
}

export default App