"use client"

import { useState } from "react"
import { Plus, Trash2, ImageIcon, FileText, ChevronDown, ChevronUp } from "lucide-react"
import type { LotItem, UploadedFile, Currency } from "@/types/auction-types"
import FileUploader from "./file-uploader"

interface LotManagerProps {
  lots: LotItem[]
  onChange: (lots: LotItem[]) => void
  currency: Currency
}

export default function LotManager({ lots, onChange, currency }: LotManagerProps) {
  const [expandedLotId, setExpandedLotId] = useState<string | null>(null)

  const handleAddLot = () => {
    const newLot: LotItem = {
      id: `lot-${Date.now()}`,
      name: `Lot ${lots.length + 1}`,
      description: "",
      quantity: 1,
      startPrice: 0,
      minimumIncrement: 0,
      images: [],
      documents: [],
    }

    onChange([...lots, newLot])
    setExpandedLotId(newLot.id)
  }

  const handleRemoveLot = (id: string) => {
    onChange(lots.filter((lot) => lot.id !== id))
    if (expandedLotId === id) {
      setExpandedLotId(null)
    }
  }

  const handleUpdateLot = (id: string, field: keyof LotItem, value: any) => {
    onChange(
      lots.map((lot) => {
        if (lot.id === id) {
          return { ...lot, [field]: value }
        }
        return lot
      }),
    )
  }

  const handleImagesUploaded = (lotId: string, newImages: UploadedFile[]) => {
    onChange(
      lots.map((lot) => {
        if (lot.id === lotId) {
          return {
            ...lot,
            images: [...lot.images, ...newImages],
          }
        }
        return lot
      }),
    )
  }

  const handleDocumentsUploaded = (lotId: string, newDocuments: UploadedFile[]) => {
    onChange(
      lots.map((lot) => {
        if (lot.id === lotId) {
          return {
            ...lot,
            documents: [...lot.documents, ...newDocuments],
          }
        }
        return lot
      }),
    )
  }

  const handleImageRemoved = (lotId: string, fileId: string) => {
    onChange(
      lots.map((lot) => {
        if (lot.id === lotId) {
          return {
            ...lot,
            images: lot.images.filter((img) => img.id !== fileId),
          }
        }
        return lot
      }),
    )
  }

  const handleDocumentRemoved = (lotId: string, fileId: string) => {
    onChange(
      lots.map((lot) => {
        if (lot.id === lotId) {
          return {
            ...lot,
            documents: lot.documents.filter((doc) => doc.id !== fileId),
          }
        }
        return lot
      }),
    )
  }

  const toggleLotExpansion = (id: string) => {
    setExpandedLotId(expandedLotId === id ? null : id)
  }

  const getCurrencySymbol = (currency: Currency) => {
    switch (currency) {
      case "USD":
        return "$"
      case "EUR":
        return "€"
      case "GBP":
        return "£"
      case "JPY":
        return "¥"
      case "INR":
        return "₹"
      case "AUD":
        return "A$"
      case "CAD":
        return "C$"
      case "CNY":
        return "¥"
      default:
        return "$"
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" className="btn-primary btn-sm" onClick={handleAddLot}>
          <Plus className="h-4 w-4 mr-1" />
          Add Lot
        </button>
      </div>

      {lots.length > 0 ? (
        <div className="space-y-3">
          {lots.map((lot) => (
            <div
              key={lot.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md animate-fade-in"
            >
              <div
                className="p-3 flex items-center justify-between cursor-pointer"
                onClick={() => toggleLotExpansion(lot.id)}
              >
                <div className="flex items-center">
                  <div className="font-medium dark:text-gray-200">{lot.name}</div>
                  <div className="ml-4 text-sm text-gray-500 dark:text-gray-400">
                    {getCurrencySymbol(currency)}
                    {lot.startPrice.toFixed(2)}
                  </div>
                  <div className="ml-4 flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <ImageIcon className="h-4 w-4 mr-1" />
                    {lot.images.length}
                  </div>
                  <div className="ml-3 flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <FileText className="h-4 w-4 mr-1" />
                    {lot.documents.length}
                  </div>
                </div>
                <div className="flex items-center">
                  <button
                    type="button"
                    className="text-destructive-500 dark:text-destructive-400 hover:text-destructive-700 dark:hover:text-destructive-300 transition-colors-smooth mr-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveLot(lot.id)
                    }}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                  {expandedLotId === lot.id ? (
                    <ChevronUp className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  )}
                </div>
              </div>

              {expandedLotId === lot.id && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Lot Name <span className="text-destructive-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={lot.name}
                      onChange={(e) => handleUpdateLot(lot.id, "name", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description <span className="text-destructive-500">*</span>
                    </label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={lot.description}
                      onChange={(e) => handleUpdateLot(lot.id, "description", e.target.value)}
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Quantity <span className="text-destructive-500">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        min="1"
                        value={lot.quantity}
                        onChange={(e) => handleUpdateLot(lot.id, "quantity", Number(e.target.value))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Start Price <span className="text-destructive-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 dark:text-gray-400 sm:text-sm">
                            {getCurrencySymbol(currency)}
                          </span>
                        </div>
                        <input
                          type="number"
                          className="form-input pl-7"
                          min="0"
                          step="0.01"
                          value={lot.startPrice}
                          onChange={(e) => handleUpdateLot(lot.id, "startPrice", Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Minimum Increment <span className="text-destructive-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 dark:text-gray-400 sm:text-sm">
                            {getCurrencySymbol(currency)}
                          </span>
                        </div>
                        <input
                          type="number"
                          className="form-input pl-7"
                          min="0"
                          step="0.01"
                          value={lot.minimumIncrement}
                          onChange={(e) => handleUpdateLot(lot.id, "minimumIncrement", Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Lot Images
                    </label>
                    <FileUploader
                      accept="image/*"
                      maxFiles={10}
                      maxSize={10 * 1024 * 1024} // 10MB
                      uploadedFiles={lot.images}
                      onFilesUploaded={(files) => handleImagesUploaded(lot.id, files)}
                      onFileRemoved={(fileId) => handleImageRemoved(lot.id, fileId)}
                      type="image"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Lot Documents
                    </label>
                    <FileUploader
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                      maxFiles={10}
                      maxSize={10 * 1024 * 1024} // 10MB
                      uploadedFiles={lot.documents}
                      onFilesUploaded={(files) => handleDocumentsUploaded(lot.id, files)}
                      onFileRemoved={(fileId) => handleDocumentRemoved(lot.id, fileId)}
                      type="document"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
          No lots added yet. Click "Add Lot" to create your first lot.
        </div>
      )}
    </div>
  )
}
