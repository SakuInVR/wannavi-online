import { NextResponse } from "next/server";

import { getOutboundLink } from "@/lib/outbound-links";

type OutboundRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: OutboundRouteProps) {
  const { id } = await params;
  const link = getOutboundLink(id);

  if (!link?.url) {
    return NextResponse.redirect(new URL("/disclosure", _request.url), 302);
  }

  return NextResponse.redirect(link.url, 302);
}
