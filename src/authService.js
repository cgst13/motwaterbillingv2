import { supabase } from './supabaseClient'

export const authService = {
  // Login function that checks against the users table
  async login(email, password) {
    try {
      // Query the users table for the email
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('status', 'active') // Only allow active users to login
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Invalid email or password')
        }
        throw new Error('Login failed: ' + error.message)
      }

      if (!users) {
        throw new Error('Invalid email or password')
      }

      // For demo purposes, compare passwords directly
      // In production, you should hash passwords on the server side
      const isPasswordValid = password === users.password
      
      if (!isPasswordValid) {
        throw new Error('Invalid email or password')
      }

      // Update last login timestamp
      await supabase
        .from('users')
        .update({ lastlogin: new Date().toISOString() })
        .eq('userid', users.userid)

      // Return user data (excluding password)
      const { password: _, ...userWithoutPassword } = users
      return {
        success: true,
        user: userWithoutPassword
      }

    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  },

  // Store user session in localStorage
  setUserSession(user) {
    localStorage.setItem('user', JSON.stringify(user))
    // Dispatch custom event to notify auth state change
    window.dispatchEvent(new Event('authChange'))
  },

  // Get user session from localStorage
  getUserSession() {
    const user = localStorage.getItem('user')
    return user ? JSON.parse(user) : null
  },

  // Clear user session
  logout() {
    localStorage.removeItem('user')
    // Dispatch custom event to notify auth state change
    window.dispatchEvent(new Event('authChange'))
  },

  // Check if user is authenticated
  isAuthenticated() {
    return this.getUserSession() !== null
  }
}
