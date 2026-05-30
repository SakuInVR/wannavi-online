import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await props.params;
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { stepIndex, status, targetDate, memo } = await req.json();

    if (stepIndex === undefined || stepIndex < 0 || stepIndex > 4) {
      return NextResponse.json({ error: "Invalid stepIndex (must be 0-4)" }, { status: 400 });
    }

    // 1. Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("user_projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
    }

    // 2. Build update payload
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) {
      if (!["todo", "doing", "done"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updateData.status = status;
    }

    if (targetDate !== undefined) {
      updateData.target_date = targetDate ? new Date(targetDate).toISOString() : null;
    }

    if (memo !== undefined) {
      updateData.memo = memo;
    }

    // 3. Update the step
    const { error: updateError } = await supabase
      .from("project_steps")
      .update(updateData)
      .eq("project_id", projectId)
      .eq("step_index", stepIndex);

    if (updateError) throw updateError;

    // 4. Fetch all steps to check if project is completed
    const { data: allSteps, error: fetchStepsError } = await supabase
      .from("project_steps")
      .select("status")
      .eq("project_id", projectId);

    if (fetchStepsError) throw fetchStepsError;

    const allDone = allSteps && allSteps.length === 5 && allSteps.every((s) => s.status === "done");
    const projectStatus = allDone ? "completed" : "in_progress";

    // 5. Update user_projects status and updated_at timestamp
    const { error: projectUpdateError } = await supabase
      .from("user_projects")
      .update({
        status: projectStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);

    if (projectUpdateError) throw projectUpdateError;

    return NextResponse.json({ success: true, projectStatus });
  } catch (error: any) {
    console.error("PATCH project step error:", error);
    return NextResponse.json({ error: error.message || "Failed to update step" }, { status: 500 });
  }
}
