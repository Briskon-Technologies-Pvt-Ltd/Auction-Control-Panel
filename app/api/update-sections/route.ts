import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // ✅ CASE 1: File upload (multipart/form-data)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return NextResponse.json({ success: false, message: "No file uploaded" }, { status: 400 });
      }

      // unique file name
      const fileName = `${Date.now()}-${file.name}`;
      const bucketName = "auction-docs";

      // upload to Supabase Storage
      const { data, error } = await supabase.storage.from(bucketName).upload(fileName, file);

      if (error) {
        console.error("Supabase upload error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
      }

      // get public URL
      const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(fileName);

      return NextResponse.json({
        success: true,
        url: publicData.publicUrl,
        fileName,
      });
    }

    // ✅ CASE 2: JSON body → update auction sections
    const body = await req.json();
    const { auction_id, sections } = body;

    if (!auction_id) {
      return NextResponse.json({ success: false, message: "Missing auction_id" }, { status: 400 });
    }

    const { error } = await supabase
      .from("auctions")
      .update({ detailed_sections: sections })
      .eq("id", auction_id);

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error in update-sections route:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
