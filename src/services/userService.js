import { supabase } from '../supabaseClient'

export const userService = {
  // Get all users
  async getAllUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('firstname', { ascending: true })
        .limit(10000)

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error getting users:', error)
      return { success: false, error: error.message, data: [] }
    }
  },

  // Search users by name
  async searchUsers(searchTerm) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`firstname.ilike.%${searchTerm}%,lastname.ilike.%${searchTerm}%`)
        .order('firstname', { ascending: true })
        .limit(10000)

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error searching users:', error)
      return { success: false, error: error.message, data: [] }
    }
  },

  // Add new user
  async addUser(userData) {
    try {
      // Generate UUID for userid
      const userid = crypto.randomUUID()
      
      const newUser = {
        userid,
        firstname: userData.firstname,
        lastname: userData.lastname,
        email: userData.email,
        password: 'admin', // Default password
        department: userData.department,
        position: userData.position,
        role: userData.role,
        status: userData.status || 'Active'
      }

      const { data, error } = await supabase
        .from('users')
        .insert([newUser])
        .select()

      if (error) throw error
      return { success: true, data: data[0] }
    } catch (error) {
      console.error('Error adding user:', error)
      return { success: false, error: error.message }
    }
  },

  // Update user
  async updateUser(userid, userData) {
    try {
      const updateData = {
        firstname: userData.firstname,
        lastname: userData.lastname,
        department: userData.department,
        position: userData.position,
        role: userData.role,
        status: userData.status
        // Email is not editable
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('userid', userid)
        .select()

      if (error) throw error
      return { success: true, data: data[0] }
    } catch (error) {
      console.error('Error updating user:', error)
      return { success: false, error: error.message }
    }
  },

  // Delete user
  async deleteUser(userid) {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('userid', userid)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error deleting user:', error)
      return { success: false, error: error.message }
    }
  },

  // Get user by ID
  async getUserById(userid) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('userid', userid)
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error getting user:', error)
      return { success: false, error: error.message }
    }
  }
}
