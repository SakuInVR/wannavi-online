# Wannavi AI Affiliate Automation Goals

This document turns the current product requirements into ordered engineering goals.
The target is not "publish many AI-written posts." The target is a system where topic
ideas, source research, article drafting, affiliate matching, publishing, and
post-publish improvement can move through explicit states with audit logs and
quality gates.

## North Star

Build an AI-assisted affiliate media system for `wannavi.online` where a human can
choose the article direction, then the system helps research, draft, monetize,
publish, verify, and improve the article without losing editorial quality or SEO
trust.

## Non-Negotiable Rules

- Articles must not be published just because an AI draft exists.
- Every article must have a clear reader job: what the reader wants to become, what
  decision they are trying to make, and what next action the page supports.
- YouTube videos can be used as research sources, but the final article must read as
  Wannavi's own editorial guidance, not as a summary of videos.
- High-intent affiliate pages must have product evidence, ASP status, and a visible
  but tasteful PR indication.
- Browser-based ASP work must produce durable records: program name, ASP, status,
  material URL, image URL, click URL, target article, and review memo.
- Production changes must be verified after deployment, not assumed from local build
  success.
- Any mojibake, placeholder text, broken affiliate link, or missing source record is
  a publishing blocker.

## Ordered Development Goals

### 1. Current Asset Health Gate

Goal: make the existing MDX, JSON, and site configuration auditable.

Deliverables:

- Detect mojibake in article bodies, frontmatter, category labels, affiliate products,
  ad creatives, and workflow docs.
- Detect published articles that have weak metadata, weak body length, missing
  headings, or missing source records.
- Detect high-intent articles without product or creative coverage.
- Add a command that reports blockers and exits non-zero when the system is not safe
  to publish.

Success condition:

- `npm run automation:audit` gives a clear blocker list and can be added to the
  preflight chain after current content is repaired.

### 2. Pipeline State Model

Goal: stop treating publishing as a pile of files.

Target entities:

- `Topic`
- `ResearchJob`
- `SourceAnalysis`
- `Claim`
- `DraftArticle`
- `QualityReview`
- `AffiliateProgram`
- `AdCreative`
- `ArticleAdSlot`
- `PublishJob`
- `ProductionVerification`

Target state flow:

`idea -> researched -> drafted -> reviewed -> monetized -> ready -> published -> verified -> improving`

Success condition:

- Each article can be traced to its research sources, monetization state, publish
  state, and verification result.

### 3. Research and Evidence Layer

Goal: make AI drafting depend on structured research rather than vibes.

Rules:

- Each article needs exactly three YouTube research sources when using the current
  video workflow.
- Important claims must be extracted into structured notes before drafting.
- Buyer articles need decision criteria: budget, use case, failure cases, and who
  should not buy.
- The final article must not include phrases like "I watched the video" or "in the
  video." Source influence belongs in the research record, not in the reader-facing
  prose.

Success condition:

- Draft generation can reject weak source analysis before writing the article.

### 4. Affiliate and Ad Creative Layer

Goal: turn ASP browsing into a repeatable monetization workflow.

Rules:

- Each ad creative must store ASP, partnership status, image URL, click URL, target
  article slugs, and approval memo.
- Approved image ads should be preferred over plain text links when the page context
  supports it.
- Candidate, applied, approved, rejected, and expired states must be explicit.
- A product can be matched to an article only when the article intent and product
  use case align.

Success condition:

- A report can tell which high-intent articles need ASP search, partnership
  application, material extraction, or page placement.

### 5. Editorial Quality Gate

Goal: make "heartless generic text" fail automatically.

Rules:

- Published articles need a concrete opening scenario.
- Each article needs at least one table, checklist, or decision framework when the
  topic is a buying or learning decision.
- Articles must include "first action today" style practical steps.
- Generic claims without source notes or real criteria should be flagged.
- Public-facing pages must not show internal fields such as affiliate intent,
  review status, or system notes.

Success condition:

- The system can produce a review report before publication and identify why an
  article feels thin.

### 6. Deployment and Production Verification

Goal: prevent local success from being mistaken for production success.

Rules:

- The active Vercel project must be the only project treated as production.
- Deployment status, build version, critical pages, ads.txt, AdSense meta, and
  affiliate redirects must be checked after publish.
- Rate-limited deployment should be recorded as an operational blocker.

Success condition:

- `npm run production:verify` or its successor tells whether the published site is
  actually serving the intended version.

### 7. Improvement Loop

Goal: move from "publish and pray" to measurable improvement.

Inputs:

- Google Search Console queries and pages
- GA4 engagement signals
- Affiliate click and approval data
- Broken link and deployment checks
- Manual editorial notes

Loop:

1. Find pages with impressions but poor CTR.
2. Find pages with traffic but weak affiliate clicks.
3. Find high-intent pages without approved creatives.
4. Rewrite title, description, intro, table, CTA, or ad slot.
5. Re-run quality gates.
6. Publish and verify production.

Success condition:

- The system can generate a prioritized improvement queue instead of relying on
  memory or mood.

## Architecture Direction

The current repository can keep using MDX as the publishing format, but the system
needs a structured control plane around it.

Short-term:

- Use JSON files and scripts as the control plane.
- Keep MDX as the public rendering layer.
- Add strict audits before adding more volume.

Mid-term:

- Move state, runs, review records, ASP programs, and production verification records
  to Supabase.
- Keep generated MDX as an export artifact or cache.
- Use background jobs for research, drafting, ad matching, and verification.

Long-term:

- Build an admin UI for topic intake, research review, draft review, ad matching,
  publish approval, and improvement queue management.

## Immediate Development Order

1. Add `automation:audit` for asset health and monetization state.
2. Repair mojibake in public-facing site config and monetization data.
3. Add article state metadata or a separate article-state registry.
4. Add structured source analysis validation.
5. Add affiliate/ad creative opportunity report.
6. Add improvement queue generation.
7. Add Supabase persistence once the local schema proves stable.
