import React, { useState, useEffect } from 'react'

/**
 * Payment Confirmation Dialog with Amount Received Input
 */
const PaymentConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  billCount,
  grandTotal,
  creditBalance = 0,
  loading = false
}) => {
  const [amountReceived, setAmountReceived] = useState('')
  const [error, setError] = useState('')

  // Calculate credit to apply and amount after credit
  const creditToApply = Math.min(creditBalance, grandTotal)
  const amountAfterCredit = grandTotal - creditToApply
  const remainingCredit = creditBalance - creditToApply

  useEffect(() => {
    if (isOpen) {
      // Pre-fill with amount after credit application
      setAmountReceived(amountAfterCredit.toFixed(2))
      setError('')
    }
  }, [isOpen, amountAfterCredit])

  const handleConfirm = () => {
    const received = parseFloat(amountReceived)
    
    if (isNaN(received) || received < 0) {
      setError('Please enter a valid amount')
      return
    }
    
    // Amount after credit should match or be less
    if (received < amountAfterCredit) {
      setError(`Amount received (₱${received.toFixed(2)}) is less than required (₱${amountAfterCredit.toFixed(2)})`)
      return
    }
    
    // Calculate new credit (overpayment after credit application)
    const newCredit = received - amountAfterCredit
    
    // Pass credit to apply (from existing balance) and new credit (from overpayment)
    onConfirm(received, creditToApply, newCredit)
  }

  if (!isOpen) return null

  const overpayment = parseFloat(amountReceived || 0) - amountAfterCredit
  const hasOverpayment = overpayment > 0

  return (
    <div className="confirmation-dialog-overlay">
      <div className="confirmation-dialog-content success" style={{ maxWidth: '550px' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 className="title is-5 mb-3">
            <span className="icon has-text-success" style={{ marginRight: '0.5rem' }}>
              <i className="fas fa-cash-register"></i>
            </span>
            Confirm Payment Processing
          </h3>
          
          {/* Payment Summary */}
          <div className="box" style={{ background: '#f0f9ff', border: '2px solid #3b82f6', marginBottom: '1rem' }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <span className="has-text-grey">Number of Bills:</span>
              <strong style={{ float: 'right', fontSize: '1.1rem' }}>{billCount}</strong>
            </div>
            <div style={{ borderTop: '1px solid #ddd', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
              <span className="has-text-grey">Grand Total:</span>
              <strong style={{ float: 'right', fontSize: '1.2rem', color: '#059669' }}>
                ₱{grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
            {creditToApply > 0 && (
              <div style={{ borderTop: '1px solid #ddd', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
                <span className="has-text-grey">Credit Applied:</span>
                <strong style={{ float: 'right', fontSize: '1.2rem', color: '#d97706' }}>
                  -₱{creditToApply.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
            )}
            <div style={{ borderTop: '2px solid #3b82f6', paddingTop: '0.75rem', background: '#dbeafe', margin: '-1rem', marginTop: '0.75rem', padding: '1rem' }}>
              <span className="has-text-grey has-text-weight-bold">Amount to Pay:</span>
              <strong style={{ float: 'right', fontSize: '1.5rem', color: '#059669' }}>
                ₱{amountAfterCredit.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          {/* Amount Received Input */}
          <div className="field">
            <label className="label">
              Amount Received <span className="has-text-danger">*</span>
            </label>
            <div className="control has-icons-left">
              <input
                className={`input ${error ? 'is-danger' : ''}`}
                type="number"
                step="0.01"
                placeholder="Enter amount received"
                value={amountReceived}
                onChange={(e) => {
                  setAmountReceived(e.target.value)
                  setError('')
                }}
                autoFocus
                disabled={loading}
              />
              <span className="icon is-small is-left">
                <i className="fas fa-peso-sign"></i>
              </span>
            </div>
            {error && (
              <p className="help is-danger">{error}</p>
            )}
            {!error && hasOverpayment && (
              <p className="help is-success">
                <i className="fas fa-info-circle"></i> New credit from overpayment: ₱{overpayment.toFixed(2)}
              </p>
            )}
          </div>

          {/* Credit Information */}
          {creditToApply > 0 && (
            <div className="notification is-warning is-light" style={{ padding: '0.75rem 1rem', marginBottom: '1rem' }}>
              <p className="is-size-7">
                <strong><i className="fas fa-piggy-bank"></i> Credit Auto-Applied:</strong><br />
                ₱{creditToApply.toFixed(2)} from available credit balance has been automatically applied to this payment.
                {remainingCredit > 0 && ` Remaining credit: ₱${remainingCredit.toFixed(2)}`}
              </p>
            </div>
          )}
          {hasOverpayment && !error && (
            <div className="notification is-success is-light" style={{ padding: '0.75rem 1rem' }}>
              <p className="is-size-7">
                <strong><i className="fas fa-coins"></i> Overpayment Detected:</strong><br />
                The excess amount of <strong>₱{overpayment.toFixed(2)}</strong> will be saved as credit and automatically applied to future bills.
              </p>
            </div>
          )}
        </div>
        
        <div className="buttons is-right" style={{ marginBottom: '0' }}>
          <button 
            className="button" 
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            className={`button is-success ${loading ? 'is-loading' : ''}`}
            onClick={handleConfirm}
            disabled={loading}
          >
            <span className="icon">
              <i className="fas fa-check-circle"></i>
            </span>
            <span>Confirm Payment</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default PaymentConfirmDialog
