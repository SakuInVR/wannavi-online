import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 500 }
    );
  }

  const { error } = await supabase
    .from("articles")
    .update({ review_status: "approved" })
    .eq("id", id);

  if (error) {
    console.error("[approve] update error:", error);
    return NextResponse.json({ error: "承認に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ success: true, review_status: "approved" });
}
