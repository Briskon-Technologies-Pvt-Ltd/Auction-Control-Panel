"use client"

import { useState } from "react"
import { Plus, Trash2, GripVertical } from "lucide-react"
import type { TermsAndCondition } from "@/types/auction-types"

interface TermsAndConditionsProps {
  terms: TermsAndCondition[]
  onChange: (terms: TermsAndCondition[]) => void
}

export default function TermsAndConditionsManager({ terms, onChange }: TermsAndConditionsProps) {
  const [newTerm, setNewTerm] = useState<Partial<TermsAndCondition>>({
    title: "",
    content: "",
    required: true,
  })

  const handleAddTerm = () => {
    if (!newTerm.title || !newTerm.content) return

    const newTerms = [
      ...terms,
      {
        id: `tc-${Date.now()}`,
        title: newTerm.title,
        content: newTerm.content,
        required: newTerm.required || false,
      },
    ]

    onChange(newTerms)
    setNewTerm({ title: "", content: "", required: true })
  }

  const handleRemoveTerm = (id: string) => {
    onChange(terms.filter((t) => t.id !== id))
  }

  const handleUpdateTerm = (id: string, field: keyof TermsAndCondition, value: any) => {
    onChange(
      terms.map((t) => {
        if (t.id === id) {
          return { ...t, [field]: value }
        }
        return t
      }),
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add Terms & Conditions</h3>
        <div className="space-y-3">
          <div>
            <input
              type="text"
              className="form-input"
              placeholder="Title"
              value={newTerm.title || ""}
              onChange={(e) => setNewTerm({ ...newTerm, title: e.target.value })}
            />
          </div>
          <div>
            <textarea
              className="form-input"
              placeholder="Content"
              rows={4}
              value={newTerm.content || ""}
              onChange={(e) => setNewTerm({ ...newTerm, content: e.target.value })}
            ></textarea>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="new-term-required"
              className="form-checkbox"
              checked={newTerm.required || false}
              onChange={(e) => setNewTerm({ ...newTerm, required: e.target.checked })}
            />
            <label htmlFor="new-term-required" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Requires explicit acceptance
            </label>
          </div>
          <button
            type="button"
            className="btn-primary btn-sm w-full"
            onClick={handleAddTerm}
            disabled={!newTerm.title || !newTerm.content}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Terms & Conditions
          </button>
        </div>
      </div>

      {terms.length > 0 ? (
        <div className="space-y-3">
          {terms.map((term) => (
            <div
              key={term.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-3 animate-fade-in"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <div className="mr-3 mt-1 cursor-move text-gray-400 dark:text-gray-600">
                    <GripVertical className="h-5 w-5" />
                  </div>
                  <div className="w-full">
                    <input
                      type="text"
                      className="form-input text-sm font-medium"
                      value={term.title}
                      onChange={(e) => handleUpdateTerm(term.id, "title", e.target.value)}
                    />
                    <textarea
                      className="form-input mt-2 text-sm w-full"
                      rows={4}
                      value={term.content}
                      onChange={(e) => handleUpdateTerm(term.id, "content", e.target.value)}
                    ></textarea>
                    <div className="flex items-center mt-2">
                      <input
                        type="checkbox"
                        id={`term-required-${term.id}`}
                        className="form-checkbox"
                        checked={term.required}
                        onChange={(e) => handleUpdateTerm(term.id, "required", e.target.checked)}
                      />
                      <label
                        htmlFor={`term-required-${term.id}`}
                        className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        Requires explicit acceptance
                      </label>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-destructive-500 dark:text-destructive-400 hover:text-destructive-700 dark:hover:text-destructive-300 transition-colors-smooth"
                  onClick={() => handleRemoveTerm(term.id)}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
          No terms and conditions added yet
        </div>
      )}
    </div>
  )
}
