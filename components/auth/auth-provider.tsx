"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { UserType } from "./login-form"

interface AuthContextType {
  user: UserType | null
  isLoading: boolean
  login: (user: UserType) => void
  logout: () => void
  updateUser: (user: UserType) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserType | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Restore user from localStorage on mount
    const storedUser = localStorage.getItem("auction_user")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const login = (userData: UserType) => {
    setUser(userData)
    localStorage.setItem("auction_user", JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("auction_user")
    localStorage.removeItem("auction_session")
  }

const updateUser = (updated: UserType) => {
  setUser(updated);
};

  const value = {
    user,
    isLoading,
    login,
    logout,
    updateUser,
  }
  console.log("Avatar URL:", user?.avatar);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
