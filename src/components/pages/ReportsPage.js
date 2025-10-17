import React, { useState, useEffect } from 'react'
import { reportService } from '../../services/reportService'

const ReportsPage = () => {
  const [activeReport, setActiveReport] = useState('water') // water, revenue, collections
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Report data
  const [waterReport, setWaterReport] = useState(null)
  const [revenueReport, setRevenueReport] = useState(null)
  const [collectionReport, setCollectionReport] = useState(null)
  const [topConsumers, setTopConsumers] = useState([])

  useEffect(() => {
    // Set default dates (current month)
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    setStartDate(firstDay.toISOString().split('T')[0])
    setEndDate(lastDay.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      loadReports()
    }
  }, [startDate, endDate])

  const loadReports = async () => {
    setLoading(true)
    setError('')

    try {
      const [waterResult, revenueResult, collectionResult, topResult] = await Promise.all([
        reportService.getWaterUsageReport(startDate, endDate),
        reportService.getRevenueReport(startDate, endDate),
        reportService.getCollectionReport(startDate, endDate),
        reportService.getTopConsumers(startDate, endDate, 10)
      ])

      if (waterResult.success) setWaterReport(waterResult.data)
      if (revenueResult.success) setRevenueReport(revenueResult.data)
      if (collectionResult.success) setCollectionReport(collectionResult.data)
      if (topResult.success) setTopConsumers(topResult.data)

      if (!waterResult.success || !revenueResult.success || !collectionResult.success) {
        setError('Some reports failed to load')
      }
    } catch (err) {
      setError('Failed to load reports')
    }

    setLoading(false)
  }

  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
  }

  const formatNumber = (num) => {
    return parseFloat(num || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
  }

  const formatMonth = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', { year: 'numeric', month: 'long' })
  }

  const exportToCSV = (data, filename) => {
    const csv = data.map(row => Object.values(row).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${startDate}_${endDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="reports-page" style={{ padding: '0' }}>
      {/* Header */}
      <div className="level mb-3">
        <div className="level-left">
          <div className="level-item">
            <h1 className="title is-4 mb-0">
              <span className="icon"><i className="fas fa-chart-bar"></i></span>
              Reports & Analytics
            </h1>
          </div>
        </div>
        <div className="level-right">
          <div className="level-item">
            <button 
              className="button is-info"
              onClick={loadReports}
              disabled={loading}
            >
              <span className="icon"><i className="fas fa-sync"></i></span>
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="notification is-danger is-light py-3">
          <button className="delete" onClick={() => setError('')}></button>
          {error}
        </div>
      )}

      {/* Date Range Selector */}
      <div className="box" style={{ marginBottom: '1rem', padding: '1.5rem' }}>
        <div className="columns">
          <div className="column is-4">
            <div className="field">
              <label className="label">Start Date</label>
              <div className="control">
                <input
                  className="input"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="column is-4">
            <div className="field">
              <label className="label">End Date</label>
              <div className="control">
                <input
                  className="input"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="column is-4">
            <div className="field">
              <label className="label">&nbsp;</label>
              <div className="control">
                <div className="buttons">
                  <button className="button is-light is-small" onClick={() => {
                    const now = new Date()
                    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
                    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
                    setStartDate(firstDay.toISOString().split('T')[0])
                    setEndDate(lastDay.toISOString().split('T')[0])
                  }}>
                    This Month
                  </button>
                  <button className="button is-light is-small" onClick={() => {
                    const now = new Date()
                    const firstDay = new Date(now.getFullYear(), 0, 1)
                    const lastDay = new Date(now.getFullYear(), 11, 31)
                    setStartDate(firstDay.toISOString().split('T')[0])
                    setEndDate(lastDay.toISOString().split('T')[0])
                  }}>
                    This Year
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="tabs is-boxed">
        <ul>
          <li className={activeReport === 'water' ? 'is-active' : ''}>
            <a onClick={() => setActiveReport('water')}>
              <span className="icon"><i className="fas fa-tint"></i></span>
              <span>Water Usage</span>
            </a>
          </li>
          <li className={activeReport === 'revenue' ? 'is-active' : ''}>
            <a onClick={() => setActiveReport('revenue')}>
              <span className="icon"><i className="fas fa-dollar-sign"></i></span>
              <span>Revenue</span>
            </a>
          </li>
          <li className={activeReport === 'collections' ? 'is-active' : ''}>
            <a onClick={() => setActiveReport('collections')}>
              <span className="icon"><i className="fas fa-hand-holding-usd"></i></span>
              <span>Collections</span>
            </a>
          </li>
        </ul>
      </div>

      {loading ? (
        <div className="has-text-centered" style={{ padding: '3rem' }}>
          <button className="button is-loading is-large is-ghost"></button>
          <p className="has-text-grey mt-3">Loading reports...</p>
        </div>
      ) : (
        <>
          {/* Water Usage Report */}
          {activeReport === 'water' && waterReport && (
            <div>
              {/* Summary Cards */}
              <div className="columns mb-3">
                <div className="column">
                  <div className="box has-background-info-light">
                    <p className="heading">Total Consumption</p>
                    <p className="title is-4">{formatNumber(waterReport.totalConsumption)} cu.m</p>
                  </div>
                </div>
                <div className="column">
                  <div className="box has-background-success-light">
                    <p className="heading">Average Consumption</p>
                    <p className="title is-4">{formatNumber(waterReport.averageConsumption)} cu.m</p>
                  </div>
                </div>
                <div className="column">
                  <div className="box has-background-warning-light">
                    <p className="heading">Total Bills</p>
                    <p className="title is-4">{waterReport.billCount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Monthly Consumption */}
              <div className="box" style={{ marginBottom: '1rem' }}>
                <div className="level">
                  <div className="level-left">
                    <h2 className="title is-5 mb-3">Monthly Consumption</h2>
                  </div>
                  <div className="level-right">
                    <button 
                      className="button is-small is-info"
                      onClick={() => exportToCSV(waterReport.byMonth, 'monthly_consumption')}
                    >
                      <span className="icon"><i className="fas fa-download"></i></span>
                      <span>Export</span>
                    </button>
                  </div>
                </div>
                <div className="table-container">
                  <table className="table is-fullwidth is-striped is-hoverable">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Total Consumption</th>
                        <th>Bill Count</th>
                        <th>Average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waterReport.byMonth.map((item) => (
                        <tr key={item.month}>
                          <td>{formatMonth(item.month)}</td>
                          <td className="has-text-weight-bold">{formatNumber(item.consumption)} cu.m</td>
                          <td>{item.count.toLocaleString()}</td>
                          <td>{formatNumber(item.consumption / item.count)} cu.m</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* By Barangay */}
              <div className="box" style={{ marginBottom: '1rem' }}>
                <h2 className="title is-5 mb-3">Consumption by Barangay</h2>
                <div className="table-container">
                  <table className="table is-fullwidth is-striped is-hoverable">
                    <thead>
                      <tr>
                        <th>Barangay</th>
                        <th>Total Consumption</th>
                        <th>Customer Count</th>
                        <th>Average per Customer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waterReport.byBarangay.map((item) => (
                        <tr key={item.barangay}>
                          <td className="has-text-weight-bold">{item.barangay}</td>
                          <td>{formatNumber(item.consumption)} cu.m</td>
                          <td>{item.count.toLocaleString()}</td>
                          <td>{formatNumber(item.consumption / item.count)} cu.m</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top Consumers */}
              <div className="box">
                <h2 className="title is-5 mb-3">Top 10 Consumers</h2>
                <div className="table-container">
                  <table className="table is-fullwidth is-striped is-hoverable">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Customer ID</th>
                        <th>Customer Name</th>
                        <th>Barangay</th>
                        <th>Total Consumption</th>
                        <th>Average per Bill</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topConsumers.map((customer, index) => (
                        <tr key={customer.customerid}>
                          <td className="has-text-weight-bold">{index + 1}</td>
                          <td>{customer.customerid}</td>
                          <td>{customer.customername}</td>
                          <td><span className="tag is-light">{customer.barangay}</span></td>
                          <td className="has-text-weight-bold has-text-danger">{formatNumber(customer.totalConsumption)} cu.m</td>
                          <td>{formatNumber(customer.totalConsumption / customer.billCount)} cu.m</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Revenue Report */}
          {activeReport === 'revenue' && revenueReport && (
            <div>
              {/* Summary Cards */}
              <div className="columns mb-3">
                <div className="column">
                  <div className="box has-background-info-light">
                    <p className="heading">Total Billed</p>
                    <p className="title is-4">{formatCurrency(revenueReport.totalBilled)}</p>
                  </div>
                </div>
                <div className="column">
                  <div className="box has-background-success-light">
                    <p className="heading">Total Paid</p>
                    <p className="title is-4">{formatCurrency(revenueReport.totalPaid)}</p>
                  </div>
                </div>
                <div className="column">
                  <div className="box has-background-danger-light">
                    <p className="heading">Total Unpaid</p>
                    <p className="title is-4">{formatCurrency(revenueReport.totalUnpaid)}</p>
                  </div>
                </div>
                <div className="column">
                  <div className="box has-background-primary-light">
                    <p className="heading">Collection Rate</p>
                    <p className="title is-4">{revenueReport.collectionRate.toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="columns mb-3">
                <div className="column">
                  <div className="box has-background-warning-light">
                    <p className="heading">Total Surcharges</p>
                    <p className="title is-5">{formatCurrency(revenueReport.totalSurcharge)}</p>
                  </div>
                </div>
                <div className="column">
                  <div className="box has-background-success-light">
                    <p className="heading">Total Discounts</p>
                    <p className="title is-5">{formatCurrency(revenueReport.totalDiscount)}</p>
                  </div>
                </div>
                <div className="column">
                  <div className="box has-background-info-light">
                    <p className="heading">Paid Bills</p>
                    <p className="title is-5">{revenueReport.paidCount.toLocaleString()}</p>
                  </div>
                </div>
                <div className="column">
                  <div className="box has-background-danger-light">
                    <p className="heading">Unpaid Bills</p>
                    <p className="title is-5">{revenueReport.unpaidCount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Monthly Revenue */}
              <div className="box" style={{ marginBottom: '1rem' }}>
                <div className="level">
                  <div className="level-left">
                    <h2 className="title is-5 mb-3">Monthly Revenue</h2>
                  </div>
                  <div className="level-right">
                    <button 
                      className="button is-small is-info"
                      onClick={() => exportToCSV(revenueReport.byMonth, 'monthly_revenue')}
                    >
                      <span className="icon"><i className="fas fa-download"></i></span>
                      <span>Export</span>
                    </button>
                  </div>
                </div>
                <div className="table-container">
                  <table className="table is-fullwidth is-striped is-hoverable">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Billed Amount</th>
                        <th>Paid Amount</th>
                        <th>Unpaid Amount</th>
                        <th>Collection %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueReport.byMonth.map((item) => (
                        <tr key={item.month}>
                          <td>{formatMonth(item.month)}</td>
                          <td>{formatCurrency(item.billed)}</td>
                          <td className="has-text-success has-text-weight-bold">{formatCurrency(item.paid)}</td>
                          <td className="has-text-danger has-text-weight-bold">{formatCurrency(item.unpaid)}</td>
                          <td>{item.billed > 0 ? ((item.paid / item.billed) * 100).toFixed(1) : 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* By Barangay */}
              <div className="box">
                <h2 className="title is-5 mb-3">Revenue by Barangay</h2>
                <div className="table-container">
                  <table className="table is-fullwidth is-striped is-hoverable">
                    <thead>
                      <tr>
                        <th>Barangay</th>
                        <th>Bills</th>
                        <th>Billed Amount</th>
                        <th>Paid Amount</th>
                        <th>Unpaid Amount</th>
                        <th>Collection %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueReport.byBarangay.map((item) => (
                        <tr key={item.barangay}>
                          <td className="has-text-weight-bold">{item.barangay}</td>
                          <td>{item.billCount.toLocaleString()}</td>
                          <td>{formatCurrency(item.billed)}</td>
                          <td className="has-text-success">{formatCurrency(item.paid)}</td>
                          <td className="has-text-danger">{formatCurrency(item.unpaid)}</td>
                          <td>{item.billed > 0 ? ((item.paid / item.billed) * 100).toFixed(1) : 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Collections Report */}
          {activeReport === 'collections' && collectionReport && (
            <div>
              {/* Summary Cards */}
              <div className="columns mb-3">
                <div className="column">
                  <div className="box has-background-success-light">
                    <p className="heading">Total Collected</p>
                    <p className="title is-4">{formatCurrency(collectionReport.totalCollected)}</p>
                  </div>
                </div>
                <div className="column">
                  <div className="box has-background-info-light">
                    <p className="heading">Collection Count</p>
                    <p className="title is-4">{collectionReport.collectionCount.toLocaleString()}</p>
                  </div>
                </div>
                <div className="column">
                  <div className="box has-background-primary-light">
                    <p className="heading">Average per Collection</p>
                    <p className="title is-4">
                      {formatCurrency(collectionReport.totalCollected / collectionReport.collectionCount)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Daily Collections */}
              <div className="box" style={{ marginBottom: '1rem' }}>
                <div className="level">
                  <div className="level-left">
                    <h2 className="title is-5 mb-3">Daily Collections</h2>
                  </div>
                  <div className="level-right">
                    <button 
                      className="button is-small is-info"
                      onClick={() => exportToCSV(collectionReport.byDate, 'daily_collections')}
                    >
                      <span className="icon"><i className="fas fa-download"></i></span>
                      <span>Export</span>
                    </button>
                  </div>
                </div>
                <div className="table-container">
                  <table className="table is-fullwidth is-striped is-hoverable">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Amount Collected</th>
                        <th>Collection Count</th>
                        <th>Average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {collectionReport.byDate.map((item) => (
                        <tr key={item.date}>
                          <td>{new Date(item.date).toLocaleDateString('en-PH')}</td>
                          <td className="has-text-weight-bold has-text-success">{formatCurrency(item.amount)}</td>
                          <td>{item.count.toLocaleString()}</td>
                          <td>{formatCurrency(item.amount / item.count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* By Collector */}
              <div className="box">
                <h2 className="title is-5 mb-3">Collections by Collector</h2>
                <div className="table-container">
                  <table className="table is-fullwidth is-striped is-hoverable">
                    <thead>
                      <tr>
                        <th>Collector</th>
                        <th>Amount Collected</th>
                        <th>Collection Count</th>
                        <th>Average per Collection</th>
                      </tr>
                    </thead>
                    <tbody>
                      {collectionReport.byCollector.map((item) => (
                        <tr key={item.collector}>
                          <td className="has-text-weight-bold">{item.collector}</td>
                          <td className="has-text-success has-text-weight-bold">{formatCurrency(item.amount)}</td>
                          <td>{item.count.toLocaleString()}</td>
                          <td>{formatCurrency(item.amount / item.count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ReportsPage
