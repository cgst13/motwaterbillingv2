import { supabase } from '../supabaseClient'

export const reportService = {
  // Get water usage report by date range
  async getWaterUsageReport(startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('billedmonth, consumption, customerid, customername, barangay')
        .gte('billedmonth', startDate)
        .lte('billedmonth', endDate)
        .order('billedmonth', { ascending: true })
        .range(0, 999999)

      if (error) throw error

      // Aggregate data
      const totalConsumption = data.reduce((sum, bill) => sum + parseFloat(bill.consumption || 0), 0)
      const averageConsumption = data.length > 0 ? totalConsumption / data.length : 0

      // Group by month
      const byMonth = {}
      data.forEach(bill => {
        const month = bill.billedmonth
        if (!byMonth[month]) {
          byMonth[month] = { month, consumption: 0, count: 0 }
        }
        byMonth[month].consumption += parseFloat(bill.consumption || 0)
        byMonth[month].count++
      })

      // Group by barangay
      const byBarangay = {}
      data.forEach(bill => {
        const barangay = bill.barangay || 'Unknown'
        if (!byBarangay[barangay]) {
          byBarangay[barangay] = { barangay, consumption: 0, count: 0 }
        }
        byBarangay[barangay].consumption += parseFloat(bill.consumption || 0)
        byBarangay[barangay].count++
      })

      return {
        success: true,
        data: {
          totalConsumption,
          averageConsumption,
          billCount: data.length,
          byMonth: Object.values(byMonth),
          byBarangay: Object.values(byBarangay).sort((a, b) => b.consumption - a.consumption),
          rawData: data
        }
      }
    } catch (error) {
      console.error('Error getting water usage report:', error)
      return { success: false, error: error.message }
    }
  },

  // Get revenue report by date range
  async getRevenueReport(startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('billedmonth, totalbillamount, paymentstatus, datepaid, basicamount, surchargeamount, discountamount, barangay')
        .gte('billedmonth', startDate)
        .lte('billedmonth', endDate)
        .range(0, 999999)

      if (error) throw error

      // Calculate totals
      const totalBilled = data.reduce((sum, bill) => sum + parseFloat(bill.totalbillamount || 0), 0)
      const totalPaid = data
        .filter(bill => bill.paymentstatus === 'Paid')
        .reduce((sum, bill) => sum + parseFloat(bill.totalbillamount || 0), 0)
      const totalUnpaid = data
        .filter(bill => bill.paymentstatus === 'Unpaid')
        .reduce((sum, bill) => sum + parseFloat(bill.totalbillamount || 0), 0)
      const totalSurcharge = data.reduce((sum, bill) => sum + parseFloat(bill.surchargeamount || 0), 0)
      const totalDiscount = data.reduce((sum, bill) => sum + parseFloat(bill.discountamount || 0), 0)

      const paidCount = data.filter(bill => bill.paymentstatus === 'Paid').length
      const unpaidCount = data.filter(bill => bill.paymentstatus === 'Unpaid').length
      const collectionRate = data.length > 0 ? (paidCount / data.length) * 100 : 0

      // Group by month
      const byMonth = {}
      data.forEach(bill => {
        const month = bill.billedmonth
        if (!byMonth[month]) {
          byMonth[month] = { month, billed: 0, paid: 0, unpaid: 0 }
        }
        byMonth[month].billed += parseFloat(bill.totalbillamount || 0)
        if (bill.paymentstatus === 'Paid') {
          byMonth[month].paid += parseFloat(bill.totalbillamount || 0)
        } else {
          byMonth[month].unpaid += parseFloat(bill.totalbillamount || 0)
        }
      })

      // Group by barangay
      const byBarangay = {}
      data.forEach(bill => {
        const barangay = bill.barangay || 'Unknown'
        if (!byBarangay[barangay]) {
          byBarangay[barangay] = { barangay, billed: 0, paid: 0, unpaid: 0, billCount: 0 }
        }
        byBarangay[barangay].billed += parseFloat(bill.totalbillamount || 0)
        byBarangay[barangay].billCount++
        if (bill.paymentstatus === 'Paid') {
          byBarangay[barangay].paid += parseFloat(bill.totalbillamount || 0)
        } else {
          byBarangay[barangay].unpaid += parseFloat(bill.totalbillamount || 0)
        }
      })

      return {
        success: true,
        data: {
          totalBilled,
          totalPaid,
          totalUnpaid,
          totalSurcharge,
          totalDiscount,
          paidCount,
          unpaidCount,
          collectionRate,
          byMonth: Object.values(byMonth),
          byBarangay: Object.values(byBarangay).sort((a, b) => b.billed - a.billed)
        }
      }
    } catch (error) {
      console.error('Error getting revenue report:', error)
      return { success: false, error: error.message }
    }
  },

  // Get payment collection report (actual collections by date paid)
  async getCollectionReport(startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('datepaid, totalbillamount, paidby, customername, barangay')
        .eq('paymentstatus', 'Paid')
        .gte('datepaid', startDate)
        .lte('datepaid', endDate)
        .order('datepaid', { ascending: true })
        .range(0, 999999)

      if (error) throw error

      const totalCollected = data.reduce((sum, bill) => sum + parseFloat(bill.totalbillamount || 0), 0)

      // Group by date
      const byDate = {}
      data.forEach(bill => {
        const date = bill.datepaid.split('T')[0]
        if (!byDate[date]) {
          byDate[date] = { date, amount: 0, count: 0 }
        }
        byDate[date].amount += parseFloat(bill.totalbillamount || 0)
        byDate[date].count++
      })

      // Group by collector
      const byCollector = {}
      data.forEach(bill => {
        const collector = bill.paidby || 'Unknown'
        if (!byCollector[collector]) {
          byCollector[collector] = { collector, amount: 0, count: 0 }
        }
        byCollector[collector].amount += parseFloat(bill.totalbillamount || 0)
        byCollector[collector].count++
      })

      return {
        success: true,
        data: {
          totalCollected,
          collectionCount: data.length,
          byDate: Object.values(byDate),
          byCollector: Object.values(byCollector).sort((a, b) => b.amount - a.amount)
        }
      }
    } catch (error) {
      console.error('Error getting collection report:', error)
      return { success: false, error: error.message }
    }
  },

  // Get top consumers
  async getTopConsumers(startDate, endDate, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('customerid, customername, consumption, barangay')
        .gte('billedmonth', startDate)
        .lte('billedmonth', endDate)
        .range(0, 999999)

      if (error) throw error

      // Aggregate by customer
      const byCustomer = {}
      data.forEach(bill => {
        const customerid = bill.customerid
        if (!byCustomer[customerid]) {
          byCustomer[customerid] = {
            customerid,
            customername: bill.customername,
            barangay: bill.barangay,
            totalConsumption: 0,
            billCount: 0
          }
        }
        byCustomer[customerid].totalConsumption += parseFloat(bill.consumption || 0)
        byCustomer[customerid].billCount++
      })

      const topConsumers = Object.values(byCustomer)
        .sort((a, b) => b.totalConsumption - a.totalConsumption)
        .slice(0, limit)

      return { success: true, data: topConsumers }
    } catch (error) {
      console.error('Error getting top consumers:', error)
      return { success: false, error: error.message }
    }
  }
}
