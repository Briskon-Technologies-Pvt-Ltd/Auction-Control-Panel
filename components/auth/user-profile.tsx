"use client"

import { useState } from "react"
import { User, LogOut, Shield, Calendar, Building, Mail, Edit2, Save, X } from "lucide-react"
import type { User as UserType } from "./login-form"

interface UserProfileProps {
  user: UserType
  onLogout: () => void
  onUpdateUser: (user: UserType) => void
}

export default function UserProfile({ user, onLogout, onUpdateUser }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedUser, setEditedUser] = useState(user)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Update user in localStorage
      localStorage.setItem("auction_user", JSON.stringify(editedUser))

      onUpdateUser(editedUser)
      setIsEditing(false)
    } catch (error) {
      console.error("Failed to update user:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setEditedUser(user)
    setIsEditing(false)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
      case "auctioneer":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
      case "organization":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
      default:
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 overflow-hidden">
      <div className="bg-gradient-to-r from-corporate-500 to-corporate-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{user.name}</h2>
              <p className="text-corporate-100">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Edit Profile"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                  title="Save Changes"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Cancel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <button
              onClick={onLogout}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
            {isEditing ? (
              <input
                type="text"
                value={editedUser.name}
                onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-corporate-500 focus:border-corporate-500"
              />
            ) : (
              <div className="flex items-center">
                <User className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-gray-900 dark:text-gray-100">{user.name}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
            <div className="flex items-center">
              <Mail className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-gray-900 dark:text-gray-100">{user.email}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Type</label>
            <div className="flex items-center">
              <Shield className="w-4 h-4 text-gray-400 mr-2" />
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
            </div>
          </div>

          {user.organization && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Organization</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedUser.organization || ""}
                  onChange={(e) => setEditedUser({ ...editedUser, organization: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-corporate-500 focus:border-corporate-500"
                />
              ) : (
                <div className="flex items-center">
                  <Building className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-900 dark:text-gray-100">{user.organization}</span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Member Since</label>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-gray-900 dark:text-gray-100">{formatDate(user.createdAt)}</span>
            </div>
          </div>

          {user.lastLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Last Login</label>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-gray-900 dark:text-gray-100">{formatDate(user.lastLogin)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t dark:border-gray-700 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Account Status</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Your account verification and security status</p>
            </div>
            <div className="flex items-center">
              {user.isVerified ? (
                <span className="flex items-center text-green-600 dark:text-green-400">
                  <Shield className="w-4 h-4 mr-1" />
                  Verified
                </span>
              ) : (
                <span className="flex items-center text-yellow-600 dark:text-yellow-400">
                  <Shield className="w-4 h-4 mr-1" />
                  Pending Verification
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
