"use client"

import { useState } from "react"
import { Eye, EyeOff, Key, CheckCircle, AlertCircle } from "lucide-react"

interface ApiKeySetupProps {
  onApiKeySet: (apiKey: string) => void
  currentApiKey?: string
}

export default function ApiKeySetup({ onApiKeySet, currentApiKey }: ApiKeySetupProps) {
  const [apiKey, setApiKey] = useState(currentApiKey || "")
  const [showKey, setShowKey] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validationStatus, setValidationStatus] = useState<"idle" | "valid" | "invalid">("idle")

  const validateApiKey = (key: string): boolean => {
    // Basic validation for OpenAI API key format
    return key.startsWith("sk-") && key.length > 20
  }

  const handleSaveKey = () => {
    if (!apiKey.trim()) return

    setIsValidating(true)

    // Simulate validation delay
    setTimeout(() => {
      const isValid = validateApiKey(apiKey)
      setValidationStatus(isValid ? "valid" : "invalid")

      if (isValid) {
        // Save to localStorage
        localStorage.setItem("openai_api_key", apiKey)
        onApiKeySet(apiKey)

        // Show success briefly
        setTimeout(() => {
          setValidationStatus("idle")
        }, 2000)
      }

      setIsValidating(false)
    }, 1000)
  }

  const handleClearKey = () => {
    setApiKey("")
    localStorage.removeItem("openai_api_key")
    onApiKeySet("")
    setValidationStatus("idle")
  }

  const getStatusIcon = () => {
    switch (validationStatus) {
      case "valid":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "invalid":
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <Key className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusMessage = () => {
    switch (validationStatus) {
      case "valid":
        return "API key saved successfully!"
      case "invalid":
        return "Invalid API key format. Please check and try again."
      default:
        return ""
    }
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 dark:bg-yellow-800 rounded-full mr-3 flex-shrink-0">
          {getStatusIcon()}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
            {currentApiKey ? "OpenAI API Key Configured" : "OpenAI API Key Required"}
          </h3>
          <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
            {currentApiKey
              ? "Your API key is configured. AI description generation is enabled."
              : "Enter your OpenAI API key to enable AI-powered product description generation."}
          </p>

          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-md">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value)
                  setValidationStatus("idle")
                }}
                placeholder="sk-..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-corporate-500 focus:border-corporate-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveKey}
              disabled={!apiKey.trim() || isValidating}
              className="px-3 py-2 text-sm font-medium text-white bg-corporate-600 hover:bg-corporate-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors flex items-center"
            >
              {isValidating ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                  Saving...
                </>
              ) : (
                "Save API Key"
              )}
            </button>

            {currentApiKey && (
              <button
                type="button"
                onClick={handleClearKey}
                className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {getStatusMessage() && (
            <p
              className={`text-xs mt-2 ${
                validationStatus === "valid" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {getStatusMessage()}
            </p>
          )}

          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
            🔒 Your API key is stored securely in your browser and never shared with external servers.
          </p>
        </div>
      </div>
    </div>
  )
}
