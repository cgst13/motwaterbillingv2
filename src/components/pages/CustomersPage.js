import React, { useState, useEffect, useMemo } from 'react'
import { customerService } from '../../services/customerService'
import { authService } from '../../authService'

const CustomersPage = () => {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMessage, setLoadingMessage] = useState('Loading customers...')
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('add')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBarangay, setFilterBarangay] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortField, setSortField] = useState('date_added')
  const [sortDirection, setSortDirection] = useState('desc')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50
  
  // Form data
  const [formData, setFormData] = useState({
    customerid: '',
    name: '',
    type: '',
    barangay: '',
    discount: 0,
    status: 'Active',
    remarks: ''
  })

  // Stats and filter options
  const [stats, setStats] = useState({ total: 0, active: 0, disconnected: 0 })
  const [barangays, setBarangays] = useState([])
  const [customerTypes, setCustomerTypes] = useState([])
  const [discounts, setDiscounts] = useState([])

  const user = authService.getUserSession()

  const getDefaultCustomerType = () => (customerTypes.length > 0 ? customerTypes[0].type : '')
  const getDefaultBarangay = () => (barangays.length > 0 ? barangays[0].barangay : '')
  const getDefaultDiscount = () => (discounts.length > 0 ? Number(discounts[0].discountpercentage) : 0)

  useEffect(() => {
    loadCustomers()
    loadFilterOptions()
    loadStats()
  }, [])

  useEffect(() => {
    if (customerTypes.length > 0) {
      setFormData((prev) => ({
        ...prev,
        type: prev.type || customerTypes[0].type
      }))
    }
  }, [customerTypes])

  useEffect(() => {
    if (barangays.length > 0) {
      setFormData((prev) => ({
        ...prev,
        barangay: prev.barangay || barangays[0].barangay
      }))
    }
  }, [barangays])

  useEffect(() => {
    if (discounts.length > 0) {
      setFormData((prev) => ({
        ...prev,
        discount: prev.discount ?? getDefaultDiscount()
      }))
    }
  }, [discounts])

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1) // Reset to first page when filters change
      loadCustomers()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, filterBarangay, filterType, filterStatus])

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const result = await customerService.getCustomers({
        search: searchTerm,
        barangay: filterBarangay,
        type: filterType,
        status: filterStatus
      })
      
      if (result.success) {
        setCustomers(result.data || [])
        setError('')
      } else {
        // Handle specific errors
        if (result.error.includes('404') || result.error.includes('relation "public.customers" does not exist')) {
          setError('The customers table has not been created yet. Please create the customers table in your Supabase database.')
        } else {
          setError(result.error)
        }
        setCustomers([])
      }
    } catch (err) {
      console.error('Error loading customers:', err)
      setError('Failed to load customers. Please check your database connection.')
      setCustomers([])
    }
    setLoading(false)
  }

  const loadFilterOptions = async () => {
    try {
      const [barangayResult, typeResult, discountResult] = await Promise.all([
        customerService.getBarangays(),
        customerService.getCustomerTypes(),
        customerService.getDiscounts()
      ])

      if (barangayResult.success) {
        setBarangays(barangayResult.data || [])
      } else {
        setBarangays([])
      }

      if (typeResult.success) {
        setCustomerTypes(typeResult.data || [])
      } else {
        setCustomerTypes([])
      }

      if (discountResult.success) {
        setDiscounts((discountResult.data || []).map(item => ({
          type: item.type,
          discountpercentage: item.discountpercentage !== null ? Number(item.discountpercentage) : 0
        })))
      } else {
        setDiscounts([])
      }
    } catch (err) {
      console.error('Error loading filter options:', err)
      setBarangays([])
      setCustomerTypes([])
      setDiscounts([])
    }
  }

  const loadStats = async () => {
    try {
      const result = await customerService.getCustomerStats()
      if (result.success) {
        setStats(result.data || { total: 0, active: 0, disconnected: 0 })
      }
    } catch (err) {
      console.error('Error loading stats:', err)
      setStats({ total: 0, active: 0, disconnected: 0 })
    }
  }

  // Handle form operations
  const handleAddCustomer = async () => {
    if (!user) {
      setError('Your session has expired. Please log in again to add customers.')
      return
    }

    if (customerTypes.length === 0) {
      setError('No customer types are configured. Please add customer types before creating a customer.')
      return
    }

    if (barangays.length === 0) {
      setError('No barangays are configured. Please add barangays before creating a customer.')
      return
    }

    if (discounts.length === 0) {
      setError('No discounts are configured. Please add discount options before creating a customer.')
      return
    }

    const idResult = await customerService.generateCustomerId()
    if (!idResult.success) {
      setError(idResult.error || 'Failed to generate a new customer ID. Please try again.')
      return
    }

    const { firstname = '', lastname = '' } = user
    const addedBy = `${firstname} ${lastname}`.trim() || 'Unknown User'

    setFormData({
      customerid: idResult.data,
      name: '',
      type: getDefaultCustomerType(),
      barangay: getDefaultBarangay(),
      discount: getDefaultDiscount(),
      status: 'Active',
      remarks: '',
      added_by: addedBy
    })
    setModalType('add')
    setShowModal(true)
  }

  const handleEditCustomer = (customer) => {
    setFormData(customer)
    setSelectedCustomer(customer)
    setModalType('edit')
    setShowModal(true)
  }

  const handleViewCustomer = (customer) => {
    setSelectedCustomer(customer)
    setModalType('view')
    setShowModal(true)
  }

  const handleStatusChange = (customer) => {
    setSelectedCustomer(customer)
    setFormData({ ...customer, remarks: '' })
    setModalType('status')
    setShowModal(true)
  }

  const handleDeleteCustomer = (customer) => {
    setSelectedCustomer(customer)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (selectedCustomer) {
      const result = await customerService.deleteCustomer(selectedCustomer.customerid)
      if (result.success) {
        loadCustomers()
        loadStats()
        setShowDeleteConfirm(false)
        setSelectedCustomer(null)
      } else {
        setError(result.error)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    let result

    if (modalType === 'add') {
      result = await customerService.addCustomer(formData)
    } else if (modalType === 'edit') {
      result = await customerService.updateCustomer(selectedCustomer.customerid, formData)
    } else if (modalType === 'status') {
      result = await customerService.updateCustomerStatus(
        selectedCustomer.customerid,
        formData.status,
        formData.remarks,
        user.firstname + ' ' + user.lastname
      )
    }

    if (result.success) {
      loadCustomers()
      loadStats()
      loadFilterOptions()
      setShowModal(false)
      setSelectedCustomer(null)
      resetForm()
    } else {
      setError(result.error)
    }
  }

  const resetForm = () => {
    setFormData({
      customerid: '',
      name: '',
      type: getDefaultCustomerType(),
      barangay: getDefaultBarangay(),
      discount: getDefaultDiscount(),
      status: 'Active',
      remarks: ''
    })
  }

  // Utility functions
  const getCustomerInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleExport = () => {
    customerService.exportToCSV(customers)
  }

  const createSampleData = async () => {
    const sampleCustomers = [
      { customerid: 1, name: 'Juan Tolentino', type: 'Residential', barangay: 'Poblacion', discount: 0, status: 'Active', added_by: user.firstname + ' ' + user.lastname },
      { customerid: 2, name: 'Maria Santos', type: 'Commercial', barangay: 'Barangay 1', discount: 5, status: 'Active', added_by: user.firstname + ' ' + user.lastname },
      { customerid: 3, name: 'Pedro Garcia', type: 'Residential', barangay: 'Barangay 2', discount: 0, status: 'Disconnected', added_by: user.firstname + ' ' + user.lastname },
      { customerid: 4, name: 'Ana Cruz', type: 'Residential', barangay: 'Poblacion', discount: 10, status: 'Active', added_by: user.firstname + ' ' + user.lastname },
      { customerid: 5, name: 'Roberto Reyes', type: 'Industrial', barangay: 'Barangay 3', discount: 0, status: 'Active', added_by: user.firstname + ' ' + user.lastname }
    ]

    try {
      for (const customer of sampleCustomers) {
        await customerService.addCustomer(customer)
      }
      loadCustomers()
      loadStats()
      setError('')
    } catch (err) {
      setError('Failed to create sample data: ' + err.message)
    }
  }

  // Memoized sorted and paginated data
  const sortedCustomers = useMemo(() => {
    const sorted = [...customers].sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })
    return sorted
  }, [customers, sortField, sortDirection])

  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedCustomers.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedCustomers, currentPage, itemsPerPage])

  const totalPages = Math.ceil(sortedCustomers.length / itemsPerPage)

  const renderModalContent = () => {
    if (!showModal) return null

    const isView = modalType === 'view'
    const isStatus = modalType === 'status'
    const isAdd = modalType === 'add'
    const isEdit = modalType === 'edit'

    const handleClose = () => {
      setShowModal(false)
      setSelectedCustomer(null)
      resetForm()
    }

    return (
      <div className={`modal ${showModal ? 'is-active' : ''}`}>
        <div className="modal-background" onClick={handleClose}></div>
        <div className="modal-card">
          <header className="modal-card-head">
            <p className="modal-card-title">
              {isAdd && 'Add Customer'}
              {isEdit && 'Edit Customer'}
              {isView && 'Customer Details'}
              {isStatus && 'Update Customer Status'}
            </p>
            <button className="delete" aria-label="close" onClick={handleClose}></button>
          </header>
          <section className="modal-card-body">
            {isView ? (
              <div className="content">
                <p><strong>ID:</strong> {formData.customerid}</p>
                <p><strong>Name:</strong> {formData.name}</p>
                <p><strong>Type:</strong> {formData.type}</p>
                <p><strong>Barangay:</strong> {formData.barangay}</p>
                <p><strong>Status:</strong> {formData.status}</p>
                <p><strong>Discount:</strong> {formData.discount}%</p>
                <p><strong>Remarks:</strong> {formData.remarks}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label className="label">Customer ID</label>
                  <div className="control">
                    <input
                      className="input"
                      type="text"
                      value={formData.customerid}
                      readOnly
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="label">Name</label>
                  <div className="control">
                    <input
                      className="input"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      disabled={isStatus}
                    />
                  </div>
                </div>

                {!isStatus && (
                  <>
                    <div className="field">
                      <label className="label">Type</label>
                      <div className="control">
                        <div className="select is-fullwidth">
                          <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            disabled={isStatus}
                          >
                            {customerTypes.map(typeObj => (
                              <option key={typeObj.type} value={typeObj.type}>
                                {typeObj.type}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="field">
                      <label className="label">Barangay</label>
                      <div className="control">
                        <div className="select is-fullwidth">
                          <select
                            value={formData.barangay}
                            onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
                          >
                            {barangays.map(barangayObj => (
                              <option key={barangayObj.barangay} value={barangayObj.barangay}>
                                {barangayObj.barangay}
                              </option>
                            ))}
                            {formData.barangay && !barangays.some(b => b.barangay === formData.barangay) && (
                              <option value={formData.barangay}>{formData.barangay}</option>
                            )}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="field">
                      <label className="label">Discount (%)</label>
                      <div className="control">
                        <div className="select is-fullwidth">
                          <select
                            value={formData.discount}
                            onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                          >
                            {discounts.map(discountObj => (
                              <option key={discountObj.type} value={discountObj.discountpercentage}>
                                {discountObj.type} ({discountObj.discountpercentage}%)
                              </option>
                            ))}
                            {typeof formData.discount === 'number' && !discounts.some(d => d.discountpercentage === Number(formData.discount)) && (
                              <option value={formData.discount}>{formData.discount}%</option>
                            )}
                          </select>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {(isAdd || isEdit) && (
                  <div className="field">
                    <label className="label">Remarks</label>
                    <div className="control">
                      <textarea
                        className="textarea"
                        value={formData.remarks}
                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                )}

                {isStatus && (
                  <>
                    <div className="field">
                      <label className="label">Status</label>
                      <div className="control">
                        <div className="select is-fullwidth">
                          <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          >
                            <option value="Active">Active</option>
                            <option value="Disconnected">Disconnected</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="field">
                      <label className="label">Remarks</label>
                      <div className="control">
                        <textarea
                          className="textarea"
                          value={formData.remarks}
                          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                          placeholder="Reason for status change"
                        ></textarea>
                      </div>
                    </div>
                  </>
                )}

                <footer className="modal-card-foot">
                  <button type="submit" className="button is-primary">
                    {isAdd && 'Save Customer'}
                    {isEdit && 'Update Customer'}
                    {isStatus && 'Update Status'}
                  </button>
                  <button type="button" className="button" onClick={handleClose}>Cancel</button>
                </footer>
              </form>
            )}
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="customers-page">
      {/* Compact Header */}
      <div className="compact-header">
        <div className="header-row">
          <div className="title-section">
            <h1 className="page-title">Customer Management</h1>
            <div className="stats-inline">
              <span className="stat-item">
                <i className="fas fa-users"></i>
                <strong>{stats.total}</strong> Total
              </span>
              <span className="stat-item active">
                <i className="fas fa-check-circle"></i>
                <strong>{stats.active}</strong> Active
              </span>
              <span className="stat-item disconnected">
                <i className="fas fa-times-circle"></i>
                <strong>{stats.disconnected}</strong> Disconnected
              </span>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary btn-sm" onClick={handleExport}>
              <i className="fas fa-download"></i>
              Export
            </button>
            {customers.length === 0 && !loading && (
              <button className="btn btn-info btn-sm" onClick={createSampleData}>
                <i className="fas fa-database"></i>
                Sample Data
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={handleAddCustomer}>
              <i className="fas fa-plus"></i>
              Add Customer
            </button>
          </div>
        </div>
      </div>

      {renderModalContent()}

      {/* Compact Filters */}
      <div className="compact-filters">
        <div className="search-input">
          <div className="control has-icons-left">
            <input
              className="input is-small"
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="notification is-warning">
          <button className="delete" onClick={() => setError('')}></button>
          <div>
            <strong>Database Setup Required:</strong>
            <p>{error}</p>
            {error.includes('customers table') && (
              <div className="mt-3">
                <p><strong>To fix this issue:</strong></p>
                <ol>
                  <li>Go to your Supabase Dashboard</li>
                  <li>Navigate to SQL Editor</li>
                  <li>Run the SQL provided in the console or documentation</li>
                  <li>Refresh this page</li>
                </ol>
                <div className="buttons">
                  <button 
                    className="button is-small is-info"
                    onClick={() => {
                      console.log(`
CREATE TABLE public.customers (
  customerid bigint not null,
  name text not null,
  type text null,
  barangay text null,
  discount numeric null,
  date_added date null default CURRENT_DATE,
  remarks text null,
  credit_balance numeric null,
  status text null,
  disconnection_date date null,
  added_by text null,
  disconnected_by text null,
  constraint customers_pkey primary key (customerid)
);
                      `)
                      alert('SQL command copied to console. Check browser console for the CREATE TABLE statement.')
                    }}
                  >
                    <i className="fas fa-copy"></i>
                    Show SQL in Console
                  </button>
                  <button 
                    className="button is-small is-primary"
                    onClick={() => {
                      setError('')
                      loadCustomers()
                      loadStats()
                      loadFilterOptions()
                    }}
                  >
                    <i className="fas fa-sync"></i>
                    Retry Connection
                  </button>
                  <button 
                    className="button is-small is-success"
                    onClick={async () => {
                      const result = await customerService.testConnection()
                      if (result.success) {
                        alert('Connection successful! Check console for details.')
                      } else {
                        alert('Connection failed: ' + result.error)
                      }
                    }}
                  >
                    <i className="fas fa-plug"></i>
                    Test Connection
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-container">
            <div className="loading-message">
              <div className="loading-spinner"></div>
              <h3 className="title is-5">{loadingMessage}</h3>
              <p className="has-text-grey">Fetching all customer records from database...</p>
            </div>
            <div className="loading-skeleton">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton-row">
                  <div className="skeleton-avatar"></div>
                  <div className="skeleton-text"></div>
                  <div className="skeleton-text short"></div>
                  <div className="skeleton-text"></div>
                  <div className="skeleton-badge"></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <table className="table is-fullwidth is-hoverable">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th onClick={() => handleSort('customerid')} className="sortable">
                    ID {sortField === 'customerid' && (
                      <i className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>
                    )}
                  </th>
                  <th onClick={() => handleSort('type')} className="sortable">
                    Type {sortField === 'type' && (
                      <i className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>
                    )}
                  </th>
                  <th onClick={() => handleSort('barangay')} className="sortable">
                    Barangay {sortField === 'barangay' && (
                      <i className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>
                    )}
                  </th>
                  <th onClick={() => handleSort('status')} className="sortable">
                    Status {sortField === 'status' && (
                      <i className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>
                    )}
                  </th>
                  <th onClick={() => handleSort('date_added')} className="sortable">
                    Date Added {sortField === 'date_added' && (
                      <i className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>
                    )}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.length > 0 ? (
                  paginatedCustomers.map(customer => (
                    <tr key={customer.customerid}>
                      <td>
                        <div className="customer-info">
                          <div className="customer-avatar">
                            {getCustomerInitials(customer.name)}
                          </div>
                          <div>
                            <div className="customer-name">{customer.name}</div>
                            <div className="customer-discount">
                              {customer.discount > 0 && `${customer.discount}% discount`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{customer.customerid}</td>
                      <td>{customer.type}</td>
                      <td>{customer.barangay}</td>
                      <td>
                        <span className={`tag ${customer.status && customer.status.toLowerCase() === 'active' ? 'is-success' : 'is-danger'}`}>
                          {customer.status}
                        </span>
                      </td>
                      <td>{new Date(customer.date_added).toLocaleDateString()}</td>
                      <td>
                        <div className="customer-actions">
                          <button 
                            className="action-btn view"
                            onClick={() => handleViewCustomer(customer)}
                            title="View Customer"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          <button 
                            className="action-btn edit"
                            onClick={() => handleEditCustomer(customer)}
                            title="Edit Customer"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            className="action-btn status"
                            onClick={() => handleStatusChange(customer)}
                            title="Change Status"
                          >
                            <i className="fas fa-power-off"></i>
                          </button>
                          <button 
                            className="action-btn delete"
                            onClick={() => handleDeleteCustomer(customer)}
                            title="Delete Customer"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="has-text-centered" style={{ padding: '3rem' }}>
                      <div className="empty-state">
                        <i className="fas fa-users fa-3x has-text-grey-light"></i>
                        <h3 className="title is-5 has-text-grey mt-4">No customers found</h3>
                        <p className="has-text-grey">
                          {error ? 'Please check the error message above.' : 
                           searchTerm || filterBarangay !== 'all' || filterType !== 'all' || filterStatus !== 'all' 
                           ? 'Try adjusting your search or filters.' 
                           : 'Start by adding your first customer.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination-container">
                <div className="pagination-info">
                  <span>
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedCustomers.length)} of {sortedCustomers.length} customers
                  </span>
                  {totalPages > 5 && (
                    <div className="page-jump">
                      <span>Go to page:</span>
                      <input
                        type="number"
                        min="1"
                        max={totalPages}
                        value={currentPage}
                        onChange={(e) => {
                          const page = parseInt(e.target.value)
                          if (page >= 1 && page <= totalPages) {
                            setCurrentPage(page)
                          }
                        }}
                        className="page-input"
                      />
                      <span>of {totalPages}</span>
                    </div>
                  )}
                </div>
                <nav className="pagination is-centered" role="navigation">
                  <button 
                    className="pagination-previous"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    <i className="fas fa-chevron-left"></i>
                    Previous
                  </button>
                  <button 
                    className="pagination-next"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next
                    <i className="fas fa-chevron-right"></i>
                  </button>
                  <ul className="pagination-list">
                    {/* First page */}
                    {currentPage > 3 && (
                      <>
                        <li>
                          <button
                            className="pagination-link"
                            onClick={() => setCurrentPage(1)}
                          >
                            1
                          </button>
                        </li>
                        {currentPage > 4 && (
                          <li>
                            <span className="pagination-ellipsis">&hellip;</span>
                          </li>
                        )}
                      </>
                    )}
                    
                    {/* Current page and surrounding pages */}
                    {[...Array(totalPages)].map((_, i) => {
                      const pageNum = i + 1;
                      if (
                        pageNum === currentPage ||
                        (pageNum >= currentPage - 2 && pageNum <= currentPage + 2) ||
                        (currentPage <= 3 && pageNum <= 5) ||
                        (currentPage >= totalPages - 2 && pageNum >= totalPages - 4)
                      ) {
                        return (
                          <li key={i}>
                            <button
                              className={`pagination-link ${currentPage === pageNum ? 'is-current' : ''}`}
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </button>
                          </li>
                        );
                      }
                      return null;
                    })}
                    
                    {/* Last page */}
                    {currentPage < totalPages - 2 && (
                      <>
                        {currentPage < totalPages - 3 && (
                          <li>
                            <span className="pagination-ellipsis">&hellip;</span>
                          </li>
                        )}
                        <li>
                          <button
                            className="pagination-link"
                            onClick={() => setCurrentPage(totalPages)}
                          >
                            {totalPages}
                          </button>
                        </li>
                      </>
                    )}
                  </ul>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default CustomersPage
