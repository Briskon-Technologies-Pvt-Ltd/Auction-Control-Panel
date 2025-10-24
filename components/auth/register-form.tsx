"use client"

import type React from "react"

import { useState } from "react"
import { Eye, EyeOff, Mail, Lock, Building, AlertCircle, User } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import type { User as AuthUser } from "./login-form"
import type { UserRole } from "./login-form"

interface RegisterFormProps {
  onRegister: (user: AuthUser) => void
  onSwitchToLogin: () => void
}

export default function RegisterForm({ onRegister, onSwitchToLogin }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "auctioneer" as UserRole,
    organization: "",
    agreeToTerms: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    if ((formData.role === "auctioneer" || formData.role === "organization") && !formData.organization.trim()) {
      newErrors.organization = "Organization name is required for this role"
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = "You must agree to the terms and conditions"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

   const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsLoading(true)
    setErrors({})

    try {
      // 1. Register with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: formData.role,
            organization: formData.organization,
          },
        },
      })

      if (error) {
        setErrors({ submit: error.message })
        setIsLoading(false)
        return
      }

      // // 2. Optionally, insert into a "profiles" table for extra info
      // if (data.user) {
      //   await supabase.from("profiles").upsert([
      //     {
      //       id: data.user.id,
      //       email: formData.email,
      //       name: formData.name,
      //       role: formData.role,
      //       organization: formData.organization,
      //       created_at: new Date().toISOString(),
      //     },
      //   ])
      // }

      // 3. Call onRegister with the new user (minimal info)
      onRegister({
        id: data.user?.id ?? "",
        email: formData.email,
        name: formData.name,
        role: formData.role,
        organization: formData.organization,
        isVerified: !!data.user?.email_confirmed_at,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      })
    } catch (err) {
      setErrors({ submit: "Registration failed. Please try again." })
    } finally {
      setIsLoading(false)
    }
  }


  const roleOptions = [
    { value: "auctioneer", label: "Auctioneer", description: "Create and manage auctions" },
    { value: "organization", label: "Organization", description: "Corporate account for bulk operations" },
  ]

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border dark:border-gray-700">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 bg-corporate-100 dark:bg-corporate-900 rounded-full mx-auto mb-4">
            <User className="w-8 h-8 text-corporate-600 dark:text-corporate-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Create Your Account</h1>
          <p className="text-gray-600 dark:text-gray-400">Join the auction platform and start bidding</p>
        </div>

        {errors.submit && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-sm text-red-700 dark:text-red-300">{errors.submit}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="name"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-corporate-500 focus:border-corporate-500 transition-colors ${
                  errors.name ? "border-red-500 dark:border-red-400" : "border-gray-300 dark:border-gray-600"
                }`}
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                id="email"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-corporate-500 focus:border-corporate-500 transition-colors ${
                  errors.email ? "border-red-500 dark:border-red-400" : "border-gray-300 dark:border-gray-600"
                }`}
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            {errors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>}
          </div>

          {/* <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Account Type
            </label>
            <div className="space-y-2">
              {roleOptions.map((option) => (
                <div
                  key={option.value}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    formData.role === option.value
                      ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
                      : "border-gray-300 dark:border-gray-600 hover:border-corporate-300 dark:hover:border-corporate-500"
                  }`}
                  onClick={() => setFormData({ ...formData, role: option.value as UserRole })}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="role"
                      value={option.value}
                      checked={formData.role === option.value}
                      onChange={() => setFormData({ ...formData, role: option.value as UserRole })}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{option.label}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{option.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div> */}

          {(formData.role === "auctioneer" || formData.role === "organization") && (
            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Organization Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="organization"
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-corporate-500 focus:border-corporate-500 transition-colors ${
                    errors.organization ? "border-red-500 dark:border-red-400" : "border-gray-300 dark:border-gray-600"
                  }`}
                  placeholder="Enter your organization name"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                />
              </div>
              {errors.organization && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.organization}</p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                className={`w-full pl-10 pr-12 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-corporate-500 focus:border-corporate-500 transition-colors ${
                  errors.password ? "border-red-500 dark:border-red-400" : "border-gray-300 dark:border-gray-600"
                }`}
                placeholder="Create a password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                className={`w-full pl-10 pr-12 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-corporate-500 focus:border-corporate-500 transition-colors ${
                  errors.confirmPassword ? "border-red-500 dark:border-red-400" : "border-gray-300 dark:border-gray-600"
                }`}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword}</p>
            )}
          </div>

          <div>
            <div className="flex items-start">
              <input
                type="checkbox"
                id="agreeToTerms"
                className="mt-1 mr-3"
                checked={formData.agreeToTerms}
                onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
              />
              <label htmlFor="agreeToTerms" className="text-sm text-gray-700 dark:text-gray-300">
                I agree to the{" "}
                <a href="#" className="text-corporate-600 dark:text-corporate-400 hover:underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-corporate-600 dark:text-corporate-400 hover:underline">
                  Privacy Policy
                </a>
              </label>
            </div>
            {errors.agreeToTerms && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.agreeToTerms}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-corporate-600 hover:bg-corporate-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="font-medium text-corporate-600 dark:text-corporate-400 hover:text-corporate-500 dark:hover:text-corporate-300"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
