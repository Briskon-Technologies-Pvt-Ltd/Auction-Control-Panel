import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client using public environment variables
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function GET(request: Request) {
  try {
    // Fetch all profiles where role is not "admin" (assuming session auth restricts to admins)
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, fname, email, role")
      .neq("role", "admin")
      .order("created_at", { ascending: true });

    if (profileError) throw profileError;

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ success: true, data: { profiles: [] } });
    }

    // Calculate auctionCount and bidCount for each profile
    const profilesWithStats = await Promise.all(
      profiles.map(async (profile) => {
        let auctionCount = 0;
        let bidCount = 0;

        // Calculate auctionCount for sellers and both
        if (profile.role === "seller" || profile.role === "both") {
          const { count: auctionCountResult } = await supabase
            .from("auctions")
            .select("*", { count: "exact", head: true })
            .eq("createdby", profile.email);
          auctionCount = auctionCountResult || 0;
        }

        // Calculate bidCount for buyers and both
        if (profile.role === "buyer" || profile.role === "both") {
          const { count: bidCountResult } = await supabase
            .from("bids")
            .select("*", { count: "exact", head: true })
            .eq("user_id", profile.id);
          bidCount = bidCountResult || 0;
        }

        return { ...profile, auctionCount, bidCount };
      })
    );

    return NextResponse.json({ success: true, data: { profiles: profilesWithStats } });
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch profiles" }, { status: 500 });
  }
}
