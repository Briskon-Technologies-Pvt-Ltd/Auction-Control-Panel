import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client for general operations
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// Initialize Supabase Admin client for auth operations
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function POST(request: Request) {
  try {
    const {
      email,
      password,
      fname,
      lname,
      location,
      role,
      type,
      organizationName,
      organizationContact,
    } = await request.json();

    // Validate input
    if (!email || !password || !fname || !lname || !role) {
      return NextResponse.json({ success: false, error: "Email, password, first name, last name, and role are required" }, { status: 400 });
    }
    if (!["admin", "buyer", "seller", "both"].includes(role)) {
      return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
    }
    if ((role === "seller" || role === "both") && !type) {
      return NextResponse.json({ success: false, error: "Seller type is required for seller or both roles" }, { status: 400 });
    }
    if (type === "organization" && (!organizationName || !organizationContact)) {
      return NextResponse.json({ success: false, error: "Organization name and contact are required for organization type" }, { status: 400 });
    }

    // Create user in auth.users with email confirmation
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Bypasses email verification by setting email_confirmed_at
      user_metadata: { role, fname, lname }, // Store role, fname, and lname in user_metadata
    });

    if (authError) throw authError;

    const userId = authData.user?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "User creation failed" }, { status: 500 });
    }

    // Insert profile into profiles table
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        email,
        fname,
        lname,
        location: location || null, // Optional field, set to null if not provided
        role,
        type: (role === "seller" || role === "both") ? type : null, // Optional for seller/both roles
      });

    if (profileError) throw profileError;

    return NextResponse.json({ success: true, message: "User created successfully", userId });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ success: false, error: "Failed to create user" }, { status: 500 });
  }
}
