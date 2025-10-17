import React from 'react'

const DashboardHome = ({ user }) => {
  return (
    <div className="dashboard-content">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back, {user.firstname}! Here's your system overview.</p>
      </div>

      {/* User Information Card */}
      <div className="info-card">
        <div className="card-header">
          <h2 className="card-title">User Information</h2>
        </div>
        <div className="card-content">
          <div className="info-grid">
            <div className="info-item">
              <label>Name</label>
              <span>{user.firstname} {user.lastname}</span>
            </div>
            <div className="info-item">
              <label>Email</label>
              <span>{user.email}</span>
            </div>
            <div className="info-item">
              <label>Department</label>
              <span>{user.department || 'Not specified'}</span>
            </div>
            <div className="info-item">
              <label>Position</label>
              <span>{user.position || 'Not specified'}</span>
            </div>
            <div className="info-item">
              <label>Role</label>
              <span className={`status-badge ${user.role?.toLowerCase()}`}>{user.role || 'Not specified'}</span>
            </div>
            <div className="info-item">
              <label>Status</label>
              <span className={`status-badge ${user.status === 'active' ? 'active' : 'inactive'}`}>
                {user.status}
              </span>
            </div>
          </div>
          {user.lastlogin && (
            <div className="last-login">
              <i className="fas fa-clock"></i>
              <span>Last login: {new Date(user.lastlogin).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon">
            <i className="fas fa-users"></i>
          </div>
          <div className="stat-content">
            <div className="stat-number">1,234</div>
            <div className="stat-label">Total Customers</div>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">
            <i className="fas fa-file-invoice-dollar"></i>
          </div>
          <div className="stat-content">
            <div className="stat-number">₱45,678</div>
            <div className="stat-label">Monthly Revenue</div>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="stat-content">
            <div className="stat-number">23</div>
            <div className="stat-label">Pending Bills</div>
          </div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon">
            <i className="fas fa-clock"></i>
          </div>
          <div className="stat-content">
            <div className="stat-number">12</div>
            <div className="stat-label">Overdue Accounts</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardHome
