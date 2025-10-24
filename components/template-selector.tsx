"use client"

import { useState } from "react"
import { CheckCircle, Clock, Users, FileText, Plus, Search } from "lucide-react"
import type { AuctionTemplate } from "@/types/auction-types"

// Mock templates data - in a real app, this would come from an API
const mockTemplates: AuctionTemplate[] = [
  {
    id: "template-1",
    name: "Standard Forward Auction",
    description: "English auction format with ascending price bidding",
    auctionType: "forward",
    auctionSubType: "english",
    auctionDuration: { days: 3, hours: 0, minutes: 0 },
    currency: "USD",
    participationType: "public",
    qualificationCriteria: [],
    termsAndConditions: [
      {
        id: "tc-1",
        title: "Standard Terms",
        content: "By participating in this auction, you agree to the standard terms and conditions.",
        required: true,
      },
    ],
    createdAt: new Date().toISOString(),
    isDefault: true,
  },
  {
    id: "template-2",
    name: "Quick Reverse Auction",
    description: "Standard reverse auction for procurement",
    auctionType: "reverse",
    auctionSubType: "standard",
    auctionDuration: { days: 1, hours: 0, minutes: 0 },
    currency: "USD",
    participationType: "verified",
    qualificationCriteria: [
      {
        id: "qc-1",
        name: "Business Registration",
        description: "Must have valid business registration",
        required: true,
      },
    ],
    termsAndConditions: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: "template-3",
    name: "Sealed Bid Auction",
    description: "Confidential bidding with single submission",
    auctionType: "forward",
    auctionSubType: "sealed",
    auctionDuration: { days: 5, hours: 0, minutes: 0 },
    currency: "EUR",
    participationType: "invite-only",
    qualificationCriteria: [],
    termsAndConditions: [],
    createdAt: new Date().toISOString(),
  },
]

interface TemplateSelectorProps {
  onSelectTemplate: (template: AuctionTemplate) => void
  onCreateNew: () => void
}

export default function TemplateSelector({ onSelectTemplate, onCreateNew }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<AuctionTemplate[]>(mockTemplates)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  // Filter templates based on search query
  const filteredTemplates = templates.filter(
    (template) =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleSelectTemplate = (template: AuctionTemplate) => {
    setSelectedTemplateId(template.id)
    onSelectTemplate(template)
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        </div>
        <input
          type="text"
          className="form-input pl-10"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Create New Template Card */}
        <div
          className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-corporate-400 dark:hover:border-corporate-500 transition-colors-smooth hover-scale"
          onClick={onCreateNew}
        >
          <div className="w-12 h-12 rounded-full bg-corporate-100 dark:bg-corporate-900/30 flex items-center justify-center mb-4">
            <Plus className="h-6 w-6 text-corporate-600 dark:text-corporate-400" />
          </div>
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Create New Auction</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Start from scratch with a custom auction configuration
          </p>
        </div>

        {/* Template Cards */}
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className={`border rounded-lg p-6 cursor-pointer transition-all-smooth hover-scale ${
              selectedTemplateId === template.id
                ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
                : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
            }`}
            onClick={() => handleSelectTemplate(template)}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">{template.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{template.description}</p>
              </div>
              {selectedTemplateId === template.id && (
                <CheckCircle className="h-5 w-5 text-corporate-500 dark:text-corporate-400" />
              )}
            </div>

            <div className="space-y-2 mt-4">
              <div className="flex items-center text-sm">
                <div
                  className={`w-3 h-3 rounded-full mr-2 ${
                    template.auctionType === "forward"
                      ? "bg-success-500 dark:bg-success-400"
                      : "bg-warning-500 dark:bg-warning-400"
                  }`}
                ></div>
                <span className="text-gray-700 dark:text-gray-300 capitalize">
                  {template.auctionType} - {template.auctionSubType.replace("-", " ")}
                </span>
              </div>

              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Clock className="h-4 w-4 mr-2" />
                <span>
                  {template.auctionDuration.days}d {template.auctionDuration.hours}h
                </span>
              </div>

              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Users className="h-4 w-4 mr-2" />
                <span className="capitalize">{template.participationType.replace("-", " ")}</span>
              </div>

              {template.termsAndConditions.length > 0 && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <FileText className="h-4 w-4 mr-2" />
                  <span>{template.termsAndConditions.length} terms & conditions</span>
                </div>
              )}
            </div>

            {template.isDefault && (
              <div className="mt-4 inline-block px-2 py-1 bg-corporate-100 dark:bg-corporate-900/30 text-corporate-800 dark:text-corporate-200 text-xs rounded-full">
                Default Template
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && searchQuery && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No templates found matching "{searchQuery}"</p>
        </div>
      )}
    </div>
  )
}
