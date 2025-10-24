// app/api/status-auction/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient"; // make sure this is a server-side client

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auctionId = params?.id;
    if (!auctionId) {
      return NextResponse.json(
        { success: false, message: "Auction ID is required" },
        { status: 400 }
      );
    }

    // Read JSON body exactly once
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Request body must be JSON" },
        { status: 400 }
      );
    }

    const approval_status = body?.approval_status as string; // "approved" | "rejected" etc.
    if (!approval_status) {
      return NextResponse.json(
        { success: false, message: "Missing approval_status" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("auctions")
      .update({ approval_status })
      .eq("id", auctionId);

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: auctionId,
      approval_status,
      message: `Auction ${approval_status} successfully`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
