import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // 🔹 Filters
    const auctionId = searchParams.get("auctionId");
    const userId = searchParams.get("userId");
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const roleFilter = searchParams.get("role");

    // 🔹 Base query (unchanged)
    let query = supabase.from("bids").select("*", { count: "exact" });

    if (auctionId) query = query.eq("auction_id", auctionId);
    if (userId) query = query.eq("user_id", userId);
    if (start) query = query.gte("created_at", new Date(start).toISOString());
    if (end) query = query.lte("created_at", new Date(end).toISOString());

    const { data: bids, error, count } = await query.order("created_at", { ascending: true });
    if (error) throw error;

    if (!bids?.length) {
      return NextResponse.json({
        success: true,
        data: { bids: [], meta: { total: 0 } },
      });
    }

    // 🔹 Collect IDs
    const userIds = [...new Set(bids.map((b) => String(b.user_id)))];
    const auctionIds = [...new Set(bids.map((b) => String(b.auction_id)))].filter(Boolean);

    // 🔹 Fetch profiles (bidders)
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, fname, lname, location, role")
      .in("id", userIds);
    if (profileError) throw profileError;

    // 🔹 Fetch auctions
    const { data: auctions, error: auctionError } = await supabase
      .from("auctions")
      .select("id, productname, auctiontype, auctionsubtype, createdby")
      .in("id", auctionIds);
    if (auctionError) throw auctionError;

    // 🔹 Collect creator emails
    const creatorEmails = [...new Set((auctions || []).map((a) => a.createdby))].filter(Boolean);

    // 🔹 Fetch auction creators
    const { data: creators, error: creatorError } = await supabase
      .from("profiles")
      .select("email, fname, lname")
      .in("email", creatorEmails);
    if (creatorError) throw creatorError;

    // 🔹 Lookup maps
    const profileMap = new Map(
      (profiles || []).map((p) => [
        String(p.id),
        {
          user_name: `${p.fname || ""} ${p.lname || ""}`.trim(),
          location: p.location || "",
          role: (p.role || "").toLowerCase(),
        },
      ])
    );

    const auctionMap = new Map(
      (auctions || []).map((a) => [
        String(a.id),
        {
          auction_title: a.productname || "",
          auction_type: (a.auctiontype || "forward").toLowerCase(),
          auction_subtype: (a.auctionsubtype || "").toLowerCase(),
          createdby: a.createdby || null,
        },
      ])
    );

    const creatorMap = new Map(
      (creators || []).map((c) => [
        c.email,
        `${c.fname || ""} ${c.lname || ""}`.trim(),
      ])
    );

    // 🔹 Merge all data
    let enrichedBids = bids.map((b) => {
      const auction = auctionMap.get(String(b.auction_id));
      const profile = profileMap.get(String(b.user_id));
      const creatorName = auction?.createdby ? creatorMap.get(auction.createdby) : null;

      return {
        ...b,
        user_name: profile?.user_name || null,
        location: profile?.location || null,
        role: profile?.role || null,
        auction_title: auction?.auction_title || null,
        auction_type: auction?.auction_type || null,
        auction_subtype: auction?.auction_subtype || null,
        creator_name: creatorName || null, // ✅ newly added field
      };
    });

    // ✅ Role filter (if provided)
    if (roleFilter) {
      const normalizedRole = roleFilter.toLowerCase();
      enrichedBids = enrichedBids.filter(
        (b) => String(b.role || "").toLowerCase() === normalizedRole
      );
    }

    // 🔹 Sort (forward vs reverse)
    const sortedBids = enrichedBids.sort((a, b) => {
      const typeA = (a.auction_type || "forward").toLowerCase();
      if (typeA === "reverse") return a.amount - b.amount;
      return b.amount - a.amount;
    });

    // ✅ Response (structure unchanged)
    return NextResponse.json({
      success: true,
      data: {
        bids: sortedBids,
        meta: { total: sortedBids.length },
      },
    });
  } catch (err: any) {
    console.error("❌ bids API error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
