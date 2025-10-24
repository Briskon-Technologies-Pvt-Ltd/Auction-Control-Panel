"use client"

import type React from "react"

import { useAuth } from "./auth-provider"
import LoginForm from "./login-form"
import RegisterForm from "./register-form"
import { useState } from "react"

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: string[]
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { user, isLoading, login } = useAuth()
  const [showRegister, setShowRegister] = useState(false)  
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-corporate-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        {showRegister ? (
          <RegisterForm onRegister={login} onSwitchToLogin={() => setShowRegister(false)} />
        ) : (
          <LoginForm onLogin={login} onSwitchToRegister={() => setShowRegister(true)} />
        )}
      </div>
    )
  }

  if (requiredRole && !requiredRole.includes(user?.role || "")) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">You don't have permission to access this page.</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Required role: {requiredRole.join(" or ")} | Your role: {user.role}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
