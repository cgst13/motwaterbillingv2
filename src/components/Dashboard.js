import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom'
import { authService } from '../authService'
import DashboardHome from './DashboardHome'
import CustomersPage from './pages/CustomersPage'
import BillingPage from './pages/BillingPage'
import PaymentsPage from './pages/PaymentsPage'
import CreditManagementPage from './pages/CreditManagementPage'
import ReportsPage from './pages/ReportsPage'
import UsersPage from './pages/UsersPage'
import ToolsPage from './pages/ToolsPage'

const Dashboard = ({ onLogout }) => {
  const [user, setUser] = useState(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    { name: 'Dashboard', icon: 'fas fa-tachometer-alt', path: '/dashboard' },
    { name: 'Customers', icon: 'fas fa-users', path: '/dashboard/customers' },
    { name: 'Billing', icon: 'fas fa-file-invoice-dollar', path: '/dashboard/billing' },
    { name: 'Payments', icon: 'fas fa-credit-card', path: '/dashboard/payments' },
    { name: 'Credit Management', icon: 'fas fa-chart-line', path: '/dashboard/credit-management' },
    { name: 'Reports', icon: 'fas fa-chart-bar', path: '/dashboard/reports' },
    { name: 'Users', icon: 'fas fa-user-cog', path: '/dashboard/users' },
    { name: 'Tools', icon: 'fas fa-tools', path: '/dashboard/tools' }
  ]

  // Get current active menu based on URL
  const getActiveMenu = () => {
    const path = location.pathname
    const menuItem = menuItems.find(item => item.path === path)
    return menuItem ? menuItem.name : 'Dashboard'
  }

  const activeMenu = getActiveMenu()

  useEffect(() => {
    const currentUser = authService.getUserSession()
    if (!currentUser) {
      navigate('/login')
    } else {
      setUser(currentUser)
    }
  }, [navigate])

  // Add scroll detection for header styling
  useEffect(() => {
    const handleScroll = () => {
      const header = document.querySelector('.dashboard-header')
      const scrollContainer = document.querySelector('.content-container')
      const scrolled = scrollContainer ? scrollContainer.scrollTop > 10 : window.scrollY > 10
      
      if (header) {
        if (scrolled) {
          header.classList.add('scrolled')
        } else {
          header.classList.remove('scrolled')
        }
      }
    }

    const scrollContainer = document.querySelector('.content-container')
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll)
      return () => scrollContainer.removeEventListener('scroll', handleScroll)
    } else {
      window.addEventListener('scroll', handleScroll)
      return () => window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Redirect to dashboard home if on exact /dashboard path
  useEffect(() => {
    if (location.pathname === '/dashboard') {
      navigate('/dashboard', { replace: true })
    }
  }, [location.pathname, navigate])

  const handleLogout = () => {
    authService.logout()
    // Call the callback to update auth state in App.js
    if (onLogout) {
      onLogout()
    }
    // Navigate to login with replace to prevent back button issues
    navigate('/login', { replace: true })
  }

  const handleMenuClick = (menuName) => {
    const menuItem = menuItems.find(item => item.name === menuName)
    if (menuItem) {
      navigate(menuItem.path)
    }
    setIsMobileMenuOpen(false)
  }

  if (!user) {
    return (
      <div className="container">
        <div className="section">
          <div className="has-text-centered">
            <button className="button is-loading is-large">Loading</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* Professional Header */}
      <header className="dashboard-header">
        <div className="header-content">
          {/* Left: Logo, Title and Description */}
          <div className="header-left">
            <div className="brand-icon">
              <i className="fas fa-building"></i>
            </div>
            <div className="brand-text">
              <h1 className="brand-title">Water Billing System</h1>
              <p className="brand-subtitle">LGU Concepcion, Romblon</p>
            </div>
          </div>

          {/* Center: Navigation Menu */}
          <nav className="header-center">
            <div className="nav-menu">
              {menuItems.map((item) => (
                <button
                  key={item.name}
                  className={`nav-item ${activeMenu === item.name ? 'active' : ''}`}
                  onClick={() => handleMenuClick(item.name)}
                >
                  <i className={item.icon}></i>
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Right: User Profile */}
          <div className="header-right">
            <div className="user-info">
              <span className="user-name">{user.firstname} {user.lastname}</span>
              <span className="user-role">{user.role}</span>
            </div>
            <div className="user-dropdown">
              <button className="user-button">
                <div className="user-avatar">
                  <i className="fas fa-user"></i>
                </div>
                <i className="fas fa-chevron-down"></i>
              </button>
              <div className="dropdown-menu">
                <a className="dropdown-item">
                  <i className="fas fa-user-edit"></i>
                  <span>Profile</span>
                </a>
                <a className="dropdown-item">
                  <i className="fas fa-cog"></i>
                  <span>Settings</span>
                </a>
                <hr className="dropdown-divider" />
                <a className="dropdown-item" onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt"></i>
                  <span>Logout</span>
                </a>
              </div>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className={`mobile-menu-toggle ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

        {/* Mobile Navigation */}
        <div className={`mobile-nav ${isMobileMenuOpen ? 'active' : ''}`}>
          {menuItems.map((item) => (
            <button
              key={item.name}
              className={`mobile-nav-item ${activeMenu === item.name ? 'active' : ''}`}
              onClick={() => handleMenuClick(item.name)}
            >
              <i className={item.icon}></i>
              <span>{item.name}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="content-container">
          <Routes>
            <Route index element={<DashboardHome user={user} />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="credit-management" element={<CreditManagementPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="tools" element={<ToolsPage />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
