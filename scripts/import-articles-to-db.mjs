import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const articlesDirectory = path.join(root, "content", "articles");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or key env variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  if (!fs.existsSync(articlesDirectory)) {
    console.error("Articles directory not found:", articlesDirectory);
    process.exit(1);
  }

  const filenames = fs
    .readdirSync(articlesDirectory)
    .filter((filename) => filename.endsWith(".mdx"));

  console.log(`Found ${filenames.length} local MDX articles to import...`);

  let successCount = 0;

  for (const filename of filenames) {
    const slug = filename.replace(/\.mdx$/, "");
    const filePath = path.join(articlesDirectory, filename);
    const source = fs.readFileSync(filePath, "utf8");
    const { content, data } = matter(source);

    const isDraft = data.draft === true;
    const reviewStatus = isDraft ? "pending" : "approved";
    const pipelineState = isDraft ? "drafted" : "published";

    // Build article payload
    const articlePayload = {
      slug,
      title: data.title || slug,
      description: data.description || "",
      category: data.category || "unknown",
      affiliate_intent: data.affiliateIntent || "medium",
      tags: data.tags || [],
      pipeline_state: pipelineState,
      review_status: reviewStatus,
      published_at: data.publishedAt || new Date().toISOString().split("T")[0],
      updated_at: data.updatedAt || data.publishedAt || new Date().toISOString().split("T")[0],
      body: content,
    };

    console.log(`Importing [${slug}]...`);

    // Upsert into articles
    const { data: upsertedArticle, error: articleError } = await supabase
      .from("articles")
      .upsert(articlePayload, { onConflict: "slug" })
      .select("id")
      .single();

    if (articleError) {
      console.error(`Error importing article [${slug}]:`, articleError);
      continue;
    }

    const articleId = upsertedArticle.id;

    // Handle sourceVideos
    const sourceVideos = data.sourceVideos || [];
    if (Array.isArray(sourceVideos) && sourceVideos.length > 0) {
      for (const url of sourceVideos) {
        if (!url || typeof url !== "string") continue;
        const cleanUrl = url.trim();
        if (!cleanUrl) continue;

        const { error: sourceError } = await supabase
          .from("research_sources")
          .upsert(
            {
              article_id: articleId,
              source_type: "youtube",
              url: cleanUrl,
            },
            { onConflict: "article_id,url" }
          );

        if (sourceError) {
          console.warn(`Warning: Could not link source video [${cleanUrl}] to article [${slug}]:`, sourceError.message);
        }
      }
    }

    successCount++;
  }

  console.log(`Import completed. Successfully imported ${successCount}/${filenames.length} articles.`);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
