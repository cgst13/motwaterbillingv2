import React, { useState, useEffect } from 'react'
import { billingService } from '../../services/billingService'

const EncodingStats = () => {
  const [selectedMonth, setSelectedMonth] = useState('')
  const [encodingStats, setEncodingStats] = useState([])
  const [filteredStats, setFilteredStats] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Filters
  const [filterBarangay, setFilterBarangay] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  
  // Expanded barangays
  const [expandedBarangays, setExpandedBarangays] = useState([])

  useEffect(() => {
    setSelectedMonth(getCurrentMonth())
  }, [])

  const getCurrentMonth = () => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  }

  const loadEncodingStats = async () => {
    if (!selectedMonth) return
    
    setLoading(true)
    setError('')
    const billedMonth = `${selectedMonth}-01`
    const result = await billingService.getEncodingStats(billedMonth)
    
    if (result.success) {
      setEncodingStats(result.data)
      applyFilters(result.data)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  const applyFilters = (data = encodingStats) => {
    let filtered = [...data]
    
    if (filterBarangay) {
      filtered = filtered.filter(stat => stat.barangay === filterBarangay)
    }
    
    if (filterType || filterStatus) {
      filtered = filtered.map(stat => {
        // Filter ALL customers based on type/status
        const filteredAllCustomers = (stat.allCustomers || []).filter(customer => {
          const matchesType = !filterType || customer.type === filterType
          const matchesStatus = !filterStatus || customer.status === filterStatus
          return matchesType && matchesStatus
        })
        
        // Recalculate counts based on filtered customers
        const filteredEncodedCount = filteredAllCustomers.filter(c => c.isEncoded).length
        const filteredNotEncodedCustomers = filteredAllCustomers.filter(c => !c.isEncoded)
        
        return {
          ...stat,
          totalCustomers: filteredAllCustomers.length,
          encodedCount: filteredEncodedCount,
          notEncodedCustomers: filteredNotEncodedCustomers
        }
      })
    }
    
    setFilteredStats(filtered)
  }

  const handleFilterChange = () => {
    applyFilters()
  }

  const handleClearFilters = () => {
    setFilterBarangay('')
    setFilterType('')
    setFilterStatus('')
    setFilteredStats(encodingStats)
  }

  const toggleBarangayExpanded = (barangay) => {
    setExpandedBarangays(prev => 
      prev.includes(barangay)
        ? prev.filter(b => b !== barangay)
        : [...prev, barangay]
    )
  }

  useEffect(() => {
    if (encodingStats.length > 0) {
      applyFilters()
    }
  }, [filterBarangay, filterType, filterStatus, encodingStats])

  const handleExportExcel = () => {
    const headers = ['Barangay', 'Total Customers', 'Encoded', 'Not Encoded', 'Not Encoded List']
    const rows = encodingStats.map(stat => [
      stat.barangay,
      stat.totalCustomers,
      stat.encodedCount,
      stat.notEncodedCustomers.length,
      stat.notEncodedCustomers.map(c => `${c.customerid}: ${c.name}`).join('; ')
    ])
    
    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `encoding_stats_${selectedMonth}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Encoding Stats Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; color: #333; }
          h2 { color: #666; margin-top: 30px; border-bottom: 2px solid #ddd; padding-bottom: 5px; }
          h3 { color: #888; margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .summary { background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .stat-box { display: inline-block; padding: 10px 15px; margin: 5px; background: #e8f4f8; border-radius: 5px; }
          .no-print { margin-top: 30px; text-align: center; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>📊 Billing Encoding Statistics Report</h1>
        <div class="summary">
          <p><strong>Report Period:</strong> ${new Date(selectedMonth + '-01').toLocaleDateString('en-PH', { year: 'numeric', month: 'long' })}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString('en-PH')}</p>
          <p><strong>Total Barangays:</strong> ${encodingStats.length}</p>
        </div>
        
        ${encodingStats.map(stat => `
          <h2>🏘️ ${stat.barangay}</h2>
          <div style="margin: 10px 0;">
            <div class="stat-box">
              <strong>Total Customers:</strong> ${stat.totalCustomers}
            </div>
            <div class="stat-box" style="background: #d4edda;">
              <strong>Encoded Bills:</strong> ${stat.encodedCount}
            </div>
            <div class="stat-box" style="background: ${stat.notEncodedCustomers.length > 0 ? '#f8d7da' : '#d4edda'};">
              <strong>Not Encoded:</strong> ${stat.notEncodedCustomers.length}
            </div>
            <div class="stat-box" style="background: #d1ecf1;">
              <strong>Completion:</strong> ${((stat.encodedCount / stat.totalCustomers) * 100).toFixed(1)}%
            </div>
          </div>
          
          ${stat.notEncodedCustomers.length > 0 ? `
            <h3>⚠️ Customers Without Bills (${stat.notEncodedCustomers.length})</h3>
            <table>
              <thead>
                <tr>
                  <th style="width: 20%;">Customer ID</th>
                  <th>Customer Name</th>
                </tr>
              </thead>
              <tbody>
                ${stat.notEncodedCustomers.map(c => `
                  <tr>
                    <td><strong>${c.customerid}</strong></td>
                    <td>${c.name}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p style="color: #28a745; font-weight: bold;">✅ All customers in this barangay have been encoded!</p>'}
        `).join('')}
        
        <div class="summary" style="margin-top: 40px;">
          <h3>📈 Overall Summary</h3>
          <p><strong>Total Customers:</strong> ${encodingStats.reduce((sum, s) => sum + s.totalCustomers, 0)}</p>
          <p><strong>Total Encoded:</strong> ${encodingStats.reduce((sum, s) => sum + s.encodedCount, 0)}</p>
          <p><strong>Total Not Encoded:</strong> ${encodingStats.reduce((sum, s) => sum + s.notEncodedCustomers.length, 0)}</p>
          <p><strong>Overall Completion:</strong> ${(
            (encodingStats.reduce((sum, s) => sum + s.encodedCount, 0) / 
            encodingStats.reduce((sum, s) => sum + s.totalCustomers, 0)) * 100
          ).toFixed(1)}%</p>
        </div>
        
        <div class="no-print">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 5px; margin-right: 10px;">
            🖨️ Print Report
          </button>
          <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background: #6c757d; color: white; border: none; border-radius: 5px;">
            ❌ Close
          </button>
        </div>
      </body>
      </html>
    `
    
    const printWindow = window.open('', '_blank')
    printWindow.document.write(printContent)
    printWindow.document.close()
  }

  return (
    <div className="encoding-stats">
      {error && (
        <div className="notification is-danger is-light py-3">
          <button className="delete" onClick={() => setError('')}></button>
          {error}
        </div>
      )}

      {/* Month Selector and Actions */}
      <div className="box" style={{ marginBottom: '1rem', padding: '1.5rem' }}>
        <div className="level" style={{ marginBottom: '0' }}>
          <div className="level-left">
            <div className="level-item">
              <div className="field has-addons" style={{ marginBottom: '0' }}>
                <div className="control">
                  <input 
                    className="input"
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>
                <div className="control">
                  <button 
                    className={`button is-primary ${loading ? 'is-loading' : ''}`}
                    onClick={loadEncodingStats}
                  >
                    <span className="icon"><i className="fas fa-search"></i></span>
                    <span>Load Stats</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="level-right">
            {encodingStats.length > 0 && (
              <>
                <div className="level-item">
                  <button className="button is-info" onClick={handleExportExcel}>
                    <span className="icon"><i className="fas fa-file-excel"></i></span>
                    <span>Export</span>
                  </button>
                </div>
                <div className="level-item">
                  <button className="button is-link" onClick={handlePrint}>
                    <span className="icon"><i className="fas fa-print"></i></span>
                    <span>Print</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      {encodingStats.length > 0 && (
        <div className="box" style={{ marginBottom: '1rem', padding: '1.5rem' }}>
          <h3 className="title is-6 mb-3">
            <span className="icon"><i className="fas fa-filter"></i></span>
            Filters
          </h3>
          <div className="columns" style={{ marginBottom: '0' }}>
            <div className="column is-3">
              <div className="control">
                <div className="select is-fullwidth">
                  <select value={filterBarangay} onChange={(e) => setFilterBarangay(e.target.value)}>
                    <option value="">All Barangays</option>
                    {encodingStats.map((stat) => (
                      <option key={stat.barangay} value={stat.barangay}>{stat.barangay}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="column is-3">
              <div className="control">
                <div className="select is-fullwidth">
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    <option value="">All Types</option>
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Industrial">Industrial</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="column is-3">
              <div className="control">
                <div className="select is-fullwidth">
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Disconnected">Disconnected</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="column is-3">
              <div className="control">
                <button 
                  className="button is-light is-fullwidth"
                  onClick={handleClearFilters}
                  disabled={!filterBarangay && !filterType && !filterStatus}
                >
                  <span className="icon"><i className="fas fa-times"></i></span>
                  <span>Clear Filters</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="has-text-centered" style={{ padding: '2rem' }}>
          <button className="button is-loading is-large is-ghost"></button>
        </div>
      ) : encodingStats.length === 0 ? (
        <div className="has-text-centered" style={{ padding: '2rem' }}>
          <span className="icon is-large has-text-grey-light">
            <i className="fas fa-chart-bar fa-3x"></i>
          </span>
          <p className="has-text-grey mt-4">Select a month and click "Load Stats" to view encoding statistics</p>
        </div>
      ) : (
        <>
          {/* Overall Summary */}
          <div className="box has-background-info-light mb-3 p-4">
            <h3 className="title is-6 mb-3">Overall Summary</h3>
            <div className="columns is-mobile">
              <div className="column">
                <div className="notification is-info is-light p-3">
                  <p className="heading">Total Customers</p>
                  <p className="title is-4">{filteredStats.reduce((sum, s) => sum + s.totalCustomers, 0)}</p>
                </div>
              </div>
              <div className="column">
                <div className="notification is-success is-light p-3">
                  <p className="heading">Encoded Bills</p>
                  <p className="title is-4">{filteredStats.reduce((sum, s) => sum + s.encodedCount, 0)}</p>
                </div>
              </div>
              <div className="column">
                <div className="notification is-danger is-light p-3">
                  <p className="heading">Not Encoded</p>
                  <p className="title is-4">{filteredStats.reduce((sum, s) => sum + s.notEncodedCustomers.length, 0)}</p>
                </div>
              </div>
              <div className="column">
                <div className="notification is-primary is-light p-3">
                  <p className="heading">Completion Rate</p>
                  <p className="title is-4">
                    {filteredStats.reduce((sum, s) => sum + s.totalCustomers, 0) > 0 ? (
                      (filteredStats.reduce((sum, s) => sum + s.encodedCount, 0) / 
                      filteredStats.reduce((sum, s) => sum + s.totalCustomers, 0)) * 100
                    ).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Per Barangay Stats */}
          {filteredStats.map((stat) => (
            <div key={stat.barangay} className="box mb-3 p-3">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className="title is-5" style={{ marginBottom: '0' }}>
                  <span className="icon"><i className="fas fa-map-marker-alt"></i></span>
                  {stat.barangay}
                </h3>
                {stat.notEncodedCustomers.length > 0 && (
                  <button 
                    className="button is-small is-info is-light"
                    onClick={() => toggleBarangayExpanded(stat.barangay)}
                  >
                    <span className="icon">
                      <i className={`fas fa-chevron-${expandedBarangays.includes(stat.barangay) ? 'up' : 'down'}`}></i>
                    </span>
                    <span>{expandedBarangays.includes(stat.barangay) ? 'Hide' : 'View'} Details</span>
                  </button>
                )}
              </div>
              
              <div className="columns is-mobile">
                <div className="column">
                  <div className="notification is-info is-light p-2">
                    <p className="heading">Total Customers</p>
                    <p className="title is-5">{stat.totalCustomers}</p>
                  </div>
                </div>
                <div className="column">
                  <div className="notification is-success is-light p-2">
                    <p className="heading">Encoded Bills</p>
                    <p className="title is-5">{stat.encodedCount}</p>
                  </div>
                </div>
                <div className="column">
                  <div className="notification is-danger is-light p-2">
                    <p className="heading">Not Encoded</p>
                    <p className="title is-5">{stat.notEncodedCustomers.length}</p>
                  </div>
                </div>
                <div className="column">
                  <div className="notification is-primary is-light p-2">
                    <p className="heading">Completion</p>
                    <p className="title is-5">
                      {((stat.encodedCount / stat.totalCustomers) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Expandable Customer List */}
              {stat.notEncodedCustomers.length > 0 && expandedBarangays.includes(stat.barangay) && (
                <>
                  <h4 className="title is-6 has-text-danger mb-2 mt-3">
                    <span className="icon"><i className="fas fa-exclamation-triangle"></i></span>
                    Customers Without Bills ({stat.notEncodedCustomers.length})
                  </h4>
                  <div className="table-container">
                    <table className="table is-fullwidth is-narrow is-striped is-hoverable">
                      <thead>
                        <tr>
                          <th width="150">Customer ID</th>
                          <th>Customer Name</th>
                          <th width="120">Type</th>
                          <th width="120">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stat.notEncodedCustomers.map((customer) => (
                          <tr key={customer.customerid}>
                            <td className="has-text-weight-bold">{customer.customerid}</td>
                            <td>{customer.name}</td>
                            <td><span className="tag is-info is-light">{customer.type}</span></td>
                            <td>
                              <span className={`tag ${customer.status === 'Active' ? 'is-success' : 'is-warning'} is-light`}>
                                {customer.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {stat.notEncodedCustomers.length === 0 && (
                <div className="notification is-success is-light p-2 mt-3">
                  <span className="icon"><i className="fas fa-check-circle"></i></span>
                  <strong>All customers in this barangay have been encoded!</strong>
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}

export default EncodingStats
