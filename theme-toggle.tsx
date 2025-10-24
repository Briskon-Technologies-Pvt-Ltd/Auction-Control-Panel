"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "./theme-context"

interface ThemeToggleProps {
  className?: string
}

export default function ThemeToggle({ className = "" }: ThemeToggleProps) {
  console.log("ThemeToggle rendered")
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-full transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-corporate-500 active-scale ${className}`}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === "light" ? <Moon className="h-5 w-5 text-gray-700" /> : <Sun className="h-5 w-5 text-gray-200" />}
    </button>
  )
}
