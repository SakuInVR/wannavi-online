import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { ReviewClient } from "./review-client";

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) notFound();

  const { data: article, error } = await supabase
    .from("articles")
    .select("id, title, description, category, review_status, body, created_at")
    .eq("id", id)
    .single();

  if (error || !article) notFound();

  // Linked ASP materials
  const { data: asps } = await supabase
    .from("article_asp_materials")
    .select("asp_material_id, asp_materials(name, asp_name, affiliate_url)")
    .eq("article_id", id);

  const linkedAsps =
    asps
      ?.map((row: unknown) => {
        const r = row as {
          asp_material_id: string;
          asp_materials: { name: string; asp_name: string; affiliate_url: string | null } | null;
        };
        return r.asp_materials;
      })
      .filter(Boolean) ?? [];

  // Past feedback for this category (the learning loop)
  const { data: pastFeedback } = await supabase
    .from("article_feedbacks")
    .select("feedback_comment, rejected_at")
    .eq("category", article.category)
    .order("rejected_at", { ascending: false })
    .limit(10);

  return (
    <ReviewClient
      article={article}
      linkedAsps={
        linkedAsps as Array<{
          name: string;
          asp_name: string;
          affiliate_url: string | null;
        }>
      }
      pastFeedback={
        ((pastFeedback as Array<{ feedback_comment: string; rejected_at: string }>) ?? []).map(
          (fb) => ({
            feedback_comment: fb.feedback_comment,
            rejected_at: fb.rejected_at,
          })
        )
      }
    />
  );
}
