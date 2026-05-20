import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  // Accept optional body edit
  let editedBody: string | undefined;
  try {
    const body = await request.json();
    if (body.body && typeof body.body === "string") {
      editedBody = body.body;
    }
  } catch {
    // no body - just approve as-is
  }

  const updateData: Record<string, unknown> = { review_status: "approved" };
  if (editedBody) {
    updateData.body = editedBody;
  }

  const { error } = await supabase
    .from("articles")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("[approve] update error:", error);
    return NextResponse.json({ error: "承認に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    review_status: "approved",
    body_updated: !!editedBody,
  });
}
