import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

/* ---------- Helper: Calculate End Date ---------- */
function calcEndDate(start?: string, duration?: any) {
  try {
    if (!start) return null;
    const s = new Date(start);
    if (isNaN(s.getTime())) return null;
    const e = new Date(s);
    if (duration) {
      if (duration?.days) e.setDate(e.getDate() + Number(duration.days));
      if (duration?.hours) e.setHours(e.getHours() + Number(duration.hours));
      if (duration?.minutes) e.setMinutes(e.getMinutes() + Number(duration.minutes));
    }
    return e;
  } catch (err) {
    console.error("calcEndDate error:", err);
    return null;
  }
}

/* ---------- Classify Status ---------- */
function classifyStatus(a: any, now = new Date()) {
  if (!a.scheduledstart) return "Unknown";
  const start = new Date(a.scheduledstart);
  const end = calcEndDate(a.scheduledstart, a.auctionduration);
  const approved = a.approved ?? true;
  if (!approved) return "Pending";
  if (start && end && start <= now && end >= now) return "Live";
  if (start && start > now) return "Upcoming";
  if (end && end < now) return "Closed";
  return "Unknown";
}

/* ---------- API ---------- */
export async function GET() {
  try {
    // 1️⃣ Fetch reverse auctions
    const { data: auctions, error: aErr } = await supabase
      .from("auctions")
      .select("*")
      .eq("auctiontype", "reverse");
    if (aErr) throw aErr;

    if (!auctions?.length) {
      return NextResponse.json({
        success: true,
        data: {
          summary: { total: 0, Live: 0, Upcoming: 0, Closed: 0, Pending: 0, Unknown: 0 },
          subtypes: {},
          auctions: [],
        },
      });
    }

    // 2️⃣ Fetch profiles (buyers/suppliers)
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id,email,fname,lname");
    if (pErr) throw pErr;

    const profileMap = new Map<string, any>();
    profiles.forEach((p) => {
      if (p.email) profileMap.set(String(p.email).toLowerCase(), p);
      if (p.id) profileMap.set(String(p.id), p);
    });

    // 3️⃣ Fetch bids
    const { data: allBids, error: bErr } = await supabase
      .from("bids")
      .select("*");
    if (bErr) throw bErr;

    // Group bids by auction_id
    const bidsByAuction: Record<string, any[]> = {};
    (allBids || []).forEach((b) => {
      if (!b.auction_id) return;
      if (!bidsByAuction[b.auction_id]) bidsByAuction[b.auction_id] = [];
      bidsByAuction[b.auction_id].push(b);
    });

    const now = new Date();

    /* ---------- Build enriched auctions ---------- */
    const enriched = auctions.map((a) => {
      const bids = (bidsByAuction[a.id] || []).filter(
        (b) => b && !isNaN(Number(b.amount))
      );
      const totalBids = bids.length;
      const lowestBid =
        totalBids > 0 ? Math.min(...bids.map((b) => Number(b.amount))) : 0;
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

      const buyerProfile =
        profileMap.get(String(a.createdby)) ||
        profileMap.get(String(a.createdby)?.toLowerCase()) ||
        null;

      return {
        id: a.id,
        productname: a.productname,
        auction_name: a.auction_name || a.productname,
        auctiontype: a.auctiontype,
        auctionsubtype: a.auctionsubtype,
        scheduledstart: a.scheduledstart,
        auctionduration: a.auctionduration,
        approved: a.approved ?? true,
        categoryid: a.categoryid,
        subcategoryid: a.subcategoryid,
        targetprice: a.targetprice,
        reserveprice: a.reserveprice,
        currency: a.currency || "USD",
        startprice: a.startprice,
        minimumincrement: a.minimumincrement,
        buyer_name: buyerProfile
          ? `${buyerProfile.fname || ""} ${buyerProfile.lname || ""}`.trim()
          : "-",
        buyer_email: buyerProfile?.email || null,
        status: classifyStatus(a, now),
        total_bids: totalBids,
        lowest_bid: lowestBid,
        last_bid_time: lastBidTime,
        bids: totalBids > 0 ? bids : [],
      };
    });

    /* ---------- Summary ---------- */
    const summary = { total: enriched.length, Live: 0, Upcoming: 0, Closed: 0, Pending: 0, Unknown: 0 };
    enriched.forEach((a) => {
      const s = a.status || "Unknown";
      summary[s] = (summary[s] || 0) + 1;
    });

    /* ---------- Subtypes ---------- */
    const subtypes: Record<string, any> = {};
    for (const a of enriched) {
      const subtype = String(a.auctionsubtype || "unspecified").toLowerCase();
      if (!subtypes[subtype])
        subtypes[subtype] = { total: 0, status: {} };
      subtypes[subtype].total++;
      subtypes[subtype].status[a.status] = (subtypes[subtype].status[a.status] || 0) + 1;
    }

    /* ---------- Financials ---------- */
    const totalGMV = enriched.reduce((sum, a) => sum + (a.lowest_bid || 0), 0);
    const averageAuctionValue = enriched.length
      ? Math.round(totalGMV / enriched.length)
      : 0;
    const commission = Math.round(totalGMV * 0.05);

    /* ---------- Outcomes ---------- */
    const closed = enriched.filter((a) => a.status === "Closed");
    const successful = closed.filter((a) => a.total_bids > 0).length;
    const unsold = closed.length - successful;

    /* ---------- Over Time ---------- */
    const monthlyMap: Record<
      string,
      { standard: number; ranked: number; sealed: number; total: number; date: Date }
    > = {};

    for (const a of enriched) {
      if (!a.scheduledstart) continue;
      const d = new Date(a.scheduledstart);
      if (isNaN(d.getTime())) continue;

      const key = `${d.toLocaleString("default", { month: "short" })} ${d.getFullYear()}`;
      if (!monthlyMap[key]) {
        monthlyMap[key] = {
          standard: 0,
          ranked: 0,
          sealed: 0,
          total: 0,
          date: new Date(d.getFullYear(), d.getMonth(), 1),
        };
      }

      const subtype = String(a.auctionsubtype || "").toLowerCase();
      if (subtype === "standard") monthlyMap[key].standard++;
      else if (subtype === "ranked") monthlyMap[key].ranked++;
      else if (subtype === "sealed") monthlyMap[key].sealed++;
      monthlyMap[key].total++;
    }

    const overTime = Object.entries(monthlyMap)
      .map(([month, val]) => ({ month, ...val }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    /* ---------- Category Performance ---------- */
    const categoryMap: Record<string, number> = {};
    for (const a of enriched) {
      const cat = a.categoryid || "Uncategorized";
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    }
    const categoryPerformance = Object.entries(categoryMap).map(
      ([name, count]) => ({ name, count })
    );

    /* ---------- Response ---------- */
    return NextResponse.json({
      success: true,
      data: {
        summary,
        subtypes,
        financials: { totalGMV, averageAuctionValue, commission },
        outcomes: { successful, unsold },
        overTime,
        categoryPerformance,
        auctions: enriched,
      },
    });
  } catch (err: any) {
    console.error("❌ reverse-auctions error details:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || JSON.stringify(err, null, 2) || "Unknown error",
      },
      { status: 500 }
    );
  }
}
