// Define types for our enhanced auction platform
export type AuctionType = "forward" | "reverse"

export type ForwardAuctionSubType = "english" | "dutch" | "sealed" | "multi-round" | "silent" | "yankee"
export type ReverseAuctionSubType =
  | "standard"
  | "japanese"
  | "vickrey"
  | "ranked"
  | "tco-based"
  | "sealed-bid"
  | "reverse-clock"
  | "yankee"

export type AuctionSubType = ForwardAuctionSubType | ReverseAuctionSubType

export type ParticipationType = "public" | "verified" | "invite-only"
export type LaunchType = "immediate" | "scheduled"
export type Currency = "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "INR" | "AUD" | "CNY"
export type Language = "en" | "fr" | "es" | "hi" | "de" | "zh" | "ja" | "ar"

// New types for product attributes and classification
export type ProductAttribute = {
  id: string
  name: string
  value: string
  type: "text" | "number" | "select" | "color" | "boolean"
  required: boolean
  options?: string[] // For select type attributes
}

export type ProductCategory = {
  id: string
  name: string
  parentId?: string
  level: number
  subcategories?: ProductCategory[]
}

export type BidIncrementType = "fixed" | "percentage" | "range-based"

export type BidIncrementRule = {
  id: string
  minBidAmount: number
  maxBidAmount?: number
  incrementValue: number
  incrementType: BidIncrementType
}

export interface AuctionDuration {
  days: number
  hours: number
  minutes: number
}

export interface QualificationCriteria {
  id: string
  name: string
  description: string
  required: boolean
}

export interface TermsAndCondition {
  id: string
  title: string
  content: string
  required: boolean
}

export interface LotItem {
  id: string
  name: string
  description: string
  quantity: number
  startPrice: number
  minimumIncrement: number
  images: UploadedFile[]
  documents: UploadedFile[]
  // New product classification fields
  categoryId: string
  subCategoryId?: string
  attributes: ProductAttribute[]
  sku?: string
  brand?: string
  model?: string
}

export interface AuctionTemplate {
  id: string
  name: string
  description: string
  auctionType: AuctionType
  auctionSubType: AuctionSubType
  auctionDuration: AuctionDuration
  currency: Currency
  participationType: ParticipationType
  qualificationCriteria: QualificationCriteria[]
  termsAndConditions: TermsAndCondition[]
  createdAt: string
  isDefault?: boolean
}

export type UploadedFile = {
  id: string
  name: string
  url: string
  size: number
  type: string
  uploadedAt: string
  file: File // For client-side operations
}
export interface AuctionFormData {
  // Step 1: Auction Type
  auctionType: AuctionType
  auctionSubType: AuctionSubType
  templateId?: string

  // Step 2: Product/Lot Details
  isMultiLot: boolean
  productName: string
  productDescription: string
  productImages: UploadedFile[] // Client-side state for rendering
  productDocuments: UploadedFile[]
  lots: LotItem[]
  categoryId: string
  subCategoryId?: string
  attributes: ProductAttribute[]
  sku?: string
  brand?: string
  model?: string

  // Step 3: Bidding Parameters
  startPrice: number
  minimumIncrement: number
  auctionDuration: AuctionDuration
  currency: Currency
  launchType: LaunchType
  scheduledStart: string
  bidExtension: boolean
  bidExtensionTime: number
  allowAutoBidding: boolean
  reservePrice?: number
  bidIncrementType: BidIncrementType
  bidIncrementRules: BidIncrementRule[]
  isSilentAuction: boolean
  percent ?: number | null // For silent auctions, percentage of the start price
  targetprice?: number | null // For reverse auctions, the target price
  requireddocuments?: string // JSON string of required documents, parsed to jsonb in DB
  // Step 4: Participation Rules
  participationType: ParticipationType
  participantEmails: string[]
  qualificationCriteria: QualificationCriteria[]

  // Step 5: Terms & Conditions
  termsAndConditions: TermsAndCondition[]
  enableDispute: boolean

  // Additional Settings
  language: Language
  enableNotifications: boolean
  notificationTypes: string[]
  enableAnalytics: boolean
  productQuantity?: number // For multi-lot auctions
}
// New types for API authentication
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface AuthenticatedUser {
  id: string
  email: string
  role: "admin" | "auctioneer" | "bidder"
  permissions: string[]
}

export interface BidData {
  id: string
  auctionId: string
  bidderId: string
  amount: number
  timestamp: string
  isWinning: boolean
  isVisible: boolean // For silent auctions
}
