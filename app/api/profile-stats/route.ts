import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams, origin } = new URL(req.url);
    const userId = searchParams.get("id");
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID required" },
        { status: 400 }
      );
    }

    // ✅ Base URL (safe for dev & prod)
    const baseUrl = origin || "http://localhost:3000";

    /* -------------------------------------------------------------------
       🔹 Fetch all data sources
       ------------------------------------------------------------------- */
    const [profileRes, auctionsRes, winnersRes] = await Promise.all([
      fetch(`${baseUrl}/api/fullprofile`),
      fetch(`${baseUrl}/api/auctions`),
      fetch(`${baseUrl}/api/all-winners`),
    ]);

    const profileJson = await profileRes.json();
    const auctionsJson = await auctionsRes.json();
    const winnersJson = await winnersRes.json();

    const allProfiles = profileJson?.data?.profiles || [];
    const allAuctions = auctionsJson?.data?.auctions || [];
    const allWinners = winnersJson?.winners || [];

    const profile = allProfiles.find((p: any) => p.id === userId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    /* -------------------------------------------------------------------
       🔹 Buyer statistics (using /api/all-winners for true accuracy)
       ------------------------------------------------------------------- */
    // User’s actual wins (from all-winners API)
    const buyerWins = allWinners.filter((w: any) => w.winner_id === userId);

    // Auctions user engaged with (bids, purchases, or selling)
    const engagedAuctions = allAuctions.filter((a: any) => {
      const participated = (a.participants || []).includes(userId);
      const purchased = a.purchaser === userId;
      const sellerListed = a.seller === userId;
      return participated || purchased || sellerListed;
    });

    const buyerStats = {
      // Engagement count (same as before)
      auctions: engagedAuctions.length,

      // ✅ Wins based on all-winners API
      wins: buyerWins.length,

      // ✅ Buys (still using auction data for Buy Now items)
      buys: allAuctions.filter(
        (a: any) => a.sale_type === 2 && a.purchaser === userId
      ).length,

      // ✅ Spend based on winning bids
      spend: buyerWins.reduce(
        (sum: number, w: any) => sum + (w.winning_bid || 0),
        0
      ),

      // Average bid from engaged auctions (keep same logic)
      avgBid: engagedAuctions.length
        ? Math.round(
            engagedAuctions.reduce(
              (sum: number, a: any) => sum + (a.currentbid || 0),
              0
            ) / engagedAuctions.length
          )
        : 0,

      // Highest bid user has placed (same as before)
      highBid: engagedAuctions.reduce(
        (max: number, a: any) => Math.max(max, a.currentbid || 0),
        0
      ),

      // ✅ Win rate — now based on actual winners list
      winRate: engagedAuctions.length
        ? Math.round((buyerWins.length / engagedAuctions.length) * 100)
        : 0,

      // Top 2 categories from engaged auctions
      categories: Array.from(
        new Set(
          engagedAuctions.map((a: any) => a.categoryid).filter(Boolean)
        )
      ).slice(0, 2),

      // Messages same as before
      messages: engagedAuctions.reduce(
        (sum: number, a: any) => sum + (a.question_count || 0),
        0
      ),
    };

    /* -------------------------------------------------------------------
       🔹 Seller statistics (no change in logic)
       ------------------------------------------------------------------- */
    const sellerListings = allAuctions.filter((a: any) => a.seller === userId);

    const sellerStats = {
      listings: sellerListings.length,
      active: sellerListings.filter(
        (a: any) => a.approved && !a.purchaser
      ).length,
      sold: sellerListings.filter((a: any) => a.purchaser).length,
      gmvSold: sellerListings
        .filter((a: any) => a.purchaser)
        .reduce(
          (sum: number, a: any) => sum + (a.buy_now_price || a.currentbid || 0),
          0
        ),
      avgSale: sellerListings.filter((a: any) => a.purchaser).length
        ? Math.round(
            sellerListings
              .filter((a: any) => a.purchaser)
              .reduce(
                (sum: number, a: any) =>
                  sum + (a.buy_now_price || a.currentbid || 0),
                0
              ) /
              sellerListings.filter((a: any) => a.purchaser).length
          )
        : 0,
      pending: sellerListings.filter((a: any) => !a.approved).length,
      categories: Array.from(
        new Set(sellerListings.map((a: any) => a.categoryid).filter(Boolean))
      ).slice(0, 2),
    };

    /* -------------------------------------------------------------------
       🔹 Combined stats (same structure as before)
       ------------------------------------------------------------------- */
    const combined = {
      netGMV: (buyerStats.spend || 0) - (sellerStats.gmvSold || 0),
      transactions: buyerStats.buys + sellerStats.sold,
      memberSince: profile.created_at
        ? new Date(profile.created_at).toLocaleString("en-US", {
            month: "short",
            year: "numeric",
          })
        : null,
    };

    /* -------------------------------------------------------------------
       🔹 Total Auctions (for engagement bar)
       ------------------------------------------------------------------- */
    const totalAuctions = allAuctions.length;

    /* -------------------------------------------------------------------
       🔹 Final JSON response (no key name changes)
       ------------------------------------------------------------------- */
    return NextResponse.json({
      success: true,
      data: {
        profile,
        buyerStats,
        sellerStats,
        combined,
        totalAuctions,
      },
    });
  } catch (err) {
    console.error("profile-stats error", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
