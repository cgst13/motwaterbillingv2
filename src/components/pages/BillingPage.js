import React, { useState, useEffect } from 'react'
import { billingService } from '../../services/billingService'
import { paymentService } from '../../services/paymentService'
import BillModal from '../billing/BillModal'
import EncodingStats from '../billing/EncodingStats'
import ConfirmationDialog from '../common/ConfirmationDialog'

const BillingPage = () => {
  const [activeTab, setActiveTab] = useState('management')
  const [bills, setBills] = useState([])
  const [customerTypes, setCustomerTypes] = useState([])
  const [surchargeSettings, setSurchargeSettings] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [itemsPerPage] = useState(50)
  
  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('add')
  const [selectedBill, setSelectedBill] = useState(null)
  const [preSelectedCustomer, setPreSelectedCustomer] = useState(null)
  
  // Customer Search State
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState([])
  const [searchingCustomers, setSearchingCustomers] = useState(false)
  
  // Search Filters
  const [filterBarangay, setFilterBarangay] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [barangays, setBarangays] = useState([])
  
  // Delete Confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [billToDelete, setBillToDelete] = useState(null)

  useEffect(() => {
    loadBills()
    loadCustomerTypes()
    loadSurchargeSettings()
    loadBarangays()

    // Listen for edit bill events from modal history
    const handleEditBillEvent = (event) => {
      const billToEdit = event.detail
      handleEdit(billToEdit)
    }

    // Listen for delete bill events from modal history
    const handleDeleteBillEvent = (event) => {
      const billData = event.detail
      // Find the bill by ID if only ID is provided
      const bill = typeof billData === 'object' ? billData : bills.find(b => b.billid === billData)
      if (bill) {
        handleDeleteClick(bill)
      }
    }

    window.addEventListener('editBill', handleEditBillEvent)
    window.addEventListener('deleteBill', handleDeleteBillEvent)

    return () => {
      window.removeEventListener('editBill', handleEditBillEvent)
      window.removeEventListener('deleteBill', handleDeleteBillEvent)
    }
  }, [])

  // Auto-search customer on typing with debounce
  useEffect(() => {
    if (customerSearch.trim() === '') {
      setCustomerResults([])
      return
    }

    const timer = setTimeout(() => {
      handleCustomerSearch()
    }, 500)

    return () => clearTimeout(timer)
  }, [customerSearch, filterBarangay, filterType, filterStatus])

  const loadBills = async (page = 1) => {
    setLoading(true)
    const result = await billingService.getBills(page, itemsPerPage, 'dateencoded', false)
    if (result.success) {
      setBills(result.data)
      setTotalCount(result.count)
      setCurrentPage(page)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  const loadCustomerTypes = async () => {
    const result = await billingService.getCustomerTypes()
    if (result.success) {
      setCustomerTypes(result.data)
    }
  }

  const loadSurchargeSettings = async () => {
    const result = await paymentService.getSurchargeSettings()
    if (result.success) {
      setSurchargeSettings(result.data)
    }
  }

  const loadBarangays = async () => {
    const result = await paymentService.getBarangays()
    if (result.success) {
      setBarangays(result.data)
    }
  }

  const handleCustomerSearch = async () => {
    setSearchingCustomers(true)
    setError('')
    const result = await paymentService.searchCustomers(customerSearch, {
      barangay: filterBarangay,
      type: filterType,
      status: filterStatus
    })
    
    if (result.success) {
      setCustomerResults(result.data)
      if (result.data.length === 0) {
        setError('No customers found matching your criteria')
      }
    } else {
      setError(result.error)
    }
    setSearchingCustomers(false)
  }

  const handleClearFilters = () => {
    setCustomerSearch('')
    setFilterBarangay('')
    setFilterType('')
    setFilterStatus('')
    setCustomerResults([])
  }

  const handleSelectCustomerForBilling = (customer) => {
    setPreSelectedCustomer(customer)
    setCustomerResults([])
    setCustomerSearch('')
    openAddModal()
  }

  const openAddModal = () => {
    setModalMode('add')
    setSelectedBill(null)
    setShowModal(true)
  }

  const handleEdit = (bill) => {
    setModalMode('edit')
    setSelectedBill(bill)
    setShowModal(true)
  }

  const handleDeleteClick = (bill) => {
    setBillToDelete(bill)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (!billToDelete) return
    
    setLoading(true)
    const result = await billingService.deleteBill(billToDelete.billid)
    if (result.success) {
      setSuccess('Bill deleted successfully')
      loadBills(currentPage)
      setTimeout(() => setSuccess(''), 3000)
    } else {
      setError(result.error)
    }
    setLoading(false)
    setShowDeleteConfirm(false)
    setBillToDelete(null)
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
    setBillToDelete(null)
  }

  const handleModalSuccess = (message) => {
    setSuccess(message)
    loadBills(currentPage)
  }

  const handleExportCSV = () => {
    const csv = billingService.exportToCSV(bills)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bills_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
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

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  return (
    <div className="billing-page" style={{ padding: '0' }}>
      {/* Header */}
      <div className="level mb-3">
        <div className="level-left">
          <div className="level-item">
            <h1 className="title is-4 mb-0">
              <span className="icon"><i className="fas fa-file-invoice-dollar"></i></span>
              Billing Management
            </h1>
          </div>
        </div>
        <div className="level-right">
          <div className="level-item">
            {bills.length > 0 && activeTab === 'management' && (
              <button className="button is-info" onClick={handleExportCSV}>
                <span className="icon"><i className="fas fa-file-csv"></i></span>
                <span>Export CSV</span>
              </button>
            )}
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

      {/* Tabs */}
      <div className="tabs is-boxed">
        <ul>
          <li className={activeTab === 'management' ? 'is-active' : ''} onClick={() => setActiveTab('management')}>
            <a>
              <span className="icon"><i className="fas fa-file-invoice"></i></span>
              <span>Bill Management</span>
            </a>
          </li>
          <li className={activeTab === 'stats' ? 'is-active' : ''} onClick={() => setActiveTab('stats')}>
            <a>
              <span className="icon"><i className="fas fa-chart-bar"></i></span>
              <span>Encoding Stats</span>
            </a>
          </li>
        </ul>
      </div>

      {/* Tab Content: Bill Management */}
      {activeTab === 'management' && (
        <div style={{ width: '100%' }}>
            {/* Customer Search Section */}
            <div className="box" style={{ marginBottom: '0', padding: '1.5rem', borderRadius: '0' }}>
              <h3 className="title is-6 mb-3">
                <span className="icon"><i className="fas fa-user-plus"></i></span>
                Add New Bill - Search Customer
              </h3>
              <div className="columns" style={{ marginBottom: '0' }}>
                <div className="column is-4">
                  <div className="field has-addons" style={{ marginBottom: '0' }}>
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
                        className={`button is-primary ${searchingCustomers ? 'is-loading' : ''}`}
                        onClick={handleCustomerSearch}
                      >
                        <span className="icon"><i className="fas fa-search"></i></span>
                        <span>Search</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="column is-2">
                  <div className="control">
                    <div className="select is-fullwidth">
                      <select value={filterBarangay} onChange={(e) => setFilterBarangay(e.target.value)}>
                        <option value="">All Barangays</option>
                        {barangays.map((b) => (
                          <option key={b.barangay} value={b.barangay}>{b.barangay}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="column is-2">
                  <div className="control">
                    <div className="select is-fullwidth">
                      <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                        <option value="">All Types</option>
                        {customerTypes.map((ct) => (
                          <option key={ct.type} value={ct.type}>{ct.type}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="column is-2">
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
                <div className="column is-2">
                  <div className="control">
                    <button 
                      className="button is-light is-fullwidth"
                      onClick={handleClearFilters}
                      disabled={!customerSearch && !filterBarangay && !filterType && !filterStatus}
                      title="Clear all filters"
                    >
                      <span className="icon"><i className="fas fa-times"></i></span>
                      <span>Clear</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Customer Search Results */}
              {customerResults.length > 0 && (
                <div className="table-container mt-3">
                  <table className="table is-fullwidth is-striped is-hoverable is-narrow">
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
                      {customerResults.map((customer) => (
                        <tr 
                          key={customer.customerid}
                          onClick={() => handleSelectCustomerForBilling(customer)}
                          style={{ cursor: 'pointer' }}
                          title="Click to add bill for this customer"
                        >
                          <td className="has-text-weight-bold">{customer.customerid}</td>
                          <td><strong>{customer.name}</strong></td>
                          <td><span className="tag is-info is-light">{customer.type}</span></td>
                          <td>{customer.barangay}</td>
                          <td>
                            <span className={`tag is-small ${
                              customer.status === 'Active' ? 'is-success' : 'is-danger'
                            }`}>
                              {customer.status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="button is-small is-primary"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSelectCustomerForBilling(customer)
                              }}
                            >
                              <span className="icon"><i className="fas fa-plus"></i></span>
                              <span>Add Bill</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Recent Bills Section */}
              <div className="mt-4">
                <hr />
                <h3 className="title is-6 mb-3 mt-3">
                  <span className="icon"><i className="fas fa-clock"></i></span>
                  Recent Bills Added
                </h3>
              
              {loading ? (
                <div className="has-text-centered py-5">
                  <span className="icon is-large">
                    <i className="fas fa-spinner fa-pulse fa-2x"></i>
                  </span>
                  <p className="mt-3">Loading bills...</p>
                </div>
              ) : bills.length === 0 ? (
                <div className="notification is-light has-text-centered">
                  <span className="icon"><i className="fas fa-info-circle"></i></span>
                  <span>No bills found</span>
                </div>
              ) : (
                <div className="table-container">
                  <table className="table is-fullwidth is-striped is-hoverable is-narrow">
                    <thead>
                      <tr>
                        <th>Bill ID</th>
                        <th>Customer ID</th>
                        <th>Customer Name</th>
                        <th>Barangay</th>
                        <th>Billing Month</th>
                        <th>Consumption</th>
                        <th>Basic Amount</th>
                        <th>Status</th>
                        <th>Encoded By</th>
                        <th width="120">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bills.slice(0, 10).map((bill) => (
                        <tr key={bill.billid}>
                          <td className="has-text-weight-bold">{bill.billid}</td>
                          <td>{bill.customerid}</td>
                          <td><strong>{bill.customers?.name || 'N/A'}</strong></td>
                          <td>{bill.customers?.barangay || 'N/A'}</td>
                          <td>{formatMonth(bill.billedmonth)}</td>
                          <td>{bill.consumption} cu.m</td>
                          <td>{formatCurrency(bill.basicamount)}</td>
                          <td>
                            <span className={`tag is-small ${
                              bill.paymentstatus === 'Paid' ? 'is-success' :
                              bill.paymentstatus === 'Partial' ? 'is-warning' : 'is-danger'
                            }`}>
                              {bill.paymentstatus}
                            </span>
                          </td>
                          <td>{bill.encodedby || 'N/A'}</td>
                          <td>
                            <div className="buttons are-small">
                              <button
                                className="button is-info is-small"
                                onClick={() => handleEdit(bill)}
                                title="Edit bill"
                              >
                                <span className="icon"><i className="fas fa-edit"></i></span>
                              </button>
                              <button
                                className="button is-danger is-small"
                                onClick={() => handleDeleteClick(bill)}
                                title="Delete bill"
                              >
                                <span className="icon"><i className="fas fa-trash"></i></span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {bills.length > 0 && totalPages > 1 && (
                <nav className="pagination is-small mt-3" role="navigation">
                  <button
                    className="button is-small"
                    onClick={() => loadBills(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <button
                    className="button is-small"
                    onClick={() => loadBills(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                  <ul className="pagination-list">
                    <li>
                      <span className="pagination-ellipsis">
                        Page {currentPage} of {totalPages}
                      </span>
                    </li>
                  </ul>
                </nav>
              )}
              </div>
            </div>
        </div>
      )}

      {/* Tab Content: Encoding Stats */}
      {activeTab === 'stats' && (
        <div style={{ width: '100%' }}>
          <EncodingStats />
        </div>
      )}

      {/* Bill Modal */}
      <BillModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setPreSelectedCustomer(null)
        }}
        mode={modalMode}
        bill={selectedBill}
        preSelectedCustomer={preSelectedCustomer}
        onSuccess={handleModalSuccess}
        customerTypes={customerTypes}
        surchargeSettings={surchargeSettings}
      />
      
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm && billToDelete !== null}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Confirm Delete"
        message={billToDelete ? `Are you sure you want to delete bill #${billToDelete.billid}?` : ''}
        subMessage={billToDelete ? `Customer: ${billToDelete.customername} | Month: ${new Date(billToDelete.billedmonth).toLocaleDateString('en-PH', { year: 'numeric', month: 'long' })}` : ''}
        confirmText="Delete Bill"
        cancelText="Cancel"
        type="danger"
        loading={loading}
      />
    </div>
  )
}

export default BillingPage
