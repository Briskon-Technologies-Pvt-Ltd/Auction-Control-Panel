import { type NextRequest, NextResponse } from "next/server";
// import { createClient } from "@/utils/supabase/server";
import { supabase } from "@/lib/supabaseClient";


export async function PUT(req: Request) {
  try {
    const { id, approval_status } = await req.json();

    if (!id || !approval_status) {
      return NextResponse.json(
        { success: false, message: "Missing id or approval_status" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("auctions")
      .update({ approval_status })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

