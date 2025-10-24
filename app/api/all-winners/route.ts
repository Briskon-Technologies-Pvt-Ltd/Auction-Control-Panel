import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

/* ---------------- Helpers ---------------- */
function calcEndDate(start: string, duration: any) {
  const d = new Date(start);
  d.setDate(d.getDate() + (duration?.days || 0));
  d.setHours(d.getHours() + (duration?.hours || 0));
  d.setMinutes(d.getMinutes() + (duration?.minutes || 0));
  return d;
}

/* ---------------- GET ---------------- */
export async function GET(req: Request) {
  try {
    // ✅ Optional query parameter: ?type=forward | ?type=reverse | (none)
    const { searchParams } = new URL(req.url);
    const filterType = (searchParams.get("type") || "").toLowerCase();

    // 1️⃣ Fetch all required data in parallel
    const [auctionsRes, bidsRes, profilesRes] = await Promise.all([
      supabase.from("auctions").select("*"),
      supabase.from("bids").select("*"),
      supabase.from("profiles").select("*"),
    ]);

    if (auctionsRes.error || bidsRes.error || profilesRes.error) {
      throw new Error(
        auctionsRes.error?.message ||
          bidsRes.error?.message ||
          profilesRes.error?.message
      );
    }

    let auctions = auctionsRes.data || [];
    const bids = bidsRes.data || [];
    const profiles = profilesRes.data || [];
    const now = new Date();

    // 2️⃣ Filter by type (if provided)
    if (filterType) {
      auctions = auctions.filter((a) =>
        String(a.auctiontype || a.sale_type || "")
          .toLowerCase()
          .includes(filterType)
      );
    }

    // 3️⃣ Initialize counters and result list
    const summary = {
      total_closed: 0,
      Awarded: 0,
      "Not awarded": 0,
      total_awarded_value: 0,
      average_awarded_value: 0,
    };

    const winners: any[] = [];

    // 4️⃣ Process each auction
    for (const auction of auctions) {
      const start = auction.scheduledstart ? new Date(auction.scheduledstart) : null;
      const end =
        start && auction.auctionduration
          ? calcEndDate(auction.scheduledstart, auction.auctionduration)
          : null;

      const approved =
        !!auction.approved || String(auction.approved).toLowerCase() === "true";

      if (!approved || !start || !end) continue;

      // Skip auctions that are not closed
      if (end >= now) continue;

      summary.total_closed++;

      // Get bids for this auction
      const auctionBids = bids.filter((b) => b.auction_id === auction.id);
      if (auctionBids.length === 0) {
        summary["Not awarded"]++;
        continue;
      }

      // Identify winner bid
      const type = String(auction.auctiontype || "").toLowerCase();
      let winnerBid: any = null;

      if (type === "forward" || auction.sale_type === 1) {
        winnerBid = auctionBids.reduce((max, b) =>
          b.amount > max.amount ? b : max
        );
      } else if (type === "reverse" || auction.sale_type === 3) {
        winnerBid = auctionBids.reduce((min, b) =>
          b.amount < min.amount ? b : min
        );
      }

      if (!winnerBid || !winnerBid.amount) {
        summary["Not awarded"]++;
        continue;
      }

      const winnerProfile = profiles.find((p) => p.id === winnerBid.user_id);

      // Push to winners list
      winners.push({
        auction_id: auction.id,
        auction_name: auction.productname,
        auction_type:
          type === "reverse" || auction.sale_type === 3 ? "Reverse" : "Forward",
        winner_id: winnerBid.user_id,
        winner_name: winnerProfile
          ? `${winnerProfile.fname || ""} ${winnerProfile.lname || ""}`.trim()
          : "Unknown",
        winner_location: winnerProfile?.location || null,
        winning_bid: winnerBid.amount,
        currency: auction.currency,
        closed_at: end.toISOString(),
      });

      summary.Awarded++;
      summary.total_awarded_value += Number(winnerBid.amount) || 0;
    }

    // 5️⃣ Final calculations
    if (summary.Awarded > 0) {
      summary.average_awarded_value = Number(
        (summary.total_awarded_value / summary.Awarded).toFixed(2)
      );
    }

    // Sort winners (most recent first)
    winners.sort(
      (a, b) => new Date(b.closed_at).getTime() - new Date(a.closed_at).getTime()
    );

    // 6️⃣ Return response
    return NextResponse.json({
      success: true,
      filter: filterType || "all",
      total_closed: summary.total_closed,
      summary,
      winners,
    });
  } catch (err: any) {
    
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
