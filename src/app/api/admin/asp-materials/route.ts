import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET
export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const status = request.nextUrl.searchParams.get("status") ?? "active";
  const grouped = request.nextUrl.searchParams.get("grouped");

  if (grouped === "true") {
    // Return parent materials with children nested
    const { data: parents, error } = await supabase
      .from("asp_materials")
      .select("*, variations:asp_materials!parent_id(*)")
      .is("parent_id", null)
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(parents ?? []);
  }

  const { data, error } = await supabase
    .from("asp_materials")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST: { common: {...}, variations: [{...}, ...] }  or  single/bulk as before
export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const body = await request.json();

  // Variation group mode: { common: { name, asp_name, ... }, variations: [{ material_type, ... }, ...] }
  if (body.common && body.variations && Array.isArray(body.variations)) {
    const { common } = body;
    const variations = body.variations as Array<Record<string, unknown>>;

    if (!common.name || !common.asp_name) {
      return NextResponse.json({ error: "common.name and common.asp_name required" }, { status: 400 });
    }
    if (variations.length === 0) {
      return NextResponse.json({ error: "at least one variation required" }, { status: 400 });
    }

    // Insert parent
    const { data: parent, error: parentErr } = await supabase
      .from("asp_materials")
      .insert({
        name: common.name,
        asp_name: common.asp_name,
        description: common.description ?? "",
        price_note: common.price_note ?? null,
        category_hint: common.category_hint ?? null,
        usage_type: common.usage_type ?? "recommendation",
        disclosure_info: common.disclosure_info ?? null,
        material_type: "banner", // parent is just a container
        parent_id: null,
      })
      .select("id")
      .single();

    if (parentErr) return NextResponse.json({ error: parentErr.message }, { status: 500 });

    // Insert variations
    const rows = variations.map((v) => ({
      parent_id: parent.id,
      name: common.name,
      asp_name: common.asp_name,
      description: common.description ?? "",
      price_note: common.price_note ?? null,
      category_hint: common.category_hint ?? null,
      usage_type: common.usage_type ?? "recommendation",
      display_style: v.display_style ?? v.displayStyle ?? "product_card",
      disclosure_info: common.disclosure_info ?? null,
      material_type: v.material_type ?? v.materialType ?? "banner",
      banner_width: v.banner_width ?? v.bannerWidth ?? null,
      banner_height: v.banner_height ?? v.bannerHeight ?? null,
      image_url: v.image_url ?? v.imageUrl ?? null,
      text_content: v.text_content ?? v.textContent ?? null,
      link_normal: v.link_normal ?? v.linkNormal ?? null,
      link_amp: v.link_amp ?? v.linkAmp ?? null,
      link_nojs: v.link_nojs ?? v.linkNojs ?? null,
      placement_context: v.placement_context ?? v.placementContext ?? null,
      variation_label: v.variation_label ?? v.variationLabel ?? null,
    }));

    const { data: children, error: childErr } = await supabase
      .from("asp_materials")
      .insert(rows)
      .select();

    if (childErr) return NextResponse.json({ error: childErr.message }, { status: 500 });

    return NextResponse.json({
      parent_id: parent.id,
      variation_count: children.length,
      materials: [parent, ...children],
    }, { status: 201 });
  }

  // Bulk mode (flat)
  if (body.materials && Array.isArray(body.materials)) {
    const materials = body.materials;
    if (materials.length === 0) return NextResponse.json({ error: "empty" }, { status: 400 });
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
    }));
    const { data, error } = await supabase.from("asp_materials").insert(rows).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ count: data.length, materials: data }, { status: 201 });
  }

  // Single mode
  const { name, asp_name, description, material_type, banner_width, banner_height,
          image_url, text_content, link_normal, link_amp, link_nojs, disclosure_info,
          price_note, category_hint, usage_type, display_style, variation_label, placement_context } = body;

  if (!name || !asp_name) return NextResponse.json({ error: "name and asp_name required" }, { status: 400 });

  const { data, error } = await supabase.from("asp_materials").insert({
    name, asp_name, description: description ?? "",
    material_type: material_type ?? "banner",
    banner_width: banner_width ?? null, banner_height: banner_height ?? null,
    image_url: image_url ?? null, text_content: text_content ?? null,
    link_normal: link_normal ?? null, link_amp: link_amp ?? null, link_nojs: link_nojs ?? null,
    disclosure_info: disclosure_info ?? null,
    price_note: price_note ?? null, category_hint: category_hint ?? null,
    usage_type: usage_type ?? "recommendation", display_style: display_style ?? "product_card",
    variation_label: variation_label ?? null, placement_context: placement_context ?? null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PATCH
export async function PATCH(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const body = await request.json();
  const { id, status, ...fields } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) updateData.status = status;

  const allowed = ["material_type","banner_width","banner_height","image_url","text_content",
    "link_normal","link_amp","link_nojs","disclosure_info","usage_type","display_style",
    "placement_context","variation_label","category_hint"];
  for (const f of allowed) { if (fields[f] !== undefined) updateData[f] = fields[f]; }

  const { data, error } = await supabase.from("asp_materials").update(updateData).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
