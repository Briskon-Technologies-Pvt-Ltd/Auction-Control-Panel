// app/api/category/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

/**
 * Categories API
 *
 * Endpoints:
 *  GET    /api/category            -> list categories (supports ?handle=, ?q=, ?active=)
 *  POST   /api/category            -> upsert category (body must include handle & title)
 *  PUT    /api/category            -> update category (body must include handle)
 *  DELETE /api/category?handle=xxx -> delete category by handle
 *
 * Note:
 * - POST performs an upsert by handle (so it will create or replace).
 * - PUT performs a partial update of provided fields.
 * - For image uploads use Supabase Storage from the client (anon key) or create a separate server upload endpoint.
 */

async function parseJSON(req: Request) {
  try {
    const txt = await req.text();
    if (!txt) return {};
    return JSON.parse(txt);
  } catch (e) {
    // malformed JSON
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const handle = url.searchParams.get("handle");
    const q = url.searchParams.get("q");
    const active = url.searchParams.get("active");

    let query = supabase.from("categories").select("*");

    if (handle) {
      query = query.eq("handle", handle);
    } else {
      // optional full-text-ish search across title/handle/short_desc
      if (q) {
        const like = `%${q}%`;
        query = query.or(`title.ilike.${like},handle.ilike.${like},short_desc.ilike.${like}`);
      }
      if (active === "true") query = query.eq("is_active", true);
      if (active === "false") query = query.eq("is_active", false);
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error("GET /api/category error:", error);
      return NextResponse.json({ success: false, error: error.message || error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    console.error("GET /api/category unexpected:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await parseJSON(req);
    if (body === null) {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const { handle, title } = body;
    if (!handle || !title) {
      return NextResponse.json({ success: false, error: "Missing required fields: handle and title" }, { status: 400 });
    }

    // normalize payload: only allowed fields
    const payload: any = {
      handle,
      title,
      short_desc: body.short_desc ?? null,
      long_desc: body.long_desc ?? null,
      image_url: body.image_url ?? null,
      taxonomy: body.taxonomy ?? [], // expected to be JSON array
      metadata: body.metadata ?? { created_via: "api" },
      is_active: body.is_active ?? true,
    };

    const { data, error } = await supabase.from("categories").upsert([payload], { onConflict: "handle" });

    if (error) {
      console.error("POST /api/category supabase error:", error);
      return NextResponse.json({ success: false, error: error.message || error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("POST /api/category unexpected:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await parseJSON(req);
    if (body === null) {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const handle = body.handle;
    if (!handle) {
      return NextResponse.json({ success: false, error: "handle is required for update" }, { status: 400 });
    }

    // Build updates object from allowed keys only
    const allowed = ["title", "short_desc", "long_desc", "image_url", "taxonomy", "is_active", "metadata"];
    const updates: any = {};
    for (const k of allowed) {
      if (body[k] !== undefined) updates[k] = body[k];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: "No updatable fields provided" }, { status: 400 });
    }

    const { data, error } = await supabase.from("categories").update(updates).eq("handle", handle).select().limit(1);

    if (error) {
      console.error("PUT /api/category supabase error:", error);
      return NextResponse.json({ success: false, error: error.message || error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("PUT /api/category unexpected:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const handle = url.searchParams.get("handle");
    if (!handle) {
      return NextResponse.json({ success: false, error: "Query parameter 'handle' is required" }, { status: 400 });
    }

    const { data, error } = await supabase.from("categories").delete().eq("handle", handle);

    if (error) {
      console.error("DELETE /api/category supabase error:", error);
      return NextResponse.json({ success: false, error: error.message || error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("DELETE /api/category unexpected:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
