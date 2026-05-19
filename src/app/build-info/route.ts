import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      commitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      deploymentUrl: process.env.VERCEL_URL ?? null,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
      projectId: process.env.VERCEL_PROJECT_ID ?? null,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
