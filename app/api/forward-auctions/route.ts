import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

/* ---------- Utility helpers ---------- */
function calcEndDate(start: string, duration: any) {
  const s = new Date(start);
  if (isNaN(s.getTime())) return null;
  const e = new Date(s);
  if (duration) {
    if (duration.days) e.setDate(e.getDate() + duration.days);
    if (duration.hours) e.setHours(e.getHours() + duration.hours);
    if (duration.minutes) e.setMinutes(e.getMinutes() + duration.minutes);
  }
  return e;
}

function classifyStatus(a: any, now = new Date()) {
  if (!a.scheduledstart) return "Unknown";
  const start = new Date(a.scheduledstart);
  const end = calcEndDate(a.scheduledstart, a.auctionduration);
  if (!a.approved) return "Pending";
  if (start && end && start <= now && end >= now) return "Live";
  if (start && start > now) return "Upcoming";
  if (end && end < now) return "Closed";
  return "Unknown";
}

/* ---------- API ---------- */
export async function GET() {
  try {
    // Fetch all forward auctions
    const { data: auctions, error: aErr } = await supabase
      .from("auctions")
      .select("*")
      .eq("auctiontype", "forward");

    if (aErr) throw aErr;
    if (!auctions || auctions.length === 0)
      return NextResponse.json({
        success: true,
        data: {
          summary: { total: 0, Live: 0, Upcoming: 0, Closed: 0, Pending: 0, Unknown: 0 },
          subtypes: {},
          auctions: [],
        },
      });

    // Get seller profiles
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id,email,fname,lname");
    if (pErr) throw pErr;

    // Build profile map
    const profileMap = new Map<string, any>();
    profiles.forEach((p) => {
      if (p.email) profileMap.set(String(p.email).toLowerCase(), p);
      if (p.id) profileMap.set(String(p.id), p);
    });

    // Get categories
    const { data: categories, error: cErr } = await supabase
      .from("categories")
      .select("id, title");
    if (cErr) throw cErr;

    // Build category map
    const categoryMap = new Map<string, string>();
    (categories || []).forEach((c) => {
      if (c.id) categoryMap.set(String(c.id), c.title || "Uncategorized");
    });

    const now = new Date();

    // Fetch bids table
    const { data: allBids, error: bErr } = await supabase.from("bids").select("*");
    if (bErr) throw bErr;

    // Group bids by auction_id
    const bidsByAuction: Record<string, any[]> = {};
    (allBids || []).forEach((b) => {
      if (!b.auction_id) return;
      if (!bidsByAuction[b.auction_id]) bidsByAuction[b.auction_id] = [];
      bidsByAuction[b.auction_id].push(b);
    });

    /* ---------- Build enriched auction data ---------- */
    const enriched = auctions.map((a) => {
      const bids = (bidsByAuction[a.id] || []).filter(
        (b) => b && !isNaN(Number(b.amount))
      );
      const totalBids = bids.length;
      const highestBid =
        totalBids > 0 ? Math.max(...bids.map((b) => Number(b.amount))) : 0;
      const lastBidTime =
        totalBids > 0
          ? new Date(
              bids.sort(
                (x, y) =>
                  new Date(y.created_at).getTime() -
                  new Date(x.created_at).getTime()
              )[0].created_at
            ).toISOString()
          : null;

      const sellerProfile =
        profileMap.get(String(a.createdby)) ||
        profileMap.get(String(a.createdby)?.toLowerCase()) ||
        null;

      const categoryName =
        categoryMap.get(String(a.categoryid)) || "Uncategorized";

      return {
        id: a.id,
        productname: a.productname,
        auctionsubtype: a.auctionsubtype,
        scheduledstart: a.scheduledstart,
        auctionduration: a.auctionduration,
        approved: a.approved,
        categoryid: a.categoryid,
        category_name: categoryName, // ✅ Added field
        subcategoryid: a.subcategoryid,
        currentbidder: a.currentbidder,
        targetprice: a.targetprice,
        reserveprice: a.reserveprice,
        currency: a.currency || "USD",
        startprice: a.startprice,
        minimumincrement: a.minimumincrement,
        seller_name: sellerProfile
          ? `${sellerProfile.fname || ""} ${sellerProfile.lname || ""}`.trim()
          : "-",
        seller_email: sellerProfile?.email || null,
        status: classifyStatus(a, now),
        total_bids: totalBids,
        highest_bid: highestBid,
        last_bid_time: lastBidTime,
        bids: totalBids > 0 ? bids : [], // skip zero-bid auctions
      };
    });

    /* ---------- Summary counts ---------- */
    const summary = {
      total: enriched.length,
      Live: 0,
      Upcoming: 0,
      Closed: 0,
      Pending: 0,
      Unknown: 0,
    };
    enriched.forEach((a) => {
      const s = a.status || "Unknown";
      summary[s] = (summary[s] || 0) + 1;
    });

    /* ---------- Subtype breakdown ---------- */
    const subtypes: Record<string, any> = {};
    for (const a of enriched) {
      const subtype = String(a.auctionsubtype || "unspecified").toLowerCase();
      if (!subtypes[subtype])
        subtypes[subtype] = { total: 0, status: {} };
      subtypes[subtype].total++;
      subtypes[subtype].status[a.status] =
        (subtypes[subtype].status[a.status] || 0) + 1;
    }

    /* ---------- Financials ---------- */
    const totalGMV = enriched.reduce((sum, a) => sum + (a.highest_bid || 0), 0);
    const averageAuctionValue = enriched.length
      ? Math.round(totalGMV / enriched.length)
      : 0;
    const commission = Math.round(totalGMV * 0.05);

    /* ---------- Outcomes ---------- */
    const closedAuctions = enriched.filter((a) => a.status === "Closed");
    const successful = closedAuctions.filter((a) => a.total_bids > 0).length;
    const unsold = closedAuctions.length - successful;

    /* ---------- Over Time ---------- */
    const monthlyMap: Record<
      string,
      { english: number; silent: number; sealed: number; total: number; date: Date }
    > = {};

    for (const a of enriched) {
      if (!a.scheduledstart) continue;
      const d = new Date(a.scheduledstart);
      if (isNaN(d.getTime())) continue;

      const key = `${d.toLocaleString("default", {
        month: "short",
      })} ${d.getFullYear()}`;

      if (!monthlyMap[key]) {
        monthlyMap[key] = {
          english: 0,
          silent: 0,
          sealed: 0,
          total: 0,
          date: new Date(d.getFullYear(), d.getMonth(), 1),
        };
      }

      const subtype = String(a.auctionsubtype || "").toLowerCase();
      if (["standard", "english"].includes(subtype)) monthlyMap[key].english++;
      else if (subtype === "silent") monthlyMap[key].silent++;
      else if (subtype === "sealed") monthlyMap[key].sealed++;

      monthlyMap[key].total++;
    }

    const overTime = Object.entries(monthlyMap)
      .map(([month, val]) => ({
        month,
        ...val,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    /* ---------- Category Performance ---------- */
    const categoryMapCount: Record<string, number> = {};
    for (const a of enriched) {
      const cat = a.category_name || "Uncategorized";
      categoryMapCount[cat] = (categoryMapCount[cat] || 0) + 1;
    }
    const categoryPerformance = Object.entries(categoryMapCount).map(
      ([name, count]) => ({ name, count })
    );

    /* ---------- Response ---------- */
    return NextResponse.json({
      success: true,
      data: {
        summary,
        subtypes,
        auctions: enriched,
        financials: { totalGMV, averageAuctionValue, commission },
        outcomes: { successful, unsold },
        overTime,
        categoryPerformance,
      },
    });
  } catch (err) {
    console.error("forward-auctions error:", err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
