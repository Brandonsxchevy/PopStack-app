import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  name: string
  email: string
  role: 'USER' | 'DEVELOPER' | 'ADMIN'
  badges: string[]
  avgRating: number | null
  preferredLanguage: string
}

interface AuthState {
  token: string | null
  user: User | null
  hydrated: boolean
  setAuth: (token: string, user: User) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
  isDeveloper: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      hydrated: false,
      setAuth: (token, user) => {
        localStorage.setItem('popstack_token', token)
        set({ token, user })
      },
      clearAuth: () => {
        localStorage.removeItem('popstack_token')
        set({ token: null, user: null })
      },
      isAuthenticated: () => !!get().token,
      isDeveloper: () => get().user?.role === 'DEVELOPER',
    }),
    {
      name: 'popstack_auth',
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true
      },
    }
  )
)
