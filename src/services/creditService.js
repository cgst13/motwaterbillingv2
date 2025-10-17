import { supabase } from '../supabaseClient'

export const creditService = {
  // Get all customers with credit balance
  async getCustomersWithCredit() {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('customerid, name, barangay, type, status, credit_balance')
        .gt('credit_balance', 0)
        .order('credit_balance', { ascending: false })
        .range(0, 999999)

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error getting customers with credit:', error)
      return { success: false, error: error.message, data: [] }
    }
  },

  // Get credit statistics
  async getCreditStats() {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('credit_balance')
        .range(0, 999999)

      if (error) throw error

      const customersWithCredit = data.filter(c => parseFloat(c.credit_balance || 0) > 0)
      const totalCredit = data.reduce((sum, c) => sum + parseFloat(c.credit_balance || 0), 0)

      return {
        success: true,
        data: {
          totalCustomers: data.length,
          customersWithCredit: customersWithCredit.length,
          totalCreditAmount: totalCredit,
          averageCredit: customersWithCredit.length > 0 ? totalCredit / customersWithCredit.length : 0
        }
      }
    } catch (error) {
      console.error('Error getting credit stats:', error)
      return { success: false, error: error.message }
    }
  },

  // Search customers (with or without credit)
  async searchCustomers(searchTerm) {
    try {
      let query = supabase
        .from('customers')
        .select('customerid, name, barangay, type, status, credit_balance')
        .range(0, 999999)

      if (searchTerm) {
        const isNumeric = /^\d+$/.test(searchTerm)
        if (isNumeric) {
          query = query.or(`name.ilike.%${searchTerm}%,customerid.eq.${searchTerm}`)
        } else {
          query = query.ilike('name', `%${searchTerm}%`)
        }
      }

      query = query.order('name', { ascending: true })

      const { data, error } = await query

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error searching customers:', error)
      return { success: false, error: error.message, data: [] }
    }
  },

  // Adjust customer credit (add or deduct)
  async adjustCredit(customerid, amount, adjustmentType, remarks) {
    try {
      // Get current credit balance
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('credit_balance, name')
        .eq('customerid', customerid)
        .single()

      if (customerError) throw customerError

      const currentCredit = parseFloat(customerData.credit_balance || 0)
      let newCredit

      if (adjustmentType === 'add') {
        newCredit = currentCredit + parseFloat(amount)
      } else if (adjustmentType === 'deduct') {
        newCredit = currentCredit - parseFloat(amount)
        if (newCredit < 0) {
          return { success: false, error: 'Cannot deduct more than available credit balance' }
        }
      } else {
        return { success: false, error: 'Invalid adjustment type' }
      }

      // Update customer credit balance
      const { error: updateError } = await supabase
        .from('customers')
        .update({ credit_balance: newCredit })
        .eq('customerid', customerid)

      if (updateError) throw updateError

      return {
        success: true,
        data: {
          customerid,
          customerName: customerData.name,
          previousBalance: currentCredit,
          adjustment: adjustmentType === 'add' ? amount : -amount,
          newBalance: newCredit,
          remarks
        }
      }
    } catch (error) {
      console.error('Error adjusting credit:', error)
      return { success: false, error: error.message }
    }
  },

  // Get customer's unpaid bills
  async getUnpaidBills(customerid) {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('customerid', customerid)
        .eq('paymentstatus', 'Unpaid')
        .order('billedmonth', { ascending: true })
        .range(0, 999999)

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error getting unpaid bills:', error)
      return { success: false, error: error.message, data: [] }
    }
  },

  // Apply credit to bills
  async applyCreditToBills(customerid, billIds, creditToApply, paidBy) {
    try {
      // Get current credit balance
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('credit_balance')
        .eq('customerid', customerid)
        .single()

      if (customerError) throw customerError

      const currentCredit = parseFloat(customerData.credit_balance || 0)

      if (creditToApply > currentCredit) {
        return { success: false, error: 'Insufficient credit balance' }
      }

      // Update bills as paid with advance payment amount
      const updatePromises = billIds.map(({ billid, amount }) =>
        supabase
          .from('bills')
          .update({
            paymentstatus: 'Paid',
            advancepaymentamount: amount,
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

      // Deduct credit from customer
      const newCredit = currentCredit - creditToApply
      await supabase
        .from('customers')
        .update({ credit_balance: newCredit })
        .eq('customerid', customerid)

      return {
        success: true,
        data: {
          billsPaid: billIds.length,
          creditUsed: creditToApply,
          remainingCredit: newCredit
        }
      }
    } catch (error) {
      console.error('Error applying credit to bills:', error)
      return { success: false, error: error.message }
    }
  }
}
