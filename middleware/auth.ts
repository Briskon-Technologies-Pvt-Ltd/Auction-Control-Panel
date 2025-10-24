import { type NextRequest, NextResponse } from "next/server"
import type { AuthenticatedUser } from "@/types/auction-types"

/**
 * Authentication middleware for API routes
 * Validates API keys and JWT tokens
 */

// Mock user database - in production, this would be a real database
const MOCK_USERS: Record<string, AuthenticatedUser> = {
  api_key_admin_123: {
    id: "admin-1",
    email: "admin@auction.com",
    role: "admin",
    permissions: ["create_auction", "manage_users", "view_all_bids", "manage_platform"],
  },
  api_key_auctioneer_456: {
    id: "auctioneer-1",
    email: "auctioneer@auction.com",
    role: "auctioneer",
    permissions: ["create_auction", "manage_own_auctions", "view_own_bids"],
  },
  api_key_bidder_789: {
    id: "bidder-1",
    email: "bidder@auction.com",
    role: "bidder",
    permissions: ["place_bid", "view_public_auctions"],
  },
}

/**
 * Validates API key and returns user information
 */
export function validateApiKey(apiKey: string): AuthenticatedUser | null {
  return MOCK_USERS[apiKey] || null
}

/**
 * Validates JWT token (mock implementation)
 * In production, this would verify the JWT signature and decode the payload
 */
export function validateJwtToken(token: string): AuthenticatedUser | null {
  try {
    // Mock JWT validation - in production, use a proper JWT library
    if (token.startsWith("jwt_")) {
      const userId = token.replace("jwt_", "")
      // Find user by ID in your database
      const user = Object.values(MOCK_USERS).find((u) => u.id === userId)
      return user || null
    }
    return null
  } catch (error) {
    return null
  }
}

/**
 * Checks if user has required permission
 */
export function hasPermission(user: AuthenticatedUser, permission: string): boolean {
  return user.permissions.includes(permission) || user.role === "admin"
}

/**
 * Authentication middleware function
 */
export function withAuth(
  handler: (req: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>,
  requiredPermission?: string,
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Extract authentication token from headers
      const authHeader = req.headers.get("authorization")
      const apiKey = req.headers.get("x-api-key")

      let user: AuthenticatedUser | null = null

      // Try API key authentication first
      if (apiKey) {
        user = validateApiKey(apiKey)
      }

      // Try JWT token authentication
      if (!user && authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7)
        user = validateJwtToken(token)
      }

      // If no valid authentication found
      if (!user) {
        return NextResponse.json(
          { success: false, error: "Unauthorized - Invalid or missing authentication" },
          { status: 401 },
        )
      }

      // Check required permission if specified
      if (requiredPermission && !hasPermission(user, requiredPermission)) {
        return NextResponse.json({ success: false, error: "Forbidden - Insufficient permissions" }, { status: 403 })
      }

      // Call the actual handler with authenticated user
      return await handler(req, user)
    } catch (error) {
      console.error("Authentication middleware error:", error)
      return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
    }
  }
}

/**
 * Rate limiting middleware (basic implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  maxRequests = 100,
  windowMs: number = 15 * 60 * 1000, // 15 minutes
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const clientIp = req.ip || req.headers.get("x-forwarded-for") || "unknown"
    const now = Date.now()

    const clientData = rateLimitMap.get(clientIp)

    if (!clientData || now > clientData.resetTime) {
      // Reset or initialize rate limit for this client
      rateLimitMap.set(clientIp, {
        count: 1,
        resetTime: now + windowMs,
      })
      return await handler(req)
    }

    if (clientData.count >= maxRequests) {
      return NextResponse.json({ success: false, error: "Rate limit exceeded" }, { status: 429 })
    }

    // Increment request count
    clientData.count++

    return await handler(req)
  }
}
