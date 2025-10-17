import { supabase } from '../supabaseClient'

// Utility function to fetch all records with pagination
const fetchAllRecords = async (baseQuery, batchSize = 1000) => {
  let allData = []
  let start = 0
  let hasMore = true

  while (hasMore) {
    console.log(`Fetching batch starting at ${start}...`)
    
    const { data, error } = await baseQuery
      .range(start, start + batchSize - 1)
    
    if (error) {
      throw error
    }
    
    if (data && data.length > 0) {
      allData = [...allData, ...data]
      console.log(`Fetched ${data.length} records, total so far: ${allData.length}`)
      
      // If we got less than batchSize, we've reached the end
      if (data.length < batchSize) {
        hasMore = false
      } else {
        start += batchSize
      }
    } else {
      hasMore = false
    }
  }
  
  return allData
}

export const customerService = {
  // Test connection to Supabase
  async testConnection() {
    try {
      console.log('Testing Supabase connection...')
      console.log('Supabase URL:', supabase.supabaseUrl)
      console.log('Auth status:', await supabase.auth.getSession())
      
      const { data, error, count } = await supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .range(0, 99999)
      
      console.log('Connection test result:', { data, error, count })
      
      if (error) {
        console.error('Possible RLS issue. Error details:', error)
        return { 
          success: false, 
          error: `${error.message}. This might be a Row Level Security (RLS) issue. Check console for details.` 
        }
      }
      
      return { 
        success: true, 
        message: `Connection successful! Found ${count} records in database.` 
      }
    } catch (error) {
      console.error('Connection test failed:', error)
      return { success: false, error: error.message }
    }
  },
  // Get all customers with optional filters
  async getCustomers(filters = {}) {
    try {
      console.log('Fetching customers with filters:', filters)
      
      // Build base query
      let baseQuery = supabase
        .from('customers')
        .select('*')
        .order('date_added', { ascending: false })

      // Apply filters to base query
      if (filters.search) {
        const searchTerm = filters.search.trim()
        
        if (searchTerm) {
          // Check if search term is purely numeric
          const isNumeric = /^\d+$/.test(searchTerm)
          
          console.log('Search term:', searchTerm, 'Is numeric:', isNumeric)
          
          if (isNumeric) {
            // If it's numeric, search both name and customerid
            console.log('Searching both name and customerid for:', searchTerm)
            baseQuery = baseQuery.or(`name.ilike.%${searchTerm}%,customerid.eq.${searchTerm}`)
          } else {
            // If it contains letters, only search name (case-insensitive)
            console.log('Searching only name for:', searchTerm)
            baseQuery = baseQuery.ilike('name', `%${searchTerm}%`)
          }
        }
      }
      
      if (filters.barangay && filters.barangay !== 'all') {
        console.log('Filtering by barangay (case-insensitive):', filters.barangay)
        baseQuery = baseQuery.ilike('barangay', filters.barangay)
      }
      
      if (filters.type && filters.type !== 'all') {
        console.log('Filtering by type (case-insensitive):', filters.type)
        baseQuery = baseQuery.ilike('type', filters.type)
      }
      
      if (filters.status && filters.status !== 'all') {
        console.log('Filtering by status (case-insensitive):', filters.status)
        baseQuery = baseQuery.ilike('status', filters.status)
      }

      // Fetch all records using pagination utility
      const allData = await fetchAllRecords(baseQuery)
      
      console.log('Successfully fetched ALL customers:', allData.length, 'records (truly unlimited)')
      return { success: true, data: allData }
    } catch (error) {
      console.error('Error in getCustomers:', error)
      return { success: false, error: error.message }
    }
  },

  // Get customer by ID
  async getCustomerById(customerId) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('customerid', customerId)
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Generate unique customer ID
  async generateCustomerId() {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('customerid')
        .order('customerid', { ascending: false })
        .limit(1)

      if (error) throw error
      
      const lastId = data.length > 0 ? data[0].customerid : 0
      return { success: true, data: lastId + 1 }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Add new customer
  async addCustomer(customerData) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          ...customerData,
          date_added: new Date().toISOString().split('T')[0],
          status: customerData.status || 'Active'
        }])
        .select()

      if (error) throw error
      return { success: true, data: data[0] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Update customer
  async updateCustomer(customerId, customerData) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .update(customerData)
        .eq('customerid', customerId)
        .select()

      if (error) throw error
      return { success: true, data: data[0] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Delete customer
  async deleteCustomer(customerId) {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('customerid', customerId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Update customer status (disconnect/reconnect)
  async updateCustomerStatus(customerId, status, remarks, userId) {
    try {
      const updateData = {
        status,
        remarks: remarks || null
      }

      if (status === 'Disconnected') {
        updateData.disconnection_date = new Date().toISOString().split('T')[0]
        updateData.disconnected_by = userId
      } else if (status === 'Active') {
        updateData.disconnection_date = null
        updateData.disconnected_by = null
      }

      const { data, error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('customerid', customerId)
        .select()

      if (error) throw error
      return { success: true, data: data[0] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Get customer statistics
  async getCustomerStats() {
    try {
      // Use the same pagination approach to get ALL records
      let allData = []
      let start = 0
      const batchSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('customers')
          .select('status')
          .range(start, start + batchSize - 1)
        
        if (error) throw error
        
        if (data && data.length > 0) {
          allData = [...allData, ...data]
          
          if (data.length < batchSize) {
            hasMore = false
          } else {
            start += batchSize
          }
        } else {
          hasMore = false
        }
      }

      const stats = {
        total: allData.length,
        active: allData.filter(c => c.status && c.status.toLowerCase() === 'active').length,
        disconnected: allData.filter(c => c.status && c.status.toLowerCase() === 'disconnected').length
      }

      console.log('Stats calculated from', allData.length, 'total records')
      return { success: true, data: stats }
    } catch (error) {
      return { success: false, error: error.message, data: [] }
    }
  },

  // Get unique customer types
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

  // Get discount options
  async getDiscounts() {
    try {
      const { data, error } = await supabase
        .from('discount')
        .select('type, discountpercentage')
        .order('type', { ascending: true })
        .limit(10000)

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error getting discounts:', error)
      return { success: false, error: error.message, data: [] }
    }
  },

  // Export customers to CSV
  exportToCSV(customers) {
    const headers = [
      'Customer ID',
      'Name',
      'Type',
      'Barangay',
      'Discount %',
      'Status',
      'Date Added',
      'Added By',
      'Credit Balance',
      'Disconnection Date',
      'Disconnected By',
      'Remarks'
    ]

    const csvContent = [
      headers.join(','),
      ...customers.map(customer => [
        customer.customerid,
        `"${customer.name || ''}"`,
        `"${customer.type || ''}"`,
        `"${customer.barangay || ''}"`,
        customer.discount || 0,
        `"${customer.status || ''}"`,
        customer.date_added || '',
        `"${customer.added_by || ''}"`,
        customer.credit_balance || 0,
        customer.disconnection_date || '',
        `"${customer.disconnected_by || ''}"`,
        `"${customer.remarks || ''}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `customers_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}
