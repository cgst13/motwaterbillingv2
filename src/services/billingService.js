import { supabase } from '../supabaseClient'

export const billingService = {
  // Get all bills with pagination and sorting
  async getBills(page = 1, limit = 50, orderBy = 'billedmonth', ascending = false) {
    try {
      const start = (page - 1) * limit
      const end = start + limit - 1

      // Fetch bills
      const { data: bills, error, count } = await supabase
        .from('bills')
        .select('*', { count: 'exact' })
        .order(orderBy, { ascending })
        .range(start, end)

      if (error) throw error

      // Get unique customer IDs
      const customerIds = [...new Set(bills.map(b => b.customerid).filter(id => id))]

      // Fetch customers
      const { data: customers } = await supabase
        .from('customers')
        .select('customerid, name, type, barangay')
        .in('customerid', customerIds)
        .limit(10000)

      // Create customer lookup map
      const customerMap = {}
      if (customers) {
        customers.forEach(c => {
          customerMap[c.customerid] = c
        })
      }

      // Manually join customer data to bills
      const billsWithCustomers = bills.map(bill => ({
        ...bill,
        customers: customerMap[bill.customerid] || null
      }))

      return { success: true, data: billsWithCustomers, count }
    } catch (error) {
      console.error('Error getting bills:', error)
      return { success: false, error: error.message, data: [], count: 0 }
    }
  },

  // Get customer types with rates
  async getCustomerTypes() {
    try {
      const { data, error } = await supabase
        .from('customer_type')
        .select('type, rate1, rate2')
        .order('type', { ascending: true })
        .limit(10000)

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error getting customer types:', error)
      return { success: false, error: error.message, data: [] }
    }
  },

  // Get customer's last bill
  async getLastBill(customerId) {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('customerid', customerId)
        .order('billedmonth', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return { success: true, data: data || null }
    } catch (error) {
      console.error('Error getting last bill:', error)
      return { success: false, error: error.message, data: null }
    }
  },

  // Check if bill already exists for customer and month
  async checkDuplicateBill(customerId, billedMonth, excludeBillId = null) {
    try {
      let query = supabase
        .from('bills')
        .select('billid')
        .eq('customerid', customerId)
        .eq('billedmonth', billedMonth)

      if (excludeBillId) {
        query = query.neq('billid', excludeBillId)
      }

      const { data, error } = await query

      if (error) throw error
      return { success: true, exists: data && data.length > 0 }
    } catch (error) {
      console.error('Error checking duplicate bill:', error)
      return { success: false, error: error.message, exists: false }
    }
  },

  // Check if a bill ID already exists
  async checkBillIdExists(billId) {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('billid')
        .eq('billid', billId)
        .maybeSingle()

      if (error) throw error
      return { success: true, data: { exists: data !== null } }
    } catch (error) {
      console.error('Error checking bill ID exists:', error)
      return { success: false, error: error.message, data: { exists: false } }
    }
  },

  // Calculate basic amount based on consumption and customer type
  calculateBasicAmount(consumption, customerType) {
    if (!customerType) return 0

    const rate1 = parseFloat(customerType.rate1 || 0)
    const rate2 = parseFloat(customerType.rate2 || 0)
    let basic = 0

    if (consumption === 0) {
      // Minimum charge for 0 consumption
      basic = rate1
    } else if (consumption <= 3) {
      // First 3 cubic meters charged at rate1
      basic = consumption * rate1
    } else {
      // First 3 at rate1, excess at rate2
      basic = (3 * rate1) + ((consumption - 3) * rate2)
    }

    return parseFloat(basic.toFixed(2))
  },

  // Calculate discount amount based on customer discount percentage
  calculateDiscountAmount(basicAmount, discountPercent) {
    if (!discountPercent || discountPercent <= 0) return 0
    return (basicAmount * discountPercent) / 100
  },

  // Add new bill
  async addBill(billData) {
    try {
      const { data, error } = await supabase
        .from('bills')
        .insert([billData])
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error adding bill:', error)
      return { success: false, error: error.message }
    }
  },

  // Update existing bill
  async updateBill(billId, billData) {
    try {
      const { data, error } = await supabase
        .from('bills')
        .update(billData)
        .eq('billid', billId)
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error updating bill:', error)
      return { success: false, error: error.message }
    }
  },

  // Delete bill
  async deleteBill(billId) {
    try {
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('billid', billId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error deleting bill:', error)
      return { success: false, error: error.message }
    }
  },

  // Get bills by customer
  async getCustomerBills(customerId) {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('customerid', customerId)
        .order('billedmonth', { ascending: false })
        .limit(10000)

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error getting customer bills:', error)
      return { success: false, error: error.message, data: [] }
    }
  },

  // Get encoding statistics by barangay for a specific month
  async getEncodingStats(billedMonth) {
    try {
      // Fetch all customers in batches to overcome Supabase's 1000-row default limit
      let allCustomers = []
      let start = 0
      const batchSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: customerBatch, error: customerError } = await supabase
          .from('customers')
          .select('customerid, name, barangay, type, status')
          .order('barangay', { ascending: true })
          .range(start, start + batchSize - 1)

        if (customerError) throw customerError

        if (customerBatch && customerBatch.length > 0) {
          allCustomers = [...allCustomers, ...customerBatch]
          if (customerBatch.length < batchSize) {
            hasMore = false
          } else {
            start += batchSize
          }
        } else {
          hasMore = false
        }
      }

      // Fetch all bills for the specified month in batches
      let allBills = []
      start = 0
      hasMore = true

      while (hasMore) {
        const { data: billBatch, error: billError } = await supabase
          .from('bills')
          .select('customerid')
          .eq('billedmonth', billedMonth)
          .range(start, start + batchSize - 1)

        if (billError) throw billError

        if (billBatch && billBatch.length > 0) {
          allBills = [...allBills, ...billBatch]
          if (billBatch.length < batchSize) {
            hasMore = false
          } else {
            start += batchSize
          }
        } else {
          hasMore = false
        }
      }

      const billedCustomerIds = new Set(allBills.map(b => b.customerid))

      console.log(`Encoding Stats: Fetched ${allCustomers.length} total customers and ${allBills.length} bills for ${billedMonth}`)

      // Group customers by barangay with ALL customer data
      const barangayStats = {}
      allCustomers.forEach(customer => {
        const barangay = customer.barangay || 'Unknown'
        if (!barangayStats[barangay]) {
          barangayStats[barangay] = {
            barangay,
            totalCustomers: 0,
            encodedCount: 0,
            allCustomers: [], // Store all customers for filtering
            notEncodedCustomers: []
          }
        }
        
        const customerData = {
          customerid: customer.customerid,
          name: customer.name,
          type: customer.type,
          status: customer.status,
          isEncoded: billedCustomerIds.has(customer.customerid)
        }
        
        barangayStats[barangay].allCustomers.push(customerData)
        barangayStats[barangay].totalCustomers++
        
        if (billedCustomerIds.has(customer.customerid)) {
          barangayStats[barangay].encodedCount++
        } else {
          barangayStats[barangay].notEncodedCustomers.push({
            customerid: customer.customerid,
            name: customer.name,
            type: customer.type,
            status: customer.status
          })
        }
      })

      return { 
        success: true, 
        data: Object.values(barangayStats).sort((a, b) => a.barangay.localeCompare(b.barangay))
      }
    } catch (error) {
      console.error('Error getting encoding stats:', error)
      return { success: false, error: error.message, data: [] }
    }
  },

  // Export bills to CSV
  exportToCSV(bills) {
    const headers = [
      'Bill ID', 'Customer ID', 'Customer Name', 'Barangay', 
      'Billed Month', 'Previous Reading', 'Current Reading', 'Consumption',
      'Basic Amount', 'Surcharge', 'Discount', 'Total Bill', 'Payment Status'
    ]

    const rows = bills.map(bill => [
      bill.billid,
      bill.customerid,
      bill.customers?.name || '',
      bill.customers?.barangay || '',
      bill.billedmonth,
      bill.previousreading || 0,
      bill.currentreading || 0,
      bill.consumption || 0,
      bill.basicamount || 0,
      bill.surchargeamount || 0,
      bill.discountamount || 0,
      bill.totalbillamount || 0,
      bill.paymentstatus || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    return csvContent
  }
}
