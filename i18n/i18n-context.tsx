"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { Language } from "@/types/auction-types"
import { getTranslation, type TranslationKey } from "./translations"

interface I18nContextType {
  language: Language
  t: (key: TranslationKey) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

interface I18nProviderProps {
  children: ReactNode
  language: Language
}

export function I18nProvider({ children, language }: I18nProviderProps) {
  const t = (key: TranslationKey): string => {
    return getTranslation(language, key)
  }

  return <I18nContext.Provider value={{ language, t }}>{children}</I18nContext.Provider>
}

export function useTranslation() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error("useTranslation must be used within an I18nProvider")
  }
  return context
}
