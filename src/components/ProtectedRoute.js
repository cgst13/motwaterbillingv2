import React from 'react'
import { Navigate } from 'react-router-dom'
import { authService } from '../authService'

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated()
  
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

export default ProtectedRoute
