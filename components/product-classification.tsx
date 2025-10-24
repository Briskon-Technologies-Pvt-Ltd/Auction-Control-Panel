"use client"

import { useState, useEffect } from "react"
import { Search, Plus, X, ChevronDown } from "lucide-react"
import type { ProductCategory, ProductAttribute } from "@/types/auction-types"
import { PRODUCT_CATEGORIES, getSubcategories, searchCategories } from "@/data/product-categories"
import { getAttributesForCategory, createCustomAttribute } from "@/data/product-attributes"

interface ProductClassificationProps {
  categoryId: string
  subCategoryId?: string
  attributes: ProductAttribute[]
  sku?: string
  brand?: string
  model?: string
  onCategoryChange: (categoryId: string, subCategoryId?: string) => void
  onAttributesChange: (attributes: ProductAttribute[]) => void
  onSkuChange: (sku: string) => void
  onBrandChange: (brand: string) => void
  onModelChange: (model: string) => void
}

export default function ProductClassification({
  categoryId,
  subCategoryId,
  attributes,
  sku,
  brand,
  model,
  onCategoryChange,
  onAttributesChange,
  onSkuChange,
  onBrandChange,
  onModelChange,
}: ProductClassificationProps) {
  const [categorySearch, setCategorySearch] = useState("")
  const [subCategorySearch, setSubCategorySearch] = useState("")
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [showSubCategoryDropdown, setShowSubCategoryDropdown] = useState(false)
  const [showCustomAttributeForm, setShowCustomAttributeForm] = useState(false)
  const [customAttributeName, setCustomAttributeName] = useState("")
  const [customAttributeType, setCustomAttributeType] = useState<ProductAttribute["type"]>("text")
  const [customAttributeRequired, setCustomAttributeRequired] = useState(false)

  // Filter categories based on search
  const filteredCategories = categorySearch ? searchCategories(categorySearch) : PRODUCT_CATEGORIES

  // Get subcategories for selected category
  const subcategories = categoryId ? getSubcategories(categoryId) : []

  // Filter subcategories based on search
  const filteredSubcategories = subCategorySearch
    ? subcategories.filter((sub) => sub.name.toLowerCase().includes(subCategorySearch.toLowerCase()))
    : subcategories

  // Load default attributes when category changes
  useEffect(() => {
    if (categoryId || subCategoryId) {
      const targetCategoryId = subCategoryId || categoryId
      const defaultAttributes = getAttributesForCategory(targetCategoryId)

      // Merge with existing custom attributes
      const existingCustomAttributes = attributes.filter((attr) => attr.id.startsWith("custom-"))
      const mergedAttributes = [
        ...defaultAttributes.map((attr) => {
          const existing = attributes.find((a) => a.id === attr.id)
          return existing ? { ...attr, value: existing.value } : attr
        }),
        ...existingCustomAttributes,
      ]

      onAttributesChange(mergedAttributes)
    }
  }, [categoryId, subCategoryId])

  const handleCategorySelect = (category: ProductCategory) => {
    onCategoryChange(category.id, undefined)
    setCategorySearch(category.name)
    setShowCategoryDropdown(false)
    setSubCategorySearch("")
  }

  const handleSubCategorySelect = (subCategory: ProductCategory) => {
    onCategoryChange(categoryId, subCategory.id)
    setSubCategorySearch(subCategory.name)
    setShowSubCategoryDropdown(false)
  }

  const handleAttributeChange = (attributeId: string, value: string) => {
    const updatedAttributes = attributes.map((attr) => (attr.id === attributeId ? { ...attr, value } : attr))
    onAttributesChange(updatedAttributes)
  }

  const handleAddCustomAttribute = () => {
    if (!customAttributeName.trim()) return

    const newAttribute = createCustomAttribute(customAttributeName, customAttributeType, customAttributeRequired)

    onAttributesChange([...attributes, newAttribute])

    // Reset form
    setCustomAttributeName("")
    setCustomAttributeType("text")
    setCustomAttributeRequired(false)
    setShowCustomAttributeForm(false)
  }

  const handleRemoveCustomAttribute = (attributeId: string) => {
    const updatedAttributes = attributes.filter((attr) => attr.id !== attributeId)
    onAttributesChange(updatedAttributes)
  }

  const renderAttributeInput = (attribute: ProductAttribute) => {
    switch (attribute.type) {
      case "select":
        return (
          <select
            className="form-select"
            value={attribute.value}
            onChange={(e) => handleAttributeChange(attribute.id, e.target.value)}
            required={attribute.required}
          >
            <option value="">Select {attribute.name}</option>
            {attribute.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )

      case "boolean":
        return (
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name={attribute.id}
                value="true"
                checked={attribute.value === "true"}
                onChange={(e) => handleAttributeChange(attribute.id, e.target.value)}
                className="form-radio"
              />
              <span className="ml-2">Yes</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name={attribute.id}
                value="false"
                checked={attribute.value === "false"}
                onChange={(e) => handleAttributeChange(attribute.id, e.target.value)}
                className="form-radio"
              />
              <span className="ml-2">No</span>
            </label>
          </div>
        )

      case "color":
        return (
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={attribute.value || "#000000"}
              onChange={(e) => handleAttributeChange(attribute.id, e.target.value)}
              className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
            />
            <input
              type="text"
              value={attribute.value}
              onChange={(e) => handleAttributeChange(attribute.id, e.target.value)}
              placeholder="Color name or hex code"
              className="form-input flex-1"
              required={attribute.required}
            />
          </div>
        )

      case "number":
        return (
          <input
            type="number"
            value={attribute.value}
            onChange={(e) => handleAttributeChange(attribute.id, e.target.value)}
            placeholder={`Enter ${attribute.name.toLowerCase()}`}
            className="form-input"
            required={attribute.required}
          />
        )

      default:
        return (
          <input
            type="text"
            value={attribute.value}
            onChange={(e) => handleAttributeChange(attribute.id, e.target.value)}
            placeholder={`Enter ${attribute.name.toLowerCase()}`}
            className="form-input"
            required={attribute.required}
          />
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Product Identification */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">Product Identification</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              SKU / Product Code
            </label>
            <input
              type="text"
              value={sku || ""}
              onChange={(e) => onSkuChange(e.target.value)}
              placeholder="Enter SKU or product code"
              className="form-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Brand</label>
            <input
              type="text"
              value={brand || ""}
              onChange={(e) => onBrandChange(e.target.value)}
              placeholder="Enter brand name"
              className="form-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Model</label>
            <input
              type="text"
              value={model || ""}
              onChange={(e) => onModelChange(e.target.value)}
              placeholder="Enter model name/number"
              className="form-input"
            />
          </div>
        </div>
      </div>

      {/* Category Selection */}
      <div>
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">Product Classification</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Main Category */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category <span className="text-destructive-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => {
                  setCategorySearch(e.target.value)
                  setShowCategoryDropdown(true)
                }}
                onFocus={() => setShowCategoryDropdown(true)}
                placeholder="Search or select category"
                className="form-input pr-10"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            {showCategoryDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredCategories.map((category) => (
                  <div
                    key={category.id}
                    className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => handleCategorySelect(category)}
                  >
                    <div className="font-medium dark:text-gray-100">{category.name}</div>
                  </div>
                ))}
                {filteredCategories.length === 0 && (
                  <div className="px-3 py-2 text-gray-500 dark:text-gray-400">No categories found</div>
                )}
              </div>
            )}
          </div>

          {/* Sub Category */}
          {categoryId && subcategories.length > 0 && (
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sub-Category</label>
              <div className="relative">
                <input
                  type="text"
                  value={subCategorySearch}
                  onChange={(e) => {
                    setSubCategorySearch(e.target.value)
                    setShowSubCategoryDropdown(true)
                  }}
                  onFocus={() => setShowSubCategoryDropdown(true)}
                  placeholder="Search or select sub-category"
                  className="form-input pr-10"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              {showSubCategoryDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredSubcategories.map((subCategory) => (
                    <div
                      key={subCategory.id}
                      className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => handleSubCategorySelect(subCategory)}
                    >
                      <div className="font-medium dark:text-gray-100">{subCategory.name}</div>
                    </div>
                  ))}
                  {filteredSubcategories.length === 0 && (
                    <div className="px-3 py-2 text-gray-500 dark:text-gray-400">No sub-categories found</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Product Attributes */}
      {attributes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">Product Attributes</h3>
            <button type="button" onClick={() => setShowCustomAttributeForm(true)} className="btn-secondary btn-sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Custom Attribute
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attributes.map((attribute) => (
              <div key={attribute.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {attribute.name}
                    {attribute.required && <span className="text-destructive-500 ml-1">*</span>}
                  </label>
                  {attribute.id.startsWith("custom-") && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomAttribute(attribute.id)}
                      className="text-destructive-500 hover:text-destructive-700 dark:text-destructive-400 dark:hover:text-destructive-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {renderAttributeInput(attribute)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Attribute Form */}
      {showCustomAttributeForm && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-medium text-gray-800 dark:text-gray-100 mb-3">Add Custom Attribute</h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Attribute Name</label>
              <input
                type="text"
                value={customAttributeName}
                onChange={(e) => setCustomAttributeName(e.target.value)}
                placeholder="Enter attribute name"
                className="form-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select
                value={customAttributeType}
                onChange={(e) => setCustomAttributeType(e.target.value as ProductAttribute["type"])}
                className="form-select"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="select">Select</option>
                <option value="color">Color</option>
                <option value="boolean">Yes/No</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="customAttributeRequired"
                checked={customAttributeRequired}
                onChange={(e) => setCustomAttributeRequired(e.target.checked)}
                className="form-checkbox"
              />
              <label htmlFor="customAttributeRequired" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Required
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button type="button" onClick={() => setShowCustomAttributeForm(false)} className="btn-secondary btn-sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddCustomAttribute}
              disabled={!customAttributeName.trim()}
              className="btn-primary btn-sm"
            >
              Add Attribute
            </button>
          </div>
        </div>
      )}

      {/* Click outside handlers */}
      {showCategoryDropdown && <div className="fixed inset-0 z-0" onClick={() => setShowCategoryDropdown(false)} />}
      {showSubCategoryDropdown && (
        <div className="fixed inset-0 z-0" onClick={() => setShowSubCategoryDropdown(false)} />
      )}
    </div>
  )
}
