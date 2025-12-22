// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Auth Store (Zustand)
// ═══════════════════════════════════════════════════════════════════════════════

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../utils/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      admin: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      // Login
      login: async (email, password) => {
        try {
          const response = await api.post('/auth/login', { email, password })
          const { token, admin } = response.data
          
          set({
            admin,
            token,
            isAuthenticated: true,
            isLoading: false
          })
          
          // Set token for API calls
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          
          return { success: true }
        } catch (error) {
          return {
            success: false,
            message: error.response?.data?.message || 'Giriş başarısız'
          }
        }
      },

      // Logout
      logout: () => {
        set({
          admin: null,
          token: null,
          isAuthenticated: false,
          isLoading: false
        })
        delete api.defaults.headers.common['Authorization']
      },

      // Check Auth on App Load
      checkAuth: async () => {
        const { token } = get()
        
        if (!token) {
          set({ isLoading: false })
          return
        }
        
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          const response = await api.get('/auth/me')
          
          set({
            admin: response.data.admin,
            isAuthenticated: true,
            isLoading: false
          })
        } catch (error) {
          set({
            admin: null,
            token: null,
            isAuthenticated: false,
            isLoading: false
          })
          delete api.defaults.headers.common['Authorization']
        }
      },

      // Update Profile
      updateProfile: async (data) => {
        try {
          const response = await api.put('/auth/profile', data)
          set({ admin: response.data.admin })
          return { success: true }
        } catch (error) {
          return {
            success: false,
            message: error.response?.data?.message || 'Güncelleme başarısız'
          }
        }
      },

      // Change Password
      changePassword: async (currentPassword, newPassword) => {
        try {
          await api.put('/auth/password', { currentPassword, newPassword })
          return { success: true }
        } catch (error) {
          return {
            success: false,
            message: error.response?.data?.message || 'Şifre değiştirilemedi'
          }
        }
      },

      setLoading: (loading) => set({ isLoading: loading })
    }),
    {
      name: 'olimpiyat-auth',
      partialize: (state) => ({
        token: state.token,
        admin: state.admin,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

// Initialize auth check
if (typeof window !== 'undefined') {
  useAuthStore.getState().checkAuth()
}

