import { type NextRequest, NextResponse } from "next/server";
import { withAuth, withRateLimit } from "@/middleware/auth";
import type { AuctionFormData, ApiResponse } from "@/types/auction-types";
import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabaseClient";
import { keysToLowerCase } from "@/utils/misc";

// GET /api/auctions
export async function getAllTheAuctions() {
  const { data, error } = await supabase
    .from("auctions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, data });
}

// POST /api/auctions
export async function createASingleAuction(req: Request) {
  const body = await req.json();
  const { data, error } = await supabase
    .from("auctions")
    .insert([body])
    .select();
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, data: data[0] }, { status: 201 });
}

/**
 * GET /api/auctions - Get all auctions (with filtering)
 */
async function getAuctions(req: NextRequest, user: any): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "10000");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const auctionType = searchParams.get("auctionType");

    const { data, error } = await supabase
      .from("auctions")
      .select("*")
      .order("createdat", { ascending: false });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    const mockAuctions = data || [];

    // Apply filters
    let filteredAuctions = mockAuctions;

    if (category) {
      filteredAuctions = filteredAuctions.filter((auction) => auction.categoryId === category);
    }

    if (status) {
      filteredAuctions = filteredAuctions.filter((auction) => auction.status === status);
    }

    if (auctionType) {
      filteredAuctions = filteredAuctions.filter((auction) => auction.auctionType === auctionType);
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAuctions = filteredAuctions.slice(startIndex, endIndex);

    const response: ApiResponse = {
      success: true,
      data: {
        auctions: paginatedAuctions,
        pagination: {
          page,
          limit,
          total: filteredAuctions.length,
          totalPages: Math.ceil(filteredAuctions.length / limit),
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching auctions:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch auctions" }, { status: 500 });
  }
}

/**
 * POST /api/auctions - Create a new auction
 */
async function createAuction(req: NextRequest, user: any): Promise<NextResponse> {
  try {
    const auctionData: AuctionFormData = await req.json();
    const { searchParams } = new URL(req.url);
    const createdBy = searchParams.get("user");

    // Validate required fields
    if (!auctionData.auctionType || !auctionData.auctionSubType) {
      return NextResponse.json({ success: false, error: "Auction type and subtype are required" }, { status: 400 });
    }

    if (!auctionData.productName && !auctionData.isMultiLot) {
      return NextResponse.json(
        { success: false, error: "Product name is required for single lot auctions" },
        { status: 400 }
      );
    }

    if (auctionData.isMultiLot && auctionData.lots.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one lot is required for multi-lot auctions" },
        { status: 400 }
      );
    }

    // Validate reverse auction-specific fields
    if (auctionData.auctionType === "reverse") {
      if (typeof auctionData.targetprice !== "number" || auctionData.targetprice <= 0) {
        return NextResponse.json(
          { success: false, error: "Target price is required and must be a positive number for reverse auctions" },
          { status: 400 }
        );
      }
      if (!auctionData.requireddocuments || typeof auctionData.requireddocuments !== "string") {
        return NextResponse.json(
          { success: false, error: "Required documents must be provided as a JSON string for reverse auctions" },
          { status: 400 }
        );
      }
      try {
        const docs = JSON.parse(auctionData.requireddocuments);
        if (!Array.isArray(docs) || !docs.every(doc => typeof doc === "object" && doc.name)) {
          return NextResponse.json(
            { success: false, error: "Required documents must be a valid JSON array of objects with a 'name' field" },
            { status: 400 }
          );
        }
      } catch (e) {
        return NextResponse.json(
          { success: false, error: "Invalid JSON format for required documents" },
          { status: 400 }
        );
      }
    }

    // Special case: Yankee auction
    if (auctionData.auctionSubType === "yankee") {
      if (!auctionData.productQuantity || auctionData.productQuantity < 2) {
        return NextResponse.json(
          { success: false, error: "Quantity must be at least 2 for Yankee auctions" },
          { status: 400 }
        );
      }
      // Remove bid increment rules and types
      auctionData.bidIncrementType = 'fixed';
      auctionData.minimumIncrement = 0;
      auctionData.bidIncrementRules = [];
    } else {
      // Validate bid increment rules if not Yankee
      if (auctionData.bidIncrementType === "range-based" && auctionData.bidIncrementRules.length === 0) {
        return NextResponse.json(
          { success: false, error: "At least one bid increment rule is required for range-based auctions" },
          { status: 400 }
        );
      }

      if (auctionData.bidIncrementType === "fixed") {
        const fixedRule = auctionData.bidIncrementRules[0];
        if (!fixedRule || !fixedRule.incrementValue || fixedRule.incrementValue <= 0) {
          return NextResponse.json(
            { success: false, error: "Minimum increment must be a positive number for fixed type" },
            { status: 400 }
          );
        }
      } else if (auctionData.bidIncrementType === "percentage") {
        const percentageRule = auctionData.bidIncrementRules[0];
        if (!percentageRule || !percentageRule.incrementValue || percentageRule.incrementValue < 0.1 || percentageRule.incrementValue > 100) {
          return NextResponse.json(
            { success: false, error: "Percentage increment must be between 0.1% and 100%" },
            { status: 400 }
          );
        }
      }
    }

    // Generate auction ID
    const auctionId = randomUUID();
    const productImageUrls = auctionData.productImages?.map((img) => img.url) || [];
    const createdAt = new Date().toISOString();

    let scheduledstart: string;
    if (auctionData.launchType === "immediate") {
      scheduledstart = createdAt;
    } else if (auctionData.scheduledStart) {
      scheduledstart = new Date(auctionData.scheduledStart).toISOString();
    } else {
      return NextResponse.json(
        { success: false, error: "Scheduled start time is required for scheduled auctions" },
        { status: 400 }
      );
    }
    
    // Prepare auction record
    const newAuction = keysToLowerCase({
      id: auctionId,
      ...auctionData,
      createdAt,
      scheduledstart,
      status: auctionData.launchType === "immediate" ? "active" : "scheduled",
      currentBid: auctionData.auctionType === "reverse" ? auctionData.targetprice : auctionData.startPrice,
      bidCount: 0,
      approved: false,
      participants: [],
      productimages: productImageUrls,
      productImages: undefined,
      percent:
        auctionData.bidIncrementType === "percentage"
          ? auctionData.bidIncrementRules[0]?.incrementValue
          : null,
      minimumincrement:
        auctionData.bidIncrementType === "fixed"
          ? auctionData.bidIncrementRules[0]?.incrementValue
          : 0,
      requireddocuments: auctionData.requireddocuments ? JSON.parse(auctionData.requireddocuments) : null,
      targetprice: auctionData.targetprice || null,
      createdby: createdBy,
    });

    const { data, error } = await supabase.from("auctions").insert([newAuction]).select();
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    const response: ApiResponse = {
      success: true,
      data: { auction: data[0] },
      message: "Auction created successfully",
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error creating auction:", error);
    return NextResponse.json({ success: false, error: "Failed to create auction" }, { status: 500 });
  }
}


// Apply authentication and rate limiting to the handlers
const authenticatedGetAuctions = withAuth(getAuctions, "view_public_auctions");
const authenticatedCreateAuction = withAuth(createAuction, "create_auction");

// export const GET = withRateLimit(authenticatedGetAuctions);
// export const POST = withRateLimit(authenticatedCreateAuction);

// PUT /api/auctions/:id - Approve auction and optionally update scheduledstart



export const GET = getAuctions;
export const POST = createAuction;
