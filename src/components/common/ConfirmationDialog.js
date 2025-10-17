import React from 'react'

/**
 * Reusable Confirmation Dialog Component
 * 
 * @param {boolean} isOpen - Controls dialog visibility
 * @param {function} onClose - Callback when dialog closes
 * @param {function} onConfirm - Callback when user confirms action
 * @param {string} title - Dialog title
 * @param {string} message - Main message to display
 * @param {string} confirmText - Text for confirm button (default: "Confirm")
 * @param {string} cancelText - Text for cancel button (default: "Cancel")
 * @param {string} type - Dialog type: 'danger', 'warning', 'info', 'success' (default: 'info')
 * @param {boolean} loading - Show loading state on confirm button
 */
const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  subMessage,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  loading = false,
  icon = null
}) => {
  if (!isOpen) return null

  const getIcon = () => {
    if (icon) return icon
    
    switch (type) {
      case 'danger':
        return <i className="fas fa-exclamation-triangle"></i>
      case 'warning':
        return <i className="fas fa-exclamation-circle"></i>
      case 'success':
        return <i className="fas fa-check-circle"></i>
      case 'info':
      default:
        return <i className="fas fa-info-circle"></i>
    }
  }

  const getIconColor = () => {
    switch (type) {
      case 'danger':
        return 'has-text-danger'
      case 'warning':
        return 'has-text-warning'
      case 'success':
        return 'has-text-success'
      case 'info':
      default:
        return 'has-text-info'
    }
  }

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'is-danger'
      case 'warning':
        return 'is-warning'
      case 'success':
        return 'is-success'
      case 'info':
      default:
        return 'is-primary'
    }
  }

  return (
    <div className="confirmation-dialog-overlay">
      <div className={`confirmation-dialog-content ${type}`}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 className="title is-5 mb-3">
            <span className={`icon ${getIconColor()}`} style={{ marginRight: '0.5rem' }}>
              {getIcon()}
            </span>
            {title}
          </h3>
          <p className="mb-3" style={{ fontSize: '1rem', color: '#4a5568' }}>
            {message}
          </p>
          {subMessage && (
            <p className="has-text-grey is-size-7">
              {subMessage}
            </p>
          )}
        </div>
        
        <div className="buttons is-right" style={{ marginBottom: '0' }}>
          <button 
            className="button" 
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button 
            className={`button ${getConfirmButtonClass()} ${loading ? 'is-loading' : ''}`}
            onClick={onConfirm}
            disabled={loading}
          >
            <span className="icon">
              {type === 'danger' && <i className="fas fa-trash"></i>}
              {type === 'success' && <i className="fas fa-check"></i>}
              {type === 'warning' && <i className="fas fa-exclamation"></i>}
              {type === 'info' && <i className="fas fa-info"></i>}
            </span>
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmationDialog
