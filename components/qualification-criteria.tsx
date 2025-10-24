"use client"

import { useState } from "react"
import { Plus, Trash2, GripVertical } from "lucide-react"
import type { QualificationCriteria } from "@/types/auction-types"

interface QualificationCriteriaProps {
  criteria: QualificationCriteria[]
  onChange: (criteria: QualificationCriteria[]) => void
}

export default function QualificationCriteriaManager({ criteria, onChange }: QualificationCriteriaProps) {
  const [newCriterion, setNewCriterion] = useState<Partial<QualificationCriteria>>({
    name: "",
    description: "",
    required: true,
  })

  const handleAddCriterion = () => {
    if (!newCriterion.name) return

    const newCriteria = [
      ...criteria,
      {
        id: `qc-${Date.now()}`,
        name: newCriterion.name,
        description: newCriterion.description || "",
        required: newCriterion.required || false,
      },
    ]

    onChange(newCriteria)
    setNewCriterion({ name: "", description: "", required: true })
  }

  const handleRemoveCriterion = (id: string) => {
    onChange(criteria.filter((c) => c.id !== id))
  }

  const handleUpdateCriterion = (id: string, field: keyof QualificationCriteria, value: any) => {
    onChange(
      criteria.map((c) => {
        if (c.id === id) {
          return { ...c, [field]: value }
        }
        return c
      }),
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add Qualification Criterion</h3>
        <div className="space-y-3">
          <div>
            <input
              type="text"
              className="form-input"
              placeholder="Criterion Name"
              value={newCriterion.name || ""}
              onChange={(e) => setNewCriterion({ ...newCriterion, name: e.target.value })}
            />
          </div>
          <div>
            <textarea
              className="form-input"
              placeholder="Description (optional)"
              rows={2}
              value={newCriterion.description || ""}
              onChange={(e) => setNewCriterion({ ...newCriterion, description: e.target.value })}
            ></textarea>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="new-criterion-required"
              className="form-checkbox"
              checked={newCriterion.required || false}
              onChange={(e) => setNewCriterion({ ...newCriterion, required: e.target.checked })}
            />
            <label htmlFor="new-criterion-required" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Required for participation
            </label>
          </div>
          <button
            type="button"
            className="btn-primary btn-sm w-full"
            onClick={handleAddCriterion}
            disabled={!newCriterion.name}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Criterion
          </button>
        </div>
      </div>

      {criteria.length > 0 ? (
        <div className="space-y-3">
          {criteria.map((criterion, index) => (
            <div
              key={criterion.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-3 animate-fade-in"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <div className="mr-3 mt-1 cursor-move text-gray-400 dark:text-gray-600">
                    <GripVertical className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center">
                      <input
                        type="text"
                        className="form-input text-sm font-medium"
                        value={criterion.name}
                        onChange={(e) => handleUpdateCriterion(criterion.id, "name", e.target.value)}
                      />
                    </div>
                    <textarea
                      className="form-input mt-2 text-sm"
                      rows={2}
                      value={criterion.description}
                      onChange={(e) => handleUpdateCriterion(criterion.id, "description", e.target.value)}
                      placeholder="Description"
                    ></textarea>
                    <div className="flex items-center mt-2">
                      <input
                        type="checkbox"
                        id={`criterion-required-${criterion.id}`}
                        className="form-checkbox"
                        checked={criterion.required}
                        onChange={(e) => handleUpdateCriterion(criterion.id, "required", e.target.checked)}
                      />
                      <label
                        htmlFor={`criterion-required-${criterion.id}`}
                        className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        Required for participation
                      </label>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-destructive-500 dark:text-destructive-400 hover:text-destructive-700 dark:hover:text-destructive-300 transition-colors-smooth"
                  onClick={() => handleRemoveCriterion(criterion.id)}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
          No qualification criteria added yet
        </div>
      )}
    </div>
  )
}
