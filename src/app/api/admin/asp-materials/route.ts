import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET
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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST (single or bulk)
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
      material_type: m.material_type ?? m.materialType ?? "banner",
      banner_width: m.banner_width ?? m.bannerWidth ?? null,
      banner_height: m.banner_height ?? m.bannerHeight ?? null,
      image_url: m.image_url ?? m.imageUrl ?? null,
      text_content: m.text_content ?? m.textContent ?? null,
      link_normal: m.link_normal ?? m.linkNormal ?? null,
      link_amp: m.link_amp ?? m.linkAmp ?? null,
      link_nojs: m.link_nojs ?? m.linkNojs ?? null,
      disclosure_info: m.disclosure_info ?? m.disclosureInfo ?? null,
      description: m.description ?? "",
      asp_name: m.asp_name ?? m.aspName ?? "",
      price_note: m.price_note ?? m.priceNote ?? null,
      category_hint: m.category_hint ?? m.categoryHint ?? null,
      usage_type: m.usage_type ?? m.usageType ?? "recommendation",
      display_style: m.display_style ?? m.displayStyle ?? "product_card",
      variation_label: m.variation_label ?? m.variationLabel ?? null,
      placement_context: m.placement_context ?? m.placementContext ?? null,
    }));
    const { data, error } = await supabase.from("asp_materials").insert(rows).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ count: data.length, materials: data }, { status: 201 });
  }

  // Single mode
  const {
    name, asp_name, description,
    material_type, banner_width, banner_height, image_url, text_content,
    link_normal, link_amp, link_nojs, disclosure_info,
    price_note, category_hint, usage_type, display_style,
    variation_label, placement_context,
  } = body;

  if (!name || !asp_name) {
    return NextResponse.json({ error: "name and asp_name required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("asp_materials")
    .insert({
      name,
      asp_name,
      description: description ?? "",
      material_type: material_type ?? "banner",
      banner_width: banner_width ?? null,
      banner_height: banner_height ?? null,
      image_url: image_url ?? null,
      text_content: text_content ?? null,
      link_normal: link_normal ?? null,
      link_amp: link_amp ?? null,
      link_nojs: link_nojs ?? null,
      disclosure_info: disclosure_info ?? null,
      price_note: price_note ?? null,
      category_hint: category_hint ?? null,
      usage_type: usage_type ?? "recommendation",
      display_style: display_style ?? "product_card",
      variation_label: variation_label ?? null,
      placement_context: placement_context ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PATCH
export async function PATCH(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }
  const body = await request.json();
  const { id, status, ...fields } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) updateData.status = status;

  const allowedFields = [
    "material_type", "banner_width", "banner_height", "image_url", "text_content",
    "link_normal", "link_amp", "link_nojs", "disclosure_info",
    "usage_type", "display_style", "placement_context", "variation_label",
  ];
  for (const f of allowedFields) {
    if (fields[f] !== undefined) updateData[f] = fields[f];
  }

  const { data, error } = await supabase
    .from("asp_materials")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
