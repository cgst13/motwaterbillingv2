import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import { authService } from './authService'
import 'bulma/css/bulma.min.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated())

  // Listen for authentication changes
  useEffect(() => {
    // Check auth status on mount and when localStorage changes
    const checkAuth = () => {
      setIsAuthenticated(authService.isAuthenticated())
    }

    // Check immediately
    checkAuth()

    // Listen for storage events (for multi-tab sync)
    window.addEventListener('storage', checkAuth)
    
    // Custom event for same-tab auth changes
    window.addEventListener('authChange', checkAuth)

    return () => {
      window.removeEventListener('storage', checkAuth)
      window.removeEventListener('authChange', checkAuth)
    }
  }, [])

  return (
    <Router basename={process.env.PUBLIC_URL}>
      <div className="App">
        <Routes>
          {/* Redirect root to login or dashboard based on auth status */}
          <Route 
            path="/" 
            element={
              isAuthenticated ? 
              <Navigate to="/dashboard" replace /> : 
              <Navigate to="/login" replace />
            } 
          />
          
          {/* Login route */}
          <Route 
            path="/login" 
            element={
              isAuthenticated ? 
              <Navigate to="/dashboard" replace /> : 
              <Login onLoginSuccess={() => setIsAuthenticated(true)} />
            } 
          />
          
          {/* Protected dashboard routes */}
          <Route 
            path="/dashboard/*" 
            element={
              <ProtectedRoute>
                <Dashboard onLogout={() => setIsAuthenticated(false)} />
              </ProtectedRoute>
            } 
          />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
