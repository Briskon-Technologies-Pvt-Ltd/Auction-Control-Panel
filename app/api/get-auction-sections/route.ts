import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const auctionId = searchParams.get("auction_id");

    if (!auctionId) {
      return NextResponse.json(
        { success: false, message: "Missing auction_id" },
        { status: 400 }
      );
    }

    // Fetch from auctions table
    const { data, error } = await supabase
      .from("auctions")
      .select("detailed_sections")
      .eq("id", auctionId)
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      sections: data?.detailed_sections || [],
    });
  } catch (err: any) {
    console.error("Error fetching auction sections:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
