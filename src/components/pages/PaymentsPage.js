import React, { useState, useEffect } from 'react'
import { paymentService } from '../../services/paymentService'
import { authService } from '../../authService'
import PaymentConfirmDialog from '../common/PaymentConfirmDialog'
import ConfirmationDialog from '../common/ConfirmationDialog'

const PaymentsPage = () => {
  const [activeTab, setActiveTab] = useState('search') // search or customerid
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [customerTabs, setCustomerTabs] = useState([]) // Array of customer tab objects
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Filters
  const [filterBarangay, setFilterBarangay] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [barangays, setBarangays] = useState([])
  const [customerTypes, setCustomerTypes] = useState([])
  
  // Surcharge
  const [surchargeSettings, setSurchargeSettings] = useState(null)
  
  const [stats, setStats] = useState({
    todayCollection: 0,
    todayCount: 0,
    monthCollection: 0,
    monthCount: 0
  })
  
  // Recent Payments
  const [recentPayments, setRecentPayments] = useState([])
  const [loadingRecentPayments, setLoadingRecentPayments] = useState(false)
  
  // Payment Confirmation
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false)
  const [pendingPayment, setPendingPayment] = useState(null)
  const [amountReceived, setAmountReceived] = useState('')
  
  // Mark as Unpaid
  const [showUnpaidConfirm, setShowUnpaidConfirm] = useState(false)
  const [billToMarkUnpaid, setBillToMarkUnpaid] = useState(null)

  const user = authService.getUserSession()

  useEffect(() => {
    loadStats()
    loadFilterOptions()
    loadSurchargeSettings()
    loadRecentPayments()
  }, [])

  // Auto-search when searchTerm or filters change
  useEffect(() => {
    // Clear results if search term is empty
    if (!searchTerm.trim()) {
      setSearchResults([])
      return
    }

    // Debounced search
    const timer = setTimeout(() => {
      handleSearch()
    }, 500)
    
    return () => clearTimeout(timer)
  }, [searchTerm, filterBarangay, filterType, filterStatus])

  const loadStats = async () => {
    const result = await paymentService.getPaymentStats()
    if (result.success) {
      setStats(result.data)
    }
  }

  const loadFilterOptions = async () => {
    try {
      // Get unique barangays from customers
      const { data: customersData } = await paymentService.searchCustomers('')
      if (customersData) {
        const uniqueBarangays = [...new Set(customersData.map(c => c.barangay).filter(Boolean))]
        setBarangays(uniqueBarangays.map(b => ({ barangay: b })))
        
        const uniqueTypes = [...new Set(customersData.map(c => c.type).filter(Boolean))]
        setCustomerTypes(uniqueTypes.map(t => ({ type: t })))
      }
    } catch (error) {
      console.error('Error loading filter options:', error)
    }
  }

  const loadSurchargeSettings = async () => {
    const result = await paymentService.getSurchargeSettings()
    if (result.success) {
      setSurchargeSettings(result.data)
    }
  }

  const loadRecentPayments = async () => {
    setLoadingRecentPayments(true)
    const result = await paymentService.getRecentPayments(10)
    if (result.success) {
      setRecentPayments(result.data)
    }
    setLoadingRecentPayments(false)
  }

  const handleProcessPayment = async (amountReceived, creditToApply, newCredit) => {
    if (!pendingPayment) return
    
    setLoading(true)
    
    // Calculate total credit adjustment: deduct applied credit, add new credit
    const creditAdjustment = newCredit - creditToApply
    
    const result = await paymentService.processPayment(
      pendingPayment.bills,
      `${user.firstname} ${user.lastname}`,
      amountReceived,
      creditAdjustment
    )
    
    if (result.success) {
      let message = `Successfully processed payment for ${result.data.paidCount} bill(s)!`
      if (creditToApply > 0) {
        message += ` Credit of ₱${creditToApply.toFixed(2)} was applied.`
      }
      if (newCredit > 0) {
        message += ` New credit of ₱${newCredit.toFixed(2)} added to account.`
      }
      setSuccess(message)
      await reloadCustomerData(pendingPayment.customerid)
      loadStats()
      loadRecentPayments()
      setTimeout(() => setSuccess(''), 5000)
    } else {
      setError(result.error)
    }
    setLoading(false)
    setShowPaymentConfirm(false)
    setPendingPayment(null)
  }

  const handleMarkAsUnpaid = async () => {
    if (!billToMarkUnpaid) return
    
    setLoading(true)
    const result = await paymentService.markBillAsUnpaid(billToMarkUnpaid.billid)
    
    if (result.success) {
      setSuccess(`Bill #${billToMarkUnpaid.billid} marked as unpaid successfully!`)
      await reloadCustomerData(billToMarkUnpaid.customerid)
      loadStats()
      loadRecentPayments()
      setTimeout(() => setSuccess(''), 3000)
    } else {
      setError(result.error)
    }
    setLoading(false)
    setShowUnpaidConfirm(false)
    setBillToMarkUnpaid(null)
  }

  // Get active customer tab
  const getActiveCustomerTab = () => {
    return customerTabs.find(tab => tab.customer.customerid === activeTab)
  }

  // Calculate surcharges and discounts for bills
  const calculateBillsWithSurcharge = (bills, customer) => {
    if (!surchargeSettings) return bills
    
    return bills.map(bill => {
      const surchargeInfo = paymentService.calculateSurcharge(bill, surchargeSettings)
      
      // Calculate discount from customer discount percentage
      const basicAmount = parseFloat(bill.basicamount || 0)
      
      // Priority: bill's stored discount > customer discount percentage
      let calculatedDiscountAmount = 0
      if (bill.discountamount && parseFloat(bill.discountamount) > 0) {
        // Use stored discount from bill
        calculatedDiscountAmount = parseFloat(bill.discountamount)
      } else if (customer && customer.discount) {
        // Calculate from customer discount percentage
        const customerDiscountPercent = parseFloat(customer.discount)
        calculatedDiscountAmount = (basicAmount * customerDiscountPercent) / 100
      }
      
      // Calculate total: basic + surcharge - discount
      const surchargeAmount = surchargeInfo ? surchargeInfo.surchargeAmount : parseFloat(bill.surchargeamount || 0)
      const totalWithSurcharge = basicAmount + surchargeAmount - calculatedDiscountAmount
      
      return {
        ...bill,
        surchargeInfo,
        calculatedDiscountAmount,
        calculatedTotal: totalWithSurcharge
      }
    })
  }

  // Handle customer search with filters
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a customer name or ID')
      return
    }

    setLoading(true)
    setError('')
    const result = await paymentService.searchCustomers(searchTerm)
    
    if (result.success) {
      let filteredData = result.data
      
      // Apply filters
      if (filterBarangay !== 'all') {
        filteredData = filteredData.filter(c => c.barangay === filterBarangay)
      }
      if (filterType !== 'all') {
        filteredData = filteredData.filter(c => c.type === filterType)
      }
      if (filterStatus !== 'all') {
        filteredData = filteredData.filter(c => c.status === filterStatus)
      }
      
      setSearchResults(filteredData)
      if (filteredData.length === 0) {
        setError(`No customers found matching "${searchTerm}" with current filters.`)
      }
    } else {
      setError(`Search error: ${result.error}`)
    }
    setLoading(false)
  }

  // Browse all customers with filters
  const handleBrowseAll = async () => {
    setLoading(true)
    setError('')
    setSearchTerm('')
    const result = await paymentService.searchCustomers('')
    
    if (result.success) {
      let filteredData = result.data
      
      // Apply filters
      if (filterBarangay !== 'all') {
        filteredData = filteredData.filter(c => c.barangay === filterBarangay)
      }
      if (filterType !== 'all') {
        filteredData = filteredData.filter(c => c.type === filterType)
      }
      if (filterStatus !== 'all') {
        filteredData = filteredData.filter(c => c.status === filterStatus)
      }
      
      setSearchResults(filteredData)
      if (filteredData.length === 0) {
        setError('No customers found with current filters.')
      }
    } else {
      setError(`Error loading customers: ${result.error}`)
    }
    setLoading(false)
  }

  // Select customer and load their data (add new tab or switch to existing)
  const handleSelectCustomer = async (customer) => {
    // Check if customer already has a tab
    const existingTab = customerTabs.find(tab => tab.customer.customerid === customer.customerid)
    
    if (existingTab) {
      // Just switch to existing tab
      setActiveTab(customer.customerid)
      return
    }

    setLoading(true)
    setError('')

    // Load customer details with credit balance
    const customerDetailsResult = await paymentService.getCustomerDetails(customer.customerid)
    const customerWithCredit = customerDetailsResult.success ? customerDetailsResult.data : customer

    // Load unpaid bills
    const unpaidResult = await paymentService.getUnpaidBills(customer.customerid)
    const unpaidBills = unpaidResult.success ? unpaidResult.data : []

    // Load payment history
    const historyResult = await paymentService.getPaymentHistory(customer.customerid)
    const paymentHistory = historyResult.success ? historyResult.data : []

    // Create new tab with calculated surcharges and discounts
    const billsWithSurcharge = calculateBillsWithSurcharge(unpaidBills, customerWithCredit)
    const newTab = {
      customer: customerWithCredit,
      unpaidBills,
      paymentHistory,
      billsWithSurcharge,
      selectedBills: [],
      creditBalance: parseFloat(customerWithCredit.credit_balance || 0)
    }

    setCustomerTabs([...customerTabs, newTab])
    setActiveTab(customer.customerid) // Switch to new tab
    setLoading(false)
  }

  // Close a customer tab
  const handleCloseTab = (customerid) => {
    const updatedTabs = customerTabs.filter(tab => tab.customer.customerid !== customerid)
    setCustomerTabs(updatedTabs)
    
    // If closing active tab, switch to search or another tab
    if (activeTab === customerid) {
      if (updatedTabs.length > 0) {
        setActiveTab(updatedTabs[updatedTabs.length - 1].customer.customerid)
      } else {
        setActiveTab('search')
      }
    }
  }

  // Update selected bills for active tab
  const updateSelectedBills = (bills) => {
    setCustomerTabs(prevTabs =>
      prevTabs.map(tab =>
        tab.customer.customerid === activeTab
          ? { ...tab, selectedBills: bills }
          : tab
      )
    )
  }

  // Reload customer tab data after payment
  const reloadCustomerData = async (customerid) => {
    const customerDetailsResult = await paymentService.getCustomerDetails(customerid)
    const unpaidResult = await paymentService.getUnpaidBills(customerid)
    const historyResult = await paymentService.getPaymentHistory(customerid)

    const newUnpaidBills = unpaidResult.success ? unpaidResult.data : []
    const customerWithCredit = customerDetailsResult.success ? customerDetailsResult.data : null
    const billsWithSurcharge = calculateBillsWithSurcharge(newUnpaidBills, customerWithCredit)

    setCustomerTabs(prevTabs =>
      prevTabs.map(tab =>
        tab.customer.customerid === customerid
          ? {
              ...tab,
              customer: customerWithCredit || tab.customer,
              unpaidBills: newUnpaidBills,
              paymentHistory: historyResult.success ? historyResult.data : [],
              billsWithSurcharge,
              creditBalance: customerWithCredit ? parseFloat(customerWithCredit.credit_balance || 0) : 0,
              selectedBills: []
            }
          : tab
      )
    )
  }

  // Format currency
  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Format month
  const formatMonth = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long'
    })
  }

  return (
    <div className="customers-page">
      {/* Compact Header */}
      <div className="compact-header">
        <div className="header-row">
          <div className="title-section">
            <h1 className="page-title">Payment Processing</h1>
            <div className="stats-inline">
              <span className="stat-item">
                <i className="fas fa-cash-register"></i>
                <strong>{formatCurrency(stats.todayCollection)}</strong> Today
              </span>
              <span className="stat-item active">
                <i className="fas fa-calendar-alt"></i>
                <strong>{formatCurrency(stats.monthCollection)}</strong> This Month
              </span>
              <span className="stat-item">
                <i className="fas fa-receipt"></i>
                <strong>{stats.todayCount + stats.monthCount}</strong> Transactions
              </span>
            </div>
          </div>
          <div className="header-actions">
            {customerTabs.length > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('search')}>
                <i className="fas fa-search"></i>
                Search Customers
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="notification is-warning">
          <button className="delete" onClick={() => setError('')}></button>
          {error}
        </div>
      )}
      {success && (
        <div className="notification is-success">
          <button className="delete" onClick={() => setSuccess('')}></button>
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs is-boxed">
        <ul>
          <li className={activeTab === 'search' ? 'is-active' : ''} onClick={() => setActiveTab('search')}>
            <a>
              <span className="icon is-small"><i className="fas fa-search"></i></span>
              <span>Customer Search</span>
            </a>
          </li>
          {customerTabs.map((tab) => (
            <li 
              key={tab.customer.customerid}
              className={activeTab === tab.customer.customerid ? 'is-active' : ''}
              style={{ position: 'relative' }}
            >
              <a onClick={() => setActiveTab(tab.customer.customerid)} style={{ paddingRight: '2rem' }}>
                <span className="icon is-small"><i className="fas fa-money-check-alt"></i></span>
                <span>{tab.customer.name}</span>
              </a>
              <button 
                className="delete is-small"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCloseTab(tab.customer.customerid)
                }}
                style={{ 
                  position: 'absolute', 
                  top: '8px', 
                  right: '8px',
                  zIndex: 10
                }}
                title="Close tab"
              ></button>
            </li>
          ))}
        </ul>
      </div>

      {/* Tab Content: Customer Search */}
      {activeTab === 'search' && (
        <div>
          {/* Compact Search */}
          <div className="compact-filters">
            <div className="search-input">
              <div className="control has-icons-left">
                <input
                  className="input is-small"
                  type="text"
                  placeholder="Search customer name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <span className="icon is-small is-left">
                  <i className="fas fa-search"></i>
                </span>
              </div>
            </div>

            <div className="filter-row">
              <div className="filter-group">
                <select 
                  className="select is-small" 
                  value={filterBarangay} 
                  onChange={(e) => setFilterBarangay(e.target.value)}
                >
                  <option value="all">All Barangays</option>
                  {barangays.map(barangayObj => (
                    <option key={barangayObj.barangay} value={barangayObj.barangay}>
                      {barangayObj.barangay}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <select 
                  className="select is-small" 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All Types</option>
                  {customerTypes.map(typeObj => (
                    <option key={typeObj.type} value={typeObj.type}>{typeObj.type}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <select 
                  className="select is-small" 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Disconnected">Disconnected</option>
                </select>
              </div>

              <button 
                className={`button is-info is-small ${loading ? 'is-loading' : ''}`}
                onClick={handleSearch}
                disabled={loading}
              >
                <span className="icon"><i className="fas fa-search"></i></span>
                <span>Search</span>
              </button>
              <button 
                className={`button is-link is-small ${loading ? 'is-loading' : ''}`}
                onClick={handleBrowseAll}
                disabled={loading}
              >
                <span className="icon"><i className="fas fa-list"></i></span>
                <span>Browse All</span>
              </button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="box" style={{ marginTop: '1rem', padding: '1.5rem' }}>
              <h3 className="title is-6 mb-3">
                <span className="icon"><i className="fas fa-users"></i></span>
                Search Results
              </h3>
              <div className="table-container">
                <table className="table is-fullwidth is-striped is-hoverable">
                  <thead>
                    <tr>
                      <th>Customer ID</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Barangay</th>
                      <th>Status</th>
                      <th width="100">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((customer) => (
                      <tr 
                        key={customer.customerid}
                        onClick={() => handleSelectCustomer(customer)}
                        style={{ cursor: 'pointer' }}
                        title="Click to select customer"
                      >
                        <td>{customer.customerid}</td>
                        <td><strong>{customer.name}</strong></td>
                        <td><span className="tag is-info is-light">{customer.type}</span></td>
                        <td>{customer.barangay}</td>
                        <td>
                          <span className={`tag ${customer.status === 'Active' ? 'is-success' : 'is-danger'}`}>
                            {customer.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="button is-small is-primary"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelectCustomer(customer)
                            }}
                          >
                            <span className="icon"><i className="fas fa-arrow-right"></i></span>
                            <span>Select</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Payments */}
          {recentPayments.length > 0 && (
            <div className="box" style={{ marginTop: '1rem', padding: '1.5rem' }}>
              <h3 className="title is-6 mb-3">
                <span className="icon"><i className="fas fa-clock"></i></span>
                Recent Payments
              </h3>
              <div className="table-container">
                <table className="table is-fullwidth is-narrow is-striped is-hoverable">
                  <thead>
                    <tr>
                      <th>Date Paid</th>
                      <th>Customer ID</th>
                      <th>Customer Name</th>
                      <th>Barangay</th>
                      <th>Billed Month</th>
                      <th>Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.map((payment) => (
                      <tr key={payment.billid}>
                        <td>
                          <span className="icon-text">
                            <span className="icon has-text-success">
                              <i className="fas fa-check-circle"></i>
                            </span>
                            <span>{new Date(payment.datepaid).toLocaleDateString('en-PH', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </span>
                        </td>
                        <td className="has-text-weight-bold">{payment.customerid}</td>
                        <td>{payment.customer?.name || 'N/A'}</td>
                        <td><span className="tag is-light">{payment.customer?.barangay || 'N/A'}</span></td>
                        <td>{new Date(payment.billedmonth).toLocaleDateString('en-PH', { year: 'numeric', month: 'long' })}</td>
                        <td className="has-text-weight-bold has-text-success">
                          ₱{parseFloat(payment.totalbillamount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {searchResults.length === 0 && !loading && recentPayments.length === 0 && (
            <div className="has-text-centered" style={{ padding: '3rem' }}>
              <span className="icon is-large has-text-grey-light">
                <i className="fas fa-search fa-3x"></i>
              </span>
              <p className="has-text-grey mt-4">Search for customers to process payments</p>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Payment Processing */}
      {activeTab !== 'search' && getActiveCustomerTab() && (() => {
        const currentTab = getActiveCustomerTab()
        const { customer, unpaidBills, paymentHistory, billsWithSurcharge, selectedBills } = currentTab
        return (
        <div>
          {/* Customer Info Banner */}
          <div className="box" style={{ background: '#f5f5f5', marginBottom: '1rem' }}>
            <div className="level is-mobile">
              <div className="level-left">
                <div className="level-item">
                  <div>
                    <p className="heading">Customer</p>
                    <p className="title is-5">{customer.name}</p>
                  </div>
                </div>
                <div className="level-item">
                  <div>
                    <p className="heading">ID</p>
                    <p className="title is-6">{customer.customerid}</p>
                  </div>
                </div>
                <div className="level-item">
                  <div>
                    <p className="heading">Type</p>
                    <p><span className="tag is-info">{customer.type}</span></p>
                  </div>
                </div>
                <div className="level-item">
                  <div>
                    <p className="heading">Barangay</p>
                    <p className="title is-6">{customer.barangay}</p>
                  </div>
                </div>
                <div className="level-item">
                  <div>
                    <p className="heading">Discount</p>
                    <p className="title is-6">{customer.discount || 0}%</p>
                  </div>
                </div>
                <div className="level-item">
                  <div>
                    <p className="heading">Status</p>
                    <p>
                      <span className={`tag ${customer.status === 'Active' ? 'is-success' : 'is-danger'}`}>
                        {customer.status}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="level-item">
                  <div>
                    <p className="heading">Credit Balance</p>
                    <p className="title is-6 has-text-success">
                      {formatCurrency(currentTab.creditBalance || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Unpaid Bills Section */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 className="title is-5">
              <i className="fas fa-file-invoice-dollar"></i> Unpaid Bills
              {unpaidBills.length > 0 && (
                <span className="tag is-danger ml-2">{unpaidBills.length}</span>
              )}
            </h2>
            
            {loading ? (
              <div className="has-text-centered" style={{ padding: '2rem' }}>
                <button className="button is-loading is-large is-ghost"></button>
              </div>
            ) : unpaidBills.length === 0 ? (
              <div className="notification is-success is-light has-text-centered">
                <i className="fas fa-check-circle fa-2x"></i>
                <p className="mt-2">No unpaid bills</p>
              </div>
            ) : (
                <>
                  <div className="table-container">
                    <table className="table is-fullwidth is-striped is-hoverable">
                      <thead>
                        <tr>
                          <th width="50">
                            <label className="checkbox">
                              <input
                                type="checkbox"
                                checked={selectedBills.length === billsWithSurcharge.length && billsWithSurcharge.length > 0}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    updateSelectedBills(billsWithSurcharge.map(b => b.billid))
                                  } else {
                                    updateSelectedBills([])
                                  }
                                }}
                              />
                            </label>
                          </th>
                          <th>Bill ID</th>
                          <th>Billing Month</th>
                          <th>Previous</th>
                          <th>Current</th>
                          <th>Consumption</th>
                          <th>Basic Amount</th>
                          <th>Surcharge</th>
                          <th>Discount</th>
                          <th>Total Bill</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billsWithSurcharge.map((bill) => {
                          const isOverdue = bill.surchargeInfo && bill.surchargeInfo.daysOverdue > 0
                          return (
                            <tr key={bill.billid} className={selectedBills.includes(bill.billid) ? 'is-selected' : ''}>
                              <td>
                                <label className="checkbox">
                                  <input
                                    type="checkbox"
                                    checked={selectedBills.includes(bill.billid)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        updateSelectedBills([...selectedBills, bill.billid])
                                      } else {
                                        updateSelectedBills(selectedBills.filter(id => id !== bill.billid))
                                      }
                                    }}
                                  />
                                </label>
                              </td>
                              <td><strong>{bill.billid}</strong></td>
                              <td>
                                <div>{formatMonth(bill.billedmonth)}</div>
                                {isOverdue && (
                                  <small className="has-text-danger">
                                    <i className="fas fa-exclamation-triangle"></i> {bill.surchargeInfo.daysOverdue} days overdue
                                  </small>
                                )}
                              </td>
                              <td>{bill.previousreading || 0}</td>
                              <td>{bill.currentreading || 0}</td>
                              <td><strong>{bill.consumption} cu.m</strong></td>
                              <td>{formatCurrency(bill.basicamount)}</td>
                              <td>
                                {bill.surchargeInfo && bill.surchargeInfo.surchargeAmount > 0 ? (
                                  <span className="has-text-danger has-text-weight-bold">
                                    {formatCurrency(bill.surchargeInfo.surchargeAmount)}
                                  </span>
                                ) : (
                                  <span className="has-text-grey">-</span>
                                )}
                              </td>
                              <td className="has-text-success">
                                {bill.calculatedDiscountAmount > 0 ? `-${formatCurrency(bill.calculatedDiscountAmount)}` : '-'}
                              </td>
                              <td className="has-text-weight-bold is-size-5">
                                {formatCurrency(bill.calculatedTotal || bill.totalbillamount)}
                              </td>
                              <td>
                                <span className={`tag ${
                                  bill.paymentstatus === 'Unpaid' ? 'is-danger' :
                                  bill.paymentstatus === 'Partial' ? 'is-warning' : 'is-info'
                                }`}>
                                  {bill.paymentstatus}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="has-background-light">
                          <td className="has-text-centered has-text-weight-bold">
                            {selectedBills.length}
                          </td>
                          <td colSpan="5" className="has-text-right has-text-weight-bold">
                            Selected Bills:
                          </td>
                          <td className="has-text-weight-bold">
                            <div className="heading">Total Basic Amount</div>
                            <div className="is-size-5">
                              {formatCurrency(
                                billsWithSurcharge
                                  .filter(bill => selectedBills.includes(bill.billid))
                                  .reduce((sum, bill) => sum + parseFloat(bill.basicamount || 0), 0)
                              )}
                            </div>
                          </td>
                          <td className="has-text-weight-bold">
                            <div className="heading">Total Surcharge</div>
                            <div className="is-size-5 has-text-danger">
                              {formatCurrency(
                                billsWithSurcharge
                                  .filter(bill => selectedBills.includes(bill.billid))
                                  .reduce((sum, bill) => sum + parseFloat(bill.surchargeInfo?.surchargeAmount || 0), 0)
                              )}
                            </div>
                          </td>
                          <td className="has-text-weight-bold">
                            <div className="heading">Total Discount</div>
                            <div className="is-size-5 has-text-success">
                              -{formatCurrency(
                                billsWithSurcharge
                                  .filter(bill => selectedBills.includes(bill.billid))
                                  .reduce((sum, bill) => sum + parseFloat(bill.calculatedDiscountAmount || 0), 0)
                              )}
                            </div>
                          </td>
                          <td className="has-text-weight-bold">
                            <div className="heading">Grand Total</div>
                            <div className="is-size-4 has-text-success">
                              {formatCurrency(
                                billsWithSurcharge
                                  .filter(bill => selectedBills.includes(bill.billid))
                                  .reduce((sum, bill) => sum + parseFloat(bill.calculatedTotal || bill.totalbillamount || 0), 0)
                              )}
                            </div>
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Payment Action Buttons */}
                  {selectedBills.length > 0 && (
                    <div className="buttons is-right mt-3">
                      <button
                        className="button is-small is-light"
                        onClick={() => updateSelectedBills([])}
                      >
                        <span className="icon is-small"><i className="fas fa-times"></i></span>
                        <span>Clear</span>
                      </button>
                      <button
                        className="button is-success"
                        onClick={() => {
                          // Calculate total from actual bills
                          const totalAmount = billsWithSurcharge
                            .filter(bill => selectedBills.includes(bill.billid))
                            .reduce((sum, bill) => sum + parseFloat(bill.calculatedTotal || bill.totalbillamount || 0), 0)
                          
                          setPendingPayment({
                            bills: selectedBills,
                            customerid: customer.customerid,
                            count: selectedBills.length,
                            totalAmount: totalAmount,
                            creditBalance: currentTab.creditBalance || 0
                          })
                          setAmountReceived('')
                          setShowPaymentConfirm(true)
                        }}
                      >
                        <span className="icon"><i className="fas fa-check-circle"></i></span>
                        <span>Process Payment</span>
                      </button>
                    </div>
                  )}
                </>
              )}
          </div>

          {/* Payment History Section */}
          <div style={{ marginTop: '1.5rem' }}>
            <h2 className="title is-5">
              <i className="fas fa-history"></i> Payment History
              {paymentHistory.length > 0 && (
                <span className="tag is-info ml-2">{paymentHistory.length}</span>
              )}
            </h2>
            
            {loading ? (
              <div className="has-text-centered" style={{ padding: '2rem' }}>
                <button className="button is-loading is-large is-ghost"></button>
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="notification is-light has-text-centered">
                <i className="fas fa-history fa-2x has-text-grey-light"></i>
                <p className="has-text-grey mt-2">No payment history</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table is-fullwidth is-striped is-hoverable">
                  <thead>
                    <tr>
                      <th>Bill ID</th>
                      <th>Billing Month</th>
                      <th>Previous</th>
                      <th>Current</th>
                      <th>Consumption</th>
                      <th>Amount Paid</th>
                      <th>Date Paid</th>
                      <th>Paid By</th>
                      <th>Status</th>
                      <th width="120">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((bill) => (
                      <tr key={bill.billid}>
                        <td><strong>{bill.billid}</strong></td>
                        <td>{formatMonth(bill.billedmonth)}</td>
                        <td>{bill.previousreading || 0}</td>
                        <td>{bill.currentreading || 0}</td>
                        <td><strong>{bill.consumption} cu.m</strong></td>
                        <td className="has-text-weight-bold">{formatCurrency(bill.totalbillamount)}</td>
                        <td>{formatDate(bill.datepaid)}</td>
                        <td>{bill.paidby}</td>
                        <td>
                          <span className="tag is-success">
                            <i className="fas fa-check"></i> {bill.paymentstatus}
                          </span>
                        </td>
                        <td>
                          <button
                            className="button is-warning is-small"
                            onClick={() => {
                              setBillToMarkUnpaid(bill)
                              setShowUnpaidConfirm(true)
                            }}
                            title="Mark as Unpaid"
                          >
                            <span className="icon"><i className="fas fa-undo"></i></span>
                            <span>Unpaid</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        )
      })()}
      
      {/* Payment Confirmation Dialog */}
      <PaymentConfirmDialog
        isOpen={showPaymentConfirm && pendingPayment !== null}
        onClose={() => {
          setShowPaymentConfirm(false)
          setPendingPayment(null)
        }}
        onConfirm={handleProcessPayment}
        billCount={pendingPayment?.count || 0}
        grandTotal={pendingPayment?.totalAmount || 0}
        creditBalance={pendingPayment?.creditBalance || 0}
        loading={loading}
      />

      {/* Mark as Unpaid Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showUnpaidConfirm && billToMarkUnpaid !== null}
        onClose={() => {
          setShowUnpaidConfirm(false)
          setBillToMarkUnpaid(null)
        }}
        onConfirm={handleMarkAsUnpaid}
        title="Mark Bill as Unpaid?"
        message={billToMarkUnpaid ? `Are you sure you want to mark Bill #${billToMarkUnpaid.billid} as unpaid?` : ''}
        subMessage="This will reverse the payment status. Use this only if the bill was accidentally marked as paid."
        confirmText="Mark as Unpaid"
        cancelText="Cancel"
        type="warning"
        loading={loading}
      />
    </div>
  )
}

export default PaymentsPage
