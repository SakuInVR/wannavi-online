import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    // 1. Fetch projects for user
    const { data: projects, error: projectsError } = await supabase
      .from("user_projects")
      .select(`
        id,
        article_id,
        status,
        created_at,
        updated_at,
        articles:article_id (
          title,
          slug,
          category,
          category_title:category
        )
      `)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (projectsError) throw projectsError;

    // 2. Fetch steps for all user projects
    const projectIds = (projects || []).map((p) => p.id);
    let stepsMap: Record<string, any[]> = {};

    if (projectIds.length > 0) {
      const { data: steps, error: stepsError } = await supabase
        .from("project_steps")
        .select("project_id, step_index, status, target_date, memo")
        .in("project_id", projectIds)
        .order("step_index", { ascending: true });

      if (stepsError) throw stepsError;

      (steps || []).forEach((step) => {
        if (!stepsMap[step.project_id]) {
          stepsMap[step.project_id] = [];
        }
        stepsMap[step.project_id].push(step);
      });
    }

    // 3. Format projects with steps and progress rate
    const formatted = (projects || []).map((project) => {
      const steps = stepsMap[project.id] || [];
      const completedCount = steps.filter((s) => s.status === "done").length;
      const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

      return {
        ...project,
        steps,
        progress,
      };
    });

    return NextResponse.json({ success: true, projects: formatted });
  } catch (error: any) {
    console.error("GET projects error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { articleId } = await req.json();
    if (!articleId) {
      return NextResponse.json({ error: "Missing articleId" }, { status: 400 });
    }

    // 1. Fetch user profile to check subscription status
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;
    const isPro = profile?.subscription_status === "active" || profile?.subscription_status === "pro";

    // 2. If not Pro, check existing active projects limit (Max 1 active project for free users)
    if (!isPro) {
      const { count, error: countError } = await supabase
        .from("user_projects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "in_progress");

      if (countError) throw countError;
      if (count && count >= 1) {
        return NextResponse.json(
          {
            error: "LIMIT_REACHED",
            message: "無料プランで同時に進められる学習プロジェクトは1つまでです。別のプロジェクトを完了にするか、Wannavi Proにアップグレードしてください。",
          },
          { status: 403 }
        );
      }
    }

    // 3. Verify that the roadmap is unlocked for the user (or it's official admin article with userId=null)
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .select("id, user_id")
      .eq("id", articleId)
      .single();

    if (articleError || !article) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    // Official articles (userId=null) or own articles are free, others require unlock check unless user is Pro
    const isOwnArticle = article.user_id === user.id;
    const isOfficial = !article.user_id;

    if (!isPro && !isOwnArticle && !isOfficial) {
      const { data: unlock, error: unlockError } = await supabase
        .from("article_unlocks")
        .select("id")
        .eq("user_id", user.id)
        .eq("article_id", articleId)
        .maybeSingle();

      if (unlockError) throw unlockError;
      if (!unlock) {
        return NextResponse.json(
          { error: "Roadmap is locked. Please unlock it using credits first." },
          { status: 403 }
        );
      }
    }

    // 4. Create user project (use upsert to handle if they already completed it before and want to restart)
    const { data: project, error: projectError } = await supabase
      .from("user_projects")
      .upsert(
        { user_id: user.id, article_id: articleId, status: "in_progress", updated_at: new Date().toISOString() },
        { onConflict: "user_id,article_id" }
      )
      .select("id")
      .single();

    if (projectError) throw projectError;

    // 5. Initialize the 5 learning steps (Step 1 to 5, indexes 0 to 4)
    const stepsData = Array.from({ length: 5 }, (_, i) => ({
      project_id: project.id,
      step_index: i,
      status: "todo",
      memo: "",
      updated_at: new Date().toISOString(),
    }));

    const { error: stepsError } = await supabase
      .from("project_steps")
      .upsert(stepsData, { onConflict: "project_id,step_index" });

    if (stepsError) throw stepsError;

    return NextResponse.json({ success: true, projectId: project.id });
  } catch (error: any) {
    console.error("POST projects error:", error);
    return NextResponse.json({ error: error.message || "Failed to create project" }, { status: 500 });
  }
}
