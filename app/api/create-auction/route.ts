import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabaseClient";
import { withAuth } from "@/middleware/auth";
import { keysToLowerCase } from "@/utils/misc";
import type { AuctionFormData, ApiResponse } from "@/types/auction-types";

/**
 * 🟢 Create Forward Auction (Admin)
 */
async function createAuction(req: NextRequest, user: any): Promise<NextResponse> {
  try {
    const auctionData: AuctionFormData = await req.json();

    // 🔒 Basic validation
    if (!auctionData.productName) {
      return NextResponse.json(
        { success: false, error: "Product name is required" },
        { status: 400 }
      );
    }

    if (!auctionData.auctionSubType) {
      return NextResponse.json(
        { success: false, error: "Auction subtype (English/Silent) is required" },
        { status: 400 }
      );
    }

    if (!auctionData.startPrice || auctionData.startPrice <= 0) {
      return NextResponse.json(
        { success: false, error: "Start price must be greater than 0" },
        { status: 400 }
      );
    }

    // 🧩 Handle auction scheduling
    const auctionId = randomUUID();
    const createdAt = new Date().toISOString();

    const scheduledStart =
      auctionData.launchType === "immediate"
        ? createdAt
        : auctionData.scheduledStart
        ? new Date(auctionData.scheduledStart).toISOString()
        : createdAt;

    // 🕒 Handle duration
    const durationJSON = {
      days: auctionData.days ?? 0,
      hours: auctionData.hours ?? 0,
      minutes: auctionData.minutes ?? 0,
    };

    // 🧩 Construct normalized object
    const newAuction = keysToLowerCase({
      id: auctionId,
      // Core identifiers
      auctiontype: "forward",
      auctionsubtype: auctionData.auctionSubType,
      sale_type: 1, // 1 = Forward Auction
      ismultilot: auctionData.isMultiLot ?? false,

      // Product details
      productname: auctionData.productName,
      productdescription: auctionData.productDescription ?? null,
      product_heromsg: auctionData.product_heromsg ?? null, // 🆕 marketing note
      remarks: auctionData.remarks ?? null, // 🆕 remarks for bidders
      categoryid: auctionData.categoryId ?? null,
      subcategoryid: auctionData.subcategoryid ?? null,
      attributes: auctionData.attributes ?? null,
      sku: auctionData.sku ?? null,
      brand: auctionData.brand ?? null,
      model: auctionData.model ?? null,

      // Pricing
      startprice: auctionData.startPrice,
      minimumincrement: auctionData.minimumIncrement ?? 0,
      reserveprice: auctionData.reserveprice ?? null,
      currency: "EUR", // 🆕 fixed to Euro

      // Launch / Duration
      launchtype: auctionData.launchType ?? "immediate",
      scheduledstart: scheduledStart,
      auctionduration: durationJSON, // 🆕 added

      // Uploads
      productimages: auctionData.productImages ?? null,
      productdocuments: auctionData.productDocuments ?? null,
      requireddocuments:
        typeof auctionData.requireddocuments === "string"
          ? JSON.parse(auctionData.requireddocuments)
          : auctionData.requireddocuments ?? null,

      // System fields
      createdby: user?.id || "system",
      createdat: createdAt,
      seller: "71641d74-2643-4da3-8d2d-58bf8d0b6b66", // 🆕 hardcoded seller
      status: auctionData.launchType === "immediate" ? "active" : "scheduled",
      currentbid: null, // 🆕 no default bid
      bidcount: 0,
      participants: [],
      approved: true,
      ended: false,
      editable: true,
      approval_status: "pending",
      wishlist_count: 0,
      bidder_count: 0,
      is_featured: Boolean(auctionData.is_featured) ?? false, // 🆕 checkbox
    });

    // 🧮 Insert into Supabase
    const { data, error } = await supabase
      .from("auctions")
      .insert([newAuction])
      .select();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        data: data[0],
        message: "Forward auction created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating auction:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create auction" },
      { status: 500 }
    );
  }
}

/**
 * ✏️ Update existing auction (overwrite all fields except id)
 */
async function updateAuction(req: NextRequest, user: any): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const auctionId = searchParams.get("id");

    if (!auctionId) {
      return NextResponse.json(
        { success: false, error: "Auction ID is required" },
        { status: 400 }
      );
    }

    const auctionData: AuctionFormData = await req.json();
    delete (auctionData as any).id;

    const updatedAuction = keysToLowerCase({
      ...auctionData,
      updatedat: new Date().toISOString(),
      updatedby: user?.id || "system",
    });

    const { data, error } = await supabase
      .from("auctions")
      .update(updatedAuction)
      .eq("id", auctionId)
      .select();

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, data: data[0], message: "Auction updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating auction:", error);
    return NextResponse.json({ success: false, error: "Failed to update auction" }, { status: 500 });
  }
}

// ✅ Auth-protected routes
export const POST = withAuth(createAuction, "create_auction");
export const PUT = withAuth(updateAuction, "edit_auction");
