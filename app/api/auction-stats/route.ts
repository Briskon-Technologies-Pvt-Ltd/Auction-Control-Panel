import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

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

export async function GET() {
  try {
    const { data: auctions, error } = await supabase.from("auctions").select("*");
    if (error) throw error;

    const now = new Date();

    // Helper for classification
    const classifyStatus = (a: any) => {
      if (!a.scheduledstart) return "Unknown";
      const start = new Date(a.scheduledstart);
      const end = calcEndDate(a.scheduledstart, a.auctionduration);
      if (!a.approved) return "Pending";
      if (start && end && start <= now && end >= now) return "Live";
      if (start && start > now) return "Upcoming";
      if (end && end < now) return "Closed";
      return "Unknown";
    };

    // Filter relevant auctions
    const filtered = auctions.filter((a) => 
      ["forward", "reverse"].includes(String(a.auctiontype || "").toLowerCase())
    );
    

    const summary = { Live: 0, Upcoming: 0, Closed: 0, Pending: 0, Unknown: 0, total: filtered.length };
    const forward = {
      total: 0,
      status: { Live: 0, Upcoming: 0, Closed: 0, Pending: 0, Unknown: 0 },
      subtypes: { english: {}, sealed: {}, silent: {} } as any,
    };
    const reverse = {
      total: 0,
      status: { Live: 0, Upcoming: 0, Closed: 0, Pending: 0, Unknown: 0 },
      subtypes: { standard: {}, ranked: {}, sealed: {} } as any,
    };

    for (const a of filtered) {
      const status = classifyStatus(a);
      const type = String(a.auctiontype || "").toLowerCase();
      const subtype = String(a.auctionsubtype || "").toLowerCase();

      summary[status]++;
      if (type === "forward") {
        forward.total++;
        forward.status[status]++;
        if (["standard", "english"].includes(subtype)) {
          forward.subtypes.english[status] = (forward.subtypes.english[status] || 0) + 1;
        } else if (subtype === "sealed") {
          forward.subtypes.sealed[status] = (forward.subtypes.sealed[status] || 0) + 1;
        } else if (subtype === "silent") {
          forward.subtypes.silent[status] = (forward.subtypes.silent[status] || 0) + 1;
        }
      } else if (type === "reverse") {
        reverse.total++;
        reverse.status[status]++;
        if (subtype === "ranked") {
          reverse.subtypes.ranked[status] = (reverse.subtypes.ranked[status] || 0) + 1;
        } else if (subtype === "sealed") {
          reverse.subtypes.sealed[status] = (reverse.subtypes.sealed[status] || 0) + 1;
        } else if (subtype === "standard") {
          reverse.subtypes.standard[status] = (reverse.subtypes.standard[status] || 0) + 1;
        }
      }
    }

    // Compute subtype totals
    for (const side of [forward, reverse]) {
      for (const key of Object.keys(side.subtypes)) {
        const counts = side.subtypes[key];
        const total = Object.values(counts).reduce((a: any, b: any) => a + b, 0);
        side.subtypes[key] = { total, status: counts };
      }
    }

    return NextResponse.json({
      success: true,
      data: { summary, forward, reverse },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
