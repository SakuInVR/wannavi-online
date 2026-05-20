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

// POST - add new ASP material(s)
// Single: { name, asp_name, ... }
// Bulk:   { materials: [{ name, asp_name, ... }, ...] }
export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await request.json();

  // Bulk mode
  if (body.materials && Array.isArray(body.materials)) {
    const materials = body.materials;
    if (materials.length === 0) {
      return NextResponse.json({ error: "materials array is empty" }, { status: 400 });
    }

    const rows = materials.map((m: Record<string, unknown>) => ({
      name: m.name,
      description: m.description ?? "",
      asp_name: m.asp_name ?? m.aspName,
      affiliate_url: m.affiliate_url ?? m.affiliateUrl ?? null,
      image_url: m.image_url ?? m.imageUrl ?? null,
      price_note: m.price_note ?? m.priceNote ?? null,
      category_hint: m.category_hint ?? m.categoryHint ?? null,
      usage_type: m.usage_type ?? m.usageType ?? "recommendation",
      display_style: m.display_style ?? m.displayStyle ?? "product_card",
      placement_context: m.placement_context ?? m.placementContext ?? null,
      variation_label: m.variation_label ?? m.variationLabel ?? null,
    }));

    const { data, error } = await supabase
      .from("asp_materials")
      .insert(rows)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ count: data.length, materials: data }, { status: 201 });
  }

  // Single mode
  const { name, description, asp_name, affiliate_url, image_url, price_note,
          category_hint, usage_type, display_style, placement_context, variation_label } = body;

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
      usage_type: usage_type ?? "recommendation",
      display_style: display_style ?? "product_card",
      placement_context: placement_context ?? null,
      variation_label: variation_label ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// PATCH - update ASP material (archive/restore or update fields)
export async function PATCH(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await request.json();
  const { id, status, ...fields } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (status) updateData.status = status;
  if (fields.usage_type) updateData.usage_type = fields.usage_type;
  if (fields.display_style) updateData.display_style = fields.display_style;
  if (fields.placement_context !== undefined) updateData.placement_context = fields.placement_context;
  if (fields.variation_label !== undefined) updateData.variation_label = fields.variation_label;

  const { data, error } = await supabase
    .from("asp_materials")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
