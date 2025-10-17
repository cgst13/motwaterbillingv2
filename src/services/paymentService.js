import { supabase } from '../supabaseClient'

export const paymentService = {
  // Search customers by name with filters
  async searchCustomers(searchTerm, filters = {}) {
    try {
      let query = supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true })

      // Apply search term
      if (searchTerm) {
        const isNumeric = /^\d+$/.test(searchTerm.trim())
        if (isNumeric) {
          query = query.or(`customerid.eq.${searchTerm},name.ilike.%${searchTerm}%`)
        } else {
          query = query.ilike('name', `%${searchTerm}%`)
        }
      }

      // Apply filters
      if (filters.barangay) {
        query = query.eq('barangay', filters.barangay)
      }
      if (filters.type) {
        query = query.eq('type', filters.type)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      // Set high limit to retrieve all records (Supabase default is 1000)
      // This allows searching through all customer records without pagination
      query = query.limit(10000)

      const { data, error } = await query

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error searching customers:', error)
      return { success: false, error: error.message }
    }
  },

  // Get all barangays
  async getBarangays() {
    try {
      const { data, error } = await supabase
        .from('barangay')
        .select('*')
        .order('barangay', { ascending: true })
        .limit(10000)

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error getting barangays:', error)
      return { success: false, error: error.message, data: [] }
    }
  },

  // Get customer by ID with all details
  async getCustomerDetails(customerId) {
    try {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('customerid', customerId)
        .single()

      if (customerError) throw customerError

      return { success: true, data: customer }
    } catch (error) {
      console.error('Error getting customer details:', error)
      return { success: false, error: error.message }
    }
  },

  // Get customer details including credit balance and discount
  async getCustomerDetails(customerId) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('customerid, name, barangay, type, status, credit_balance, discount')
        .eq('customerid', customerId)
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error getting customer details:', error)
      return { success: false, error: error.message }
    }
  },

  // Get unpaid bills for a customer
  async getUnpaidBills(customerId) {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('customerid', customerId)
        .or('paymentstatus.eq.Unpaid,paymentstatus.eq.Partial')
        .order('billedmonth', { ascending: true })

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error getting unpaid bills:', error)
      return { success: false, error: error.message }
    }
  },

  // Get payment history for a customer
  async getPaymentHistory(customerId) {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('customerid', customerId)
        .eq('paymentstatus', 'Paid')
        .order('billedmonth', { ascending: false })
        .limit(10)

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error getting payment history:', error)
      return { success: false, error: error.message }
    }
  },

  // Get surcharge settings
  async getSurchargeSettings() {
    try {
      const { data, error } = await supabase
        .from('surcharge_settings')
        .select('*')
        .limit(1)
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error getting surcharge settings:', error)
      // Return default settings if table doesn't exist
      return { 
        success: true, 
        data: { 
          due_day: 10, 
          first_surcharge_percent: 10, 
          second_surcharge_percent: 15 
        } 
      }
    }
  },

  // Calculate surcharge for a bill
  calculateSurcharge(bill, surchargeSettings) {
    if (!bill || !bill.billedmonth || !bill.basicamount) {
      return {
        surchargeAmount: 0,
        firstSurcharge: 0,
        secondSurcharge: 0,
        daysOverdue: 0,
        surchargeType: null
      }
    }

    const today = new Date()
    const billedMonth = new Date(bill.billedmonth)
    
    // Set due date to the due_day of the month after billing month
    const dueDate = new Date(billedMonth.getFullYear(), billedMonth.getMonth() + 1, surchargeSettings.due_day)
    
    // Calculate days overdue (day after due date starts counting)
    const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24))
    
    if (daysOverdue <= 0) {
      // Not overdue yet
      return {
        surchargeAmount: 0,
        firstSurcharge: 0,
        secondSurcharge: 0,
        daysOverdue: 0,
        surchargeType: null,
        dueDate
      }
    }

    const basicAmount = parseFloat(bill.basicamount)
    
    // Calculate end of month of the due date
    const endOfDueMonth = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0) // Last day of due month
    const isAfterEndOfDueMonth = today > endOfDueMonth
    
    let firstSurcharge = 0
    let secondSurcharge = 0
    let surchargeType = null
    
    // Apply first surcharge (day after due date)
    if (daysOverdue >= 1) {
      firstSurcharge = (basicAmount * surchargeSettings.first_surcharge_percent) / 100
      surchargeType = 'first'
    }
    
    // Apply second surcharge (after end of month of due date) - compounds on top
    if (isAfterEndOfDueMonth) {
      const baseForSecondSurcharge = basicAmount + firstSurcharge
      secondSurcharge = (baseForSecondSurcharge * surchargeSettings.second_surcharge_percent) / 100
      surchargeType = 'both'
    }
    
    const totalSurcharge = firstSurcharge + secondSurcharge

    return {
      surchargeAmount: Math.round(totalSurcharge * 100) / 100, // Round to 2 decimals
      firstSurcharge: Math.round(firstSurcharge * 100) / 100,
      secondSurcharge: Math.round(secondSurcharge * 100) / 100,
      daysOverdue,
      surchargeType,
      dueDate,
      endOfDueMonth,
      firstSurchargePercent: surchargeSettings.first_surcharge_percent,
      secondSurchargePercent: surchargeSettings.second_surcharge_percent
    }
  },

  // Calculate total bill amount with surcharge
  calculateTotalWithSurcharge(bill, surchargeInfo) {
    const basicAmount = parseFloat(bill.basicamount || 0)
    const discountAmount = parseFloat(bill.discountamount || 0)
    const existingSurcharge = parseFloat(bill.surchargeamount || 0)
    
    // Use calculated surcharge or existing surcharge from database
    const surcharge = surchargeInfo ? surchargeInfo.surchargeAmount : existingSurcharge
    
    return basicAmount + surcharge - discountAmount
  },

  // Process payment for single or multiple bills
  async processPayment(billIds, paidBy, amountReceived = 0, creditAmount = 0) {
    try {
      // Update bills to mark as paid
      const updatePromises = billIds.map(billid => 
        supabase
          .from('bills')
          .update({
            paymentstatus: 'Paid',
            paidby: paidBy,
            datepaid: new Date().toISOString()
          })
          .eq('billid', billid)
      )

      const results = await Promise.all(updatePromises)
      
      const hasError = results.some(result => result.error)
      if (hasError) {
        throw new Error('Some bills failed to update')
      }

      // If there's credit amount, update customer's credit balance
      if (creditAmount > 0 && billIds.length > 0) {
        // Get the customerid from the first bill
        const { data: billData, error: billError } = await supabase
          .from('bills')
          .select('customerid')
          .eq('billid', billIds[0])
          .single()

        if (!billError && billData) {
          // Get current credit balance
          const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .select('credit_balance')
            .eq('customerid', billData.customerid)
            .single()

          if (!customerError && customerData) {
            const currentCredit = parseFloat(customerData.credit_balance || 0)
            const newCredit = currentCredit + creditAmount

            // Update customer's credit balance
            await supabase
              .from('customers')
              .update({ credit_balance: newCredit })
              .eq('customerid', billData.customerid)
          }
        }
      }

      return { 
        success: true, 
        data: { 
          paidCount: billIds.length,
          creditApplied: creditAmount
        } 
      }
    } catch (error) {
      console.error('Error processing payment:', error)
      return { success: false, error: error.message }
    }
  },

  // Get payment statistics
  async getPaymentStats() {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const thisMonth = new Date()
      thisMonth.setDate(1)
      thisMonth.setHours(0, 0, 0, 0)

      const { data: todayData, error: todayError } = await supabase
        .from('bills')
        .select('totalbillamount')
        .eq('paymentstatus', 'Paid')
        .gte('datepaid', today.toISOString())

      const { data: monthData, error: monthError } = await supabase
        .from('bills')
        .select('totalbillamount')
        .eq('paymentstatus', 'Paid')
        .gte('datepaid', thisMonth.toISOString())

      if (todayError || monthError) {
        throw new Error('Error fetching statistics')
      }

      const todayTotal = todayData.reduce((sum, bill) => sum + parseFloat(bill.totalbillamount || 0), 0)
      const monthTotal = monthData.reduce((sum, bill) => sum + parseFloat(bill.totalbillamount || 0), 0)

      return {
        success: true,
        data: {
          todayCollection: todayTotal,
          todayCount: todayData.length,
          monthCollection: monthTotal,
          monthCount: monthData.length
        }
      }
    } catch (error) {
      console.error('Error getting payment stats:', error)
      return { success: false, error: error.message }
    }
  },

  // Get recent payments with customer info
  async getRecentPayments(limit = 10) {
    try {
      const { data: bills, error: billsError } = await supabase
        .from('bills')
        .select('*')
        .eq('paymentstatus', 'Paid')
        .not('datepaid', 'is', null)
        .order('datepaid', { ascending: false })
        .limit(limit)

      if (billsError) throw billsError

      // Get customer info for these bills
      const customerIds = [...new Set(bills.map(b => b.customerid))]
      const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('customerid, name, type, barangay')
        .in('customerid', customerIds)
        .limit(10000)

      if (customerError) throw customerError

      // Map customer data to bills
      const billsWithCustomers = bills.map(bill => ({
        ...bill,
        customer: customers.find(c => c.customerid === bill.customerid)
      }))

      return { success: true, data: billsWithCustomers }
    } catch (error) {
      console.error('Error getting recent payments:', error)
      return { success: false, error: error.message, data: [] }
    }
  },

  // Mark bill as unpaid (reverse payment)
  async markBillAsUnpaid(billId) {
    try {
      // First get the bill details to check if it was paid using credit
      const { data: billData, error: billError } = await supabase
        .from('bills')
        .select('customerid, advancepaymentamount')
        .eq('billid', billId)
        .single()

      if (billError) throw billError

      // If bill was paid using advance payment (credit), restore it to customer balance
      if (billData.advancepaymentamount && parseFloat(billData.advancepaymentamount) > 0) {
        const creditToRestore = parseFloat(billData.advancepaymentamount)
        
        // Get current credit balance
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('credit_balance')
          .eq('customerid', billData.customerid)
          .single()

        if (!customerError && customerData) {
          const currentCredit = parseFloat(customerData.credit_balance || 0)
          const newCredit = currentCredit + creditToRestore

          // Update customer's credit balance
          await supabase
            .from('customers')
            .update({ credit_balance: newCredit })
            .eq('customerid', billData.customerid)
        }
      }

      // Now mark the bill as unpaid
      const { error } = await supabase
        .from('bills')
        .update({
          paymentstatus: 'Unpaid',
          paidby: null,
          datepaid: null,
          advancepaymentamount: null
        })
        .eq('billid', billId)

      if (error) throw error

      return { success: true, message: 'Bill marked as unpaid successfully' }
    } catch (error) {
      console.error('Error marking bill as unpaid:', error)
      return { success: false, error: error.message }
    }
  }
}
