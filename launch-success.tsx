"use client"

import { useEffect, useState } from "react"
import { CheckCircle, ArrowRight } from "lucide-react"
import { useTheme } from "./theme-context"

interface LaunchSuccessProps {
  productName: string
  onGoToDashboard: () => void
}

export default function LaunchSuccess({ productName, onGoToDashboard }: LaunchSuccessProps) {
  const [showConfetti, setShowConfetti] = useState(false)
  const [showCheck, setShowCheck] = useState(false)
  const [showMessage, setShowMessage] = useState(false)
  const [showButton, setShowButton] = useState(false)
  const { theme } = useTheme()

  useEffect(() => {
    // Start the animation sequence
    setShowConfetti(true)

    // Sequence the animations
    const checkTimer = setTimeout(() => setShowCheck(true), 300)
    const messageTimer = setTimeout(() => setShowMessage(true), 800)
    const buttonTimer = setTimeout(() => setShowButton(true), 1300)

    return () => {
      clearTimeout(checkTimer)
      clearTimeout(messageTimer)
      clearTimeout(buttonTimer)
    }
  }, [])

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[400px] py-16 px-4 text-center">
      {/* Confetti */}
      {showConfetti && <Confetti />}

      {/* Success Icon */}
      <div
        className={`mb-6 transform transition-all duration-700 ${
          showCheck ? "scale-100 opacity-100" : "scale-0 opacity-0"
        }`}
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-success-100 dark:bg-success-900/30 animate-ping opacity-25"></div>
          <div className="relative bg-success-100 dark:bg-success-900/30 rounded-full p-4">
            <CheckCircle className="w-16 h-16 text-success-600 dark:text-success-500" />
          </div>
        </div>
      </div>

      {/* Success Message */}
      <div
        className={`space-y-4 max-w-md transition-all duration-700 ${
          showMessage ? "opacity-100 transform translate-y-0" : "opacity-0 transform translate-y-10"
        }`}
      >
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Auction Launched!</h2>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          {productName ? `Your auction for "${productName}"` : "Your auction"} has been successfully created and is now
          live.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You can manage your auction, view bids, and communicate with participants from your dashboard.
        </p>
      </div>

      {/* CTA Button */}
      <div
        className={`mt-8 transition-all duration-500 ${
          showButton ? "opacity-100 transform translate-y-0" : "opacity-0 transform translate-y-10"
        }`}
      >
        <button onClick={onGoToDashboard} className="btn-primary btn-lg hover-scale">
          Go to Auction Dashboard
          <ArrowRight className="ml-2 h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

// Enhanced Confetti Component
function Confetti() {
  const { theme } = useTheme()

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 100 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-5%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${Math.random() * 3 + 2}s`,
            backgroundColor:
              theme === "light"
                ? [
                    "#0ea5e9", // Corporate blue
                    "#0c4a6e", // Dark blue
                    "#7dd3fc", // Light blue
                    "#22c55e", // Success green
                    "#f59e0b", // Warning amber
                  ][Math.floor(Math.random() * 5)]
                : [
                    "#38bdf8", // Lighter blue for dark mode
                    "#0ea5e9", // Corporate blue
                    "#7dd3fc", // Light blue
                    "#4ade80", // Lighter green for dark mode
                    "#fbbf24", // Lighter amber for dark mode
                  ][Math.floor(Math.random() * 5)],
            width: `${Math.random() * 10 + 5}px`,
            height: `${Math.random() * 10 + 5}px`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  )
}
