import { NextResponse } from "next/server";

import { getOutboundLink, getOutboundUrl } from "@/lib/outbound-links";

type OutboundRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: OutboundRouteProps) {
  const { id } = await params;
  const link = getOutboundLink(id);

  if (!link) {
    return NextResponse.redirect(new URL("/disclosure", _request.url), 302);
  }

  const url = getOutboundUrl(link);

  if (!url) {
    return NextResponse.redirect(new URL("/disclosure", _request.url), 302);
  }

  return NextResponse.redirect(url, 302);
}
