import React, { useState, useEffect } from 'react'
import { billingService } from '../../services/billingService'
import { paymentService } from '../../services/paymentService'
import { authService } from '../../authService'

const BillModal = ({ 
  isOpen, 
  onClose, 
  mode, 
  bill,
  preSelectedCustomer, 
  onSuccess,
  customerTypes,
  surchargeSettings 
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Customer search
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [lastBill, setLastBill] = useState(null)
  const [customerHistory, setCustomerHistory] = useState([])
  
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [billToDelete, setBillToDelete] = useState(null)
  
  // Form data
  const [formData, setFormData] = useState({
    customerid: '',
    billedmonth: '',
    previousreading: 0,
    currentreading: 0,
    consumption: 0,
    basicamount: 0
  })

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && bill) {
        loadEditMode()
      } else if (mode === 'add' && preSelectedCustomer) {
        loadPreSelectedCustomer()
      } else {
        resetForm()
      }
    }
  }, [isOpen, mode, bill, preSelectedCustomer])

  const loadEditMode = async () => {
    const customer = {
      customerid: bill.customerid,
      name: bill.customers?.name || '',
      type: bill.customers?.type || '',
      barangay: bill.customers?.barangay || '',
      discount: bill.customers?.discount || 0
    }
    setSelectedCustomer(customer)
    setFormData({
      customerid: bill.customerid,
      billedmonth: bill.billedmonth.substring(0, 7), // Extract YYYY-MM format
      previousreading: bill.previousreading,
      currentreading: bill.currentreading,
      consumption: bill.consumption,
      basicamount: bill.basicamount
    })
    
    // Load customer history
    const historyResult = await billingService.getCustomerBills(bill.customerid)
    if (historyResult.success) {
      setCustomerHistory(historyResult.data)
    }
  }

  const loadPreSelectedCustomer = async () => {
    // Pre-selected customer from billing page
    await handleSelectCustomer(preSelectedCustomer)
  }

  const resetForm = () => {
    setSelectedCustomer(null)
    setCustomerResults([])
    setCustomerSearch('')
    setLastBill(null)
    setCustomerHistory([])
    setError('')
    setFormData({
      customerid: '',
      billedmonth: getCurrentMonth(),
      previousreading: 0,
      currentreading: 0,
      consumption: 0,
      basicamount: 0
    })
  }

  const getCurrentMonth = () => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  }

  const handleCustomerSearch = async () => {
    if (!customerSearch.trim()) {
      setError('Please enter customer name or ID')
      return
    }
    
    setLoading(true)
    setError('')
    const result = await paymentService.searchCustomers(customerSearch)
    
    if (result.success) {
      setCustomerResults(result.data)
      if (result.data.length === 0) {
        setError('No customers found')
      }
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  const handleSelectCustomer = async (customer) => {
    setSelectedCustomer(customer)
    setCustomerResults([])
    setCustomerSearch('')
    
    // Load last bill for previous reading
    const lastBillResult = await billingService.getLastBill(customer.customerid)
    if (lastBillResult.success && lastBillResult.data) {
      setLastBill(lastBillResult.data)
      setFormData(prev => ({
        ...prev,
        previousreading: lastBillResult.data.currentreading || 0
      }))
    } else {
      setLastBill(null)
      setFormData(prev => ({ ...prev, previousreading: 0 }))
    }
    
    // Load customer billing history
    const historyResult = await billingService.getCustomerBills(customer.customerid)
    if (historyResult.success) {
      setCustomerHistory(historyResult.data)
    }
    
    // Set next billed month (automatically set to month after last bill)
    const nextMonth = getNextBilledMonth(lastBillResult.data?.billedmonth)
    setFormData(prev => ({
      ...prev,
      customerid: customer.customerid,
      billedmonth: nextMonth
    }))
  }

  const getNextBilledMonth = (lastBilledMonth) => {
    if (!lastBilledMonth) {
      return getCurrentMonth()
    }
    // lastBilledMonth comes from DB as YYYY-MM-DD, extract YYYY-MM
    const yearMonth = lastBilledMonth.substring(0, 7)
    const date = new Date(yearMonth + '-01')
    date.setMonth(date.getMonth() + 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }

  const handleFormChange = (field, value) => {
    const newFormData = { ...formData, [field]: value }
    
    // Auto-calculate consumption
    if (field === 'previousreading' || field === 'currentreading') {
      const prev = parseFloat(field === 'previousreading' ? value : newFormData.previousreading) || 0
      const curr = parseFloat(field === 'currentreading' ? value : newFormData.currentreading) || 0
      newFormData.consumption = Math.max(0, curr - prev)
    }
    
    // Auto-calculate basic amount
    if (field === 'consumption' || field === 'previousreading' || field === 'currentreading') {
      const customerType = customerTypes.find(ct => ct.type === selectedCustomer?.type)
      if (customerType && newFormData.consumption >= 0) {
        newFormData.basicamount = billingService.calculateBasicAmount(newFormData.consumption, customerType)
      }
    }
    
    setFormData(newFormData)
  }

  const generateUniqueBillId = async () => {
    // Generate random 8-digit number (10000000 to 99999999)
    const generateRandom8Digit = () => {
      return Math.floor(10000000 + Math.random() * 90000000)
    }
    
    let billId = generateRandom8Digit()
    let attempts = 0
    const maxAttempts = 10
    
    // Check if billId exists and generate new one if it does
    while (attempts < maxAttempts) {
      const { data, error } = await billingService.checkBillIdExists(billId)
      if (error) {
        throw new Error('Error checking bill ID: ' + error)
      }
      if (!data.exists) {
        return billId
      }
      billId = generateRandom8Digit()
      attempts++
    }
    
    throw new Error('Could not generate unique bill ID after ' + maxAttempts + ' attempts')
  }

  const validateForm = async () => {
    if (!selectedCustomer) {
      setError('Please select a customer')
      return false
    }
    
    if (!formData.billedmonth) {
      setError('Please select billing month')
      return false
    }
    
    if (parseFloat(formData.currentreading) < parseFloat(formData.previousreading)) {
      setError('Current reading cannot be less than previous reading')
      return false
    }
    
    // Check for duplicate bill (convert month format for checking)
    const billedMonthForCheck = formData.billedmonth + '-01'
    const duplicateCheck = await billingService.checkDuplicateBill(
      formData.customerid,
      billedMonthForCheck,
      mode === 'edit' ? bill?.billid : null
    )
    
    if (duplicateCheck.exists) {
      setError('A bill for this customer and month already exists')
      return false
    }
    
    return true
  }

  const handleSubmit = async () => {
    if (!await validateForm()) return
    
    setLoading(true)
    setError('')
    
    try {
      // Get current logged-in user
      const currentUser = authService.getUserSession()
      
      const billData = {
        customerid: formData.customerid,
        billedmonth: formData.billedmonth + '-01', // Convert YYYY-MM to YYYY-MM-DD
        previousreading: parseFloat(formData.previousreading) || 0,
        currentreading: parseFloat(formData.currentreading) || 0,
        consumption: parseFloat(formData.consumption) || 0,
        basicamount: parseFloat(formData.basicamount) || 0,
        surchargeamount: 0,
        discountamount: 0,
        totalbillamount: 0,
        paymentstatus: 'Unpaid',
        encodedby: currentUser ? `${currentUser.firstname} ${currentUser.lastname}` : 'Unknown'
      }
      
      let result
      if (mode === 'add') {
        // Generate unique 8-digit bill ID
        const uniqueBillId = await generateUniqueBillId()
        billData.billid = uniqueBillId
        result = await billingService.addBill(billData)
      } else {
        result = await billingService.updateBill(bill.billid, billData)
      }
      
      if (result.success) {
        onSuccess(`Bill ${mode === 'add' ? 'added' : 'updated'} successfully!`)
        onClose()
      } else {
        setError(result.error)
      }
    } catch (error) {
      setError(error.message)
    }
    
    setLoading(false)
  }

  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatMonth = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long'
    })
  }

  if (!isOpen) return null

  return (
    <div className="modal is-active">
      <div className="modal-background" onClick={onClose}></div>
      <div className="modal-card" style={{ width: '90vw', maxWidth: '1000px' }}>
        <header className="modal-card-head" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <p className="modal-card-title" style={{ color: 'white', fontSize: '1.25rem', fontWeight: '600' }}>
            <span className="icon"><i className="fas fa-file-invoice-dollar"></i></span>
            <span>{mode === 'add' ? 'Add New Bill' : 'Edit Bill'}</span>
          </p>
          <button className="delete" onClick={onClose}></button>
        </header>
        
        <section className="modal-card-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '1.5rem' }}>
          {error && (
            <div className="notification is-danger">
              <button className="delete" onClick={() => setError('')}></button>
              {error}
            </div>
          )}

          {/* Customer Selection */}
          {!selectedCustomer && mode === 'add' && (
            <div className="box">
              <h3 className="title is-5">Select Customer</h3>
              <div className="field has-addons">
                <div className="control is-expanded">
                  <input
                    className="input"
                    type="text"
                    placeholder="Search by customer name or ID..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCustomerSearch()}
                  />
                </div>
                <div className="control">
                  <button 
                    className={`button is-primary ${loading ? 'is-loading' : ''}`}
                    onClick={handleCustomerSearch}
                  >
                    Search
                  </button>
                </div>
              </div>

              {customerResults.length > 0 && (
                <div className="table-container mt-3">
                  <table className="table is-fullwidth is-hoverable">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Barangay</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerResults.map((customer) => (
                        <tr key={customer.customerid}>
                          <td>{customer.customerid}</td>
                          <td><strong>{customer.name}</strong></td>
                          <td><span className="tag is-info">{customer.type}</span></td>
                          <td>{customer.barangay}</td>
                          <td>
                            <button
                              className="button is-small is-primary"
                              onClick={() => handleSelectCustomer(customer)}
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Customer Info */}
          {selectedCustomer && (
            <>
              <div style={{ 
                background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)', 
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '1.25rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <span className="icon has-text-primary" style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>
                    <i className="fas fa-user-circle"></i>
                  </span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>Customer Information</h3>
                </div>
                <div className="columns is-multiline is-mobile" style={{ marginBottom: '0' }}>
                  <div className="column is-3">
                    <p style={{ fontSize: '0.75rem', color: '#7a7a7a', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>ID</p>
                    <p style={{ fontSize: '1rem', fontWeight: '600', color: '#363636' }}>{selectedCustomer.customerid}</p>
                  </div>
                  <div className="column is-3">
                    <p style={{ fontSize: '0.75rem', color: '#7a7a7a', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>Name</p>
                    <p style={{ fontSize: '1rem', fontWeight: '600', color: '#363636' }}>{selectedCustomer.name}</p>
                  </div>
                  <div className="column is-3">
                    <p style={{ fontSize: '0.75rem', color: '#7a7a7a', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>Type</p>
                    <span className="tag is-info is-light" style={{ fontWeight: '600' }}>{selectedCustomer.type}</span>
                  </div>
                  <div className="column is-3">
                    <p style={{ fontSize: '0.75rem', color: '#7a7a7a', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>Barangay</p>
                    <p style={{ fontSize: '1rem', fontWeight: '600', color: '#363636' }}>{selectedCustomer.barangay}</p>
                  </div>
                  {lastBill && (
                    <div className="column is-full">
                      <div style={{ 
                        background: '#fff', 
                        padding: '0.75rem', 
                        borderRadius: '6px',
                        border: '1px solid #e0e0e0',
                        marginTop: '0.5rem'
                      }}>
                        <p style={{ fontSize: '0.75rem', color: '#7a7a7a', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>
                          <i className="fas fa-history"></i> Last Reading
                        </p>
                        <p style={{ fontSize: '1rem', fontWeight: '600', color: '#3273dc' }}>
                          {lastBill.currentreading} cu.m <span style={{ color: '#7a7a7a', fontWeight: '400' }}>({formatMonth(lastBill.billedmonth)})</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bill Form */}
              <div style={{ 
                background: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '1.25rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <span className="icon has-text-link" style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>
                    <i className="fas fa-file-invoice"></i>
                  </span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>Bill Details</h3>
                </div>
                
                {/* Billing Month */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.875rem', 
                    fontWeight: '600', 
                    color: '#363636',
                    marginBottom: '0.5rem' 
                  }}>
                    <i className="fas fa-calendar-alt" style={{ marginRight: '0.5rem', color: '#667eea' }}></i>
                    Billing Month *
                  </label>
                  <input
                    className="input"
                    type="month"
                    value={formData.billedmonth}
                    onChange={(e) => handleFormChange('billedmonth', e.target.value)}
                    disabled={mode === 'edit'}
                    style={{ 
                      fontSize: '1rem',
                      borderRadius: '6px',
                      borderColor: '#e0e0e0'
                    }}
                  />
                  <p className="help" style={{ fontSize: '0.75rem', color: '#7a7a7a', marginTop: '0.25rem' }}>
                    Select month and year for billing
                  </p>
                </div>

                {/* Meter Readings & Amount */}
                <div style={{ 
                  background: '#f9fafb', 
                  padding: '1rem', 
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb'
                }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#4b5563', marginBottom: '0.75rem' }}>
                    <i className="fas fa-tachometer-alt" style={{ marginRight: '0.5rem' }}></i>
                    Meter Readings & Amount
                  </p>
                  <div className="columns" style={{ marginBottom: '0' }}>
                    <div className="column is-3">
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                        Previous Reading *
                      </label>
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        value={formData.previousreading}
                        onChange={(e) => handleFormChange('previousreading', e.target.value)}
                        style={{ borderRadius: '6px', fontSize: '1rem', fontWeight: '500' }}
                      />
                      {lastBill && (
                        <p className="help is-info" style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>
                          <i className="fas fa-info-circle"></i> Last: {lastBill.currentreading} cu.m
                        </p>
                      )}
                    </div>
                    <div className="column is-3">
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                        Current Reading *
                      </label>
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        value={formData.currentreading}
                        onChange={(e) => handleFormChange('currentreading', e.target.value)}
                        style={{ borderRadius: '6px', fontSize: '1rem', fontWeight: '500' }}
                      />
                    </div>
                    <div className="column is-3">
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                        Consumption
                      </label>
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        value={formData.consumption}
                        readOnly
                        style={{ 
                          borderRadius: '6px', 
                          fontSize: '1rem', 
                          fontWeight: '700',
                          background: '#fff',
                          color: '#667eea',
                          borderColor: '#667eea'
                        }}
                      />
                      <p className="help" style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                        Auto-calculated
                      </p>
                    </div>
                    <div className="column is-3">
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                        <i className="fas fa-coins" style={{ marginRight: '0.25rem' }}></i>
                        Basic Amount
                      </label>
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        value={formData.basicamount}
                        readOnly
                        style={{ 
                          borderRadius: '6px', 
                          fontSize: '1rem', 
                          fontWeight: '700',
                          background: '#fff',
                          color: '#667eea',
                          borderColor: '#667eea'
                        }}
                      />
                      <p className="help" style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                        Auto-calculated
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Billing History */}
              {customerHistory.length > 0 && (
                <div style={{ 
                  background: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  padding: '1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                    <span className="icon has-text-info" style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>
                      <i className="fas fa-history"></i>
                    </span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>Recent Billing History</h3>
                  </div>
                  <div className="table-container">
                    <table className="table is-fullwidth is-narrow is-striped is-hoverable" style={{ fontSize: '0.9rem' }}>
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th>Reading</th>
                          <th>Consumption</th>
                          <th>Basic Amount</th>
                          <th>Status</th>
                          <th width="120">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerHistory.slice(0, 5).map((h) => (
                          <tr key={h.billid}>
                            <td>{formatMonth(h.billedmonth)}</td>
                            <td>{h.previousreading} → {h.currentreading}</td>
                            <td>{h.consumption} cu.m</td>
                            <td>{formatCurrency(h.basicamount)}</td>
                            <td>
                              <span className={`tag is-small ${
                                h.paymentstatus === 'Paid' ? 'is-success' :
                                h.paymentstatus === 'Partial' ? 'is-warning' : 'is-danger'
                              }`}>
                                {h.paymentstatus}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <button
                                  className="button is-small is-info is-light"
                                  onClick={() => {
                                    // Add customer data to the bill object
                                    const billWithCustomer = {
                                      ...h,
                                      customers: selectedCustomer
                                    }
                                    onClose()
                                    setTimeout(() => {
                                      window.dispatchEvent(new CustomEvent('editBill', { detail: billWithCustomer }))
                                    }, 100)
                                  }}
                                  title="Edit this bill"
                                  style={{ borderRadius: '4px' }}
                                >
                                  <span className="icon is-small">
                                    <i className="fas fa-edit"></i>
                                  </span>
                                </button>
                                <button
                                  className="button is-small is-danger is-light"
                                  onClick={() => {
                                    setBillToDelete(h)
                                    setShowDeleteConfirm(true)
                                  }}
                                  title="Delete this bill"
                                  style={{ borderRadius: '4px' }}
                                >
                                  <span className="icon is-small">
                                    <i className="fas fa-trash"></i>
                                  </span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
        
        <footer className="modal-card-foot" style={{ 
          background: '#f9fafb', 
          borderTop: '1px solid #e5e7eb',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem'
        }}>
          <button 
            className="button"
            onClick={onClose}
            style={{ 
              borderRadius: '6px',
              fontWeight: '600',
              padding: '0.75rem 1.5rem'
            }}
          >
            <span className="icon"><i className="fas fa-times"></i></span>
            <span>Cancel</span>
          </button>
          <button 
            className={`button is-primary ${loading ? 'is-loading' : ''}`}
            onClick={handleSubmit}
            disabled={!selectedCustomer}
            style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              padding: '0.75rem 2rem',
              boxShadow: '0 4px 6px rgba(102, 126, 234, 0.25)'
            }}
          >
            <span className="icon"><i className="fas fa-save"></i></span>
            <span>{mode === 'add' ? 'Add Bill' : 'Update Bill'}</span>
          </button>
        </footer>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && billToDelete && (
        <div className="dialog-overlay">
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Icon and Title */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                boxShadow: '0 8px 16px rgba(255, 107, 107, 0.3)'
              }}>
                <i className="fas fa-exclamation-triangle" style={{ fontSize: '2rem', color: 'white' }}></i>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#363636', marginBottom: '0.5rem' }}>
                Delete Bill?
              </h3>
              <p style={{ fontSize: '0.95rem', color: '#7a7a7a' }}>
                This action cannot be undone
              </p>
            </div>

            {/* Bill Info */}
            <div style={{
              background: '#f9fafb',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#7a7a7a', fontSize: '0.875rem' }}>Billing Month:</span>
                <span style={{ fontWeight: '600', color: '#363636' }}>{formatMonth(billToDelete.billedmonth)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#7a7a7a', fontSize: '0.875rem' }}>Consumption:</span>
                <span style={{ fontWeight: '600', color: '#363636' }}>{billToDelete.consumption} cu.m</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#7a7a7a', fontSize: '0.875rem' }}>Amount:</span>
                <span style={{ fontWeight: '600', color: '#667eea' }}>{formatCurrency(billToDelete.basicamount)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="button is-light"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setBillToDelete(null)
                }}
                style={{
                  flex: 1,
                  borderRadius: '8px',
                  fontWeight: '600',
                  padding: '0.75rem 1.5rem',
                  border: '2px solid #e5e7eb'
                }}
              >
                <span className="icon"><i className="fas fa-times"></i></span>
                <span>Cancel</span>
              </button>
              <button
                className="button is-danger"
                onClick={() => {
                  onClose()
                  setShowDeleteConfirm(false)
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('deleteBill', { detail: billToDelete.billid }))
                  }, 100)
                  setBillToDelete(null)
                }}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  padding: '0.75rem 1.5rem',
                  boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)'
                }}
              >
                <span className="icon"><i className="fas fa-trash"></i></span>
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BillModal
