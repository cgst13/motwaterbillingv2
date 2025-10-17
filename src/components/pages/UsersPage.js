import React, { useState, useEffect } from 'react'
import { userService } from '../../services/userService'
import ConfirmationDialog from '../common/ConfirmationDialog'

const UsersPage = () => {
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('add') // 'add' or 'edit'
  const [selectedUser, setSelectedUser] = useState(null)
  
  // Form data
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    department: '',
    position: '',
    role: 'Reader',
    status: 'Active'
  })
  
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [searchTerm, users])

  const loadUsers = async () => {
    setLoading(true)
    const result = await userService.getAllUsers()
    if (result.success) {
      setUsers(result.data)
      setFilteredUsers(result.data)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  const filterUsers = () => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users)
      return
    }
    
    const filtered = users.filter(user => {
      const fullName = `${user.firstname} ${user.lastname}`.toLowerCase()
      return fullName.includes(searchTerm.toLowerCase()) ||
             user.firstname.toLowerCase().includes(searchTerm.toLowerCase()) ||
             user.lastname.toLowerCase().includes(searchTerm.toLowerCase())
    })
    setFilteredUsers(filtered)
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users)
      return
    }
    
    setLoading(true)
    const result = await userService.searchUsers(searchTerm)
    if (result.success) {
      setFilteredUsers(result.data)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  const openAddModal = () => {
    setModalMode('add')
    setSelectedUser(null)
    setFormData({
      firstname: '',
      lastname: '',
      email: '',
      department: '',
      position: '',
      role: 'Reader',
      status: 'Active'
    })
    setShowModal(true)
  }

  const openEditModal = (user) => {
    setModalMode('edit')
    setSelectedUser(user)
    setFormData({
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      department: user.department || '',
      position: user.position || '',
      role: user.role,
      status: user.status
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedUser(null)
    setFormData({
      firstname: '',
      lastname: '',
      email: '',
      department: '',
      position: '',
      role: 'Reader',
      status: 'Active'
    })
  }

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async () => {
    // Validation
    if (!formData.firstname.trim() || !formData.lastname.trim() || !formData.email.trim()) {
      setError('Please fill in all required fields (First Name, Last Name, Email)')
      return
    }

    setLoading(true)
    setError('')
    
    let result
    if (modalMode === 'add') {
      result = await userService.addUser(formData)
    } else {
      result = await userService.updateUser(selectedUser.userid, formData)
    }

    if (result.success) {
      setSuccess(`User ${modalMode === 'add' ? 'added' : 'updated'} successfully!`)
      closeModal()
      loadUsers() // Reload the users list
      setTimeout(() => setSuccess(''), 3000)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  const openDeleteConfirm = (user) => {
    setUserToDelete(user)
    setShowDeleteConfirm(true)
  }

  const closeDeleteConfirm = () => {
    setUserToDelete(null)
    setShowDeleteConfirm(false)
  }

  const handleDelete = async () => {
    if (!userToDelete) return

    setLoading(true)
    const result = await userService.deleteUser(userToDelete.userid)
    
    if (result.success) {
      setSuccess('User deleted successfully!')
      closeDeleteConfirm()
      loadUsers()
      setTimeout(() => setSuccess(''), 3000)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'Admin': return 'is-danger'
      case 'Manager': return 'is-warning'
      case 'Collector': return 'is-info'
      case 'Reader': return 'is-light'
      default: return 'is-light'
    }
  }

  const getStatusBadgeClass = (status) => {
    return status === 'Active' ? 'is-success' : 'is-danger'
  }

  return (
    <div className="users-page" style={{ padding: '0' }}>
      {/* Header */}
      <div className="level mb-3">
        <div className="level-left">
          <div className="level-item">
            <h1 className="title is-4 mb-0">
              <span className="icon"><i className="fas fa-users"></i></span>
              User Management
            </h1>
          </div>
        </div>
        <div className="level-right">
          <div className="level-item">
            <button className="button is-primary" onClick={openAddModal}>
              <span className="icon"><i className="fas fa-user-plus"></i></span>
              <span>Add User</span>
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
      {success && (
        <div className="notification is-success is-light py-3">
          <button className="delete" onClick={() => setSuccess('')}></button>
          {success}
        </div>
      )}

      {/* Search Section */}
      <div className="box" style={{ marginBottom: '1rem', padding: '1.5rem' }}>
        <div className="field has-addons">
          <div className="control is-expanded">
            <input
              className="input"
              type="text"
              placeholder="Search by first name or last name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="control">
            <button 
              className={`button is-primary ${loading ? 'is-loading' : ''}`}
              onClick={handleSearch}
            >
              <span className="icon"><i className="fas fa-search"></i></span>
              <span>Search</span>
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="box" style={{ padding: '0' }}>
        {loading && filteredUsers.length === 0 ? (
          <div className="has-text-centered" style={{ padding: '3rem' }}>
            <button className="button is-loading is-large is-ghost"></button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="has-text-centered" style={{ padding: '3rem' }}>
            <span className="icon is-large has-text-grey-light">
              <i className="fas fa-users fa-3x"></i>
            </span>
            <p className="has-text-grey mt-4">No users found</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table is-fullwidth is-striped is-hoverable">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Position</th>
                  <th>Status</th>
                  <th width="150">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.userid}>
                    <td>
                      <strong>{user.firstname} {user.lastname}</strong>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`tag ${getRoleBadgeClass(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{user.department || '-'}</td>
                    <td>{user.position || '-'}</td>
                    <td>
                      <span className={`tag ${getStatusBadgeClass(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td>
                      <div className="buttons are-small">
                        <button
                          className="button is-info is-small"
                          onClick={() => openEditModal(user)}
                          title="Edit User"
                        >
                          <span className="icon"><i className="fas fa-edit"></i></span>
                        </button>
                        <button
                          className="button is-danger is-small"
                          onClick={() => openDeleteConfirm(user)}
                          title="Delete User"
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
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal is-active">
          <div className="modal-background" onClick={closeModal}></div>
          <div className="modal-card" style={{ width: '600px' }}>
            <header className="modal-card-head">
              <p className="modal-card-title">
                <span className="icon"><i className={`fas fa-user-${modalMode === 'add' ? 'plus' : 'edit'}`}></i></span>
                {modalMode === 'add' ? 'Add New User' : 'Edit User'}
              </p>
              <button className="delete" aria-label="close" onClick={closeModal}></button>
            </header>
            <section className="modal-card-body">
              <div className="field">
                <label className="label">First Name <span className="has-text-danger">*</span></label>
                <div className="control">
                  <input
                    className="input"
                    type="text"
                    placeholder="Enter first name"
                    value={formData.firstname}
                    onChange={(e) => handleFormChange('firstname', e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label className="label">Last Name <span className="has-text-danger">*</span></label>
                <div className="control">
                  <input
                    className="input"
                    type="text"
                    placeholder="Enter last name"
                    value={formData.lastname}
                    onChange={(e) => handleFormChange('lastname', e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label className="label">Email <span className="has-text-danger">*</span></label>
                <div className="control">
                  <input
                    className="input"
                    type="email"
                    placeholder="Enter email"
                    value={formData.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    disabled={modalMode === 'edit'}
                  />
                </div>
                {modalMode === 'edit' && (
                  <p className="help">Email cannot be edited</p>
                )}
              </div>

              <div className="field">
                <label className="label">Department</label>
                <div className="control">
                  <input
                    className="input"
                    type="text"
                    placeholder="Enter department"
                    value={formData.department}
                    onChange={(e) => handleFormChange('department', e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label className="label">Position</label>
                <div className="control">
                  <input
                    className="input"
                    type="text"
                    placeholder="Enter position"
                    value={formData.position}
                    onChange={(e) => handleFormChange('position', e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label className="label">Role <span className="has-text-danger">*</span></label>
                <div className="control">
                  <div className="select is-fullwidth">
                    <select
                      value={formData.role}
                      onChange={(e) => handleFormChange('role', e.target.value)}
                    >
                      <option value="Admin">Admin</option>
                      <option value="Manager">Manager</option>
                      <option value="Collector">Collector</option>
                      <option value="Reader">Reader</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="field">
                <label className="label">Status <span className="has-text-danger">*</span></label>
                <div className="control">
                  <div className="select is-fullwidth">
                    <select
                      value={formData.status}
                      onChange={(e) => handleFormChange('status', e.target.value)}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {modalMode === 'add' && (
                <div className="notification is-info is-light">
                  <p className="is-size-7">
                    <strong>Note:</strong> Default password will be set to <strong>"admin"</strong>
                  </p>
                </div>
              )}
            </section>
            <footer className="modal-card-foot">
              <button 
                className={`button is-success ${loading ? 'is-loading' : ''}`}
                onClick={handleSubmit}
                disabled={loading}
              >
                <span className="icon"><i className="fas fa-save"></i></span>
                <span>{modalMode === 'add' ? 'Add User' : 'Save Changes'}</span>
              </button>
              <button className="button" onClick={closeModal}>Cancel</button>
            </footer>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm && userToDelete !== null}
        onClose={closeDeleteConfirm}
        onConfirm={handleDelete}
        title="Confirm Delete"
        message={userToDelete ? `Are you sure you want to delete user ${userToDelete.firstname} ${userToDelete.lastname}?` : ''}
        subMessage="This action cannot be undone."
        confirmText="Delete User"
        cancelText="Cancel"
        type="danger"
        loading={loading}
      />
    </div>
  )
}

export default UsersPage
