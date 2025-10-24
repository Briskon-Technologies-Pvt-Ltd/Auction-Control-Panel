import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

/**
 * GET /api/calendar
 * Returns simplified auction calendar data
 */
export async function GET() {
  try {
    // Fetch all approved auctions of sale_type 1 or 3
    const { data, error } = await supabase
      .from("auctions")
      .select("productname, auctiontype,scheduledstart, auctionduration, bidcount, approved, sale_type")
      .eq("approved", true)
      .in("sale_type", [1, 3]);

    if (error) {
      console.error("Error fetching auctions for calendar:", error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    const now = new Date();

    const calendarData = (data || []).map((auction) => {
      const startDate = new Date(auction.scheduledstart);

      // auctionduration is an object like { days: 0, hours: 2, minutes: 30 }
      const durationObj = auction.auctionduration || {};
      const days = Number(durationObj.days || 0);
      const hours = Number(durationObj.hours || 0);
      const minutes = Number(durationObj.minutes || 0);

      const durationInMs =
        days * 24 * 60 * 60 * 1000 +
        hours * 60 * 60 * 1000 +
        minutes * 60 * 1000;

      const endDate = new Date(startDate.getTime() + durationInMs);

      // Determine auction status
      let auctionStatus: string;
      if (now >= startDate && now <= endDate) {
        auctionStatus = "Live";
      } else if (now < startDate) {
        auctionStatus = "Upcoming";
      } else {
        auctionStatus = "Closed";
      }

      return {
        auctionname: auction.productname,
        auctiontype: auction.auctiontype,
        startdate: startDate.toISOString(),
        enddate: endDate.toISOString(),
        bidcount: auction.bidcount ?? 0,
        auctionstatus: auctionStatus,
      };
    });

    return NextResponse.json({ success: true, data: calendarData }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in calendar API:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch calendar data" }, { status: 500 });
  }
}
