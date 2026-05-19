import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const articlesDirectory = path.join(root, "content", "articles");
const researchDirectory = path.join(root, "research", "youtube");
const rewriteQueuePath = path.join(root, "VIDEO_REWRITE_QUEUE.md");
const youtubePattern =
  /^https:\/\/(?:www\.)?youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function fail(message) {
  console.error(`- ${message}`);
  return 1;
}

function normalizeUrl(url) {
  return String(url).trim();
}

function getCompletedQueueFiles() {
  if (!fs.existsSync(rewriteQueuePath)) {
    return new Set();
  }

  const queue = fs.readFileSync(rewriteQueuePath, "utf8");

  return new Set(
    [...queue.matchAll(/^- \[x\] `([^`]+\.mdx)`/gm)].map((match) => match[1]),
  );
}

function getResearchEntries() {
  if (!fs.existsSync(researchDirectory)) {
    return [];
  }

  return fs
    .readdirSync(researchDirectory)
    .filter((filename) => filename.endsWith(".json"))
    .map((filename) => {
      const filePath = path.join(researchDirectory, filename);
      const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));

      return {
        filename,
        title: payload.title,
        urls: new Set(
          (payload.videos ?? []).map((video) => normalizeUrl(video.url)),
        ),
      };
    });
}

function hasMatchingResearch(sourceVideos, researchEntries) {
  const requiredUrls = sourceVideos.map(normalizeUrl);

  return researchEntries.some((entry) =>
    requiredUrls.every((url) => entry.urls.has(url)),
  );
}

function hasPlaceholder(content, sourceVideos) {
  return (
    content.includes("REPLACE_ME") ||
    sourceVideos.some((url) => url.includes("REPLACE_ME"))
  );
}

function validateVideoBackedArticle(filename, data, content, researchEntries) {
  let failures = 0;
  const sourceVideos = data.sourceVideos;

  if (!Array.isArray(sourceVideos) || sourceVideos.length !== 3) {
    return fail(`${filename}: sourceVideos must include exactly three YouTube URLs`);
  }

  for (const url of sourceVideos) {
    if (!youtubePattern.test(normalizeUrl(url))) {
      failures += fail(`${filename}: invalid YouTube source video URL "${url}"`);
    }
  }

  if (hasPlaceholder(content, sourceVideos)) {
    failures += fail(`${filename}: remove video research placeholders before publishing`);
  }

  if (!hasMatchingResearch(sourceVideos, researchEntries)) {
    failures += fail(
      `${filename}: no research/youtube JSON matches all sourceVideos`,
    );
  }

  if (!content.includes("## 参考にした視点")) {
    failures += fail(`${filename}: missing "参考にした視点" section`);
  }

  return failures;
}

const completedQueueFiles = getCompletedQueueFiles();
const researchEntries = getResearchEntries();

const articleFiles = fs
  .readdirSync(articlesDirectory)
  .filter((filename) => filename.endsWith(".mdx"));

let failureCount = 0;
let checkedCount = 0;

for (const filename of articleFiles) {
  const source = read(path.join("content", "articles", filename));
  const { content, data } = matter(source);
  const hasSourceVideos = Array.isArray(data.sourceVideos);
  const isCompletedQueueArticle = completedQueueFiles.has(filename);

  if (!hasSourceVideos && !isCompletedQueueArticle) {
    continue;
  }

  checkedCount += 1;
  failureCount += validateVideoBackedArticle(
    filename,
    data,
    content,
    researchEntries,
  );
}

for (const filename of completedQueueFiles) {
  if (!articleFiles.includes(filename)) {
    failureCount += fail(`VIDEO_REWRITE_QUEUE.md references missing article ${filename}`);
  }
}

if (failureCount > 0) {
  console.error(`Video research check failed with ${failureCount} issue(s).`);
  process.exit(1);
}

console.log(`Video research check passed for ${checkedCount} article(s).`);
