import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

/**
 * GET - list available YouTube research JSON files
 */
export async function GET() {
  const researchDir = path.join(process.cwd(), "research", "youtube");

  if (!fs.existsSync(researchDir)) {
    return NextResponse.json([]);
  }

  const files = fs
    .readdirSync(researchDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const filePath = path.join(researchDir, f);
      try {
        const raw = fs.readFileSync(filePath, "utf8");
        const data = JSON.parse(raw);
        return {
          filename: f,
          title: data.title ?? f.replace(".json", ""),
          videoCount: data.videos?.length ?? 0,
          generatedAt: data.generatedAt ?? null,
        };
      } catch {
        return { filename: f, title: f.replace(".json", ""), videoCount: 0, generatedAt: null };
      }
    })
    .sort(
      (a, b) =>
        new Date(b.generatedAt ?? 0).getTime() -
        new Date(a.generatedAt ?? 0).getTime()
    );

  return NextResponse.json(files);
}
