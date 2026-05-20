import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET - list all ASP materials
export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const status = request.nextUrl.searchParams.get("status") ?? "active";

  const { data, error } = await supabase
    .from("asp_materials")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST - add new ASP material
export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await request.json();
  const { name, description, asp_name, affiliate_url, image_url, price_note, category_hint } = body;

  if (!name || !asp_name) {
    return NextResponse.json(
      { error: "name and asp_name are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("asp_materials")
    .insert({
      name,
      description: description ?? "",
      asp_name,
      affiliate_url: affiliate_url ?? null,
      image_url: image_url ?? null,
      price_note: price_note ?? null,
      category_hint: category_hint ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// PATCH - update ASP material (archive/restore)
export async function PATCH(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await request.json();
  const { id, status } = body;

  if (!id || !status) {
    return NextResponse.json(
      { error: "id and status are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("asp_materials")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
