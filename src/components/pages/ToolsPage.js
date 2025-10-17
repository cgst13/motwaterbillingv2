import React from 'react'

const ToolsPage = () => {

  return (
    <div>
      <div className="level">
        <div className="level-left">
          <div className="level-item">
            <h1 className="title">System Tools & Utilities</h1>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-content">
          <div className="has-text-centered" style={{ padding: '4rem 2rem' }}>
            <span className="icon is-large has-text-grey-light">
              <i className="fas fa-tools fa-4x"></i>
            </span>
            <h2 className="title is-3 has-text-grey mt-4">Coming Soon</h2>
            <p className="subtitle has-text-grey">System tools and utilities will be available soon.</p>
            <p className="has-text-grey">This page will include database backup, data import/export, system maintenance, and configuration tools.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ToolsPage
