import React, { useState, useEffect } from 'react'
import { creditService } from '../../services/creditService'
import { authService } from '../../authService'
import ConfirmationDialog from '../common/ConfirmationDialog'

const CreditManagementPage = () => {
  const [activeTab, setActiveTab] = useState('overview') // overview, adjust, apply
  const [customers, setCustomers] = useState([])
  const [stats, setStats] = useState({
    totalCustomers: 0,
    customersWithCredit: 0,
    totalCreditAmount: 0,
    averageCredit: 0
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [adjustmentType, setAdjustmentType] = useState('add')
  const [adjustmentAmount, setAdjustmentAmount] = useState('')
  const [adjustmentRemarks, setAdjustmentRemarks] = useState('')

  // Apply Credit Modal
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [unpaidBills, setUnpaidBills] = useState([])
  const [selectedBills, setSelectedBills] = useState([])

  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)

  const user = authService.getUserSession()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (searchTerm.trim()) {
      const timer = setTimeout(() => {
        handleSearch()
      }, 500)
      return () => clearTimeout(timer)
    } else {
      loadData()
    }
  }, [searchTerm])

  const loadData = async () => {
    setLoading(true)
    const [customersResult, statsResult] = await Promise.all([
      creditService.getCustomersWithCredit(),
      creditService.getCreditStats()
    ])

    if (customersResult.success) {
      setCustomers(customersResult.data)
    } else {
      setError(customersResult.error)
    }

    if (statsResult.success) {
      setStats(statsResult.data)
    }

    setLoading(false)
  }

  const handleSearch = async () => {
    setLoading(true)
    const result = await creditService.searchCustomers(searchTerm)
    if (result.success) {
      setCustomers(result.data)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  const openAdjustModal = (customer) => {
    setSelectedCustomer(customer)
    setAdjustmentType('add')
    setAdjustmentAmount('')
    setAdjustmentRemarks('')
    setShowAdjustModal(true)
  }

  const handleAdjustCredit = async () => {
    if (!selectedCustomer || !adjustmentAmount) {
      setError('Please fill in all required fields')
      return
    }

    const amount = parseFloat(adjustmentAmount)
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setLoading(true)
    const result = await creditService.adjustCredit(
      selectedCustomer.customerid,
      amount,
      adjustmentType,
      adjustmentRemarks
    )

    if (result.success) {
      setSuccess(`Credit ${adjustmentType === 'add' ? 'added' : 'deducted'} successfully!`)
      setShowAdjustModal(false)
      loadData()
      setTimeout(() => setSuccess(''), 3000)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  const openApplyModal = async (customer) => {
    setSelectedCustomer(customer)
    setLoading(true)
    const result = await creditService.getUnpaidBills(customer.customerid)
    if (result.success) {
      setUnpaidBills(result.data)
      setSelectedBills([])
      setShowApplyModal(true)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  const handleApplyCredit = async () => {
    if (selectedBills.length === 0) {
      setError('Please select at least one bill')
      return
    }

    const totalToApply = selectedBills.reduce((sum, b) => sum + parseFloat(b.amount), 0)
    const availableCredit = parseFloat(selectedCustomer.credit_balance || 0)

    if (totalToApply > availableCredit) {
      setError('Total amount exceeds available credit')
      return
    }

    setLoading(true)
    const result = await creditService.applyCreditToBills(
      selectedCustomer.customerid,
      selectedBills,
      totalToApply,
      `${user.firstname} ${user.lastname}`
    )

    if (result.success) {
      setSuccess(`Credit applied to ${result.data.billsPaid} bill(s) successfully!`)
      setShowApplyModal(false)
      loadData()
      setTimeout(() => setSuccess(''), 3000)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  const toggleBillSelection = (bill) => {
    const billAmount = parseFloat(bill.totalbillamount || 0)
    const existingIndex = selectedBills.findIndex(b => b.billid === bill.billid)

    if (existingIndex >= 0) {
      setSelectedBills(prev => prev.filter(b => b.billid !== bill.billid))
    } else {
      setSelectedBills(prev => [...prev, { billid: bill.billid, amount: billAmount }])
    }
  }

  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long'
    })
  }

  return (
    <div className="credit-management-page" style={{ padding: '0' }}>
      {/* Header */}
      <div className="level mb-3">
        <div className="level-left">
          <div className="level-item">
            <h1 className="title is-4 mb-0">
              <span className="icon"><i className="fas fa-piggy-bank"></i></span>
              Credit Management
            </h1>
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
      {success && (
        <div className="notification is-success is-light py-3">
          <button className="delete" onClick={() => setSuccess('')}></button>
          {success}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="columns mb-3">
        <div className="column">
          <div className="box has-background-info-light">
            <p className="heading">Total Customers</p>
            <p className="title is-4">{stats.totalCustomers.toLocaleString()}</p>
          </div>
        </div>
        <div className="column">
          <div className="box has-background-success-light">
            <p className="heading">Customers with Credit</p>
            <p className="title is-4">{stats.customersWithCredit.toLocaleString()}</p>
          </div>
        </div>
        <div className="column">
          <div className="box has-background-warning-light">
            <p className="heading">Total Credit Amount</p>
            <p className="title is-4">{formatCurrency(stats.totalCreditAmount)}</p>
          </div>
        </div>
        <div className="column">
          <div className="box has-background-primary-light">
            <p className="heading">Average Credit</p>
            <p className="title is-4">{formatCurrency(stats.averageCredit)}</p>
          </div>
        </div>
      </div>

      {/* Search Box */}
      <div className="box" style={{ marginBottom: '1rem', padding: '1.5rem' }}>
        <div className="field has-addons">
          <div className="control is-expanded">
            <input
              className="input"
              type="text"
              placeholder="Search customer by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="control">
            <button className={`button is-primary ${loading ? 'is-loading' : ''}`} onClick={handleSearch}>
              <span className="icon"><i className="fas fa-search"></i></span>
              <span>Search</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="box" style={{ padding: '0' }}>
        {loading && customers.length === 0 ? (
          <div className="has-text-centered" style={{ padding: '3rem' }}>
            <button className="button is-loading is-large is-ghost"></button>
          </div>
        ) : customers.length === 0 ? (
          <div className="has-text-centered" style={{ padding: '3rem' }}>
            <span className="icon is-large has-text-grey-light">
              <i className="fas fa-piggy-bank fa-3x"></i>
            </span>
            <p className="has-text-grey mt-4">No customers found</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table is-fullwidth is-striped is-hoverable">
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Customer Name</th>
                  <th>Barangay</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Credit Balance</th>
                  <th width="200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.customerid}>
                    <td className="has-text-weight-bold">{customer.customerid}</td>
                    <td>{customer.name}</td>
                    <td><span className="tag is-light">{customer.barangay}</span></td>
                    <td><span className="tag is-info is-light">{customer.type}</span></td>
                    <td>
                      <span className={`tag ${customer.status === 'Active' ? 'is-success' : 'is-warning'} is-light`}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="has-text-weight-bold has-text-success">
                      {formatCurrency(customer.credit_balance)}
                    </td>
                    <td>
                      <div className="buttons are-small">
                        <button
                          className="button is-info is-small"
                          onClick={() => openAdjustModal(customer)}
                          title="Adjust Credit"
                        >
                          <span className="icon"><i className="fas fa-edit"></i></span>
                          <span>Adjust</span>
                        </button>
                        {parseFloat(customer.credit_balance || 0) > 0 && (
                          <button
                            className="button is-success is-small"
                            onClick={() => openApplyModal(customer)}
                            title="Apply Credit to Bills"
                          >
                            <span className="icon"><i className="fas fa-check-circle"></i></span>
                            <span>Apply</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjust Credit Modal (continued in next part due to length) */}
      {showAdjustModal && selectedCustomer && (
        <div className="modal is-active">
          <div className="modal-background" onClick={() => setShowAdjustModal(false)}></div>
          <div className="modal-card">
            <header className="modal-card-head">
              <p className="modal-card-title">
                <span className="icon"><i className="fas fa-coins"></i></span>
                Adjust Credit - {selectedCustomer.name}
              </p>
              <button className="delete" onClick={() => setShowAdjustModal(false)}></button>
            </header>
            <section className="modal-card-body">
              <div className="notification is-info is-light mb-3">
                <strong>Current Credit Balance:</strong> {formatCurrency(selectedCustomer.credit_balance)}
              </div>

              <div className="field">
                <label className="label">Adjustment Type</label>
                <div className="control">
                  <div className="select is-fullwidth">
                    <select value={adjustmentType} onChange={(e) => setAdjustmentType(e.target.value)}>
                      <option value="add">Add Credit</option>
                      <option value="deduct">Deduct Credit</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="field">
                <label className="label">Amount <span className="has-text-danger">*</span></label>
                <div className="control has-icons-left">
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    placeholder="Enter amount"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                  />
                  <span className="icon is-small is-left">
                    <i className="fas fa-peso-sign"></i>
                  </span>
                </div>
              </div>

              <div className="field">
                <label className="label">Remarks</label>
                <div className="control">
                  <textarea
                    className="textarea"
                    placeholder="Enter remarks (optional)"
                    value={adjustmentRemarks}
                    onChange={(e) => setAdjustmentRemarks(e.target.value)}
                    rows="3"
                  ></textarea>
                </div>
              </div>

              {adjustmentAmount && (
                <div className={`notification ${adjustmentType === 'add' ? 'is-success' : 'is-warning'} is-light`}>
                  <strong>New Balance:</strong> {formatCurrency(
                    parseFloat(selectedCustomer.credit_balance || 0) + 
                    (adjustmentType === 'add' ? 1 : -1) * parseFloat(adjustmentAmount || 0)
                  )}
                </div>
              )}
            </section>
            <footer className="modal-card-foot">
              <button
                className={`button is-success ${loading ? 'is-loading' : ''}`}
                onClick={handleAdjustCredit}
                disabled={loading}
              >
                <span className="icon"><i className="fas fa-check"></i></span>
                <span>Confirm Adjustment</span>
              </button>
              <button className="button" onClick={() => setShowAdjustModal(false)}>Cancel</button>
            </footer>
          </div>
        </div>
      )}

      {/* Apply Credit Modal */}
      {showApplyModal && selectedCustomer && (
        <div className="modal is-active">
          <div className="modal-background" onClick={() => setShowApplyModal(false)}></div>
          <div className="modal-card" style={{ width: '900px' }}>
            <header className="modal-card-head">
              <p className="modal-card-title">
                <span className="icon"><i className="fas fa-money-check-alt"></i></span>
                Apply Credit - {selectedCustomer.name}
              </p>
              <button className="delete" onClick={() => setShowApplyModal(false)}></button>
            </header>
            <section className="modal-card-body">
              <div className="notification is-info is-light mb-3">
                <div className="columns is-mobile">
                  <div className="column">
                    <strong>Available Credit:</strong> {formatCurrency(selectedCustomer.credit_balance)}
                  </div>
                  <div className="column">
                    <strong>Selected Total:</strong> {formatCurrency(selectedBills.reduce((sum, b) => sum + b.amount, 0))}
                  </div>
                </div>
              </div>

              {unpaidBills.length === 0 ? (
                <div className="has-text-centered" style={{ padding: '2rem' }}>
                  <span className="icon is-large has-text-grey-light">
                    <i className="fas fa-check-circle fa-2x"></i>
                  </span>
                  <p className="has-text-grey mt-3">No unpaid bills found</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="table is-fullwidth is-striped is-hoverable is-narrow">
                    <thead>
                      <tr>
                        <th width="50"></th>
                        <th>Bill ID</th>
                        <th>Billed Month</th>
                        <th>Consumption</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unpaidBills.map((bill) => (
                        <tr key={bill.billid}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedBills.some(b => b.billid === bill.billid)}
                              onChange={() => toggleBillSelection(bill)}
                            />
                          </td>
                          <td>{bill.billid}</td>
                          <td>{formatDate(bill.billedmonth)}</td>
                          <td>{bill.consumption} cu.m</td>
                          <td className="has-text-weight-bold">{formatCurrency(bill.totalbillamount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            <footer className="modal-card-foot">
              <button
                className={`button is-success ${loading ? 'is-loading' : ''}`}
                onClick={handleApplyCredit}
                disabled={loading || selectedBills.length === 0}
              >
                <span className="icon"><i className="fas fa-check-circle"></i></span>
                <span>Apply Credit to {selectedBills.length} Bill(s)</span>
              </button>
              <button className="button" onClick={() => setShowApplyModal(false)}>Cancel</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreditManagementPage
