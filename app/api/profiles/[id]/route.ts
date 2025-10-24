import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client for general operations
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// Initialize Supabase Admin client for auth.users deletion
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 });
  }

  try {
    // Fetch the user to determine their role and email
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("role, email")
      .eq("id", id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Delete associated auctions for sellers and both, including their bids
    if (user.role === "seller" || user.role === "both") {
      // First, delete all bids associated with the user's auctions
      const { data: auctions, error: auctionFetchError } = await supabase
        .from("auctions")
        .select("id")
        .eq("createdby", user.email);
      if (auctionFetchError) throw auctionFetchError;

      if (auctions && auctions.length > 0) {
        const auctionIds = auctions.map((auction) => auction.id);
        const { error: bidDeleteError } = await supabase
          .from("bids")
          .delete()
          .in("auction_id", auctionIds);
        if (bidDeleteError) throw bidDeleteError;
      }

      // Then delete the auctions
      const { error: auctionDeleteError } = await supabase
        .from("auctions")
        .delete()
        .eq("createdby", user.email);
      if (auctionDeleteError) throw auctionDeleteError;
    }

    // Delete associated bids, update questions, and update affected auctions for buyers and both
    if (user.role === "buyer" || user.role === "both") {
      // Fetch all bids placed by the user
      const { data: userBids, error: bidFetchError } = await supabase
        .from("bids")
        .select("auction_id, amount")
        .eq("user_id", id);
      if (bidFetchError) throw bidFetchError;

      if (userBids && userBids.length > 0) {
        const auctionIds = userBids.map((bid) => bid.auction_id);

        // Delete all bids placed by the user
        const { error: bidDeleteError } = await supabase
          .from("bids")
          .delete()
          .eq("user_id", id);
        if (bidDeleteError) throw bidDeleteError;

        // Fetch auctions affected by the deleted bids and questions
        const { data: auctions, error: auctionFetchError } = await supabase
          .from("auctions")
          .select("id, currentbid, currentbidder, participants, questions, auctiontype")
          .in("id", auctionIds);
        if (auctionFetchError) throw auctionFetchError;

        if (auctions) {
          for (const auction of auctions) {
            // Fetch remaining bids for the auction
            const { data: remainingBids, error: remainingBidsError } = await supabase
              .from("bids")
              .select("user_id, amount")
              .eq("auction_id", auction.id)
              .order("amount", { ascending: auction.auctiontype === "reverse" ? true : false });
            if (remainingBidsError) throw remainingBidsError;

            let newCurrentBid = null;
            let newCurrentBidder = null;

            if (remainingBids && remainingBids.length > 0) {
              // Determine the new current bid based on auctiontype
              const bestBid = auction.auctiontype === "reverse"
                ? remainingBids.reduce((min, bid) => min.amount < bid.amount ? min : bid)
                : remainingBids.reduce((max, bid) => max.amount > bid.amount ? max : bid);
              newCurrentBid = bestBid.amount;
              newCurrentBidder = (await supabase
                .from("profiles")
                .select("email")
                .eq("id", bestBid.user_id)
                .single()).data?.email || null;
            }

            // Update questions by removing entries where user matches the deleted user's email
            let updatedQuestions = auction.questions as { user: string; answer: string | null; question: string; answer_time: string | null; question_time: string }[] || [];
            if (updatedQuestions.length > 0) {
              updatedQuestions = updatedQuestions.filter(q => q.user !== user.email);
            }

            // Update participants by removing the deleted user
            const updatedParticipants = (auction.participants as string[] || [])
              .filter((userId) => userId !== id);

            // Update the auction with new values
            const { error: updateError } = await supabase
              .from("auctions")
              .update({
                currentbid: newCurrentBid,
                currentbidder: newCurrentBidder,
                participants: updatedParticipants,
                questions: updatedQuestions,
              })
              .eq("id", auction.id);
            if (updateError) throw updateError;
          }
        }
      }
    }

    // Delete the user profile
    const { error: userDeleteError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", id);
    if (userDeleteError) throw userDeleteError;

    // Delete the user from auth.users table
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authDeleteError) throw authDeleteError;

    return NextResponse.json({ success: true, message: "User and associated data deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ success: false, error: "Failed to delete user" }, { status: 500 });
  }
}



export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> } // params is a Promise
) {
  try {
    // Await the params before using
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, fname, lname, email, role, location, type, avatar_url, phone, addressline1, addressline2, created_at"
      )
      .eq("id", id) // Use `id` from params
      .single();

    if (error || !data) {
      console.error("Supabase Error for id", id, ":", error?.message);
      return NextResponse.json(
        { success: false, error: error?.message || "Profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err) {
    console.error("Route Error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

