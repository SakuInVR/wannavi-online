# Affiliate Link Setup

Wanna Navi already routes article CTAs through `/go/...`, but the links do not earn revenue until real affiliate URLs are set in Vercel.

## Required Vercel environment variables

Set these in Vercel Project Settings -> Environment Variables -> Production.

```bash
AFFILIATE_AI_TOOLS_URL=
AFFILIATE_DTM_STARTER_KIT_URL=
AFFILIATE_VR_CREATOR_KIT_URL=
AFFILIATE_INSTRUMENT_STARTER_KIT_URL=
```

After setting them, redeploy Production.

## Verify production redirects

Run this after redeploying:

```powershell
npm run affiliate:check
```

Optional custom base URL:

```powershell
$env:AFFILIATE_CHECK_BASE_URL='https://www.wannavi.online'; npm run affiliate:check
```

The check fails when a `/go/...` route still falls back to `/disclosure` or redirects inside the site. It passes only when every configured CTA goes to an external affiliate URL.
