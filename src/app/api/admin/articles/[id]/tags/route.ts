import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  let tags: string[];
  try {
    const body = await request.json();
    tags = body.tags;
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  if (!Array.isArray(tags)) {
    return NextResponse.json({ error: "tags は文字列の配列で指定してください" }, { status: 400 });
  }

  // Clean and validate tags
  const cleaned = tags
    .map((t) => (typeof t === "string" ? t.trim() : ""))
    .filter((t) => t.length > 0 && t.length <= 30);

  const { error } = await supabase
    .from("articles")
    .update({ tags: cleaned })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, tags: cleaned });
}
