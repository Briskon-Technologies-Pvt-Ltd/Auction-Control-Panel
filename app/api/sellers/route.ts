import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client using public environment variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    // Fetch all profiles where role is "seller"
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("*") // get ALL columns
      .eq("role", "seller")
      .order("created_at", { ascending: false });

    if (profileError) throw profileError;

    return NextResponse.json({
      success: true,
      data: { profiles: profiles || [] },
    });
  } catch (error) {
    console.error("Error fetching seller profiles:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch seller profiles" },
      { status: 500 }
    );
  }
}
