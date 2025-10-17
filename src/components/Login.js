import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../authService'

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    try {
      const result = await authService.login(email, password)
      
      if (result.success) {
        authService.setUserSession(result.user)
        // Call the callback to update auth state in App.js
        if (onLoginSuccess) {
          onLoginSuccess()
        }
        // Navigate to dashboard with replace to prevent back button issues
        navigate('/dashboard', { replace: true })
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="login-branding">
          <div className="logo-section">
            <div className="logo-icon">
              <i className="fas fa-building"></i>
            </div>
            <div className="logo-text">
              <h1 className="system-title">Water Billing System</h1>
              <p className="system-subtitle">Local Government Unit</p>
              <p className="system-location">Concepcion, Romblon</p>
            </div>
          </div>
          <div className="login-features">
            <div className="feature-item">
              <i className="fas fa-shield-alt"></i>
              <span>Secure Access</span>
            </div>
            <div className="feature-item">
              <i className="fas fa-users"></i>
              <span>Customer Management</span>
            </div>
            <div className="feature-item">
              <i className="fas fa-file-invoice-dollar"></i>
              <span>Billing & Payments</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="login-right">
        <div className="login-form-container">
          <div className="form-header">
            <h2 className="form-title">Sign In</h2>
            <p className="form-subtitle">Access your account to continue</p>
          </div>
          
          <form onSubmit={handleSubmit} className="professional-form">

            {error && (
              <div className="error-message">
                <i className="fas fa-exclamation-circle"></i>
                <span>{error}</span>
                <button 
                  className="error-close" 
                  onClick={() => setError('')}
                  type="button"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <input
                  className="form-input"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
                <i className="fas fa-envelope input-icon"></i>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper">
                <input
                  className="form-input"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <i className="fas fa-lock input-icon"></i>
              </div>
            </div>

            <button
              className={`login-button ${loading ? 'loading' : ''}`}
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt"></i>
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
          
          <div className="form-footer">
            <p>© 2024 LGU Concepcion, Romblon. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
